// ============================================================================
// accueil.js — page d'accueil (/)
// ============================================================================
// Réglages de la page, Custom code, pied de page. Deux blocs collés là, repris à l'identique :
//   1. bouton #request-access-button : ouvre /obtenir-mon-offre dans un nouvel onglet, avec la
//      page d'origine (url) et l'e-mail saisi dans le formulaire de la page (email), s'il y en a ;
//   2. compte à rebours .home_timer_* vers le 25/11/2025 à 12 h (heure de Paris). La date est
//      passée : il affiche 00 partout et ajoute .countdown-finished au bloc. Il reste tant que le
//      bloc est sur la page, pour qu'elle s'affiche comme aujourd'hui.
// La vidéo flottante est dans video-presentation.js, les « Nouveaux partenaires » dans
// new-members.js.

(function () {
  if (window.__elseeAccueil) return;
  window.__elseeAccueil = true;

  // 1. Bouton « request access »
  document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("request-access-button");
    const form = document.querySelector('form#wf-form-email-form');
    const emailInput = form ? form.querySelector('input[name="email-4"]') : null;
    const currentUrl = encodeURIComponent(window.location.href);
    const targetBase = "/obtenir-mon-offre";

    button?.addEventListener("click", function (e) {
      e.preventDefault();
      let finalUrl = `${targetBase}?url=${currentUrl}`;
      if (emailInput && emailInput.value.trim()) {
        finalUrl += `&email=${encodeURIComponent(emailInput.value.trim())}`;
      }
      window.open(finalUrl, "_blank");
    });
  });

  // 2. Compte à rebours
  document.addEventListener('DOMContentLoaded', function () {
    // Date cible : 24/11/2025 12:00, heure de France (CET, UTC+1 en novembre)
    const targetDate = new Date('2025-11-25T12:00:00+01:00');

    if (isNaN(targetDate.getTime())) {
      console.error('Date cible invalide');
      return;
    }

    const daysEl     = document.querySelector('.home_timer_number.days');
    const hoursEl    = document.querySelector('.home_timer_number.hours');
    const minutesEl  = document.querySelector('.home_timer_number.minutes');
    const secondesEl = document.querySelector('.home_timer_number.secondes');

    if (!daysEl || !hoursEl || !minutesEl || !secondesEl) {
      console.error('Un ou plusieurs éléments du timer sont introuvables.');
      return;
    }

    function updateCountdown() {
      const now  = new Date().getTime();
      const diff = targetDate.getTime() - now;

      if (diff <= 0) {
        daysEl.textContent     = '00';
        hoursEl.textContent    = '00';
        minutesEl.textContent  = '00';
        secondesEl.textContent = '00';
        document.querySelector('.home_timer_wrapper')?.classList.add('countdown-finished');
        clearInterval(timer);
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days  = Math.floor(totalSeconds / (60 * 60 * 24));
      const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
      const mins  = Math.floor((totalSeconds % (60 * 60)) / 60);
      const secs  = totalSeconds % 60;

      daysEl.textContent     = String(days).padStart(2, '0');
      hoursEl.textContent    = String(hours).padStart(2, '0');
      minutesEl.textContent  = String(mins).padStart(2, '0');
      secondesEl.textContent = String(secs).padStart(2, '0');
    }

    // Premier affichage immédiat
    updateCountdown();
    // Mise à jour toutes les secondes
    const timer = setInterval(updateCountdown, 1000);
  });
})();
