// ============================================================================
// menu-principal.js — le nouvel en-tête : défilement et tiroir mobile
// ============================================================================
// Réglages du site, Custom code, pied de page. Sans effet sur une page sans le bouton
// [data-mm-burger] (le burger du nouvel en-tête, classe mm_burger) : l'ancien en-tête n'est
// pas touché.
//
// 1. Défilement (toutes tailles). L'en-tête est fixe en haut de l'écran (navbarContainer).
//    Dès qu'on quitte le haut de la page, il prend la classe is-scrolled (fond vert foncé).
//    En descendant, la rangée du haut (.topbar) prend is-hidden et se replie ; en remontant,
//    elle revient, sur le fond vert. Retour en haut de page : en-tête transparent.
//    Si le fond sous l'en-tête est trop clair en haut de page, l'en-tête prend is-fond-clair
//    (même fond vert) dès le départ. Détection automatique sur les fonds de couleur unie et les
//    dégradés CSS (moyenne de leurs couleurs) ; pour
//    une photo ou une vidéo, poser data-entete="vert" (ou "transparent") sur la section dans
//    Webflow. Console : window.elseeFondClairSousEntete() donne le verdict de la page.
// 2. Tiroir (≤ 991 px). Le burger pose is-open sur l'en-tête, .topbar, chaque .mm_dropdown et
//    les barres du burger. Ces styles sont des combos Webflow « is-open » réglés sur Tablet :
//    sur desktop, la classe ne change rien.
//
// Les combos is-open, is-scrolled, is-fond-clair et is-hidden n'ont aucun élément qui les porte dans le
// Designer : ils n'existent que pour ce script. Ne pas les supprimer avec « Clean up ».
//
// Superposition : l'en-tête (z-index 2147483001 dans Webflow) passe devant la bannière cookies ;
// le chat Brevo est masqué tant que le tiroir est ouvert (classe elsee-menu-ouvert sur <html>).
//
// Accessibilité : aria-expanded et aria-label suivent l'état du tiroir ; Échap le ferme et
// rend le focus au bouton ; un clic sur un lien le ferme ; la page derrière ne défile plus
// pendant l'ouverture ; il se ferme seul si la fenêtre repasse en desktop.

