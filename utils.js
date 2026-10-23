// ============================================================================
// utils.js — script global du site www.elsee.care
// ============================================================================
// Chargé sur toutes les pages : réglages du site Webflow, Custom code, pied de page, balise
// jsDelivr épinglée sur un commit, avec `integrity`, toujours en `defer` (les écouteurs
// DOMContentLoaded ci-dessous supposent qu'il s'exécute avant cet événement).
//
// Depuis le 2026-10-23, il porte aussi les blocs qui étaient collés à côté de lui dans le pied
// de page du site, repris à l'identique : boutons `.funnelentry`, provenance des visites
// (`first_source`, `session_source`, `last_touch_url`, lus par obtenir-mon-offre.js) et dates
// `.cms-date` en jj/mm/aaaa. Les balises des fournisseurs (GTM, Enzuzo, Claydar) restent collées
// dans Webflow : webflow/site/.

(function () {
  // Collée deux fois par erreur, la balise ne doit pas doubler les écouteurs : deux clics sur
  // un `.funnelentry` ouvriraient deux onglets.
  if (window.__elseeUtils) return;
  window.__elseeUtils = true;

  // 0. Provenance des visites — dès l'exécution, comme le bloc collé qu'elle remplace.
  // Écrit first_source (première page vue, une fois pour toutes), session_source (première page
  // de la visite : nouveau jour, ou plus de 30 min sans passage) et last_touch_url, URL
  // nettoyées des paramètres internes. obtenir-mon-offre.js les envoie à `leadWebflow`.
  const recordVisitSource = () => {
    const cleanUrl = (u) => {
      try {
        const url = new URL(u);
        ['url', 'email', 'wfsession'].forEach(p => url.searchParams.delete(p));
        const qs = url.searchParams.toString();
        return url.origin + url.pathname + (qs ? '?' + qs : '');
      } catch (e) { return u; }
    };

    try {
      const now = Date.now();
      const cleaned = cleanUrl(location.href);

      if (!localStorage.getItem('first_source')) {
        localStorage.setItem('first_source', cleaned);
        localStorage.setItem('first_touch_ts', String(now));
      }

      const INACTIVITY_MS = 30 * 60 * 1000;
      const lastTs = parseInt(localStorage.getItem('last_visit_ts') || '0', 10);
      const dayChanged = lastTs ? new Date().toDateString() !== new Date(lastTs).toDateString() : true;
      const inactive = !lastTs || (now - lastTs) > INACTIVITY_MS;
      if (dayChanged || inactive) {
        localStorage.setItem('session_source', cleaned);
      }

      localStorage.setItem('last_touch_url', cleaned);
      localStorage.setItem('last_visit_ts', String(now));
    } catch (e) {
      // stockage bloqué (navigation privée, cookies refusés) : la page fonctionne sans
    }
  };

  // 1. Affiche l’URL
  const showPageUrl = () => {
    const urlDisplay = document.querySelector('[fs-hacks-element="show-page-url"]');
    const urlInput = document.querySelector('[fs-hacks-element="page-url-input"]');
    if (urlDisplay && urlInput) {
      urlInput.value = location.href;
      urlDisplay.textContent = location.href;
    }
  };

  // 2. Localise les dates
  const localizeDates = () => {
    const data = {
      months: {
        en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        local: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
      },
      days: {
        en: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
        local: ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
      }
    };
    const shorten = str => str.slice(0, 3);
    const convertToLocal = (type, selector) => {
      const elements = document.querySelectorAll(selector);
      const ref = type === 'month' ? data.months : data.days;
      elements.forEach(el => {
        let text = el.textContent;
        ref.en.forEach((en, i) => {
          text = text.replace(new RegExp(en, 'g'), ref.local[i]);
          text = text.replace(new RegExp(shorten(en), 'g'), shorten(ref.local[i]));
        });
        el.textContent = text;
      });
    };
    // À activer si besoin
    // convertToLocal('month', '.classname');
  };

  // 3. Accordéon FAQ
  const setupFAQToggle = () => {
    document.querySelectorAll(".faq_accordion_item").forEach(item => {
      const header = item.querySelector(".faq_accordion_header");
      const content = item.querySelector(".faq_accordion_content");
      const toggle = item.querySelector(".faq_accordion_toggle");
      if (header && content && toggle) {
        content.style.display = "none";
        header.addEventListener("click", () => {
          const open = content.style.display === "block";
          content.style.display = open ? "none" : "block";
          toggle.classList.toggle("active", !open);
        });
      }
    });
  };

  // 4. Virgules CMS
  const addCommasToCMSLists = () => {
    document.querySelectorAll(".collection_list_with_separator").forEach(list => {
      const items = list.querySelectorAll(".w-dyn-item");
      items.forEach((item, i) => {
        const txt = item.querySelector(".main_text");
        if (txt && i < items.length - 1) {
          txt.textContent = txt.textContent.trim() + ", ";
        }
      });
    });
  };

  // 5. Boutons `.funnelentry` : ouvrent /obtenir-mon-offre dans un nouvel onglet, avec la page
  // d'origine en paramètre `url` (lue par le formulaire comme source du lead).
  const setupFunnelEntries = () => {
    const finalUrl = "/obtenir-mon-offre?url=" + encodeURIComponent(window.location.href);
    document.querySelectorAll(".funnelentry").forEach(button => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(finalUrl, "_blank");
      });
    });
  };

  // 6. Dates `.cms-date` en jj/mm/aaaa (heure locale du navigateur)
  const formatCmsDates = () => {
    document.querySelectorAll(".cms-date").forEach(el => {
      const parsedDate = new Date(el.textContent.trim());
      if (isNaN(parsedDate)) return;
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      el.textContent = `${day}/${month}/${parsedDate.getFullYear()}`;
    });
  };

  // === Initialisation ===
  recordVisitSource();

  document.addEventListener("DOMContentLoaded", function () {
    showPageUrl();
    localizeDates();
    setupFAQToggle();
    addCommasToCMSLists();
    setupFunnelEntries();
    formatCmsDates();
  });
})();
