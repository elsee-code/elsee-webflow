// ============================================================================
// fiche-carte.js — carte Google Maps d'une fiche praticien ou d'une salle de sport
// ============================================================================
// Pages : modèles CMS praticiens (2 676) et salles de sport (1 195), bloc Embed « Localisation »
// (relevé du 2026-10-23). Le code était recopié dans chaque page avec l'adresse écrite en dur
// dans une chaîne JavaScript ; il est ici une seule fois, et l'adresse se lit dans la page.
//
// Embed attendu (webflow/embeds/fiche-carte-*.html) :
//   <div id="map" data-adresse="{{adresse}}, {{CP}},{{ville}}" data-lieu="{{lieu}}" …></div>
//   <script src="…/fiche-carte.js" integrity="…" crossorigin="anonymous" defer></script>
//   <script defer src="https://maps.googleapis.com/maps/api/js?key=…&callback=initMap&libraries=marker"></script>
// Les deux balises en `defer`, dans cet ordre : initMap doit exister quand l'API Google
// l'appelle. L'ancienne balise Google était `async defer` ; `async` l'emporte et pourrait
// appeler initMap avant ce fichier.
//
// L'adresse est lue dans l'attribut data-adresse de #map, sinon dans les constantes
// `adresseFallback` et `lieuRecherche` de l'ancien Embed, si elles y sont restées. L'attribut
// est plus sûr : une adresse du CMS qui contient un retour à la ligne cassait la chaîne
// JavaScript et la carte (2 fiches le 2026-10-23), et Webflow y écrivait les apostrophes en
// `&#39;`, envoyées telles quelles au géocodage. Les salles cherchent d'abord le lieu
// (data-lieu), puis l'adresse ; les praticiens, l'adresse seule.

(function () {
  if (window.__elseeFicheCarte) return;
  window.__elseeFicheCarte = true;

  var PIN_URL = "https://cdn.prod.website-files.com/64708634ac0bc7337aa7acd8/67cad0c8239295a942935ed6_mapPin.png";
  var MAP_ID = "33113a550c95d650";

  // Les anciennes constantes contiennent des entités HTML (`&#39;`) : on les décode comme le
  // ferait le navigateur dans un attribut. Un <textarea> détaché ne crée aucun élément et
  // n'exécute rien : son contenu n'est que du texte.
  function decodeEntities(s) {
    var t = document.createElement("textarea");
    t.innerHTML = s;
    return t.value;
  }

  function readAddresses(mapDiv) {
    var adresse = mapDiv.dataset.adresse;
    var lieu = mapDiv.dataset.lieu;
    if (adresse === undefined) {
      /* global adresseFallback, lieuRecherche */
      adresse = typeof adresseFallback !== "undefined" ? decodeEntities(String(adresseFallback)) : "";
      lieu = typeof lieuRecherche !== "undefined" ? decodeEntities(String(lieuRecherche)) : "";
    }
    return { adresse: (adresse || "").trim(), lieu: (lieu || "").trim() };
  }

  function afficherCarte(mapDiv, resultLocation) {
    var map = new google.maps.Map(mapDiv, {
      zoom: 15,
      center: resultLocation,
      mapId: MAP_ID,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: true,
      mapTypeControl: false,
      fullscreenControl: false,
      gestureHandling: "none",
    });

    map.setOptions({
      streetViewControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    });

    var pinIcon = document.createElement("img");
    pinIcon.src = PIN_URL;
    pinIcon.width = 48;
    pinIcon.height = 48;
    pinIcon.style.cursor = "pointer";

    var marker = new google.maps.marker.AdvancedMarkerElement({
      map: map,
      position: resultLocation,
      content: pinIcon,
    });

    var gmapsLink = "https://www.google.com/maps/dir/?api=1&destination=" +
      resultLocation.lat() + "," + resultLocation.lng() + "&travelmode=driving";

    var tooltip = document.createElement("div");
    tooltip.textContent = "Cliquer pour obtenir l'itinéraire";
    Object.assign(tooltip.style, {
      position: "absolute",
      background: "#fff",
      color: "#29413D",
      fontSize: "14px",
      fontFamily: "Montserrat, sans-serif",
      fontWeight: "300",
      padding: "24px",
      borderRadius: "24px",
      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
      whiteSpace: "nowrap",
      textAlign: "center",
      transition: "opacity 0.3s ease-in-out",
      opacity: "0",
      zIndex: "1000",
      pointerEvents: "none",
      display: "none",
    });
    mapDiv.appendChild(tooltip);

    function updateTooltipPosition() {
      var pinRect = pinIcon.getBoundingClientRect();
      var mapRect = mapDiv.getBoundingClientRect();
      var x = pinRect.left - mapRect.left + pinRect.width / 2;
      var y = pinRect.top - mapRect.top;
      tooltip.style.left = (x - tooltip.offsetWidth / 2) + "px";
      tooltip.style.top = (y - tooltip.offsetHeight - 10) + "px";
    }

    function updateIfVisible() {
      if (tooltip.style.display === "block") updateTooltipPosition();
    }

    marker.addEventListener("click", function () {
      window.open(gmapsLink, "_blank");
    });

    pinIcon.addEventListener("mouseenter", function () {
      tooltip.style.display = "block";
      setTimeout(function () {
        updateTooltipPosition();
        tooltip.style.opacity = "1";
      }, 10);
    });

    pinIcon.addEventListener("mouseleave", function () {
      tooltip.style.opacity = "0";
      setTimeout(function () {
        tooltip.style.display = "none";
      }, 300);
    });

    map.addListener("zoom_changed", updateIfVisible);
    map.addListener("dragend", updateIfVisible);
    window.addEventListener("resize", updateIfVisible);
  }

  // Appelée par l'API Google Maps (paramètre callback=initMap de sa balise).
  window.initMap = function () {
    var mapDiv = document.getElementById("map");
    if (!mapDiv) {
      console.error("[fiche-carte] le div #map est introuvable");
      return;
    }

    var a = readAddresses(mapDiv);
    var geocoder = new google.maps.Geocoder();

    function geocodeAdresse() {
      if (!a.adresse) {
        console.error("[fiche-carte] aucune adresse à géocoder");
        return;
      }
      geocoder.geocode({ address: a.adresse }, function (results, status) {
        if (status === "OK" && results[0]) {
          afficherCarte(mapDiv, results[0].geometry.location);
        } else {
          console.error("[fiche-carte] impossible de géocoder l'adresse :", status);
        }
      });
    }

    // Un lieu vide n'est pas envoyé : le géocodeur le refusait (INVALID_REQUEST) avant de
    // passer à l'adresse, une requête facturée pour rien sur chaque fiche de salle.
    if (!a.lieu) {
      geocodeAdresse();
      return;
    }
    geocoder.geocode({ address: a.lieu }, function (results, status) {
      if (status === "OK" && results[0]) {
        afficherCarte(mapDiv, results[0].geometry.location);
      } else {
        geocodeAdresse();
      }
    });
  };
})();
