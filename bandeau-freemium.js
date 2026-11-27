// ============================================================================
// bandeau-freemium.js — bandeau « 20 € offerts » et popin « Testez Elsee gratuitement »
// ============================================================================
// Réglages du site, Custom code, pied de page : toutes les pages (spec PRODUCT-1475, carte mère
// PRODUCT-1474). Sans effet sur une page sans le nouvel en-tête (bouton [data-mm-burger] du
// composant nav_megamenu_26), comme menu-principal.js, et sur les pages de tunnel
// (/obtenir-mon-offre, /carte-cadeau, /reset-password).
//
// 1. Bandeau. Injecté en tête de l'en-tête fixe (.navbarcontainer), au-dessus de la rangée du
//    haut (.topbar). Il se replie et revient avec elle : il recopie la classe is-hidden que
//    menu-principal.js pose sur .topbar au défilement. Masqué tant que le tiroir mobile est
//    ouvert. Une cale de sa hauteur, en tête de <body>, descend la page d'autant : l'en-tête
//    garde sa place au-dessus du contenu. C'est un vrai lien vers l'inscription freemium : un
//    clic du milieu, ou un script qui plante, mène quand même à l'app.
// 2. Popin. Un tap sur le bandeau l'ouvre ; l'encart rose du tiroir (« J'active mes 20 € »,
//    a.mm_encart) aussi, au lieu d'aller droit à l'app. Panneau par le bas sur mobile, fenêtre
//    centrée de 480 px dès 768 px. Se ferme par la croix, un tap sur le fond, Échap et le geste
//    retour ; le focus y entre à l'ouverture et revient d'où il venait ; la page ne défile plus.
//    Jamais d'ouverture sans tap.
// 3. Fiches partenaires (modèles CMS avec #refundOpenBtn) : le bandeau ouvre le simulateur
//    existant (simulateur-remboursement.js) au lieu de la popin.
// 4. Bannière cookies. Décision de l'humaine (2026-11-27) : si la visiteuse tape le bandeau avant
//    d'avoir fait son choix, la popin (ou le simulateur) s'ouvre juste après ce choix, jamais
//    par-dessus la bannière. Le choix se lit dans consentement.js (window.elseeConsentement,
//    événement elsee:consentement) ; ce script n'y touche pas.
// 5. Mesure. Événements PostHog freemium_bandeau_clic, freemium_popin_vue, freemium_popin_cta,
//    freemium_popin_fermee (propriété source), envoyés seulement si la mesure d'audience est
//    acceptée : PostHog compte les refus sans cookie (D92), ces événements-là ne partent pas.
//    posthog-site.js ne charge PostHog qu'en prod.
//
// D112 § 3 : 20 € fixes, aucun compte à rebours ni échéance. Le bandeau n'a pas de croix.

