// ============================================================================
// maps-autocomplete.js
// Champ « lieu » de l'annuaire : suggestions Google Places, puis filtre Algolia par
// window.applyGeoFilterFromMaps (algolia-search.js). Ville ou adresse : cercle de
// 20 km. Département, région ou pays : rectangle de la zone donné par Google.
//
// La bibliothèque Google reste chargée par sa propre balise dans Webflow, avec la clé :
// <script src="https://maps.googleapis.com/maps/api/js?key=…&libraries=places" async defer></script>
// ============================================================================

(function () {
  // Territoires français (métropole + DOM-TOM) servant à prioriser le tri
  const TERRITOIRES_FR = [
    "France", "Guadeloupe", "Martinique", "Guyane", "La Réunion",
    "Mayotte", "Saint-Pierre", "Saint-Barthélemy", "Saint-Martin",
    "Polynésie", "Nouvelle-Calédonie", "Wallis",
  ];

  // Types Google d'une zone filtrée par son rectangle plutôt que par un cercle
  const TYPES_ZONE = [
    "administrative_area_level_1", // région
    "administrative_area_level_2", // département
    "country",
  ];

  // Détecte si une prédiction concerne un territoire français
  const estFR = (p) =>
    TERRITOIRES_FR.some((t) => p.description.includes(t));

  // Rectangle Algolia [latNE, lngNE, latSO, lngSO] d'une zone, ou undefined
  function rectangleZone(place) {
    const viewport = place.geometry.viewport;
    if (!viewport || !place.types?.some((t) => TYPES_ZONE.includes(t))) return undefined;
    const ne = viewport.getNorthEast();
    const sw = viewport.getSouthWest();
    return [ne.lat(), ne.lng(), sw.lat(), sw.lng()].map((v) => +v.toFixed(4));
  }

  function start() {
    let service = null;
    let sessionToken = null;

    // Initialisation Google Places
    function initGoogle() {
      if (typeof google === "undefined" || !google.maps?.places) {
        setTimeout(initGoogle, 250);
        return;
      }
      service = new google.maps.places.AutocompleteService();
      sessionToken = new google.maps.places.AutocompleteSessionToken();
    }
    initGoogle();

    // Fonction générique pour brancher l'autocomplete sur un trio input / clear / dropdown
    function setupAutocomplete({ inputSelector, clearSelector, resultSelector }) {
      const input = document.querySelector(inputSelector);
      const clearBtn = document.querySelector(clearSelector);
      const resultBox = document.querySelector(resultSelector);

      if (!input || !clearBtn || !resultBox) {
        console.warn("❌ Autocomplete non initialisé pour", inputSelector, {
          input: !!input,
          clearBtn: !!clearBtn,
          resultBox: !!resultBox,
        });
        return;
      }

      let currentText = "";
      let typingTimer;

      // Ferme la liste et retire ses suggestions
      const viderListe = () => {
        resultBox.style.display = "none";
        resultBox.replaceChildren();
      };

      // Focus : la dropdown ne s'ouvre qu'avec des prédictions
      input.addEventListener("focus", () => {
        input.classList.add("is-focused");
      });

      // Blur → on laisse un petit délai pour permettre le clic sur un item
      input.addEventListener("blur", () => {
        setTimeout(() => {
          input.classList.remove("is-focused");
          resultBox.style.display = "none";
        }, 120);
      });

      // Saisie
      input.addEventListener("input", (e) => {
        currentText = e.target.value;
        clearBtn.style.display = currentText ? "block" : "none";

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          if (!service || currentText.length < 2) {
            viderListe();
            return;
          }

          service.getPlacePredictions(
            {
              input: currentText,
              types: ["geocode"],
              sessionToken,
            },
            (predictions, status) => {
              if (
                status !== google.maps.places.PlacesServiceStatus.OK ||
                !predictions?.length
              ) {
                viderListe();
                return;
              }

              // Re-tri côté client : on fait remonter les territoires français
              // en tête, tout en conservant l'ordre de pertinence de Google
              // à l'intérieur de chaque groupe (Array.sort est stable).
              const tries = [...predictions].sort((a, b) => {
                const fa = estFR(a) ? 0 : 1;
                const fb = estFR(b) ? 0 : 1;
                return fa - fb;
              });

              // Texte Google inséré en textContent, jamais en HTML
              resultBox.replaceChildren(
                ...tries.slice(0, 6).map((p) => {
                  const item = document.createElement("div");
                  item.className = "directory_search_result_text";
                  item.dataset.placeId = p.place_id;
                  item.textContent = p.description;
                  return item;
                })
              );

              resultBox.style.display = "flex";
            }
          );
        }, 200);
      });

      // Empêcher le blur immédiat au mousedown sur la liste
      resultBox.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      // Clic sur un résultat
      resultBox.addEventListener("click", (e) => {
        const item = e.target.closest(".directory_search_result_text");
        if (!item) return;

        const text = item.textContent.trim();
        const placeId = item.dataset.placeId;

        input.value = text;
        currentText = text;
        resultBox.style.display = "none";
        input.classList.add("is-selected");
        clearBtn.style.display = "block";

        console.log("✅ Adresse choisie :", text, placeId, "depuis", inputSelector);

        // Récupérer les coordonnées (et le rectangle d'une zone) et les envoyer à Algolia
        if (typeof google !== "undefined" && placeId) {
          const dummy = document.createElement("div");
          const placeService = new google.maps.places.PlacesService(dummy);
          placeService.getDetails(
            { placeId, fields: ["geometry", "types"] },
            (place, status) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                place?.geometry?.location &&
                typeof window.applyGeoFilterFromMaps === "function"
              ) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                window.applyGeoFilterFromMaps(lat, lng, text, rectangleZone(place));
              } else {
                console.warn("⚠️ Impossible de récupérer les coordonnées", status);
              }
            }
          );
        }
      });

      // Bouton clear (le filtre Algolia est retiré par algolia-search.js)
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        input.value = "";
        currentText = "";
        clearBtn.style.display = "none";
        input.focus();
        input.classList.remove("is-selected");
        viderListe();
      });

      // Clic global pour fermer la dropdown
      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !resultBox.contains(e.target)) {
          resultBox.style.display = "none";
          input.classList.remove("is-focused");
        }
      });

      console.log("✅ Autocomplete initialisé sur", inputSelector);
    }

    // --- Desktop ---
    setupAutocomplete({
      inputSelector: "#maps_input_desktop",
      clearSelector: ".directory_search_clear_desktop",
      resultSelector: "#maps_autocomplete",
    });

    // --- Mobile ---
    setupAutocomplete({
      inputSelector: "#maps_input_mobile",
      clearSelector: ".directory_search_clear_mobile",
      resultSelector: "#maps_autocomplete_mobile",
    });
  }

  // Chargé par <script src> : le DOM peut être déjà prêt (balise async ou en fin de page)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
