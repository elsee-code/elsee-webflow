(function () {
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

  // === Initialisation ===
  document.addEventListener("DOMContentLoaded", function () {
    showPageUrl();
    localizeDates();
    setupFAQToggle();
    addCommasToCMSLists();
  });
})();