(function () {
  if (window.__elseeMenuPrincipal) return;
  window.__elseeMenuPrincipal = true;

  const DESKTOP = "(min-width: 992px)";
  const HAUT_DE_PAGE = 8; // px : en dessous, l'en-tête reste transparent
  const SEUIL = 6; // px : un mouvement plus petit ne change rien (évite le clignotement)
  const SEUIL_CLAIR = 0.6; // luminance relative (0 noir, 1 blanc) au-dessus de laquelle un fond est clair

  // --- Fond sous l'en-tête --------------------------------------------------
  function luminance(couleur) {
    const m = /rgba?\(([^)]+)\)/.exec(couleur || "");
    if (!m) return null;
    const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (v.length > 3 && v[3] < 0.5) return null; // presque transparent : on regarde dessous
    const lin = function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(v[0]) + 0.7152 * lin(v[1]) + 0.0722 * lin(v[2]);
  }

  // Luminance moyenne des couleurs d'un dégradé CSS (linear-, radial-, conic-gradient), sans les
  // couleurs presque transparentes ; null s'il n'en reste aucune.
  function luminanceDegrade(image) {
    const couleurs = image.match(/rgba?\([^)]+\)/g) || [];
    const valeurs = couleurs.map(luminance).filter(function (l) { return l !== null; });
    if (!valeurs.length) return null;
    return valeurs.reduce(function (a, b) { return a + b; }, 0) / valeurs.length;
  }

  // Ce qu'il y a sous un point : "clair", "sombre", ou "inconnu" pour une photo ou une vidéo,
  // qu'on ne sait pas juger (l'en-tête reste alors transparent). Un dégradé CSS se juge par la
  // moyenne de ses couleurs couvrantes, y compris quand il teinte une photo (héros des pages
  // thématiques : « linear-gradient(…), url(…) ») ; une photo sans dégradé reste inconnue.
  function fondAuPoint(x, y, entete) {
    const pile = document.elementsFromPoint(x, y);
    for (let i = 0; i < pile.length; i++) {
      const el = pile[i];
      if (entete && entete.contains(el)) continue;
      if (/^(img|video|picture|canvas|iframe|svg)$/i.test(el.tagName)) return "inconnu";
      const style = getComputedStyle(el);
      const image = style.backgroundImage;
      if (image && image !== "none") {
        const ld = luminanceDegrade(image);
        if (ld !== null) return ld > SEUIL_CLAIR ? "clair" : "sombre";
        if (/url\(/i.test(image)) return "inconnu";
      }
      const l = luminance(style.backgroundColor);
      if (l !== null) return l > SEUIL_CLAIR ? "clair" : "sombre";
    }
    return "clair"; // rien de coloré dessous : le fond blanc du navigateur
  }

  // true si, en haut de page, le fond sous l'en-tête est trop clair pour un en-tête transparent.
  // Trois points sur la largeur, à mi-hauteur de l'en-tête ; clair s'il l'est à au moins deux.
  // Un attribut data-entete sur la section sous l'en-tête (ou un parent, jusqu'à <body>) décide
  // à la place : "vert" force le fond vert, "transparent" le refuse (photos, vidéos, erreurs).
  function fondClairSousEntete(entete) {
    const y = Math.max(1, Math.round((entete ? entete.getBoundingClientRect().height : 80) / 2));
    const xs = [0.15, 0.5, 0.85].map(function (f) { return Math.round(window.innerWidth * f); });
    for (let i = 0; i < xs.length; i++) {
      const dessous = document.elementsFromPoint(xs[i], y).filter(function (el) {
        return !(entete && entete.contains(el));
      })[0];
      const choix = dessous && dessous.closest("[data-entete]");
      if (choix) return choix.getAttribute("data-entete") === "vert";
    }
    return xs.filter(function (x) { return fondAuPoint(x, y, entete) === "clair"; }).length >= 2;
  }
  // Pour le relevé des pages et le débogage dans la console.
  window.elseeFondClairSousEntete = fondClairSousEntete;

  function initialiser() {
    const bouton = document.querySelector("[data-mm-burger]");
    if (!bouton) return;
    const entete = bouton.closest("header") || document.querySelector(".navbarcontainer");
    if (!entete) return;
    const rangeeHaut = entete.querySelector(".topbar");

    const ouvert = () => bouton.getAttribute("aria-expanded") === "true";

    // --- 0. Fond clair sous l'en-tête ----------------------------------------
    // Mesuré en haut de page seulement (plus bas, c'est le contenu qui passe dessous), puis
    // remesuré après le chargement complet et à chaque redimensionnement.
    let fondMesure = false;
    function mesurerFond() {
      fondMesure = true;
      entete.classList.toggle("is-fond-clair", fondClairSousEntete(entete));
    }
    function remesurerFond() {
      fondMesure = false;
      if (window.scrollY <= HAUT_DE_PAGE) mesurerFond();
    }
    window.addEventListener("load", remesurerFond);
    let minuterieTaille = null;
    window.addEventListener("resize", function () {
      clearTimeout(minuterieTaille);
      minuterieTaille = setTimeout(remesurerFond, 200);
    });

    // --- 1. Défilement -------------------------------------------------------
    let dernier = window.scrollY;
    let enAttente = false;

    function surDefilement() {
      enAttente = false;
      const y = Math.max(0, window.scrollY);
      if (y <= HAUT_DE_PAGE && !fondMesure) mesurerFond();
      entete.classList.toggle("is-scrolled", y > HAUT_DE_PAGE);
      if (ouvert() || !rangeeHaut) {
        dernier = y;
        return;
      }
      if (y <= rangeeHaut.offsetHeight || y < dernier - SEUIL) {
        rangeeHaut.classList.remove("is-hidden");
      } else if (y > dernier + SEUIL) {
        rangeeHaut.classList.add("is-hidden");
      }
      if (Math.abs(y - dernier) > SEUIL) dernier = y;
    }

    window.addEventListener("scroll", function () {
      if (enAttente) return;
      enAttente = true;
      window.requestAnimationFrame(surDefilement);
    }, { passive: true });
    surDefilement();

    // --- 2. Tiroir mobile ----------------------------------------------------
    // Le chat Brevo (#brevo-conversations, chargé hors de ce dépôt) a un z-index plus haut que
    // tout : on le masque tant que le tiroir est ouvert. La bannière cookies, elle, passe sous
    // l'en-tête par son z-index (réglé dans Webflow sur navbarContainer).
    const style = document.createElement("style");
    style.textContent = "html.elsee-menu-ouvert #brevo-conversations{display:none!important}";
    document.head.appendChild(style);

    function basculer(ouvrir) {
      document.documentElement.classList.toggle("elsee-menu-ouvert", ouvrir);
      const cibles = [entete].concat(
        Array.from(entete.querySelectorAll(".topbar, .mm_dropdown")),
        Array.from(bouton.querySelectorAll(".mm_burger_barre"))
      );
      cibles.forEach(function (el) { el.classList.toggle("is-open", ouvrir); });
      if (ouvrir && rangeeHaut) rangeeHaut.classList.remove("is-hidden");
      bouton.setAttribute("aria-expanded", String(ouvrir));
      bouton.setAttribute("aria-label", ouvrir ? "Fermer le menu" : "Ouvrir le menu");
      document.documentElement.style.overflow = ouvrir ? "hidden" : "";
    }

    bouton.addEventListener("click", function () { basculer(!ouvert()); });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !ouvert()) return;
      basculer(false);
      bouton.focus();
    });

    entete.addEventListener("click", function (e) {
      if (ouvert() && e.target.closest && e.target.closest("a[href]")) basculer(false);
    });

    const desktop = window.matchMedia(DESKTOP);
    const auPassageDesktop = function (e) { if (e.matches && ouvert()) basculer(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", auPassageDesktop);
    else desktop.addListener(auPassageDesktop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialiser);
  else initialiser();
})();
