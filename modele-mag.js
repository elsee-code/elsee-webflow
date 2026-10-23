// ============================================================================
// modele-mag.js — modèle CMS « Blog Posts » (/lemag/*)
// ============================================================================
// 112 articles le 2026-10-23. Réglages du modèle, Custom code, pied de page. Deux blocs collés
// là, repris à l'identique :
//   1. jours et mois de la date de l'article en français (.dayclass, .dateclass) ;
//   2. sommaire des H2 de #blogpostContent dans #summary, chaque lien visant une ancre placée
//      60 px au-dessus du titre (la barre de navigation fixe le masquerait).
// Le CSS du sommaire reste dans l'en-tête du modèle (webflow/modeles/lemag/head.html).

(function () {
  if (window.__elseeModeleMag) return;
  window.__elseeModeleMag = true;

  var DAYS = {
    Monday: "lundi", Tuesday: "mardi", Wednesday: "mercredi", Thursday: "jeudi",
    Friday: "vendredi", Saturday: "samedi", Sunday: "dimanche"
  };
  var MONTHS = {
    January: "janvier", February: "février", March: "mars", April: "avril",
    May: "mai", June: "juin", July: "juillet", August: "août",
    September: "septembre", October: "octobre", November: "novembre", December: "décembre"
  };

  // 1. Date de l'article en français.
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".dayclass").forEach(function (el) {
      var value = el.textContent.trim();
      if (DAYS[value]) el.textContent = DAYS[value];
    });
    document.querySelectorAll(".dateclass").forEach(function (el) {
      var value = el.textContent.trim();
      if (MONTHS[value]) el.textContent = MONTHS[value];
    });
  });

  // 2. Sommaire.
  document.addEventListener("DOMContentLoaded", function () {
    var contentDiv = document.getElementById("blogpostContent");
    var summaryDiv = document.getElementById("summary");
    if (!contentDiv || !summaryDiv) {
      console.warn("[mag] #blogpostContent ou #summary introuvable");
      return;
    }

    var headers = contentDiv.querySelectorAll("h2");
    if (headers.length === 0) return; // article sans intertitre : pas de sommaire

    var list = document.createElement("ul");
    list.classList.add("nobullet-list");

    headers.forEach(function (header, index) {
      if (!header.id) header.id = "header-" + index;

      var offsetDiv = document.createElement("div");
      offsetDiv.style.position = "relative";
      offsetDiv.style.top = "-60px";
      offsetDiv.style.height = "0";
      offsetDiv.id = "offset-" + header.id;
      header.parentNode.insertBefore(offsetDiv, header);

      var listItem = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#offset-" + header.id;
      link.textContent = header.textContent;
      listItem.appendChild(link);
      list.appendChild(listItem);
    });

    summaryDiv.appendChild(list);
  });
})();
