// test-formulaire-lp — ce que formulaire-lp.js envoie à leadWebflow dans `interests`.
//
// Le script tourne dans un faux DOM réduit aux éléments qu'il lit (formulaire, cases, champ
// « Autre », champ e-mail) ; `fetch` est intercepté, la redirection ignorée. Sans dépendance :
// la CI n'installe rien.
//
// Le cas qui a motivé ce test (2026-11-16) : le champ « Autre » portait name="email" dans le
// Designer, le remplissage automatique y mettait l'adresse, et elle partait dans `interests`.
//
// Usage : node scripts/ci/test-formulaire-lp.mjs. Sortie 0 si tout passe, 1 sinon.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../../formulaire-lp.js', import.meta.url), 'utf8');
const ADRESSE = 'visiteuse.test@example.org'; // fictive

function element(props) {
  const ecouteurs = {};
  return {
    style: {},
    dataset: {},
    attributs: {},
    checked: false,
    value: '',
    ...props,
    addEventListener(type, f) { ecouteurs[type] = f; },
    setAttribute(nom, valeur) { this.attributs[nom] = valeur; },
    closest() { return null; },
    declencher(type, e = {}) { return ecouteurs[type] && ecouteurs[type].call(this, e); },
  };
}

/** Monte le formulaire, coche les cases, remplit les champs, envoie, rend le corps posté. */
async function envoyer({ cases = [], autre, email = ADRESSE }) {
  const sport = element({ id: 'Sport', name: 'Sport', dataset: { name: 'Sport' } });
  const caseAutre = element({ id: 'Autre', name: 'Autre', dataset: { name: 'Autre ...' } });
  const champAutre = element({ id: 'other-response', name: 'email', type: 'text' });
  const champEmail = element({ id: 'email', name: 'email', type: 'email' });
  const formulaire = element({ id: 'wf-form-Email-LP-Form', querySelectorAll: () => [sport, caseAutre] });
  const parId = { 'wf-form-Email-LP-Form': formulaire, Autre: caseAutre, 'other-response': champAutre, email: champEmail };
  let pret;
  const corps = [];
  const contexte = {
    window: { location: { hostname: 'www.elsee.care', search: '', href: 'https://www.elsee.care/offres-remboursement-elsee' } },
    document: {
      currentScript: { dataset: { formName: 'lp' } },
      getElementById: (id) => parId[id] || null,
      addEventListener: (type, f) => { if (type === 'DOMContentLoaded') pret = f; },
    },
    URLSearchParams,
    console,
    alert: () => {},
    fetch: (url, options) => { corps.push(JSON.parse(options.body)); return Promise.resolve({ ok: true }); },
  };
  vm.runInNewContext(source, contexte);
  pret();
  const nomApresChargement = champAutre.name;
  if (cases.includes('Sport')) sport.checked = true;
  if (autre !== undefined) {
    caseAutre.checked = true;
    champAutre.value = autre;
  }
  champEmail.value = email;
  formulaire.declencher('submit', { preventDefault() {} });
  await new Promise((r) => setTimeout(r, 0));
  return { corps: corps[0], nomApresChargement, autocomplete: champAutre.attributs.autocomplete };
}

const cas = [
  ['le champ « Autre » ne s’appelle plus email après le chargement', async () => {
    const r = await envoyer({ cases: ['Sport'] });
    assert.equal(r.nomApresChargement, 'autre');
    assert.equal(r.autocomplete, 'off');
  }],
  ['les cases cochées partent seules', async () => {
    assert.equal((await envoyer({ cases: ['Sport'] })).corps.interests, 'Sport');
  }],
  ['une réponse « Autre » ordinaire part avec les cases', async () => {
    assert.equal((await envoyer({ cases: ['Sport'], autre: 'Ostéopathie' })).corps.interests, 'Sport, Ostéopathie');
  }],
  ['l’adresse de la visiteuse dans « Autre » ne part pas dans interests', async () => {
    const { corps } = await envoyer({ cases: ['Sport'], autre: ADRESSE });
    assert.equal(corps.interests, 'Sport');
    assert.equal(corps.email, ADRESSE);
  }],
  ['une autre adresse dans « Autre » ne part pas non plus', async () => {
    assert.equal((await envoyer({ cases: ['Sport'], autre: 'autre.adresse@example.net' })).corps.interests, 'Sport');
  }],
];

let echecs = 0;
for (const [nom, f] of cas) {
  try {
    await f();
    console.log(`✅ ${nom}`);
  } catch (e) {
    echecs++;
    console.log(`❌ ${nom}\n   ${e.message}`);
  }
}
process.exit(echecs ? 1 : 0);
