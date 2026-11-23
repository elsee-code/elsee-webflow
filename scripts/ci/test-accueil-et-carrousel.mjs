// test-accueil-et-carrousel — le compte à rebours de l'accueil (accueil.js) et le carrousel de
// /reseau-elsee (slider-hero.js) ne lèvent plus d'erreur.
//
// Chaque script tourne dans un faux DOM réduit aux éléments qu'il lit ; les minuteries sont
// interceptées et déclenchées à la main. Sans dépendance : la CI n'installe rien.
//
// Les cas qui ont motivé ce test (erreurs PostHog relevées le 2026-11-23) :
// - accueil.js : la date cible étant passée, le premier affichage lisait `timer` avant sa
//   déclaration (« Cannot access 'timer' before initialization ») ;
// - slider-hero.js : le défilement automatique avançait sans transitionend, l'index sortait de
//   la piste (« Cannot read properties of undefined (reading 'classList') »).
//
// Usage : node scripts/ci/test-accueil-et-carrousel.mjs. Sortie 0 si tout passe, 1 sinon.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const lire = (fichier) => readFileSync(new URL(`../../${fichier}`, import.meta.url), 'utf8');

function element(props = {}) {
  const classes = new Set(props.classes || []);
  const ecouteurs = {};
  return {
    style: {},
    textContent: '',
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, oui) => (oui ? classes.add(c) : classes.delete(c)),
    },
    ...props,
    addEventListener(type, f) { ecouteurs[type] = f; },
    declencher(type, e = {}) { return ecouteurs[type] && ecouteurs[type].call(this, e); },
  };
}

/** Lance un script : rend ses écouteurs DOMContentLoaded et ses minuteries. */
function monter(source, document, extra = {}) {
  const pret = [];
  const minuteries = [];
  document.addEventListener = (type, f) => { if (type === 'DOMContentLoaded') pret.push(f); };
  const contexte = {
    window: { addEventListener() {}, open() {}, location: { href: 'https://www.elsee.care/' } },
    document,
    console: { ...console, error() {} },
    setInterval: (f) => { minuteries.push(f); return minuteries.length; },
    clearInterval: () => {},
    Date,
    ...extra,
  };
  vm.runInNewContext(source, contexte);
  pret.forEach((f) => f());
  return minuteries;
}

function accueil(dateCible) {
  const chiffres = Object.fromEntries(['days', 'hours', 'minutes', 'secondes'].map((n) => [n, element()]));
  const bloc = element();
  const document = {
    getElementById: () => null,
    querySelector: (sel) => {
      if (sel === '.home_timer_wrapper') return bloc;
      const nom = sel.replace('.home_timer_number.', '');
      return chiffres[nom] || null;
    },
  };
  let source = lire('accueil.js');
  if (dateCible) source = source.replace("'2025-11-25T12:00:00+01:00'", `'${dateCible}'`);
  const minuteries = monter(source, document);
  return { chiffres, bloc, minuteries };
}

function carrousel() {
  const diapositive = () => element({ classes: ['js-hero-slide'], getBoundingClientRect: () => ({ width: 100 }) });
  const originales = [0, 1, 2].map(diapositive);
  for (const d of originales) d.cloneNode = diapositive;
  let pistes = [...originales];
  const piste = element({
    querySelectorAll: () => pistes,
    appendChild: (e) => { pistes.push(e); },
    insertBefore: (e, avant) => { pistes.splice(pistes.indexOf(avant), 0, e); },
  });
  const points = element({ appendChild() {} });
  const curseur = element({
    querySelector: (sel) => ({ '.js-hero-slider-track': piste, '.js-hero-dots': points })[sel] || null,
  });
  const document = {
    querySelector: (sel) => (sel === '.js-hero-slider' ? curseur : null),
    createElement: () => element(),
  };
  const minuteries = monter(lire('slider-hero.js'), document);
  // L'index se lit dans le décalage : translateX(-100 * index px).
  const index = () => -Number(/translateX\((-?[\d.]+)px\)/.exec(piste.style.transform)[1]) / 100;
  return { piste, pistes: () => pistes, minuteries, index };
}

const cas = [
  ['accueil, date passée : 00 partout, aucune erreur, aucune minuterie', () => {
    const r = accueil();
    assert.equal(r.chiffres.days.textContent, '00');
    assert.equal(r.bloc.classList.contains('countdown-finished'), true);
    assert.equal(r.minuteries.length, 0);
  }],
  ['accueil, date à venir : le compte à rebours tourne', () => {
    const r = accueil(new Date(Date.now() + 3 * 86400000 + 5000).toISOString());
    assert.equal(r.chiffres.days.textContent, '03');
    assert.equal(r.minuteries.length, 1);
  }],
  ['carrousel : vingt avances sans transitionend, l’index reste dans la piste', () => {
    const r = carrousel();
    const n = r.pistes().length;
    for (let i = 0; i < 20; i++) {
      r.minuteries[0]();
      assert.ok(r.index() >= 0 && r.index() <= n - 1, `index ${r.index()} hors de 0..${n - 1}`);
    }
    r.piste.declencher('transitionend', { target: r.piste });
  }],
  ['carrousel : arrivé sur le clone de fin, transitionend ramène à la première vraie diapositive', () => {
    const r = carrousel();
    const n = r.pistes().length;
    while (r.index() < n - 1) r.minuteries[0]();
    r.piste.declencher('transitionend', { target: r.piste });
    assert.equal(r.index(), 1);
  }],
  ['carrousel : la transition d’un élément d’une diapositive est ignorée', () => {
    const r = carrousel();
    const n = r.pistes().length;
    while (r.index() < n - 1) r.minuteries[0]();
    r.piste.declencher('transitionend', { target: element() });
    assert.equal(r.index(), n - 1);
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
