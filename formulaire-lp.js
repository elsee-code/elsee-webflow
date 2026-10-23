// ============================================================================
// formulaire-lp.js — formulaire e-mail des landings Webflow
// ============================================================================
// Pages : /offres-remboursement-elsee (data-form-name="lp") et
// /remboursement-complements-alimentaires (data-form-name="lp-complements",
// data-meta="offres-remboursement-elsee"), réglages de la page, Custom code, avant </body>.
//
// Formulaire #wf-form-Email-LP-Form : centres d'intérêt cochés (et « Autre » en texte libre),
// e-mail, posté à la fonction `leadWebflow` d'elsee_functions_v2 (celle de staging depuis
// *.webflow.io), puis redirection vers app.elsee.care/signup, que l'envoi réussisse ou non.
//
// Les deux pages avaient chacune leur copie, qui ne différaient que par `formName` et le
// paramètre `meta` de la redirection : ils passent sur la balise.
//   data-form-name  valeur `formName` envoyée à leadWebflow (obligatoire)
//   data-meta       paramètre `meta` ajouté à l'URL de redirection (facultatif)
// Le reste est repris à l'identique.

(function () {
  if (window.__elseeFormulaireLp) return;
  window.__elseeFormulaireLp = true;

  // Réglages lus sur la balise pendant son exécution (document.currentScript n'existe plus
  // dans les écouteurs).
  const config = (document.currentScript && document.currentScript.dataset) || {};
  const FORM_NAME = config.formName;
  const META = config.meta || '';

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('wf-form-Email-LP-Form');
  if (!form) return;
  if (!FORM_NAME) {
    console.error('[formulaire-lp] attribut data-form-name manquant sur la balise');
    return;
  }

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
      formName: FORM_NAME,
    };

    fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .catch(function (err) {
        console.error('[formulaire-lp] envoi à leadWebflow en échec :', err);
      })
      .finally(function () {
        const redirectUrl =
          'https://app.elsee.care/signup' +
          '?email=' + encodeURIComponent(email) +
          '&source=' + encodeURIComponent(sourceUrl) +
          '&price=' + encodeURIComponent(price) +
          (META ? '&meta=' + encodeURIComponent(META) : '');
        window.location.href = redirectUrl;
      });
  });
});
})();
