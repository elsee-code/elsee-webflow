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
// 2. Tiroir (≤ 991 px). Le burger pose is-open sur l'en-tête, .topbar, chaque .mm_dropdown et
//    les barres du burger. Ces styles sont des combos Webflow « is-open » réglés sur Tablet :
//    sur desktop, la classe ne change rien.
//
// Les combos is-open, is-scrolled et is-hidden n'ont aucun élément qui les porte dans le
// Designer : ils n'existent que pour ce script. Ne pas les supprimer avec « Clean up ».
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

  function initialiser() {
    const bouton = document.querySelector("[data-mm-burger]");
    if (!bouton) return;
    const entete = bouton.closest("header") || document.querySelector(".navbarcontainer");
    if (!entete) return;
    const rangeeHaut = entete.querySelector(".topbar");

    const ouvert = () => bouton.getAttribute("aria-expanded") === "true";

    // --- 1. Défilement -------------------------------------------------------
    let dernier = window.scrollY;
    let enAttente = false;

    function surDefilement() {
      enAttente = false;
      const y = Math.max(0, window.scrollY);
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
    function basculer(ouvrir) {
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
