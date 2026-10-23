// ============================================================================
// accordeon-remboursements.js — page /avantages
// ============================================================================
// Réglages de la page, Custom code, pied de page. Repris à l'identique : accordéon des
// remboursements (.refund_accordion_item), premier élément ouvert. Son CSS reste dans l'en-tête
// de la page (webflow/pages/avantages/head.html).

(function () {
  if (window.__elseeAccordeonRemboursements) return;
  window.__elseeAccordeonRemboursements = true;

  // Accordéon
  document.addEventListener("DOMContentLoaded", function () {
      const accordionItems = document.querySelectorAll(".refund_accordion_item");

      accordionItems.forEach((item, index) => {
        const header = item.querySelector(".refund_accordion_header");
        const content = item.querySelector(".refund_accordion_content");
        const toggle = item.querySelector(".refund_accordion_toggle");

        // Par défaut, ouvrir uniquement le premier item
        if (index === 0) {
          content.style.display = "block"; // Ouvre le premier item
          toggle.classList.add("active"); // Active la rotation
        } else {
          content.style.display = "none"; // Ferme les autres items
        }

        // Ajouter le comportement au clic
        header.addEventListener("click", () => {
          const isOpen = content.style.display === "block";
          content.style.display = isOpen ? "none" : "block"; // Basculer ouverture/fermeture
          toggle.classList.toggle("active", !isOpen); // Basculer la rotation du toggle
        });
      });
    });
})();
