// remboursement-complements-alimentaires.js — formulaire de la landing
// https://www.elsee.care/remboursement-complements-alimentaires
//
// Copie du code collé dans Webflow, relevée sur la page en ligne le 2026-10-12, sans
// modification. Emplacement, d'après la page servie : réglages de la page, Custom code,
// avant </body>, entre <script> et </script>.
//
// Formulaire #wf-form-Email-LP-Form, posté à la fonction `leadWebflow` d'elsee_functions_v2
// (celle de staging depuis *.webflow.io) avec `formName: 'lp-complements'`. Jumeau de
// offres-remboursement-elsee.js, qui n'en diffère que par `formName` et le paramètre
// `meta` de la redirection.

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('wf-form-Email-LP-Form');

  const otherCheckbox = document.getElementById('Autre');
  const otherInput = document.getElementById('other-response');
  const emailInput = document.getElementById('email');
    const LEAD_WEBHOOK_URL = window.location.hostname.endsWith('.webflow.io')
    ? 'https://europe-west1-appelsee-staging.cloudfunctions.net/leadWebflow'
    : 'https://europe-west1-appelsee-2k24.cloudfunctions.net/leadWebflow';
  const getSourceUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const sourceFromParam = params.get('url');
    if (sourceFromParam && sourceFromParam.trim() !== '') {
      return sourceFromParam;
    }
    return window.location.href;
  };

  if (otherInput) {
    otherInput.style.display = 'none';
  }

  if (otherCheckbox && otherInput) {
    otherCheckbox.addEventListener('change', function () {
      if (this.checked) {
        otherInput.style.display = 'block';
      } else {
        otherInput.style.display = 'none';
        otherInput.value = '';
      }
    });
  }

  const checkboxNodes = form.querySelectorAll(
    '.checkbox-answer-wrapper input[type="checkbox"]'
  );

  // Highlight
  checkboxNodes.forEach((cb) => {
    cb.addEventListener('change', () => {
      const cell = cb.closest('.checkbox-lp-cell');
      if (!cell) return;
      if (cb.checked) {
        cell.classList.add('lp-selected');
      } else {
        cell.classList.remove('lp-selected');
      }
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email) {
      alert('Merci d’indiquer votre adresse mail.');
      return;
    }

    const selectedLabels = [];
    checkboxNodes.forEach(function (cb) {
      if (!cb.checked) return;
      if (cb.id === 'Autre') {
        if (!otherInput) return;
        const otherVal = otherInput.value.trim();
        if (otherVal) {
          selectedLabels.push(otherVal);
        }
      } else {
        const label = cb.dataset.name || cb.name || cb.id;
        selectedLabels.push(label);
      }
    });

    const sourceUrl = getSourceUrl();
    const price = 19;

    const payload = {
      email: email,
      interests: selectedLabels.join(', '),
      source: sourceUrl,
      price: price,
      formName: 'lp-complements',
    };

    fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .catch(function (err) {
        console.error('Erreur lors de l’envoi à Make :', err);
      })
      .finally(function () {
        const redirectUrl =
          'https://app.elsee.care/signup' +
          '?email=' + encodeURIComponent(email) +
          '&source=' + encodeURIComponent(sourceUrl) +
          '&price=' + encodeURIComponent(price) +
          '&meta=offres-remboursement-elsee';
        window.location.href = redirectUrl;
      });
  });
});
