// ============================================================================
// modele-programme.js — modèle CMS « Programs » (/programme/*)
// ============================================================================
// 173 pages le 2026-10-23. Réglages du modèle, Custom code, pied de page.
// Ajoute une virgule après chaque élément des listes [data-list="comma-separated"], sauf le
// dernier, et la remet à jour si la liste change. Repris à l'identique du bloc collé, sans ses
// cinq console.log de débogage (dont un par élément de liste).

(function () {
  if (window.__elseeModeleProgramme) return;
  window.__elseeModeleProgramme = true;

  document.addEventListener("DOMContentLoaded", function () {
    var SELECTOR = '[data-list="comma-separated"]';

    function addCommas() {
      document.querySelectorAll(SELECTOR).forEach(function (list) {
        // Les virgules posées au passage précédent sont retirées d'abord : pas de doublon.
        list.querySelectorAll(".comma").forEach(function (comma) { comma.remove(); });

        var items = list.children;
        for (var i = 0; i < items.length - 1; i++) {
          var comma = document.createElement("span");
          comma.textContent = ",";
          comma.className = "comma";
          items[i].appendChild(comma);
        }
      });
    }

    addCommas();

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") addCommas();
      });
    });
    document.querySelectorAll(SELECTOR).forEach(function (list) {
      observer.observe(list, { childList: true, subtree: true });
    });
  });
})();
