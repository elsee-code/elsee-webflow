// ============================================================================
// devenir-therapeute.js — formulaire « Rejoindre le réseau » de /devenir-therapeute-elsee
// ============================================================================
// Réglages de la page, Custom code, en-tête : collé en ligne par le kit de collage ({{inline:…}},
// le formulaire ne dépend pas de jsDelivr), comme les trois blocs qu'il réunit. Le CSS du menu
// reste dans l'en-tête (webflow/pages/devenir-therapeute-elsee/).
// Repris à l'identique :
//   1. adresse de la fonction `sendTherapistLeadToMake` d'elsee_functions_v2 : staging depuis
//      *.webflow.io, prod depuis www.elsee.care (window.THP_ENDPOINT) ;
//   2. menu des métiers avec recherche : la liste Webflow (collection Jobs) s'affiche tout de
//      suite, puis est remplacée par celle d'Odoo (GET sur la fonction) ; en prod, seulement si
//      elle n'est pas nettement plus courte (collection Firestore incomplète) ;
//   3. envoi : POST JSON sur la fonction, puis /label-therapeute, ou le bloc « non éligible »
//      quand la case « ma spécialité n'est pas dans la liste » est cochée. L'écouteur est en
//      capture sur document et arrête l'événement : le traitement de formulaire Webflow ne
//      part pas.

