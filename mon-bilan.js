// ============================================================================
// mon-bilan.js — page /mon-bilan-elsee
// ============================================================================
// Bloc Embed de la page, après l'<iframe id="bilan">. Repris à l'identique : charge dans l'iframe
// la fonction `bilanBienEtre` d'elsee_functions_v2 (prod), avec les paramètres de la page.

(function () {
  if (window.__elseeMonBilan) return;
  window.__elseeMonBilan = true;

  // Source de l'iframe
  document.getElementById('bilan').src =
    'https://europe-west1-appelsee-2k24.cloudfunctions.net/bilanBienEtre' + location.search;
})();
