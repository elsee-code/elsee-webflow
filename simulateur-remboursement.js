// ============================================================================
// simulateur-remboursement.js — « Demander un remboursement » des fiches partenaires
// ============================================================================
// Le bouton #refundOpenBtn ouvre une fenêtre qui calcule le remboursement d'une facture au
// taux et au plafond de la fiche, puis renvoie vers app.elsee.care/signin_freemium.
// Pages : modèles CMS praticiens, salles de sport, marques, programmes, groupes sport
// (4 367 pages le 2026-10-23), dans le bloc Embed « fake-funnel-code ». Le <style> qui masque
// #refundModal reste dans l'Embed, avant la balise, pour qu'elle ne s'affiche pas au
// chargement ; voir webflow/embeds/simulateur-remboursement.html.
//
// Lu sur le bouton : data-refund-rate (ex. 60), data-refund-cap (ex. 150, en euros) et
// data-refund-origin (source envoyée à l'app, « website » à défaut).
//
// Repris à l'identique du bloc collé, à une ligne près : il appelait `amountInput()` après
// l'ouverture (l'élément <input>, pas une fonction) et levait une TypeError à chaque clic.
// L'appel est retiré ; la fenêtre s'ouvrait déjà avant l'erreur, rien ne change pour l'usage.

(() => {
  if (window.__refundFeatureInit) return;
  window.__refundFeatureInit = true;

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("#refundOpenBtn");
    const modal = document.querySelector("#refundModal");
    const amountInput = document.querySelector("#invoiceAmount");
    const display = document.querySelector("#refundDisplay");
    const cancelBtn = document.querySelector("#cancelButton");
    const conditions = document.querySelector("#refund-conditions");
    const outputCTA = document.querySelector("#output-cta");

    // éléments indispensables pour le simulateur
    if (!btn || !modal || !amountInput || !display || !cancelBtn || !conditions) return;

    const formatEUR = (n) =>
      (isFinite(n) ? n : 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

    const openModal = () => modal.classList.add("is-open");
    const closeModal = () => modal.classList.remove("is-open");

    let rateRaw = 0; // ex: 60
    let rate = 0;    // ex: 0.6
    let cap = 0;     // ex: 150

    // on garde l'origine pour l'URL finale
    let refundOrigin = null;

    const setConditionsText = () => {
      conditions.innerHTML =
        `<span id="refund-rate-part">${rateRaw.toLocaleString("fr-FR")} %</span>` +
        ` remboursés dans la limite de ${cap.toLocaleString("fr-FR")}€ par facture`;

      const ratePart = conditions.querySelector("#refund-rate-part");
      if (ratePart) ratePart.style.display = "none";
    };

    const toggleRatePartVisibility = (show) => {
      const ratePart = conditions.querySelector("#refund-rate-part");
      if (!ratePart) return;
      ratePart.style.display = show ? "inline" : "none";
    };

    const resetState = () => {
      amountInput.value = "";
      display.textContent = rateRaw ? `${rateRaw.toLocaleString("fr-FR")} %` : "—";
      toggleRatePartVisibility(false);
    };

    // ouverture du simulateur
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      rateRaw = Number(btn.getAttribute("data-refund-rate")); // ex: 60
      cap = Number(btn.getAttribute("data-refund-cap"));      // ex: 150
      rate = rateRaw / 100;

      refundOrigin = btn.getAttribute("data-refund-origin") || null;

      setConditionsText();
      resetState();
      openModal();
    });

    // calcul live du remboursement
    amountInput.addEventListener("input", () => {
      const raw = amountInput.value.replace(",", ".");
      const amount = Number(raw);

      const hasValue = isFinite(amount) && amount > 0;
      toggleRatePartVisibility(hasValue);

      if (!hasValue) {
        display.textContent = `${rateRaw.toLocaleString("fr-FR")} %`;
        return;
      }

      const refund = Math.min(amount * rate, cap);
      display.textContent = formatEUR(refund);
    });

    // fermeture via bouton "annuler"
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
      resetState();
    });

    // fermeture via ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
        resetState();
      }
    });

    // clic sur le CTA final -> redirection freemium avec source
    if (outputCTA) {
      outputCTA.addEventListener("click", (e) => {
        e.preventDefault();

        // on prend en priorité l'origine déjà lue, sinon on relit l'attribut
        const originAttr = btn.getAttribute("data-refund-origin");
        const origin = refundOrigin || originAttr || "website";

        const url =
          `https://app.elsee.care/signin_freemium` +
          `?fromWebsite=true&source=${encodeURIComponent(origin)}-freemium-button`;

        window.location.href = url;
      });
    }
  });
})();