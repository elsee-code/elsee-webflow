// ============================================================================
// modele-salle-de-sport.js — modèle CMS « Salles de sports » (/salles-de-sport/*)
// ============================================================================
// 1 195 pages le 2026-10-23. Réglages du modèle, Custom code, pied de page. Quatre blocs
// collés là, repris ici dans l'ordre où ils agissaient :
//   1. masquer le bloc des spécialités quand il est vide (et le réévaluer s'il se remplit) ;
//   2. retirer le doublon « Trouver <groupe> <salle> » quand les deux noms sont égaux ;
//   3. à DOMContentLoaded, écrire les sports et spécialités du groupe ;
//   4. à DOMContentLoaded, masquer « autres membres du groupe » quand la liste est vide.
// La carte est dans fiche-carte.js, le simulateur dans simulateur-remboursement.js.

(function () {
  if (window.__elseeModeleSalle) return;
  window.__elseeModeleSalle = true;

  // 1. Bloc des spécialités masqué quand il est vide.
  (function () {
    var target = document.querySelector("#spe") || document.querySelector("#specialitiesContainer");
    if (!target) return;

    var hideParentIfEmpty = function () {
      var isEmpty = target.textContent.trim().length === 0;
      var parent = target.closest(".directory_informations_raw") || target.parentElement;
      if (parent) parent.style.display = isEmpty ? "none" : "";
    };

    hideParentIfEmpty();
    // Le bloc 3 le remplit à DOMContentLoaded : on réévalue à chaque changement.
    new MutationObserver(hideParentIfEmpty)
      .observe(target, { childList: true, subtree: true, characterData: true });
  })();

  // 2. Titre « Trouver <groupe> <salle> » : un seul nom quand les deux sont égaux
  // ([data-dedupe] porte le bloc, [data-g] le groupe, [data-n] la salle ;
  // data-dedupe="n" retire la salle, sinon le groupe).
  (function () {
    var norm = function (s) {
      return s.trim().toLowerCase().normalize("NFD")
        .replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
    };
    var run = function () {
      document.querySelectorAll("[data-dedupe]").forEach(function (scope) {
        var g = scope.querySelector("[data-g]");
        var n = scope.querySelector("[data-n]");
        if (!g || !n) return;
        if (norm(g.textContent) === norm(n.textContent)) {
          (scope.dataset.dedupe === "n" ? n : g).remove();
        }
      });
    };
    run();
    // Finsweet CMS Load, s'il charge des éléments plus tard.
    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push(["cmsload", function () { run(); }]);
  })();

  // 3. Sports et spécialités du groupe, lus dans les listes CMS cachées (#groupSport--slug,
  // deux exemplaires dans la page) et écrits « A, B, C ».
  document.addEventListener("DOMContentLoaded", function () {
    var groupId = document.getElementById("groupSportId");
    var targetGroupId = groupId && groupId.textContent.trim();
    if (!targetGroupId) {
      console.error("[salle-de-sport] identifiant du groupe sport introuvable (#groupSportId)");
      return;
    }

    function renderItems(itemClass, containerId) {
      var items = [];
      document.querySelectorAll("#groupSport--slug").forEach(function (list) {
        var groupDiv = list.querySelector("#" + CSS.escape(targetGroupId));
        if (!groupDiv) return;
        groupDiv.querySelectorAll(itemClass).forEach(function (el) {
          items.push(el.textContent.trim());
        });
      });

      var container = document.getElementById(containerId);
      if (!container) {
        console.error("[salle-de-sport] conteneur #" + containerId + " introuvable");
        return;
      }
      container.textContent = items.join(", ");
    }

    renderItems(".sport-item", "sportsContainer");
    renderItems(".speciality-item", "specialitiesContainer");
  });

  // 4. « Autres membres du groupe » masqué quand la liste CMS est vide (.w-dyn-empty affiché).
  document.addEventListener("DOMContentLoaded", function () {
    function toggleGroupMembers() {
      var dynEmpty = document.querySelector(".w-dyn-empty");
      var hide = !!(dynEmpty && getComputedStyle(dynEmpty).display === "block");
      document.querySelectorAll(".other_group_members").forEach(function (el) {
        var wanted = hide ? "none" : "";
        // N'écrire que si la valeur change : l'observateur ci-dessous suit aussi les attributs,
        // et une écriture inutile le relancerait.
        if (el.style.display !== wanted) el.style.display = wanted;
      });
    }

    toggleGroupMembers();
    new MutationObserver(toggleGroupMembers)
      .observe(document.body, { childList: true, subtree: true, attributes: true });
  });
})();
