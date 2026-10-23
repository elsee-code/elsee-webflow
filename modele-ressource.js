// ============================================================================
// modele-ressource.js — modèle CMS « Ressources » (/ressources/*)
// ============================================================================
// 7 pages le 2026-10-23. Réglages du modèle, Custom code, pied de page. Deux blocs collés là,
// repris à l'identique (sans le console.log de débogage du sommaire) :
//   1. sommaire des H2 de .ressourcetextblock dans #summary, défilement doux au clic ;
//   2. boutons .upbutton : retour en haut de page.
// Le CSS du sommaire reste dans l'en-tête du modèle (webflow/modeles/ressources/head.html).

(function () {
  if (window.__elseeModeleRessource) return;
  window.__elseeModeleRessource = true;

  // 1. Sommaire.
  document.addEventListener("DOMContentLoaded", function () {
    var summaryEl = document.querySelector("#summary");
    if (!summaryEl) return;

    var headers = document.querySelectorAll(".ressourcetextblock h2");
    if (headers.length === 0) return;

    var ul = document.createElement("ul");
    ul.classList.add("nobullet-list");

    headers.forEach(function (h2) {
      var text = (h2.textContent || "").trim();
      if (!text) return;

      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#";
      a.textContent = text;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        h2.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.appendChild(a);
      ul.appendChild(li);
    });

    summaryEl.replaceChildren(ul);
  });

  // 2. Retour en haut.
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".upbutton").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  });
})();