(function () {
  if (window.__elseeBandeauFreemium) return;
  window.__elseeBandeauFreemium = true;

  if (/^\/(obtenir-mon-offre|carte-cadeau|reset-password)(\/|$)/.test(location.pathname)) return;

  var APP = "https://app.elsee.care";
  var INSCRIPTION = APP + "/signin_freemium?fromWebsite=true&source=";
  var NBSP = " ";

  // --- Mesure ---------------------------------------------------------------
  function mesureAcceptee() {
    var c = window.elseeConsentement && window.elseeConsentement.choix();
    return !!(c && c.audience);
  }
  function mesurer(evenement, proprietes, avantDepart) {
    if (!window.posthog || typeof window.posthog.capture !== "function" || !mesureAcceptee()) return;
    // Avant un changement de page, sendBeacon : l'envoi survit au départ.
    window.posthog.capture(evenement, proprietes || {}, avantDepart ? { transport: "sendBeacon" } : undefined);
  }

  // --- Bannière cookies ------------------------------------------------------
  // Sans consentement.js (bloqué, ou pas chargé), rien n'attend.
  function choixAFaire() {
    return !!(window.elseeConsentement && !window.elseeConsentement.choix());
  }
  var enAttente = null; // action à jouer après le choix cookies (la dernière demandée)
  document.addEventListener("elsee:consentement", function () {
    var action = enAttente;
    enAttente = null;
    // Après la main : consentement.js donne le focus au cadenas juste après l'événement.
    if (action) setTimeout(action, 0);
  });
  function apresLeChoix(action) {
    if (choixAFaire()) enAttente = action;
    else action();
  }

  // --- Styles ---------------------------------------------------------------
  var CSS =
    ".ebf-bandeau{order:-1;display:flex;align-items:center;gap:10px;box-sizing:border-box;min-height:44px;" +
    "max-height:120px;padding:8px 12px 8px 16px;background:#EDD17A;color:#29413D;text-decoration:none;" +
    "font-family:Montserrat,sans-serif;font-size:13px;font-weight:600;line-height:1.35;overflow:hidden;" +
    "transition:max-height .3s,padding .3s,min-height .3s,opacity .2s,visibility 0s}" +
    ".ebf-bandeau:hover,.ebf-bandeau:focus{color:#29413D;text-decoration:none}" +
    ".ebf-bandeau:focus-visible{outline:2px solid #29413D;outline-offset:-4px}" +
    ".ebf-bandeau-texte{flex:1 1 auto;min-width:0}" +
    ".ebf-bandeau-lien{flex-shrink:0;display:inline-flex;align-items:center;gap:2px;font-weight:700;" +
    "text-decoration:underline;text-underline-offset:3px}" +
    ".ebf-bandeau.is-hidden{min-height:0;max-height:0;padding-top:0;padding-bottom:0;opacity:0;" +
    "visibility:hidden;pointer-events:none;transition:max-height .3s,padding .3s,min-height .3s,opacity .2s,visibility 0s .3s}" +
    ".navbarcontainer.is-open .ebf-bandeau{display:none}" +
    ".ebf-cale{display:block;flex-shrink:0}" +
    "@media (min-width:768px){.ebf-bandeau{justify-content:center;gap:16px;min-height:40px;padding:6px 24px;font-size:14px}" +
    ".ebf-bandeau-texte{flex:0 1 auto}}" +
    // Popin
    ".ebf-voile{position:fixed;inset:0;z-index:2147483002;background:rgba(20,32,30,.55);display:flex;" +
    "align-items:flex-end;justify-content:center;opacity:0;transition:opacity .25s}" +
    ".ebf-voile.is-open{opacity:1}" +
    ".ebf-popin{position:relative;box-sizing:border-box;width:100%;max-height:100%;overflow-y:auto;" +
    "overscroll-behavior:contain;background:#29413D;color:#F6FAEF;border-radius:24px 24px 0 0;" +
    "padding:8px 24px calc(24px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:18px;" +
    "box-shadow:0 24px 48px rgba(0,0,0,.25);font-family:Montserrat,sans-serif;text-align:left;" +
    "transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}" +
    ".ebf-voile.is-open .ebf-popin{transform:none}" +
    ".ebf-popin:focus{outline:none}" +
    ".ebf-poignee{align-self:center;width:40px;height:4px;margin-top:4px;border-radius:999px;background:rgba(246,250,239,.3)}" +
    ".ebf-tete{display:flex;align-items:center;justify-content:space-between;margin-top:-12px}" +
    ".ebf-fermer{width:44px;height:44px;margin-left:-12px;display:flex;align-items:center;justify-content:center;" +
    "border:0;border-radius:999px;background:transparent;padding:0;cursor:pointer;color:#F6FAEF}" +
    ".ebf-fermer:hover{background:rgba(246,250,239,.08)}" +
    ".ebf-connexion{min-height:44px;display:flex;align-items:center;font-size:13px;font-weight:500;color:#C4D0C6;" +
    "text-decoration:underline;text-underline-offset:3px}" +
    ".ebf-connexion:hover{color:#F6FAEF}" +
    ".ebf-titre{margin:0;text-align:center;font-family:Recline,Georgia,serif;font-weight:500;font-size:34px;" +
    "line-height:1.15;letter-spacing:-.015em;color:#F6FAEF}" +
    ".ebf-pastille{display:inline-block;padding:0 10px 2px;border-radius:12px;background:#D5EBAD;color:#29413D}" +
    ".ebf-etapes{list-style:none;margin:0;padding:0;position:relative;display:flex;flex-direction:column;gap:18px}" +
    ".ebf-etapes::before{content:'';position:absolute;left:17px;top:18px;bottom:18px;width:2px;background:rgba(213,235,173,.3)}" +
    ".ebf-etape{position:relative;display:flex;gap:14px;margin:0;padding:0}" +
    ".ebf-num{flex-shrink:0;width:36px;height:36px;border-radius:999px;background:#D5EBAD;color:#29413D;" +
    "display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}" +
    ".ebf-etape-texte{display:flex;flex-direction:column;gap:2px}" +
    ".ebf-etape-titre{font-size:16px;font-weight:600;line-height:1.4}" +
    ".ebf-etape-desc{font-size:13px;line-height:1.5;color:#C4D0C6}" +
    ".ebf-chiffre{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 16px;border-radius:24px;" +
    "background:#34504B;text-align:center}" +
    ".ebf-chiffre-sur{font-size:12px;font-weight:600;letter-spacing:.08em;color:#C4D0C6}" +
    ".ebf-chiffre-montant{font-family:Recline,Georgia,serif;font-weight:500;font-size:52px;line-height:1;" +
    "letter-spacing:-.02em;color:#D5EBAD}" +
    ".ebf-chiffre-sous{font-size:13px;line-height:1.5;color:#F6FAEF}" +
    ".ebf-actions{display:flex;flex-direction:column;gap:4px}" +
    ".ebf-cta{height:56px;border-radius:24px;background:#D5EBAD;color:#29413D;display:flex;align-items:center;" +
    "justify-content:center;font-size:16px;font-weight:600;text-decoration:none}" +
    ".ebf-cta:hover,.ebf-cta:focus{background:#E4F3C8;color:#29413D;text-decoration:none}" +
    ".ebf-tarifs{min-height:44px;display:flex;align-items:center;justify-content:center;font-size:14px;" +
    "font-weight:500;color:#F6FAEF;text-decoration:underline;text-underline-offset:3px}" +
    ".ebf-tarifs:hover{color:#D5EBAD}" +
    ".ebf-popin a:focus-visible,.ebf-popin button:focus-visible{outline:2px solid #D5EBAD;outline-offset:2px}" +
    ".ebf-mention{margin:0;text-align:center;font-size:12px;line-height:1.5;color:#C4D0C6}" +
    "@media (min-width:768px){.ebf-voile{align-items:center;padding:24px}" +
    ".ebf-popin{width:480px;border-radius:24px;padding:16px 32px 24px;gap:16px;transform:translateY(16px)}" +
    ".ebf-poignee{display:none}.ebf-tete{margin-top:0}.ebf-titre{font-size:36px}}" +
    "@media (prefers-reduced-motion:reduce){.ebf-bandeau,.ebf-bandeau.is-hidden,.ebf-voile,.ebf-popin{transition:none}}";

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  var CROIX =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var CHEVRON =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6"/></svg>';

  function initialiser() {
    var burger = document.querySelector("[data-mm-burger]");
    if (!burger) return;
    var entete = burger.closest("header") || document.querySelector(".navbarcontainer");
    if (!entete || entete.querySelector(".ebf-bandeau")) return;
    var rangeeHaut = entete.querySelector(".topbar");
    var simulateur = document.querySelector("#refundOpenBtn");

    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    // --- 1. Bandeau ----------------------------------------------------------
    var texte = simulateur
      ? "Testez gratuitement" + NBSP + ": 20" + NBSP + "€ de remboursements offerts"
      : "Testez Elsee gratuitement" + NBSP + ": 20" + NBSP + "€ de remboursements offerts";
    var bandeau = el(
      '<a class="ebf-bandeau" href="' + INSCRIPTION + 'bandeau-freemium-button">' +
        '<span class="ebf-bandeau-texte"></span>' +
        '<span class="ebf-bandeau-lien">' + (simulateur ? "Simuler" : "Je teste") + CHEVRON + "</span>" +
      "</a>"
    );
    bandeau.querySelector(".ebf-bandeau-texte").textContent = texte;
    if (!simulateur) bandeau.setAttribute("aria-haspopup", "dialog");
    entete.insertBefore(bandeau, entete.firstChild);

    // Cale : l'en-tête est fixe, la page descend de la hauteur du bandeau déplié.
    var cale = el('<div class="ebf-cale" aria-hidden="true"></div>');
    document.body.insertBefore(cale, document.body.firstChild);
    // Mesurée déplié et au repos seulement : une hauteur prise en pleine transition ferait
    // sauter la page (et menu-principal.js lirait ce saut comme un défilement).
    function caler() {
      if (bandeau.classList.contains("is-hidden") || entete.classList.contains("is-open")) return;
      cale.style.height = bandeau.offsetHeight + "px";
    }
    caler();
    var minuterie = null;
    window.addEventListener("resize", function () {
      clearTimeout(minuterie);
      minuterie = setTimeout(caler, 200);
    });
    bandeau.addEventListener("transitionend", function (e) {
      if (e.target === bandeau && e.propertyName === "max-height") caler();
    });

    // Repli avec la rangée du haut (classe posée par menu-principal.js).
    function suivreRangee() {
      var cache = !!(rangeeHaut && rangeeHaut.classList.contains("is-hidden"));
      bandeau.classList.toggle("is-hidden", cache);
      if (cache) bandeau.setAttribute("tabindex", "-1");
      else bandeau.removeAttribute("tabindex");
    }
    if (rangeeHaut) {
      new MutationObserver(suivreRangee).observe(rangeeHaut, { attributes: true, attributeFilter: ["class"] });
      suivreRangee();
    }

    bandeau.addEventListener("click", function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // nouvel onglet : le lien suffit
      e.preventDefault();
      var cible = simulateur ? "simulateur" : "popin";
      var attente = choixAFaire();
      // Avant le choix cookies, l'événement attend lui aussi : il part (ou non) selon ce choix.
      var action = function () {
        mesurer("freemium_bandeau_clic", { cible: cible, apres_choix_cookies: attente });
        if (simulateur) simulateur.click();
        else ouvrir("bandeau", bandeau);
      };
      apresLeChoix(action);
    });

    if (simulateur) return; // la popin n'a pas d'usage sur une fiche partenaire

    // --- 2. Encart rose du tiroir --------------------------------------------
    // Écouté sur document : menu-principal.js referme d'abord le tiroir (clic sur un lien de
    // l'en-tête), puis la popin s'ouvre et reprend le blocage du défilement.
    document.addEventListener("click", function (e) {
      var encart = e.target.closest && e.target.closest("a.mm_encart");
      if (!encart || !entete.contains(encart)) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      apresLeChoix(function () { ouvrir("menu-mobile", burger); });
    });

    // --- 3. Popin ------------------------------------------------------------
    var tarifs = (entete.querySelector("a.navbarofferbutton") || {}).href || "/obtenir-mon-offre";
    var voile = null;
    var popin = null;
    var source = null;
    var retourFocus = null;
    var etatHistorique = false;

    function construire() {
      voile = el(
        '<div class="ebf-voile">' +
          '<section class="ebf-popin" role="dialog" aria-modal="true" aria-labelledby="ebf-titre" tabindex="-1">' +
            '<span class="ebf-poignee" aria-hidden="true"></span>' +
            '<div class="ebf-tete">' +
              '<button type="button" class="ebf-fermer" aria-label="Fermer" data-ebf="fermer">' + CROIX + "</button>" +
              '<a class="ebf-connexion" href="' + APP + '/login" data-ebf="connexion">Me connecter</a>' +
            "</div>" +
            '<h2 class="ebf-titre" id="ebf-titre">Testez Elsee <span class="ebf-pastille">gratuitement</span></h2>' +
            '<ol class="ebf-etapes">' +
              etape(1, "Créez votre compte gratuit", "Pas d’abonnement, pas de paiement.") +
              etape(2, "Consultez un partenaire du réseau", "Ostéo, naturo, yoga, compléments" + NBSP + ": trouvez-le dans l’annuaire.") +
              etape(3, "Envoyez vos factures", "Vos 20" + NBSP + "€ s’utilisent sur une ou plusieurs factures, remboursement en 48h.") +
            "</ol>" +
            '<div class="ebf-chiffre">' +
              '<span class="ebf-chiffre-sur">OFFERTS</span>' +
              '<span class="ebf-chiffre-montant">20' + NBSP + "€</span>" +
              '<span class="ebf-chiffre-sous">de remboursements, sans abonnement</span>' +
            "</div>" +
            '<div class="ebf-actions">' +
              '<a class="ebf-cta" href="#" data-ebf="je-teste">Je teste gratuitement</a>' +
              '<a class="ebf-tarifs" href="/obtenir-mon-offre" data-ebf="tarifs">Voir les tarifs</a>' +
            "</div>" +
            '<p class="ebf-mention">Remboursement valable sur une facture réalisée auprès d’un partenaire du réseau Elsee.</p>' +
          "</section>" +
        "</div>"
      );
      popin = voile.querySelector(".ebf-popin");
      // Même cible que « Voir les tarifs » de l'en-tête, posée par attribut (jamais dans le HTML).
      voile.querySelector('[data-ebf="tarifs"]').setAttribute("href", tarifs);

      voile.addEventListener("click", function (e) {
        if (e.target === voile) return fermer("fond");
        var action = e.target.closest("[data-ebf]");
        if (!action) return;
        var nom = action.getAttribute("data-ebf");
        if (nom === "fermer") return fermer("croix");
        // Liens : la navigation suit son cours, l'événement part en sendBeacon.
        mesurer("freemium_popin_cta", { source: source, cta: nom }, true);
      });
      voile.addEventListener("keydown", pieger);
    }

    function etape(n, titre, desc) {
      return (
        '<li class="ebf-etape"><span class="ebf-num" aria-hidden="true">' + n + "</span>" +
        '<span class="ebf-etape-texte"><span class="ebf-etape-titre">' + titre + "</span>" +
        '<span class="ebf-etape-desc">' + desc + "</span></span></li>"
      );
    }

    // Tab et Maj+Tab restent dans la popin.
    function pieger(e) {
      if (e.key !== "Tab") return;
      var focusables = popin.querySelectorAll("a[href], button");
      var premier = focusables[0];
      var dernier = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === premier || document.activeElement === popin)) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    }

    function surEchap(e) {
      if (e.key === "Escape" && voile && voile.isConnected) fermer("echap");
    }

    function surRetour() {
      if (!voile || !voile.isConnected) return;
      etatHistorique = false; // l'entrée vient d'être quittée par le navigateur
      fermer("retour");
    }

    function ouvrir(depuis, origine) {
      if (voile && voile.isConnected) return;
      if (!voile) construire();
      source = depuis;
      retourFocus = origine || document.activeElement;
      voile.querySelector('[data-ebf="je-teste"]').href = INSCRIPTION + depuis + "-freemium-button";
      document.body.appendChild(voile);
      document.documentElement.style.overflow = "hidden";
      // Le geste retour ferme la popin : une entrée d'historique, à la même adresse.
      try {
        history.pushState({ elseeFreemium: true }, "");
        etatHistorique = true;
      } catch (err) {
        etatHistorique = false;
      }
      window.addEventListener("popstate", surRetour);
      document.addEventListener("keydown", surEchap);
      void voile.offsetWidth; // départ de la transition
      voile.classList.add("is-open");
      popin.focus({ preventScroll: true });
      mesurer("freemium_popin_vue", { source: depuis });
    }

    function fermer(moyen) {
      if (!voile || !voile.isConnected) return;
      window.removeEventListener("popstate", surRetour);
      document.removeEventListener("keydown", surEchap);
      voile.classList.remove("is-open");
      voile.remove();
      document.documentElement.style.overflow = "";
      if (etatHistorique) {
        etatHistorique = false;
        if (history.state && history.state.elseeFreemium) history.back();
      }
      mesurer("freemium_popin_fermee", { source: source, moyen: moyen });
      var cible = retourFocus;
      // Ouverte depuis le tiroir, refermé entre-temps : le focus revient au burger.
      if (cible && document.contains(cible) && cible.offsetParent !== null) cible.focus({ preventScroll: true });
      else burger.focus({ preventScroll: true });
    }

    // Pour la recette et le débogage dans la console.
    window.elseeBandeauFreemium = { ouvrir: function () { ouvrir("console", null); }, fermer: function () { fermer("console"); } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiser);
  else initialiser();
})();
