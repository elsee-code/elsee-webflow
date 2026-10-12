// obtenir-mon-offre.js — formulaires de la page https://www.elsee.care/obtenir-mon-offre
//
// Copie du code collé dans Webflow, relevée sur la page en ligne le 2026-10-12, sans
// modification. Emplacement, d'après la page servie : réglages de la page, Custom code,
// avant </body>, entre <script> et </script>. Le même bloc charge avant ce script
// intl-tel-input 17.0.12 (cdnjs : js/intlTelInput.min.js puis js/utils.min.js) et contient
// après lui le <style> d'obtenir-mon-offre.css ; la feuille css/intlTelInput.min.css est
// dans l'en-tête de la page.
//
// Deux formulaires, postés à la fonction `leadWebflow` d'elsee_functions_v2 (celle de
// staging depuis *.webflow.io) : `mainForm`, le formulaire principal (#prospectForm), et
// `quoteForm`, la demande de devis (#wf-form-quoteForm). `first_source` et
// `session_source` viennent de source-tracking.js.

document.addEventListener("DOMContentLoaded", function () {

  // Webhook des leads : fonction de staging sur le site test (*.webflow.io),
  // Make sur www.elsee.care tant que la fonction de prod n'est pas en ligne.
  const LEAD_WEBHOOK_URL = window.location.hostname.endsWith('.webflow.io')
    ? 'https://europe-west1-appelsee-staging.cloudfunctions.net/leadWebflow'
    : 'https://europe-west1-appelsee-2k24.cloudfunctions.net/leadWebflow';

  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const sourceUrl = params.get('url');
    const emailFromUrl = params.get('email');
    return {
      sourceUrl: (sourceUrl && sourceUrl.trim() !== '') ? sourceUrl : window.location.href,
      emailFromUrl: (emailFromUrl && emailFromUrl.trim() !== '') ? emailFromUrl : null
    };
  };

  const setupMultiStepForm = () => {
    const form = document.getElementById('prospectForm');
    if (!form) return;

    const formSlider = form.querySelector("#formSlider");
    if (!formSlider) return;

    const slides = Array.from(formSlider.querySelectorAll(".slide"));
    const nextButton = form.querySelector("#next");
    const previousButton = form.querySelector("#previous");

    const stepperDone = form.querySelector('#stepperDone');
    const stepperCursor = form.querySelector('#stepperCursor');
    const stepperLine = form.querySelector('#stepperLine');

    const stepperValues = { 0: 0, 1: 40, 2: 60, 3: 90 };
    let currentSlideIndex = 0;

    const phoneInput = form.querySelector("#phoneFunnelForm");
    const dialCodeInput = form.querySelector(".dialCode");
    const errorMsg = form.querySelector("#error-msg");

    if (phoneInput && window.intlTelInput) {
      window.iti = window.intlTelInput(phoneInput, {
        initialCountry: "fr",
        placeholderNumberType: 'FIXED_LINE',
        preferredCountries: ["fr", "ch", "be"]
      });

      const updateDialCode = () => {
        if (dialCodeInput) {
          dialCodeInput.value = "+" + window.iti.getSelectedCountryData().dialCode;
        }
      };

      const resetPhoneErrors = () => {
        phoneInput.classList.remove("error");
        if (errorMsg) {
          errorMsg.innerHTML = "";
          errorMsg.classList.add("hide");
        }
      };

      phoneInput.addEventListener('input', updateDialCode);
      phoneInput.addEventListener('countrychange', updateDialCode);

      phoneInput.addEventListener('blur', function () {
        resetPhoneErrors();
        if (phoneInput.value.trim() !== "" && !window.iti.isValidNumber()) {
          phoneInput.classList.add("error");
          if (errorMsg) {
            const errorCode = window.iti.getValidationError();
            const errorMap = ["Numéro invalide", "Code pays invalide", "Numéro trop court", "Numéro trop long", "Numéro invalide"];
            errorMsg.innerHTML = errorMap[errorCode] || "Numéro invalide";
            errorMsg.classList.remove("hide");
          }
        }
      });

      phoneInput.addEventListener('keyup', resetPhoneErrors);
      phoneInput.addEventListener('change', resetPhoneErrors);
    }

    const showSlide = (index) => {
      slides.forEach((slide, i) => {
        slide.classList.toggle("active", i === index);
      });

      if (previousButton) previousButton.style.display = index === 0 ? "none" : "flex";
      if (nextButton) nextButton.style.display = index === slides.length - 1 ? "none" : "flex";

      if (stepperDone) stepperDone.style.width = `${stepperValues[index] || 0}%`;
      if (stepperCursor) stepperCursor.style.left = `${stepperValues[index] || 0}%`;
      if (stepperLine) stepperLine.style.width = `${100 - (stepperValues[index] || 0)}%`;

      syncSelectedBudget();
    };

    const budgetRadios = form.querySelectorAll('input[name="annualBudget"]');
    const selectedBudgetInput = form.querySelector('#selectedBudget');
    const slide3 = form.querySelector('#slide-3');

    const hideRequiredMessageOnSlide3 = () => {
      if (!slide3) return;
      const msg = slide3.querySelector('.requiredmessage');
      if (msg) msg.style.display = 'none';
    };

    const syncSelectedBudget = () => {
      if (!selectedBudgetInput) return;
      const checked = form.querySelector('input[name="annualBudget"]:checked');
      selectedBudgetInput.value = checked ? checked.value : '';
      if (selectedBudgetInput.value.trim()) {
        selectedBudgetInput.classList.remove('is-false');
        hideRequiredMessageOnSlide3();
      }
    };

    budgetRadios.forEach(r => r.addEventListener('change', syncSelectedBudget));
    syncSelectedBudget();

    const validateCurrentSlide = () => {
      const currentSlide = slides[currentSlideIndex];
      const requiredFields = currentSlide.querySelectorAll("[required]");
      let isValid = true;

      requiredFields.forEach((field) => {
        if (!String(field.value || '').trim()) {
          field.classList.add("is-false");
          isValid = false;
        } else {
          field.classList.remove("is-false");
        }
      });

      if (currentSlide.id === 'slide-3' && selectedBudgetInput) {
        if (!selectedBudgetInput.value.trim()) {
          selectedBudgetInput.classList.add('is-false');
          isValid = false;
        } else {
          selectedBudgetInput.classList.remove('is-false');
        }
      }

      const requiredMessage = currentSlide.querySelector(".requiredmessage");
      if (requiredMessage) {
        requiredMessage.style.display = isValid ? "none" : "block";
      }

      return isValid;
    };

    if (nextButton) {
      nextButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (validateCurrentSlide()) {
          if (currentSlideIndex < slides.length - 1) {
            currentSlideIndex++;
            showSlide(currentSlideIndex);
          }
        }
      });
    }

    if (previousButton) {
      previousButton.addEventListener("click", function (e) {
        e.preventDefault();
        if (currentSlideIndex > 0) {
          currentSlideIndex--;
          showSlide(currentSlideIndex);
        }
      });
    }

    showSlide(currentSlideIndex);

    const { sourceUrl, emailFromUrl } = getUrlParams();
    if (emailFromUrl) {
      const emailInput = form.querySelector("#emailFunnelForm");
      if (emailInput) emailInput.value = emailFromUrl;
    }

    const priorityOrder = ['ME', 'FE', 'GP', 'TF', 'BE'];
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    const interestInput = form.querySelector('#interest');
    const personaInput = form.querySelector('#personaSelect');

    const updateCheckboxValues = () => {
      const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
      const labels = selectedCheckboxes
        .map(cb => cb.closest('label')?.querySelector('.checkboxlabel')?.textContent?.trim())
        .filter(Boolean);
      const names = selectedCheckboxes.map(cb => cb.getAttribute('name'));

      if (interestInput) {
        interestInput.value = labels.join(', ');
      }

      if (personaInput) {
        personaInput.value = '';
        for (let code of priorityOrder) {
          if (names.includes(code)) {
            personaInput.value = code;
            break;
          }
        }
      }
    };

    checkboxes.forEach(cb => cb.addEventListener('change', updateCheckboxValues));

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const rawPhone = phoneInput?.value.trim();
      const isPhoneFilled = !!rawPhone;

      if (isPhoneFilled && window.iti && !window.iti.isValidNumber()) {
        phoneInput.classList.add("error");
        if (errorMsg) {
          const errorCode = window.iti.getValidationError();
          const errorMap = ["Numéro invalide", "Code pays invalide", "Numéro trop court", "Numéro trop long", "Numéro invalide"];
          errorMsg.innerHTML = errorMap[errorCode] || "Numéro invalide";
          errorMsg.classList.remove("hide");
        }
        return;
      }

      const persona   = personaInput?.value;
      const budget    = form.querySelector('input[name="annualBudget"]:checked')?.value;
      const email     = form.querySelector('[name="email"]')?.value.toLowerCase();
      const firstName = form.querySelector('[name="firstname"]')?.value;
      const lastName  = form.querySelector('[name="lastname"]')?.value;
      const interests = interestInput?.value;

      const dialCodeValue = dialCodeInput?.value.trim() || "";
      let phone = "";
      if (isPhoneFilled) {
        phone = rawPhone.startsWith('+') ? rawPhone : dialCodeValue + rawPhone.replace(/^0/, '');
      }

      const consentCheckbox = form.querySelector('#checkbox');
      const consent = consentCheckbox ? consentCheckbox.checked : false;

      if (persona && budget && email && firstName) {
        const redirect = `https://app.elsee.care/signup?persona=${persona}&price=${budget}` +
          `&email=${encodeURIComponent(email)}` +
          `&firstname=${encodeURIComponent(firstName)}` +
          `&lastname=${encodeURIComponent(lastName || '')}` +
          `&allPersona=${encodeURIComponent(interests || '')}` +
          `&source=miniform`;

        const makeDestination = `https://app.elsee.care/mon-offre?persona=${persona}&price=${budget}` +
          `&email=${encodeURIComponent(email)}` +
          `&firstname=${encodeURIComponent(firstName)}` +
          `&lastname=${encodeURIComponent(lastName || '')}` +
          `&allPersona=${encodeURIComponent(interests || '')}`;

        const firstSource   = localStorage.getItem('first_source') || "";
        const sessionSource = localStorage.getItem('session_source')
                            || localStorage.getItem('last_touch_url')
                            || window.location.href;

        Promise.all([
          fetch("https://api.ipify.org?format=json").then(res => res.json()),
        ])
        .then(([ipData]) => {
          const user_agent = navigator.userAgent;
          const ip = ipData.ip;

          fetch(LEAD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              persona,
              abonnement: budget,
              email,
              firstname: firstName,
              lastname: lastName,
              url: sourceUrl,
              first_source: firstSource,
              session_source: sessionSource,
              phone,
              interest: interests,
              destination: makeDestination,
              formName: "mainForm",
              ip,
              user_agent,
              consent
            })
          })
          .then(() => window.location.assign(redirect))
          .catch(() => window.location.assign(redirect));
        });
      }
    });
  };

  const setupQuoteFormWebhook = () => {
    const quoteForm = document.getElementById('wf-form-quoteForm');
    if (!quoteForm) return;

    quoteForm.addEventListener('submit', function () {
      const emailField = quoteForm.querySelector('[name="emailDevis"], #emailDevis');
      const emailDevis = emailField?.value?.trim() || '';

      fetch(LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formName: 'quoteForm',
          emailDevis: emailDevis
        })
      }).catch(() => {});
    });
  };

  setupMultiStepForm();
  setupQuoteFormWebhook();
});
