// ============================================================================
// consentement.js — bannière de consentement du site (spec PRODUCT-1270, dev_ops D92)
// ============================================================================
// Réglages du site, Custom code, en-tête : toutes les pages, après la balise de posthog-site.js.
// Remplace Enzuzo. Bannière maison, sans dépendance : bannière en bas de page, modale « Gérer mes
// préférences », bouton cadenas pour y revenir, lien « Gérer mes cookies » du pied de page
// (tout lien vers #gerer-mes-cookies).
//
// D92 : « Quatre finalités : Strictement nécessaires (toujours actifs), Mesure d'audience,
// Personnalisation, Publicité et réseaux sociaux. Rien n'est coché par défaut ; sans choix, tout
// reste refusé. »
// D92 : « GTM ne se charge que si les trois finalités facultatives sont acceptées, tant que ses
// balises n'ont pas de condition de consentement par finalité. » Le Consent Mode suit quand même
// chaque finalité, pour le jour où elles en auront (GTM_PAR_FINALITE).
// D92 : « PostHog démarre en `cookieless_mode: "on_reject"` » (posthog-site.js) : l'accord à la
// mesure d'audience le passe en mesure complète, le refus le laisse compter la visite sans cookie.
// D92 : « Le choix est gardé six mois dans le cookie `elsee_consentement`, sur `.elsee.care`. »

