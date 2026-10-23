// ============================================================================
// le-reseau-elsee.js — page /le-reseau-elsee (ancienne page « network elsee [LEGACY] »)
// ============================================================================
// Réglages de la page, Custom code, pied de page. Repris à l'identique : coupe à 100 caractères
// les titres de programme (.is-program-title-network).

(function () {
  if (window.__elseeLeReseau) return;
  window.__elseeLeReseau = true;

  // Titres coupés
  document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll(".is-program-title-network").forEach(function (element) {
          let text = element.textContent.trim();
          if (text.length > 100) {
              element.textContent = text.substring(0, 97) + "...";
          }
      });
  });
})();
