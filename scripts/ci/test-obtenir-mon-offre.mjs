// test-obtenir-mon-offre — l'envoi du formulaire principal (#prospectForm) arrive toujours à
// leadWebflow, puis redirige vers l'app.
//
// Le script tourne dans un faux DOM réduit aux éléments qu'il lit ; `fetch` et la redirection
// sont interceptés. Sans dépendance : la CI n'installe rien.
//
// Les cas qui ont motivé ce test (erreurs PostHog relevées le 2026-11-23) : un appel à
// api.ipify.org sans .catch, refusé par un bloqueur, arrêtait l'envoi (ni lead ni redirection) ;
// et localStorage, bloqué dans Safari, levait SecurityError avant même l'envoi.
//
// Usage : node scripts/ci/test-obtenir-mon-offre.mjs. Sortie 0 si tout passe, 1 sinon.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../../obtenir-mon-offre.js', import.meta.url), 'utf8');
const WEBHOOK = 'https://europe-west1-appelsee-2k24.cloudfunctions.net/leadWebflow';

function element(props = {}) {
  const ecouteurs = {};
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    value: '',
    checked: false,
    ...props,
    addEventListener(type, f) { ecouteurs[type] = f; },
    declencher(type, e = {}) { return ecouteurs[type] && ecouteurs[type].call(this, e); },
  };
}

/** Monte le formulaire rempli, l'envoie, rend les appels réseau et la redirection. */
async function envoyer({ stockage, reseau = () => Promise.resolve({ ok: true }) }) {
  const slide = element({ id: 'slide-1', querySelectorAll: () => [], querySelector: () => null });
  const formSlider = element({ querySelectorAll: () => [slide] });
  const budget = element({ value: '39', checked: true });
  const champs = {
    '#formSlider': formSlider,
    '#personaSelect': element({ value: 'ME' }),
    '#interest': element({ value: 'Sport' }),
    'input[name="annualBudget"]:checked': budget,
    '[name="email"]': element({ value: 'Visiteuse.Test@example.org' }), // fictive
    '[name="firstname"]': element({ value: 'Camille' }),
    '[name="lastname"]': element({ value: 'Test' }),
  };
  const formulaire = element({
    querySelector: (sel) => champs[sel] || null,
    querySelectorAll: (sel) => (sel === 'input[name="annualBudget"]' ? [budget] : []),
  });
  let pret;
  let redirection = null;
  const appels = [];
  const contexte = {
    window: {
      location: {
        hostname: 'www.elsee.care',
        search: '',
        href: 'https://www.elsee.care/obtenir-mon-offre',
        assign: (url) => { redirection = url; },
      },
    },
    document: {
      getElementById: (id) => (id === 'prospectForm' ? formulaire : null),
      addEventListener: (type, f) => { if (type === 'DOMContentLoaded') pret = f; },
    },
    localStorage: stockage,
    navigator: { userAgent: 'test' },
    URLSearchParams,
    console,
    fetch: (url, options) => { appels.push({ url, corps: options && JSON.parse(options.body) }); return reseau(url); },
  };
  contexte.window.window = contexte.window;
  vm.runInNewContext(source, contexte);
  pret();
  formulaire.declencher('submit', { preventDefault() {} });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  return { appels, redirection };
}

const stockageNormal = {
  getItem: (cle) => ({ first_source: 'google', session_source: 'newsletter' })[cle] ?? null,
};
const stockageBloque = {
  getItem() { throw new Error('SecurityError: The operation is insecure.'); },
};

const cas = [
  ['un seul appel réseau, à leadWebflow, puis la redirection vers l’app', async () => {
    const r = await envoyer({ stockage: stockageNormal });
    assert.deepEqual(r.appels.map((a) => a.url), [WEBHOOK]);
    assert.equal(r.appels[0].corps.formName, 'mainForm');
    assert.equal(r.appels[0].corps.first_source, 'google');
    assert.equal(r.appels[0].corps.session_source, 'newsletter');
    assert.match(r.redirection, /^https:\/\/app\.elsee\.care\/signup\?persona=ME&price=39&/);
  }],
  ['l’adresse IP ne part plus', async () => {
    const r = await envoyer({ stockage: stockageNormal });
    assert.equal('ip' in r.appels[0].corps, false);
  }],
  ['localStorage bloqué : le lead part quand même, provenance vide', async () => {
    const r = await envoyer({ stockage: stockageBloque });
    assert.equal(r.appels.length, 1);
    assert.equal(r.appels[0].corps.first_source, '');
    assert.equal(r.appels[0].corps.session_source, 'https://www.elsee.care/obtenir-mon-offre');
    assert.ok(r.redirection);
  }],
  ['leadWebflow injoignable : la redirection a lieu quand même', async () => {
    const r = await envoyer({ stockage: stockageNormal, reseau: () => Promise.reject(new TypeError('Failed to fetch')) });
    assert.ok(r.redirection);
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
