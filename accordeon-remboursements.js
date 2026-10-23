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

      // Par défaut, seul le premier item est ouvert (toggle en rotation)
      if (index === 0) {
        content.style.display = "block";
        toggle.classList.add("active");
      } else {
        content.style.display = "none";
      }

      header.addEventListener("click", () => {
        const isOpen = content.style.display === "block";
        content.style.display = isOpen ? "none" : "block";
        toggle.classList.toggle("active", !isOpen);
      });
    });
  });
})();
