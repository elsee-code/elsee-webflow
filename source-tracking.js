// source-tracking.js — provenance des visites, sur tout le site www.elsee.care
//
// Copie du code collé dans Webflow, relevée sur les pages en ligne le 2026-10-12, sans
// modification. Emplacement, d'après les pages servies : réglages du site, Custom code,
// pied de page, entre <script> et </script>.
//
// Écrit dans le localStorage du visiteur `first_source` (première page vue, une fois pour
// toutes), `session_source` (première page de la visite : nouveau jour, ou plus de 30 min
// sans passage) et `last_touch_url`, URL nettoyées des paramètres `url`, `email` et
// `wfsession`. Le formulaire principal (obtenir-mon-offre.js) les envoie à `leadWebflow`.

(function () {
  // 0) Nettoyage pour éviter les params internes type ?url=...
  function cleanUrl(u) {
    try {
      const url = new URL(u);
      ['url','email','wfsession'].forEach(p => url.searchParams.delete(p));
      const qs = url.searchParams.toString();
      return url.origin + url.pathname + (qs ? '?' + qs : '');
    } catch(e) { return u; }
  }

  try {
    const now = Date.now();
    const cleaned = cleanUrl(location.href);

    // 1) First touch — une fois pour toutes
    if (!localStorage.getItem('first_source')) {
      localStorage.setItem('first_source', cleaned);
      localStorage.setItem('first_touch_ts', String(now));
    }

    // 2) Détection "nouvelle visite"
    const LAST_TS_KEY = 'last_visit_ts';
    const SESSION_SRC_KEY = 'session_source';
    const INACTIVITY_MS = 30 * 60 * 1000; // 30 min par défaut

    const lastTs = parseInt(localStorage.getItem(LAST_TS_KEY) || '0', 10);
    const lastDate = lastTs ? new Date(lastTs) : null;
    const dayChanged = lastDate
      ? (new Date().toDateString() !== lastDate.toDateString())
      : true;
    const inactive = !lastTs || (now - lastTs) > INACTIVITY_MS;

    // Nouvelle visite si changement de jour OU inactivité prolongée
    if (dayChanged || inactive) {
      localStorage.setItem(SESSION_SRC_KEY, cleaned);
    }

    // Toujours mettre à jour le dernier passage
    localStorage.setItem('last_touch_url', cleaned);
    localStorage.setItem(LAST_TS_KEY, String(now));
  } catch(e) {
    // pas grave si storage bloqué
  }
})();
