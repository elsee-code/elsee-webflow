// ============================================================================
// longform.js — le longform des landings, à poser sur n'importe quelle page du site
// ============================================================================
// La carte « Votre offre en 1 minute » des landings du Studio : la première question du
// formulaire de l'app (compléments alimentaires), et le bouton « Simuler mes économies ».
// Pages : toute page de www.elsee.care, par le bloc Embed webflow/embeds/longform.html,
// autant de fois qu'on veut sur une même page (dev_ops D83).
//
// Au clic, la réponse part à `landingLongForm` (elsee_functions_v2), qui crée le document
// `longForm_resp` de l'app — le `formID` — et la visiteuse entre dans l'app, dans un nouvel
// onglet, à la question suivante (D53 § 3). `source` porte l'URL de la page où elle a répondu,
// paramètres compris, sans le fragment (D83 § 2). Repli sur un échec, au bout de 8 s ou sans
// `fetch` : l'onglet ouvre `/signup` avec la réponse et `utmSource` = la même URL ; la
// visiteuse repose la question, mais n'est pas perdue (D53 § 4).
//
// Lu sur le bloc : data-titre (« Votre offre en 1 minute » à défaut), data-texte (facultatif).
// La question, les réponses, le bouton et les deux pages de l'app sont ceux du Studio
// (`internal_tool:packages/shared/src/landing.ts`, LONGFORM_PREMIERE_QUESTION et
// suiteCarteLongForm), et les réponses celles du backend (DIET_COMP_FREQUENCES) : une réponse
// qui change dans l'app se reporte aux trois. Le style est celui de la carte des landings
// (`internal_tool:apps/studio/src/landing/feuille.ts`, `.lp-carte-g`), valeurs relevées le
// 2026-10-23.
//
// Appel limité par le CORS de `landingLongForm` à www.elsee.care, elsee.care et
// elsee-v-0.webflow.io : ailleurs, le repli. Depuis webflow.io aussi, le document est créé en
// prod (comme les landings) ; sa `source` en webflow.io le distingue.