(function () {
  if (window.__elseeDevenirTherapeute) return;
  window.__elseeDevenirTherapeute = true;

  // 1. Adresse de la fonction : site de staging Webflow (*.webflow.io) → fonction de
  // staging (Odoo de test) ; www.elsee.care → fonction de prod.
  window.THP_ENDPOINT = location.hostname.endsWith(".webflow.io")
    ? "https://europe-west1-appelsee-staging.cloudfunctions.net/sendTherapistLeadToMake"
    : "https://europe-west1-appelsee-2k24.cloudfunctions.net/sendTherapistLeadToMake";

  // 2. Menu des métiers
  document.addEventListener("DOMContentLoaded", function () {
    const dropdown = document.querySelector(".cms-dropdown");
    const toggle = document.querySelector(".cms-dropdown__toggle");
    const panel = document.querySelector(".cms-dropdown__panel");
    const searchInput = document.querySelector(".cms-dropdown__search");
    const optionsWrapper = document.querySelector(".cms-dropdown__options");
    const cmsItems = [...document.querySelectorAll(".cms-option")];

    // Champ caché envoyé dans le form
    const hiddenInput = document.querySelector("#cmsSelectedName");

    if (!dropdown || !toggle || !panel || !searchInput || !optionsWrapper || !hiddenInput) {
      console.warn("Dropdown CMS : élément manquant");
      return;
    }

    // Id Odoo du métier choisi, envoyé avec son nom (selected_job_id)
    let hiddenId = document.querySelector("#cmsSelectedRef");
    if (!hiddenId) {
      hiddenId = document.createElement("input");
      hiddenId.type = "hidden";
      hiddenId.name = "selected_job_id";
      hiddenId.id = "cmsSelectedRef";
      hiddenInput.insertAdjacentElement("afterend", hiddenId);
    }

    // Liste affichée tout de suite : celle de Webflow (collection Jobs)
    let options = cmsItems.map(item => {
      const inner = item.querySelector("[data-value]") || item;

      return {
        label: inner.textContent.trim(),
        value: inner.dataset.value || inner.textContent.trim(),
        id: ""
      };
    });

    function renderOptions(filter = "") {
      optionsWrapper.innerHTML = "";

      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(filter.toLowerCase())
      );

      if (!filtered.length) {
        const emptyState = document.createElement("div");
        emptyState.textContent = "Aucun résultat";
        emptyState.className = "cms-dropdown__option cms-dropdown__option--empty";
        optionsWrapper.appendChild(emptyState);
        return;
      }

      filtered.forEach(option => {
        const optionEl = document.createElement("div");
        optionEl.className = "cms-dropdown__option";
        optionEl.textContent = option.label;

        optionEl.addEventListener("click", function () {
          toggle.querySelector("div").textContent = option.label;
          hiddenInput.value = option.value;
          hiddenId.value = option.id;

          panel.style.display = "none";
          searchInput.value = "";
          renderOptions();
        });

        optionsWrapper.appendChild(optionEl);
      });
    }

    toggle.addEventListener("click", function () {
      const isOpen = panel.style.display === "block";
      panel.style.display = isOpen ? "none" : "block";

      if (!isOpen) {
        searchInput.focus();
      }
    });

    searchInput.addEventListener("input", function (e) {
      renderOptions(e.target.value);
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".cms-dropdown")) {
        panel.style.display = "none";
      }
    });

    renderOptions();

    // Liste des métiers Odoo (Firestore `jobs`) : remplace celle de Webflow dès
    // qu'elle arrive. Si l'appel échoue, la liste Webflow reste. En prod, elle
    // reste aussi si la liste reçue est nettement plus courte (collection
    // incomplète) ; sur le site de staging, la liste Firestore s'affiche toujours,
    // même incomplète, pour tester le parcours de bout en bout.
    const isStagingSite = location.hostname.endsWith(".webflow.io");
    fetch(window.THP_ENDPOINT)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!data || !Array.isArray(data.jobs) || !data.jobs.length) return;
        if (!isStagingSite && data.jobs.length < options.length * 0.8) return;
        options = data.jobs.map(job => ({ label: job.name, value: job.name, id: String(job.id) }));
        renderOptions(searchInput.value);
      })
      .catch(() => {});
  });

  // 3. Envoi du formulaire
  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("#email-form form");
    if (!form) {
      console.warn("[ThpForm] Formulaire introuvable (#email-form form)");
      return;
    }

    const ENDPOINT = window.THP_ENDPOINT;
    const REDIRECT = "https://www.elsee.care/label-therapeute";

    const checkbox        = form.querySelector("#checkbox");
    const noRefBlock      = form.querySelector(".inputblock.noref");
    const noRefInput      = noRefBlock ? noRefBlock.querySelector("input") : null;
    const specialityBlock = form.querySelector(".speciality");
    const hiddenJob       = form.querySelector("#cmsSelectedName");
    const hiddenRef       = form.querySelector("#cmsSelectedRef");
    const search          = form.querySelector(".cms-dropdown__search");
    const submitBtn       = form.querySelector('input[type="submit"], button[type="submit"], .w-button');

    if (search) search.required = false;

    // Mémoire de la sélection (pour restaurer si on décoche)
    let stashedJob = "";
    let stashedRef = "";

    /* --- Loader bouton (spinner overlay) --- */
    const style = document.createElement("style");
    style.textContent =
      ".thp-btn-wrap{position:relative;display:inline-block}" +
      ".thp-spinner{position:absolute;top:50%;left:50%;width:18px;height:18px;" +
      "margin:-9px 0 0 -9px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;" +
      "border-radius:50%;animation:thp-spin .6s linear infinite;pointer-events:none;display:none}" +
      "@keyframes thp-spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);

    let spinner = null;
    if (submitBtn && submitBtn.parentNode) {
      const wrap = document.createElement("span");
      wrap.className = "thp-btn-wrap";
      submitBtn.parentNode.insertBefore(wrap, submitBtn);
      wrap.appendChild(submitBtn);
      spinner = document.createElement("span");
      spinner.className = "thp-spinner";
      wrap.appendChild(spinner);
    }

    function setLoading(on) {
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.style.cursor = on ? "not-allowed" : "";
      submitBtn.style.color = on ? "transparent" : "";
      if (spinner) spinner.style.display = on ? "block" : "none";
    }

    /* --- Champs conditionnels --- */
    function updateMode() {
      const checked = !!(checkbox && checkbox.checked);

      if (noRefBlock) noRefBlock.style.display = checked ? "block" : "none";
      if (noRefInput) {
        noRefInput.required = checked;
        if (!checked) noRefInput.value = "";
      }
      if (specialityBlock) specialityBlock.style.display = checked ? "none" : "";

      // Éligibilité basée sur la présence de selected_job
      if (hiddenJob) {
        if (checked) {
          // case cochée => non éligible => on ne transmet aucun métier
          stashedJob = hiddenJob.value;
          stashedRef = hiddenRef ? hiddenRef.value : "";
          hiddenJob.value = "";
          if (hiddenRef) hiddenRef.value = "";
        } else {
          // case décochée => on restaure la dernière sélection si elle existe
          if (stashedJob) hiddenJob.value = stashedJob;
          if (hiddenRef && stashedRef) hiddenRef.value = stashedRef;
        }
      }
    }
    if (checkbox) {
      checkbox.addEventListener("change", updateMode);
      updateMode();
    }

    /* --- Submit --- */
    function showNonEligible() {
      const root = document.querySelector(".jobvalidation");
      if (!root) return;
      const eligible    = root.querySelector(".validationmaincontainer");
      const nonEligible = root.querySelector(".validationmaincontainer_noneligible");
      if (eligible)    eligible.style.setProperty("display", "none", "important");
      if (nonEligible) nonEligible.style.setProperty("display", "flex", "important");
    }

    document.addEventListener("submit", function (e) {
      if (e.target !== form) return;
      e.preventDefault();
      e.stopImmediatePropagation();

      const checked = !!(checkbox && checkbox.checked);
      const custom  = noRefInput ? noRefInput.value.trim() : "";
      const job     = hiddenJob ? hiddenJob.value.trim() : "";

      if (checked && !custom) { alert("Veuillez préciser votre spécialité."); return; }
      if (!checked && !job)   { alert("Veuillez sélectionner votre métier."); return; }

      setLoading(true);

      const payload = Object.fromEntries(new FormData(form).entries());
      payload.checkbox     = checked;
      payload.submitted_at = new Date().toISOString();
      payload.page_url     = window.location.href;

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => console.error("[ThpForm] Erreur envoi :", err));

      if (checked) {
        showNonEligible();
      } else {
        window.location.href = REDIRECT;
      }
    }, true);
  });
})();
