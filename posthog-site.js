// ============================================================================
// posthog-site.js — mesure du site public par PostHog (dev_ops D91)
// ============================================================================
// Réglages du site, Custom code, en-tête : toutes les pages. Remplace Hotjar (balise GTM, retirée
// le jour de la mise en ligne).
//
// D91 : « Le site charge PostHog dans le projet de production de l'app, même clé publique, même
// api_host. Pas de second projet : c'est ce qui fait suivre la personne d'un domaine à l'autre. »
// posthog-js range l'identifiant du visiteur dans un cookie sur `.elsee.care` (réglages par défaut,
// ni `persistence` ni `cross_subdomain_cookie` ici, comme dans l'app) : app.elsee.care le relit, et
// l'`identify` de l'app rattache à la personne ce qu'elle a fait sur le site.
//
// D91 : « Le site n'appelle jamais `identify`. »
// D91 : « PostHog ne se charge qu'avec l'accord d'Enzuzo : seulement quand `analytics_storage` vaut
// `granted` dans le signal qu'Enzuzo pousse au `dataLayer`, celui que GTM lit déjà. » Enzuzo tient
// ce signal dans `window.enzuzoGtmConsentObj`, lu ici chaque seconde : un accord donné plus tard
// démarre PostHog sur la page ouverte, un retrait l'arrête.
// D91 : « Production seulement : PostHog ne se charge que sur `www.elsee.care` et `elsee.care`. »
// D91 : « Les enregistrements du site ne masquent pas les saisies, comme Hotjar aujourd'hui (choix
// de l'humain). Seuls les champs mot de passe restent masqués. »

(function () {
  if (window.__elseePosthog) return;
  window.__elseePosthog = true;

  if (!/^(www\.)?elsee\.care$/.test(location.hostname)) return;

  // Clé publique du projet de production : la même que webapp:web/index.html (loadPostHog).
  var KEY = "phc_l6wWd9DBtpBAMDViRD8trbHYuFbiYfSbfjZcRZyREiq";
  var HOST = "https://eu.posthog.com";
  var started = false;

  function consent() {
    var c = window.enzuzoGtmConsentObj;
    return c && c.analytics_storage;
  }

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

  function start() {
    started = true;
    stub().init(KEY, {
      api_host: HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      capture_exceptions: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: { password: true }
      },
      loaded: function (ph) {
        // Un refus passé, puis un accord : reprendre la mesure.
        if (ph.has_opted_out_capturing()) ph.opt_in_capturing();
      }
    });
  }

  // N'agit que quand le signal change : pas d'appel chaque seconde.
  var last;
  function check() {
    var state = consent();
    if (state === last) return;
    last = state;
    if (state === "granted") {
      if (!started) start();
      else window.posthog.opt_in_capturing();
    } else if (state === "denied" && started) {
      window.posthog.opt_out_capturing();
    }
  }

  check();
  setInterval(check, 1000);
})();