(function () {
  if (window.__elseeLongform) return;
  window.__elseeLongform = true;

  const URL_FORMULAIRE = 'https://europe-west1-appelsee-2k24.cloudfunctions.net/landingLongForm';
  const URL_REPLI = 'https://app.elsee.care/signup';
  const POLICE = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap';
  // Limite de `source` côté serveur (D83 § 2).
  const SOURCE_MAX = 512;
  const DELAI_REPLI = 8000;

  const TITRE_DEFAUT = 'Votre offre en 1 minute';
  const QUESTION = 'Combien de fois par an achetez-vous des compléments alimentaires ?';
  const AIDE = 'Vitamines, plantes, probiotiques, huiles essentielles, nutri-cosmétiques etc.';
  const LIBELLE_CTA = 'Simuler mes économies';
  const REPONSES = [
    ['Jamais', '0'],
    ['1 à 3 fois par an', '2'],
    ['3 à 5 fois par an', '4'],
    ['5 à 9 fois par an', '7'],
    ['Plus de 10x par an', '12'],
  ];
  const SUITE_DEPENSE = 'https://app.elsee.care/signup/montant_complements';
  const SUITE_JAMAIS = 'https://app.elsee.care/signup/sante_mentale_seances';
  // « Jamais » saute la question du montant, comme l'app (D53 § 3).
  const suite = (valeur) => (valeur === '0' ? SUITE_JAMAIS : SUITE_DEPENSE);

  // Le squelette de la page de l'app où entre la visiteuse, affiché par l'onglet pendant que
  // le serveur répond, au lieu d'une page blanche. Copie de SQUELETTE_SUITE_CARTE du Studio
  // (elle-même copie de `webapp`, `formesSquelette`) : [écart, hauteur, largeur, retrait, rayon].
  const SQUELETTES = {
    [SUITE_DEPENSE]: {
      ecart: [0, 24],
      blocs: [
        [0, 60, 60, 12, 30], [16, 19, 0.93, 12, 4], [5, 19, 0.7, 12, 4], [16, 14, 0.83, 12, 4],
        [36, 31, 89, 12, 4], [18, 14, 181, 12, 4], [33, 8, 1, 36, 4], [32, 17, 280, 12, 4],
        [50, 81, 1, 12, 24], [12, 48, 1, 12, 24],
      ],
    },
    [SUITE_JAMAIS]: {
      ecart: [24, 96],
      blocs: [
        [0, 60, 60, 12, 30], [16, 19, 0.93, 12, 4], [5, 19, 0.7, 12, 4], [16, 14, 0.83, 12, 4],
        [36, 60, 1, 12, 12], [12, 60, 1, 12, 12], [12, 60, 1, 12, 12], [12, 60, 1, 12, 12],
        [12, 60, 1, 12, 12], [12, 60, 1, 12, 12], [12, 48, 1, 12, 24],
      ],
    },
  };

  // Toutes les règles sous `.elsee-lf` : le CSS du site (label, h3, button de Webflow)
  // s'applique aussi au bloc, d'où les remises à zéro explicites.
  const STYLE = [
    '.elsee-lf{container-type:inline-size;width:100%;max-width:520px;margin:0 auto;font:400 14px/1.55 Montserrat,system-ui,sans-serif;color:#29413D;-webkit-font-smoothing:antialiased;text-align:left}',
    '.elsee-lf *,.elsee-lf *::before,.elsee-lf *::after{box-sizing:border-box}',
    '.elsee-lf-g{padding:5px;border-radius:28px;background:linear-gradient(170deg,#F6C9C3 0%,#EDD9B0 38%,#D5EBAD 72%,#C2DE93 100%);box-shadow:0 8px 24px rgba(41,65,61,.12),0 1px 2px rgba(41,65,61,.06)}',
    '.elsee-lf-in{background:#FFFFFF;border-radius:23px;padding:32px 22px 30px;text-align:center;display:flex;flex-direction:column;align-items:center}',
    '@container (min-width:480px){.elsee-lf-in{padding:44px 40px 40px}}',
    ".elsee-lf h3{margin:0;padding:0;color:#29413D;font:300 clamp(26px,6.8cqi,30px)/1.1 Recline,Georgia,'Times New Roman',serif;letter-spacing:-.01em;max-width:320px}",
    '.elsee-lf p{margin:0;padding:0}',
    '.elsee-lf .elsee-lf-t{font-size:13px;line-height:1.6;margin-top:10px;max-width:340px}',
    '.elsee-lf form{display:contents;margin:0}',
    '.elsee-lf .elsee-lf-q{font:600 12.5px/1.4 Montserrat,system-ui,sans-serif;margin:24px 0 12px;align-self:stretch;text-align:left}',
    '.elsee-lf .elsee-lf-h{font-size:11.5px;line-height:1.5;margin:-6px 0 14px;align-self:stretch;text-align:left}',
    '.elsee-lf fieldset{display:grid;grid-template-columns:1fr;gap:8px;align-self:stretch;border:0;padding:0;margin:0;min-width:0}',
    '@container (min-width:420px){.elsee-lf fieldset{grid-template-columns:1fr 1fr}}',
    '.elsee-lf label:last-child:nth-child(odd){grid-column:1 / -1}',
    '.elsee-lf label{display:flex;align-items:center;gap:10px;min-height:44px;margin:0;padding:0 14px;border-radius:999px;background:#F5F6F4;font:500 12.5px/1.25 Montserrat,system-ui,sans-serif;color:#29413D;cursor:pointer;text-align:left;border:1px solid transparent;transition:background .15s,border-color .15s}',
    '.elsee-lf input{appearance:none;-webkit-appearance:none;margin:0;width:16px;height:16px;border-radius:50%;border:1.5px solid rgba(41,65,61,.2);background:#FFFFFF;flex:none;display:grid;place-content:center}',
    '.elsee-lf input:checked{border-color:#29413D;background:#29413D}',
    '.elsee-lf input:checked::after{content:"";width:6px;height:6px;border-radius:50%;background:#D5EBAD}',
    '.elsee-lf input:focus-visible{outline:2px solid #29413D;outline-offset:2px}',
    '.elsee-lf label:has(input:checked){background:#F2F9E6;border-color:#C2DE93}',
    '.elsee-lf button{display:inline-flex;align-items:center;justify-content:center;height:48px;margin-top:26px;padding:0 24px;border:0;border-radius:999px;background:#29413D;color:#F6FAEF;font:600 14px/1 Montserrat,system-ui,sans-serif;white-space:nowrap;cursor:pointer;transition:background .15s}',
    '.elsee-lf button:hover{background:#1F312E}',
    '.elsee-lf button:disabled{opacity:.6;cursor:default}',
  ].join('');

  // L'URL de la page, sans fragment ; trop longue, sans ses paramètres (D83 § 2).
  function sourcePage() {
    const page = location.origin + location.pathname;
    const complete = page + location.search;
    return complete.length <= SOURCE_MAX ? complete : page.slice(0, SOURCE_MAX);
  }

  // Le document de l'onglet d'attente : copie de documentSquelette du Studio.
  function documentSquelette(forme) {
    const style = [
      'html,body{margin:0;background:#FFFFFF}',
      '.sq-blocs{animation:sq-pouls 1.6s ease-in-out infinite}',
      '@keyframes sq-pouls{0%,100%{opacity:1}50%{opacity:.5}}',
      '.sq-blocs i{display:block;background:rgba(41,65,61,.1);border-radius:4px}',
      '.sq-entete{display:flex;justify-content:space-between;align-items:center;width:min(500px,calc(100% - 24px));height:48px;margin:12px auto}',
      '.sq-corps{max-width:500px;margin:0 auto;padding-top:' + forme.ecart[0] + 'px}',
      '.sq-retour{width:48px;height:48px;border-radius:24px!important}',
      '@media (min-width:701px){.sq-corps{padding-top:' + forme.ecart[1] + 'px}}',
      '@media (min-width:767px){.sq-retour{width:88px}}',
      '@media (prefers-reduced-motion:reduce){.sq-blocs{animation:none}}',
    ].join('');
    const corps = forme.blocs
      .map(([haut, hauteur, largeur, retrait, rayon]) => {
        const fixe = largeur > 1;
        const marge = fixe ? 'auto' : retrait + 'px';
        const largeurCss = fixe ? largeur + 'px' : 'calc((100% - ' + 2 * retrait + 'px) * ' + largeur + ')';
        return '<i style="margin:' + haut + 'px ' + marge + ' 0;width:' + largeurCss + ';height:' + hauteur + 'px;border-radius:' + rayon + 'px"></i>';
      })
      .join('');
    return (
      '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">' +
      '<title>elsee</title><style>' + style + '</style></head><body><div class="sq-blocs">' +
      '<div class="sq-entete"><i style="width:92px;height:30px"></i><i style="width:141px;height:48px;border-radius:24px"></i></div>' +
      '<div class="sq-corps"><i class="sq-retour"></i>' + corps + '</div></div></body></html>'
    );
  }

  function element(balise, classe, texte) {
    const e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte) e.textContent = texte;
    return e;
  }

  // La carte, construite dans le bloc. Textes posés par textContent : un data-titre collé dans
  // Webflow ne devient jamais du HTML.
  function construire(bloc) {
    const formulaire = element('form');
    formulaire.action = URL_REPLI;
    formulaire.method = 'get';
    formulaire.target = '_blank';

    const utmSource = element('input');
    utmSource.type = 'hidden';
    utmSource.name = 'utmSource';
    utmSource.value = sourcePage();
    formulaire.appendChild(utmSource);

    formulaire.appendChild(element('p', 'elsee-lf-q', QUESTION));
    formulaire.appendChild(element('p', 'elsee-lf-h', AIDE));
    const choix = element('fieldset');
    const legende = element('legend', '', QUESTION);
    legende.hidden = true;
    choix.appendChild(legende);
    REPONSES.forEach(([libelle, valeur]) => {
      const label = element('label');
      const radio = element('input');
      radio.type = 'radio';
      radio.name = 'dietCompFrequence';
      radio.value = valeur;
      radio.required = true;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(libelle));
      choix.appendChild(label);
    });
    formulaire.appendChild(choix);
    const bouton = element('button', '', LIBELLE_CTA);
    bouton.type = 'submit';
    formulaire.appendChild(bouton);

    const interieur = element('div', 'elsee-lf-in');
    interieur.appendChild(element('h3', '', bloc.dataset.titre || TITRE_DEFAUT));
    if (bloc.dataset.texte) interieur.appendChild(element('p', 'elsee-lf-t', bloc.dataset.texte));
    interieur.appendChild(formulaire);
    const cadre = element('div', 'elsee-lf-g');
    cadre.appendChild(interieur);
    bloc.classList.add('elsee-lf');
    bloc.textContent = '';
    bloc.appendChild(cadre);

    formulaire.addEventListener('submit', (e) => envoyer(e, formulaire, bouton, utmSource.value));
  }

  // L'onglet s'ouvre au clic et reçoit l'adresse ensuite : ouvert après la réponse du
  // serveur, il serait pris pour une fenêtre surgissante et bloqué (D53 § 4).
  function envoyer(e, formulaire, bouton, source) {
    const coche = formulaire.querySelector('input[type=radio]:checked');
    if (!coche || !window.fetch || !window.URLSearchParams) return;
    e.preventDefault();
    if (bouton.disabled) return;
    bouton.disabled = true;

    const destination = suite(coche.value);
    const repli = URL_REPLI + '?' + new URLSearchParams(new FormData(formulaire)).toString();
    const onglet = window.open('', '_blank');
    if (onglet) {
      try {
        const d = onglet.document;
        d.open();
        d.write(documentSquelette(SQUELETTES[destination]));
        d.close();
        const blocs = d.querySelector('.sq-blocs');
        if (blocs) blocs.style.animationDelay = -(Date.now() % 1600) + 'ms';
      } catch (x) {}
    }
    let fait = false;
    function aller(adresse) {
      if (fait) return;
      fait = true;
      bouton.disabled = false;
      if (onglet) {
        onglet.opener = null;
        onglet.location.href = adresse;
      } else {
        window.location.assign(adresse);
      }
    }
    setTimeout(() => aller(repli), DELAI_REPLI);
    fetch(URL_FORMULAIRE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dietCompFrequence: coche.value, source: source }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (!d || typeof d.formId !== 'string') throw new Error('formId');
        aller(destination + '?formID=' + encodeURIComponent(d.formId));
      })
      .catch(() => aller(repli));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const blocs = document.querySelectorAll('[data-elsee-longform]');
    if (!blocs.length) return;
    const style = element('style', '', STYLE);
    document.head.appendChild(style);
    if (!document.querySelector('link[href*="family=Montserrat"]')) {
      const police = element('link');
      police.rel = 'stylesheet';
      police.href = POLICE;
      document.head.appendChild(police);
    }
    blocs.forEach(construire);
  });
})();
