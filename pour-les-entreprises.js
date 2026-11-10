// ============================================================================
// pour-les-entreprises.js — page /pour-les-entreprises
// ============================================================================
// Réglages de la page, Custom code, pied de page.
// Quand l'envoi du formulaire B2B (celui du bouton .b2bsubmit_button) réussit, l'URL reçoit
// ?form=submitted, sans rechargement, pour que la conversion se lise dans l'URL (GTM, PostHog).
// Les paramètres déjà présents (utm, etc.) sont gardés.
// Le formulaire est un formulaire Webflow natif : en cas de succès, Webflow affiche le bloc
// .w-form-done voisin du <form>. C'est cet affichage qu'on observe : un clic avec un champ
// invalide ou un envoi en erreur ne pose pas le paramètre.

(function () {
  if (window.__elseePourLesEntreprises) return;
  window.__elseePourLesEntreprises = true;

  const PARAMETRE = 'form';
  const VALEUR = 'submitted';

  function marquerUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PARAMETRE) === VALEUR) return;
    url.searchParams.set(PARAMETRE, VALEUR);
    window.history.replaceState(window.history.state, '', url.toString());
  }

  function demarrer() {
    const bouton = document.querySelector('.b2bsubmit_button');
    const bloc = bouton && bouton.closest('.w-form');
    const succes = bloc && bloc.querySelector('.w-form-done');
    if (!succes || !window.MutationObserver) return;

    const observateur = new MutationObserver(function () {
      if (window.getComputedStyle(succes).display === 'none') return;
      observateur.disconnect();
      marquerUrl();
    });
    observateur.observe(succes, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
