// ============================================================================
// defilement-logos.js — page /remboursement-complements-alimentaires
// ============================================================================
// Bloc Embed de la page, à côté du bandeau de logos. Repris à l'identique : duplique la liste
// CMS de .marquee-track pour que l'animation CSS (dans le même Embed) boucle sans trou.

(function () {
  if (window.__elseeDefilementLogos) return;
  window.__elseeDefilementLogos = true;

  // Liste dupliquée
  document.addEventListener('DOMContentLoaded', function () {
    const track = document.querySelector('.marquee-track');
    if (!track) return;
    const list = track.querySelector('.w-dyn-items');
    if (list) {
      track.appendChild(list.cloneNode(true));
    }
  });
})();