(function () {
  if (window.__elseeConsentement) return;
  window.__elseeConsentement = true;

  var GTM_ID = "GTM-5CNWQFC7";
  // Passe à true quand chaque balise du conteneur porte sa condition de consentement : GTM se
  // charge alors pour toute personne qui accepte au moins une finalité.
  var GTM_PAR_FINALITE = false;
  var COOKIE = "elsee_consentement";
  var VERSION = 1;
  var DUREE_JOURS = 182;
  var ANCRE = "#gerer-mes-cookies";
  var FINALITES = ["audience", "personnalisation", "publicite"];

  var PROD = /(^|\.)elsee\.care$/.test(location.hostname);
  // D91, repris par la spec : aucun traceur sur /reset-password, quel que soit le choix, ni sur une
  // page ouverte depuis elle (le code de réinitialisation arriverait par le referrer).
  var SANS_TRACEUR =
    /^\/reset-password\/?$/.test(location.pathname) || document.referrer.indexOf("oobCode") !== -1;

  // ---- Consent Mode de Google : tout refusé tant qu'aucun choix n'est lu ----------------------
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted"
  });

  // ---- Le choix : cookie `v=1&d=<date>&audience=1&personnalisation=0&publicite=0` -------------
  function lireChoix() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
    if (!m) return null;
    var valeurs = {};
    decodeURIComponent(m[1]).split("&").forEach(function (paire) {
      var kv = paire.split("=");
      valeurs[kv[0]] = kv[1];
    });
    var date = new Date(valeurs.d);
    if (Number(valeurs.v) !== VERSION || isNaN(date)) return null;
    if (Date.now() - date.getTime() > DUREE_JOURS * 864e5) return null;
    var choix = {};
    FINALITES.forEach(function (f) {
      choix[f] = valeurs[f] === "1";
    });
    return choix;
  }

  function domaineCookie() {
    return PROD ? "; domain=.elsee.care" : "";
  }

  function ecrireChoix(choix) {
    var valeur = "v=" + VERSION + "&d=" + new Date().toISOString();
    FINALITES.forEach(function (f) {
      valeur += "&" + f + "=" + (choix[f] ? 1 : 0);
    });
    document.cookie =
      COOKIE + "=" + encodeURIComponent(valeur) + "; max-age=" + DUREE_JOURS * 86400 +
      "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "") + domaineCookie();
  }

  // Cookies posés par les traceurs de chaque finalité, effacés quand elle est retirée. Les balises
  // déjà chargées s'arrêtent au chargement de page suivant.
  var COOKIES_TRACEURS = {
    audience: [/^_ga/, /^ph_phc_/],
    personnalisation: [/^sib_cuid$/],
    publicite: [/^_gcl_/, /^_fbp$/, /^_ttp$/, /^_tt_enable_cookie$/, /^ttcsid/, /^smiclickId$/, /^t_gid$/]
  };

  function effacerCookies(finalite) {
    document.cookie.split("; ").forEach(function (c) {
      var nom = c.split("=")[0];
      var vise = COOKIES_TRACEURS[finalite].some(function (re) {
        return re.test(nom);
      });
      if (!vise) return;
      var expire = nom + "=; max-age=0; path=/";
      document.cookie = expire;
      document.cookie = expire + "; domain=" + location.hostname;
      document.cookie = expire + "; domain=.elsee.care";
    });
  }

  // ---- Ce que chaque finalité déclenche -----------------------------------------------------
  var dejaCharge = {};
  function charger(nom, fn) {
    if (dejaCharge[nom]) return;
    dejaCharge[nom] = true;
    fn();
  }

  function ajouterScript(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  // Pixels posés dans une page (confirmation de paiement, inscription) :
  // <script type="text/plain" data-elsee-consentement="pixels">, rejoués dans l'ordre du document.
  function rejouerPixels() {
    var blocs = document.querySelectorAll('script[type="text/plain"][data-elsee-consentement="pixels"]');
    Array.prototype.forEach.call(blocs, function (bloc) {
      var s = document.createElement("script");
      s.text = bloc.text;
      bloc.parentNode.insertBefore(s, bloc.nextSibling);
    });
  }

  function etat(oui) {
    return oui ? "granted" : "denied";
  }

  function appliquer(choix, avant) {
    gtag("consent", "update", {
      analytics_storage: etat(choix.audience),
      functionality_storage: etat(choix.personnalisation),
      personalization_storage: etat(choix.personnalisation),
      ad_storage: etat(choix.publicite),
      ad_user_data: etat(choix.publicite),
      ad_personalization: etat(choix.publicite)
    });
    window.dataLayer.push({
      event: "elsee_consentement",
      elsee_audience: choix.audience,
      elsee_personnalisation: choix.personnalisation,
      elsee_publicite: choix.publicite
    });

    if (avant) {
      FINALITES.forEach(function (f) {
        if (avant[f] && !choix[f]) effacerCookies(f);
      });
    }

    if (window.posthog) {
      if (choix.audience) window.posthog.opt_in_capturing();
      else window.posthog.opt_out_capturing();
    }

    if (SANS_TRACEUR) return;

    var gtm = GTM_PAR_FINALITE
      ? choix.audience || choix.personnalisation || choix.publicite
      : choix.audience && choix.personnalisation && choix.publicite;
    if (gtm) {
      charger("gtm", function () {
        window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
        ajouterScript("https://www.googletagmanager.com/gtm.js?id=" + GTM_ID);
      });
    }
    if (choix.publicite) {
      charger("claydar", function () {
        ajouterScript("https://static.claydar.com/init.v1.js?id=c99pK2ugyb");
      });
      charger("pixels", rejouerPixels);
    }
  }

  // ---- Interface ----------------------------------------------------------------------------
  var TEXTES = {
    audience: {
      titre: "Mesure d'audience",
      texte:
        "Nous aident à comprendre comment le site est utilisé (pages vues, parcours, clics) pour " +
        "l'améliorer. Si vous refusez, nous comptons seulement les visites, sans cookie et sans " +
        "enregistrer votre navigation."
    },
    personnalisation: {
      titre: "Personnalisation",
      texte:
        "Adaptent le site à vos préférences et affichent des services tiers, comme le chat et les " +
        "avis de nos membres."
    },
    publicite: {
      titre: "Publicité et réseaux sociaux",
      texte:
        "Mesurent l'efficacité de nos publicités et vous proposent des contenus adaptés sur " +
        "d'autres sites et sur les réseaux sociaux."
    }
  };

  var CADENAS =
    '<svg width="22" height="24" viewBox="0 0 28 31" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M5 9.09668C5 4.12612 9.02944 0.0966797 14 0.0966797C18.9706 0.0966797 23 4.12612 23 9.09668V10.8222C23.4239 10.9151 23.8308 11.0503 24.2239 11.2506C25.3529 11.8259 26.2708 12.7438 26.846 13.8727C27.217 14.6007 27.3648 15.3758 27.4337 16.2189C27.5 17.0307 27.5 18.0273 27.5 19.2347V21.4587C27.5 22.6661 27.5 23.6626 27.4337 24.4744C27.3648 25.3176 27.217 26.0926 26.846 26.8206C26.2708 27.9496 25.3529 28.8675 24.2239 29.4427C23.4959 29.8137 22.7209 29.9615 21.8777 30.0304C21.066 30.0967 20.0694 30.0967 18.862 30.0967H9.13801C7.93058 30.0967 6.93405 30.0967 6.12226 30.0304C5.27912 29.9615 4.50406 29.8137 3.77606 29.4427C2.64709 28.8675 1.7292 27.9496 1.15396 26.8206C0.783026 26.0926 0.63518 25.3176 0.566292 24.4744C0.499966 23.6626 0.499982 22.6661 0.500001 21.4586V19.2347C0.499982 18.0273 0.499966 17.0307 0.566292 16.2189C0.63518 15.3758 0.783026 14.6007 1.15396 13.8727C1.7292 12.7438 2.64709 11.8259 3.77606 11.2506C4.16921 11.0503 4.57609 10.9151 5 10.8222V9.09668ZM8 10.5991C8.35657 10.5967 8.73559 10.5967 9.13805 10.5967H18.8619C19.2644 10.5967 19.6434 10.5967 20 10.5991V9.09668C20 5.78297 17.3137 3.09668 14 3.09668C10.6863 3.09668 8 5.78297 8 9.09668V10.5991ZM6.36656 13.653C5.70894 13.7067 5.37263 13.8041 5.13803 13.9237C4.57354 14.2113 4.1146 14.6702 3.82698 15.2347C3.70745 15.4693 3.61006 15.8056 3.55633 16.4632C3.50117 17.1384 3.5 18.0118 3.5 19.2967V21.3967C3.5 22.6815 3.50117 23.555 3.55633 24.2301C3.61006 24.8877 3.70745 25.2241 3.82698 25.4586C4.1146 26.0231 4.57354 26.4821 5.13803 26.7697C5.37263 26.8892 5.70894 26.9866 6.36656 27.0404C7.04169 27.0955 7.91513 27.0967 9.2 27.0967H18.8C20.0849 27.0967 20.9583 27.0955 21.6334 27.0404C22.2911 26.9866 22.6274 26.8892 22.862 26.7697C23.4265 26.4821 23.8854 26.0231 24.173 25.4586C24.2926 25.2241 24.3899 24.8877 24.4437 24.2301C24.4988 23.555 24.5 22.6815 24.5 21.3967V19.2967C24.5 18.0118 24.4988 17.1384 24.4437 16.4632C24.3899 15.8056 24.2926 15.4693 24.173 15.2347C23.8854 14.6702 23.4265 14.2113 22.862 13.9237C22.6274 13.8041 22.2911 13.7067 21.6334 13.653C20.9583 13.5978 20.0849 13.5967 18.8 13.5967H9.2C7.91513 13.5967 7.04169 13.5978 6.36656 13.653ZM14 17.3467C14.8284 17.3467 15.5 18.0183 15.5 18.8467V21.8467C15.5 22.6751 14.8284 23.3467 14 23.3467C13.1716 23.3467 12.5 22.6751 12.5 21.8467V18.8467C12.5 18.0183 13.1716 17.3467 14 17.3467Z"/></svg>';

  // Jetons du design system Elsee (bannière, boutons pill 48px, interrupteur de la spec).
  var CSS =
    "#elsee-cookies{--ec-ink:#29413D;--ec-muted:#3F5450;--ec-lime:#D5EBAD;--ec-lime-strong:#C2DE93;--ec-lime-pressed:#B0CF7E;" +
    "--ec-border:rgba(41,65,61,.10);--ec-border-strong:rgba(41,65,61,.30);--ec-input:#F2F4F2;" +
    "--ec-float:0 8px 24px rgba(41,65,61,.12),0 1px 2px rgba(41,65,61,.06);--ec-overlay:0 24px 48px rgba(41,65,61,.18),0 2px 4px rgba(41,65,61,.06);" +
    "--ec-ring:0 0 0 2px #FFFFFF,0 0 0 4px #29413D;" +
    "font:400 14px/1.55 Montserrat,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--ec-ink);letter-spacing:normal;text-align:left}" +
    "#elsee-cookies *,#elsee-cookies *::before,#elsee-cookies *::after{box-sizing:border-box}" +
    "#elsee-cookies [hidden]{display:none!important}" +
    "#elsee-cookies h2,#elsee-cookies h3,#elsee-cookies p{margin:0;font-family:inherit;color:inherit;letter-spacing:normal;text-transform:none;text-align:left}" +
    "#elsee-cookies p{font-size:14px;line-height:1.55;font-weight:400}" +
    "#elsee-cookies a{color:var(--ec-ink);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}" +
    "#elsee-cookies a:hover{color:#7F3F2A}" +
    "#elsee-cookies :focus-visible{outline:none;box-shadow:var(--ec-ring)}" +
    "#elsee-cookies .ec-banniere{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:1180px;margin:0 auto;background:#FFFFFF;" +
    "border:1px solid var(--ec-border);border-radius:24px;box-shadow:var(--ec-float);padding:24px;display:flex;gap:24px;align-items:flex-start;" +
    "max-height:calc(100vh - 32px);overflow:auto;animation:ec-monte .25s cubic-bezier(.2,.8,.2,1)}" +
    "#elsee-cookies .ec-banniere-corps{flex:1;min-width:0}" +
    "#elsee-cookies .ec-banniere h2{font:600 20px/1.3 Montserrat,sans-serif;margin-bottom:8px}" +
    "#elsee-cookies .ec-banniere p{max-width:650px}" +
    "#elsee-cookies .ec-continuer{flex:none;font-size:12px;font-weight:500;padding:12px 0;min-height:44px}" +
    "#elsee-cookies .ec-boutons{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}" +
    "#elsee-cookies .ec-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 28px;border-radius:999px;border:0;" +
    "font:600 16px/1 Montserrat,sans-serif;color:var(--ec-ink);cursor:pointer;text-decoration:none;" +
    "transition:background-color .15s cubic-bezier(.2,.8,.2,1),transform .15s cubic-bezier(.2,.8,.2,1)}" +
    "#elsee-cookies .ec-btn:active{transform:scale(.98)}" +
    "#elsee-cookies .ec-primaire{background:var(--ec-lime)}" +
    "#elsee-cookies .ec-primaire:hover{background:var(--ec-lime-strong)}" +
    "#elsee-cookies .ec-primaire:active{background:var(--ec-lime-pressed)}" +
    "#elsee-cookies .ec-fantome{background:transparent;box-shadow:inset 0 0 0 1px var(--ec-border-strong)}" +
    "#elsee-cookies .ec-fantome:hover{background:rgba(41,65,61,.06)}" +
    "#elsee-cookies .ec-fantome:focus-visible{box-shadow:var(--ec-ring)}" +
    "#elsee-cookies .ec-sombre{background:var(--ec-ink);color:#F6FAEF}" +
    "#elsee-cookies .ec-sombre:hover{background:#34504B}" +
    "#elsee-cookies .ec-sombre:active{background:#1F322F}" +
    "#elsee-cookies .ec-voile{position:fixed;inset:0;z-index:2147483001;background:rgba(41,65,61,.60);display:flex;align-items:center;justify-content:center;padding:16px}" +
    "#elsee-cookies .ec-modale{background:#FFFFFF;border-radius:24px;box-shadow:var(--ec-overlay);width:100%;max-width:560px;max-height:calc(100vh - 32px);" +
    "display:flex;flex-direction:column;overflow:hidden;animation:ec-monte .25s cubic-bezier(.2,.8,.2,1)}" +
    "#elsee-cookies .ec-modale-tete{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:24px 24px 8px}" +
    "#elsee-cookies .ec-modale-tete h2{font:600 22px/1.3 Montserrat,sans-serif}" +
    "#elsee-cookies .ec-fermer{flex:none;width:44px;height:44px;border-radius:999px;border:0;background:var(--ec-input);color:var(--ec-ink);" +
    "font:500 20px/1 Montserrat,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}" +
    "#elsee-cookies .ec-fermer:hover{background:#E6E9E6}" +
    "#elsee-cookies .ec-modale-corps{overflow:auto;padding:0 24px 16px}" +
    "#elsee-cookies .ec-modale-corps>p{margin-bottom:16px}" +
    "#elsee-cookies .ec-finalite{border:1px solid var(--ec-border);border-radius:12px;padding:16px;margin-bottom:12px}" +
    "#elsee-cookies .ec-finalite-tete{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}" +
    "#elsee-cookies .ec-finalite h3{font:600 16px/1.3 Montserrat,sans-serif}" +
    "#elsee-cookies .ec-finalite p{font-size:12px;line-height:1.6;color:var(--ec-muted)}" +
    "#elsee-cookies .ec-badge{flex:none;font:500 12px/1.3 Montserrat,sans-serif;color:#035A52;background:rgba(0,186,169,.12);border-radius:999px;padding:4px 12px}" +
    "#elsee-cookies .ec-switch{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0;border:0;background:transparent;" +
    "font:500 12px/1 Montserrat,sans-serif;color:var(--ec-ink);cursor:pointer}" +
    "#elsee-cookies .ec-piste{position:relative;width:48px;height:28px;border-radius:999px;background:#F2F4F2;box-shadow:inset 0 0 0 1px var(--ec-border-strong);transition:background-color .15s}" +
    "#elsee-cookies .ec-piste::after{content:'';position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#3F5450;transition:transform .15s cubic-bezier(.2,.8,.2,1),background-color .15s}" +
    "#elsee-cookies .ec-switch[aria-checked=true] .ec-piste{background:#29413D;box-shadow:none}" +
    "#elsee-cookies .ec-switch[aria-checked=true] .ec-piste::after{transform:translateX(20px);background:#D5EBAD}" +
    "#elsee-cookies .ec-switch-libelle{min-width:24px}" +
    "#elsee-cookies .ec-modale-pied{border-top:1px solid var(--ec-border);padding:16px 24px 24px;display:flex;flex-wrap:wrap;gap:12px}" +
    "#elsee-cookies .ec-dock{position:fixed;left:16px;right:16px;bottom:16px;pointer-events:none;z-index:2147482999;display:flex;align-items:center;gap:12px;transition:left .25s cubic-bezier(.2,.8,.2,1)}" +
    "#elsee-cookies .ec-cadenas{flex:none;pointer-events:auto;width:48px;height:48px;border-radius:999px;border:1px solid rgba(255,255,255,.55);background:rgba(255,255,255,.72);" +
    "-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:var(--ec-float);color:var(--ec-ink);cursor:pointer;" +
    "display:inline-flex;align-items:center;justify-content:center;padding:0}" +
    "#elsee-cookies .ec-toast{background:rgba(255,255,255,.92);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--ec-border);" +
    "border-radius:24px;box-shadow:var(--ec-float);min-width:0;padding:8px 16px;font-size:12px;font-weight:500;animation:ec-monte .25s cubic-bezier(.2,.8,.2,1)}" +
    "@keyframes ec-monte{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
    "@media (max-width:767px){#elsee-cookies .ec-banniere{flex-direction:column-reverse;gap:0;padding:20px}#elsee-cookies .ec-continuer{align-self:flex-end;padding:0 0 8px}" +
    "#elsee-cookies .ec-btn{flex:1 1 auto;padding:0 20px}#elsee-cookies .ec-modale-tete{padding:20px 20px 8px}#elsee-cookies .ec-modale-corps{padding:0 20px 12px}#elsee-cookies .ec-modale-pied{padding:16px 20px 20px}}" +
    "@media (prefers-reduced-motion:reduce){#elsee-cookies *,#elsee-cookies *::after{animation:none!important;transition:none!important}}";

  var racine, banniere, voile, dock, toastMinuteur, retourFocus;

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function monterRacine() {
    if (racine) return;
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    racine = el('<div id="elsee-cookies"></div>');
    document.body.appendChild(racine);
  }

  function afficherBanniere() {
    monterRacine();
    if (banniere) {
      banniere.hidden = false;
      return;
    }
    banniere = el(
      '<section class="ec-banniere" role="region" aria-labelledby="ec-titre">' +
        '<div class="ec-banniere-corps">' +
          '<h2 id="ec-titre">Vos cookies, votre choix 🌿</h2>' +
          "<p>Nous utilisons des cookies nécessaires au fonctionnement du site. Avec votre accord, nous en " +
          "déposons aussi pour mesurer l'audience, personnaliser votre expérience et vous proposer des contenus " +
          "adaptés. Vous pouvez changer d'avis à tout moment depuis « Gérer mes cookies » en bas de page. " +
          '<a href="/politique-confidentialite">Politique de confidentialité</a></p>' +
          '<div class="ec-boutons">' +
            '<button type="button" class="ec-btn ec-primaire" data-ec="refuser">Tout refuser</button>' +
            '<button type="button" class="ec-btn ec-primaire" data-ec="accepter">Tout accepter</button>' +
            '<button type="button" class="ec-btn ec-fantome" data-ec="personnaliser">Personnaliser</button>' +
          "</div>" +
        "</div>" +
        '<a href="#" class="ec-continuer" data-ec="continuer">Continuer sans accepter</a>' +
      "</section>"
    );
    banniere.addEventListener("click", surAction);
    racine.appendChild(banniere);
  }

  function masquerBanniere() {
    if (banniere) banniere.hidden = true;
  }

  function carteFinalite(f, choix) {
    var t = TEXTES[f];
    var oui = !!(choix && choix[f]);
    return (
      '<div class="ec-finalite">' +
        '<div class="ec-finalite-tete">' +
          '<h3 id="ec-f-' + f + '">' + t.titre + "</h3>" +
          '<button type="button" class="ec-switch" role="switch" aria-checked="' + oui + '" aria-labelledby="ec-f-' + f + '" data-finalite="' + f + '">' +
            '<span class="ec-piste"></span><span class="ec-switch-libelle" aria-hidden="true">' + (oui ? "Oui" : "Non") + "</span>" +
          "</button>" +
        "</div>" +
        "<p>" + t.texte + "</p>" +
      "</div>"
    );
  }

  function ouvrirModale() {
    monterRacine();
    if (voile) return;
    retourFocus = document.activeElement;
    var choix = lireChoix();
    voile = el(
      '<div class="ec-voile">' +
        '<div class="ec-modale" role="dialog" aria-modal="true" aria-labelledby="ec-modale-titre">' +
          '<div class="ec-modale-tete">' +
            '<h2 id="ec-modale-titre">Gérer mes préférences</h2>' +
            '<button type="button" class="ec-fermer" data-ec="fermer" aria-label="Fermer">×</button>' +
          "</div>" +
          '<div class="ec-modale-corps">' +
            "<p>Activez uniquement ce qui vous convient. Votre choix est conservé 6 mois, puis nous vous reposerons la question. " +
            '<a href="/politique-confidentialite">Politique de confidentialité</a></p>' +
            '<div class="ec-finalite">' +
              '<div class="ec-finalite-tete"><h3>Strictement nécessaires</h3><span class="ec-badge">Toujours actifs</span></div>' +
              "<p>Indispensables au fonctionnement du site et de votre espace membre : connexion, sécurité, " +
              "mémorisation de vos choix cookies. Ils ne nécessitent pas votre accord.</p>" +
            "</div>" +
            FINALITES.map(function (f) {
              return carteFinalite(f, choix);
            }).join("") +
          "</div>" +
          '<div class="ec-modale-pied">' +
            '<button type="button" class="ec-btn ec-primaire" data-ec="refuser">Tout refuser</button>' +
            '<button type="button" class="ec-btn ec-primaire" data-ec="accepter">Tout accepter</button>' +
            '<button type="button" class="ec-btn ec-sombre" data-ec="enregistrer">Enregistrer mes choix</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
    voile.addEventListener("click", function (e) {
      if (e.target === voile) {
        fermerModale();
        return;
      }
      var interrupteur = e.target.closest(".ec-switch");
      if (interrupteur) {
        var oui = interrupteur.getAttribute("aria-checked") !== "true";
        interrupteur.setAttribute("aria-checked", String(oui));
        interrupteur.querySelector(".ec-switch-libelle").textContent = oui ? "Oui" : "Non";
        return;
      }
      surAction(e);
    });
    voile.addEventListener("keydown", pieger);
    masquerBanniere();
    racine.appendChild(voile);
    voile.querySelector(".ec-fermer").focus();
  }

  // Échap ferme ; Tab reste dans la modale.
  function pieger(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      fermerModale();
      return;
    }
    if (e.key !== "Tab") return;
    var focusables = voile.querySelectorAll("button, a[href]");
    var premier = focusables[0];
    var dernier = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      e.preventDefault();
      dernier.focus();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      e.preventDefault();
      premier.focus();
    }
  }

  function retirerModale() {
    if (!voile) return;
    voile.remove();
    voile = null;
  }

  // Fermer sans enregistrer : retour à la bannière si aucun choix n'existe encore.
  function fermerModale() {
    if (!voile) return;
    retirerModale();
    if (!lireChoix()) {
      afficherBanniere();
      banniere.querySelector("button").focus();
    } else if (retourFocus && document.contains(retourFocus)) {
      retourFocus.focus();
    }
  }

  function afficherDock(message) {
    monterRacine();
    if (!dock) {
      dock = el(
        '<div class="ec-dock">' +
          '<button type="button" class="ec-cadenas" data-ec="personnaliser" aria-label="Gérer mes cookies">' + CADENAS + "</button>" +
          '<div class="ec-toast" role="status" aria-live="polite" hidden></div>' +
        "</div>"
      );
      dock.addEventListener("click", surAction);
      racine.appendChild(dock);
      eviterVideo();
    }
    if (!message) return;
    var toast = dock.querySelector(".ec-toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastMinuteur);
    toastMinuteur = setTimeout(function () {
      toast.hidden = true;
    }, 5000);
  }

  // La vidéo flottante de l'accueil et de /avantages (.ps-widget) occupe aussi le coin bas gauche :
  // le cadenas se pose à sa droite tant qu'elle est visible.
  function eviterVideo() {
    var video = document.querySelector(".ps-widget");
    if (!video) return;
    function placer() {
      var visible = video.classList.contains("is-visible") && video.offsetWidth > 0;
      dock.style.left = visible ? Math.round(video.getBoundingClientRect().right + 12) + "px" : "";
    }
    new MutationObserver(placer).observe(video, { attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", placer);
    placer();
  }

  var MESSAGES = {
    accepter: "Merci, tous les cookies sont acceptés ✨",
    refuser: "C'est noté, seuls les cookies nécessaires sont actifs.",
    enregistrer: "Vos préférences sont enregistrées 💜"
  };

  function enregistrer(choix, message) {
    var avant = lireChoix();
    ecrireChoix(choix);
    retirerModale();
    masquerBanniere();
    appliquer(choix, avant);
    afficherDock(message);
    dock.querySelector(".ec-cadenas").focus({ preventScroll: true });
  }

  function tout(oui) {
    var choix = {};
    FINALITES.forEach(function (f) {
      choix[f] = oui;
    });
    return choix;
  }

  function choixDeLaModale() {
    var choix = {};
    Array.prototype.forEach.call(voile.querySelectorAll(".ec-switch"), function (s) {
      choix[s.getAttribute("data-finalite")] = s.getAttribute("aria-checked") === "true";
    });
    return choix;
  }

  function surAction(e) {
    var cible = e.target.closest("[data-ec]");
    if (!cible) return;
    e.preventDefault();
    switch (cible.getAttribute("data-ec")) {
      case "accepter":
        enregistrer(tout(true), MESSAGES.accepter);
        break;
      case "refuser":
      case "continuer":
        enregistrer(tout(false), MESSAGES.refuser);
        break;
      case "personnaliser":
        ouvrirModale();
        break;
      case "fermer":
        fermerModale();
        break;
      case "enregistrer":
        enregistrer(choixDeLaModale(), MESSAGES.enregistrer);
        break;
    }
  }

  // ---- Démarrage ----------------------------------------------------------------------------
  // Lien « Gérer mes cookies » du pied de page : tout lien vers #gerer-mes-cookies.
  document.addEventListener("click", function (e) {
    var lien = e.target.closest && e.target.closest('a[href$="' + ANCRE + '"]');
    if (!lien) return;
    e.preventDefault();
    ouvrirModale();
  });

  var choix = lireChoix();
  if (choix) appliquer(choix, null);
  // Sans choix valable (premier passage, ou six mois écoulés), PostHog oublie l'accord qu'il gardait
  // lui-même : il attend la réponse à la bannière, sans rien envoyer.
  else if (window.posthog) window.posthog.clear_opt_in_out_capturing();

  // Spec PRODUCT-1270 : « Il doit aussi exister un lien « Gérer mes cookies » dans le footer. »
  // Posé avant « Politique de confidentialité » dans chaque pied de page, au format de ses voisins
  // (« Mentions légales - », « CGU / CGV - ») et avec leur classe.
  function ajouterLienPiedDePage() {
    var liens = document.querySelectorAll('footer a[href$="/politique-confidentialite"]');
    Array.prototype.forEach.call(liens, function (politique) {
      if (politique.parentNode.querySelector('a[href="' + ANCRE + '"]')) return;
      var lien = document.createElement("a");
      lien.href = ANCRE;
      lien.className = politique.className;
      lien.textContent = "Gérer mes cookies -";
      politique.parentNode.insertBefore(lien, politique);
    });
  }

  function demarrerInterface() {
    ajouterLienPiedDePage();
    if (choix) afficherDock();
    else afficherBanniere();
    if (location.hash === ANCRE) ouvrirModale();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrerInterface);
  else demarrerInterface();
})();
