// ============================================================================
// bienvenue.js — page /bienvenue-chez-elsee (après un paiement)
// ============================================================================
// Réglages de la page, Custom code, pied de page. Repris à l'identique : le lien #urlSubs pointe
// vers app.elsee.care/success avec l'identifiant Odoo reçu en paramètre (odooid).
// Les balises Meta et Shop My Influence de la page restent collées dans Webflow
// (webflow/pages/bienvenue-chez-elsee/) : ce sont des balises de fournisseurs.

(function () {
  if (window.__elseeBienvenue) return;
  window.__elseeBienvenue = true;

  // Lien vers la page de succès de l'app, si l'URL porte le paramètre odooid
  const odooId = new URLSearchParams(window.location.search).get('odooid');
  if (odooId) {
    const newUrl = `https://app.elsee.care/success?odooid=${odooId}`;
    document.getElementById('urlSubs').setAttribute('href', newUrl);
  }
})();
