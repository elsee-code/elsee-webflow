// ============================================================================
// posthog-site.js — mesure du site public par PostHog (dev_ops D91)
// ============================================================================
// Réglages du site, Custom code, en-tête : toutes les pages. Remplace Hotjar (balise GTM, retirée
// le jour de la mise en ligne). Pages vues, clics, cartes de chaleur, erreurs JavaScript, replays.
//
// D91 : « Le site charge PostHog dans le projet de production de l'app, même clé publique, même
// api_host. Pas de second projet : c'est ce qui fait suivre la personne d'un domaine à l'autre. »
// posthog-js range l'identifiant du visiteur dans un cookie sur `.elsee.care` (réglages par défaut,
// ni `persistence` ni `cross_subdomain_cookie` ici, comme dans l'app) : app.elsee.care le relit, et
// l'`identify` de l'app rattache à la personne ce qu'elle a fait sur le site.
//
// D91 : « Le site n'appelle jamais `identify`. »
// D92 (amende D91 point 3) : « PostHog démarre en `cookieless_mode: "on_reject"` dès le chargement
// de la page […] Accord à la mesure d'audience : mesure complète, cookie sur `.elsee.care`, même
// personne que dans l'app (D91). Refus : la visite est comptée sans cookie, sans enregistrement de
// session et sans lien avec l'app. » Sans choix, rien n'est stocké ni envoyé. Le choix vient de la
// bannière : consentement.js appelle opt_in_capturing ou opt_out_capturing.
// D91 : « Production seulement : PostHog ne se charge que sur `www.elsee.care` et `elsee.care`. »
// D91 : « Les enregistrements du site ne masquent pas les saisies, comme Hotjar aujourd'hui (choix
// de l'humain). Seuls les champs mot de passe restent masqués. »

(function () {
  if (window.__elseePosthog) return;
  window.__elseePosthog = true;

  if (!/^(www\.)?elsee\.care$/.test(location.hostname)) return;
  // D91 : « Jamais sur /reset-password » : son adresse porte le code de réinitialisation (oobCode),
  // qui suffit à changer le mot de passe tant qu'il n'a pas expiré. Ni sur une page ouverte depuis
  // elle : le code arriverait par le referrer, que posthog-js garde aussi dans son cookie
  // ($initial_referrer), relu et renvoyé par l'app.
  if (/^\/reset-password\/?$/.test(location.pathname)) return;
  if (document.referrer.indexOf("oobCode") !== -1) return;

  // Clé publique du projet de production : la même que webapp:web/index.html (loadPostHog).
  var KEY = "phc_l6wWd9DBtpBAMDViRD8trbHYuFbiYfSbfjZcRZyREiq";
  var HOST = "https://eu.posthog.com";

  // File d'attente de PostHog, d'après le snippet officiel : les appels faits avant le chargement
  // de array.js y sont empilés, puis rejoués.
  function stub() {
    var ph = (window.posthog = window.posthog || []);
    if (ph.__SV) return ph;
    ph._i = [];
    ph.init = function (key, config, name) {
      var target = ph;
      if (name !== undefined) target = ph[name] = [];
      else name = "posthog";
      "capture opt_in_capturing opt_out_capturing".split(" ")
        .forEach(function (method) {
          target[method] = function () {
            target.push([method].concat(Array.prototype.slice.call(arguments)));
          };
        });
      ph._i.push([key, config, name]);
    };
    ph.__SV = 1;
    var s = document.createElement("script");
    s.async = true;
    s.src = HOST + "/static/array.js";
    document.head.appendChild(s);
    return ph;
  }

  stub().init(KEY, {
    api_host: HOST,
    cookieless_mode: "on_reject",
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    capture_exceptions: true,
    enable_heatmaps: true,
    // Le projet enregistre le corps des requêtes dans les replays (réglage de l'app) : sur le
    // site, ce serait l'envoi des formulaires. D91 : « Le réseau et la console ne sont pas
    // enregistrés dans les replays. »
    capture_performance: false,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true }
    }
  });
})();
