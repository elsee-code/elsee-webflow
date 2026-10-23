// ============================================================================
// modele-marque.js — modèle CMS « Marques » (/marques/*)
// ============================================================================
// 199 pages le 2026-10-23. Réglages du modèle, Custom code, pied de page.
// Masque .other_group_members quand la collection #products n'a aucun élément visible.
// Repris à l'identique du bloc collé, sans son console.log de débogage.

(function () {
  if (window.__elseeModeleMarque) return;
  window.__elseeModeleMarque = true;

  document.addEventListener("DOMContentLoaded", function () {
    var visibleItemsCount = document.querySelectorAll('#products .w-dyn-item:not([style*="display: none"])').length;
    var otherGroup = document.querySelector(".other_group_members");
    if (!otherGroup) return;
    otherGroup.style.display = visibleItemsCount === 0 ? "none" : "";
  });
})();
