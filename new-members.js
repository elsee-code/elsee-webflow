// ============================================================================
// new-members.js — bloc « Nouveaux partenaires »
// ============================================================================
// Les partenaires nouveaux dans le réseau, avec une seule rangée de filtres au-dessus :
// la catégorie (facette `type`). 4 cartes sur desktop et tablette ; sur mobile, 12 cartes
// qui défilent, puis une 13e carte « voir plus » vers l'annuaire. Cartes, carte « voir
// plus » et rangée reprennent le balisage et les classes Webflow de l'annuaire
// (algolia-search.js : buildCardHTML, renderInto et #directory_types) ; une évolution
// de la carte là-bas se reporte ici.
//
// À poser dans la page Webflow (bloc Embed) :
//   <div id="new_members_types" class="directory_categories_wrapper"></div>
//   <div id="new_members_hits"></div>
//   <a id="new_members_more" href="#">Tous les nouveaux partenaires</a>  (facultatif : le
//   script met à jour son lien, et la carte « voir plus » reprend son texte)
// Bibliothèques : algoliasearch-lite 4.10.5 et instantsearch.js 4.27.0, les mêmes que
// l'annuaire. Sur la page de l'annuaire, elles sont déjà chargées : ne pas les doubler.

window.addEventListener("DOMContentLoaded", function () {
  // 1. CONSTANTES ------------------------------------------------------------
  var ALGOLIA_APP_ID = "DRTSPIHOUM";
  var ALGOLIA_SEARCH_KEY = "137b70e88a3288926c97a689cdcf4048";
  var ALGOLIA_INDEX_NAME = "elsee_index";
  var DIRECTORY_BASE_URL = "https://www.elsee.care/lannuaire-des-partenaires-elsee";

  var HITS_DESKTOP = 4; // les suivantes sont masquées en CSS au-dessus de 767 px
  var HITS_MOBILE = 12;
  var MORE_TEXT_DEFAULT = "Tous les nouveaux partenaires";
  var FILTER_FACET = "type";
  var ALL_VALUE = "__ALL_TYPES__";

  var TYPES_ID = "new_members_types";
  var HITS_ID = "new_members_hits";
  var MORE_ID = "new_members_more";

  // « Nouveaux partenaires » : network_new est calculé par le backend (un mois après
  // l'entrée dans le réseau) ; aucune fiche de dev_ops:decisions/ ne le définit.
  // Visibilité : celle de l'annuaire hors géographie, sans règle à nous.
  // D77 point 4 : « l'index tel qu'il est : […] le filtre de visibilité du site
  // (`NOT show_search:true`, `NOT show_home:true` en géographique) et aucune règle de
  // publication à elle. »
  var FILTERS = "network_new:true AND NOT show_search:true";

  var THERAPIST_PLACEHOLDER_URL =
    "https://cdn.prod.website-files.com/64708634ac0bc7337aa7acd8/690dd36e1367cf7f0391812d_Fichier%20Convertio%20(3).webp";
  var DEFAULT_PLACEHOLDER_URL =
    "https://cdn.prod.website-files.com/64708634ac0bc7337aa7acd8/690dd373de251816ebaa511c_Placeholder%20de%20marque.webp";
  var NETWORK_LOGO_URL =
    "https://cdn.prod.website-files.com/64708634ac0bc7337aa7acd8/65a65b49a0e66151845cad61_mob_menu_logo_dark_green.svg";

  // Icônes des cartes : celles de la page si elle les porte (page de l'annuaire), sinon
  // une copie de celles de l'annuaire, relevée le 2026-10-19.
  var FALLBACK_ICONS = {
    directory_remote_icon:
      '<svg viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 10.5697C0 4.73221 4.5667 0 10.2 0C15.8333 0 20.4 4.73222 20.4 10.5697V14.4485C20.4 14.9305 20.0229 15.3212 19.5578 15.3212C19.0927 15.3212 18.7156 14.9305 18.7156 14.4485V10.5697C18.7156 5.6962 14.903 1.74545 10.2 1.74545C5.49697 1.74545 1.6844 5.6962 1.6844 10.5697V14.4485C1.6844 14.9305 1.30734 15.3212 0.842202 15.3212C0.377067 15.3212 0 14.9305 0 14.4485V10.5697ZM2.80734 12.9939C2.80734 11.1731 4.23181 9.69697 5.98899 9.69697C7.74617 9.69697 9.17064 11.1731 9.17064 12.9939V15.903C9.17064 17.7239 7.74617 19.2 5.98899 19.2C4.23181 19.2 2.80734 17.7239 2.80734 15.903V12.9939ZM5.98899 11.4424C5.16208 11.4424 4.49174 12.1371 4.49174 12.9939V15.903C4.49174 16.7599 5.16208 17.4545 5.98899 17.4545C6.8159 17.4545 7.48624 16.7599 7.48624 15.903V12.9939C7.48624 12.1371 6.8159 11.4424 5.98899 11.4424ZM11.2294 12.9939C11.2294 11.1731 12.6538 9.69697 14.411 9.69697C16.1682 9.69697 17.5927 11.1731 17.5927 12.9939V15.903C17.5927 17.7239 16.1682 19.2 14.411 19.2C12.6538 19.2 11.2294 17.7239 11.2294 15.903V12.9939ZM14.411 11.4424C13.5841 11.4424 12.9138 12.1371 12.9138 12.9939V15.903C12.9138 16.7599 13.5841 17.4545 14.411 17.4545C15.2379 17.4545 15.9083 16.7599 15.9083 15.903V12.9939C15.9083 12.1371 15.2379 11.4424 14.411 11.4424Z" fill="currentColor"/></svg>',
    directory_at_home_icon:
      '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.72983 1.95795C9.655 1.90735 9.545 1.90735 9.47017 1.95795L1.98217 7.02182C1.9314 7.05615 1.92 7.09646 1.92 7.11941V16.5967C1.92 16.9292 2.21782 17.28 2.688 17.28H16.512C16.9822 17.28 17.28 16.9292 17.28 16.5967V7.11941C17.28 7.09646 17.2686 7.05615 17.2178 7.02182L9.72983 1.95795ZM8.39461 0.367496C9.11917 -0.1225 10.0808 -0.122498 10.8054 0.367497L18.2934 5.43136C18.8504 5.80805 19.2 6.43312 19.2 7.11941V16.5967C19.2 18.0793 17.9505 19.2 16.512 19.2H2.688C1.24948 19.2 0 18.0793 0 16.5967V7.11941C0 6.43312 0.349589 5.80805 0.906605 5.43136L8.39461 0.367496Z" fill="currentColor"/></svg>',
    directory_discount_icon:
      '<svg viewBox="0 0 19 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.433102 10.7667C-0.264293 11.6949 -0.102212 13.0366 0.794996 13.7626L7.2027 18.9368H16.0662L18.5486 20L18.9227 19.0891L16.2614 17.9488H7.54018L1.39545 12.9885C0.910103 12.5962 0.821511 11.8704 1.20037 11.3701C1.57922 10.8669 2.29076 10.7677 2.78742 11.1552L7.73621 15.0051H13.1957V14.018H8.3799V12.8729C8.3799 12.2416 8.88126 11.7278 9.4995 11.7278H14.9231L18.4788 14.0643L19 13.2325L15.2049 10.7397H10.0103V9.93008C11.0621 9.76429 11.7378 9.09631 11.7378 8.20278C11.7378 7.18394 10.8905 6.74923 10.0103 6.39932V4.81467C10.3044 4.89853 10.6832 5.11058 10.6879 5.11347L10.736 5.14046L11.2713 4.34619L11.2157 4.31149C11.1865 4.29414 10.5447 3.90474 10.0094 3.81509V2.61311H9.0905V3.82763C8.09623 3.98571 7.48082 4.61224 7.48082 5.47397C7.48082 6.4292 8.30639 6.85621 9.0905 7.17428V8.94401C8.67772 8.84279 8.08964 8.53917 8.08209 8.53725L8.0312 8.51219L7.51475 9.36619L7.57507 9.39607C7.61654 9.41535 8.50902 9.85297 9.08767 9.94647V10.7802C8.25268 10.9508 7.59673 11.6314 7.445 12.4931C5.25668 11.5995 3.77322 9.40861 3.77322 6.95559C3.77322 3.6668 6.39141 0.988981 9.60696 0.988981C12.5747 0.988981 15.0279 3.26668 15.3924 6.20075L14.9052 5.70243L14.2229 6.40028L15.924 8.14012L17.6251 6.40028L16.9428 5.70243L16.3754 6.2827C16.0446 2.76147 13.1353 0 9.60776 0C5.85877 0 2.80897 3.11927 2.80897 6.95364C2.80897 8.37538 3.24061 9.71708 3.98418 10.843L3.36877 10.364C2.45178 9.6507 1.13427 9.83093 0.432118 10.764L0.433102 10.7667ZM9.09034 4.83189V6.02326C8.74541 5.8459 8.58897 5.67047 8.58897 5.45552C8.58897 5.15189 8.76521 4.93501 9.09034 4.83093V4.83189ZM10.0092 8.95349V7.57125C10.4409 7.79102 10.6293 8.00596 10.6293 8.27972C10.6293 8.62478 10.4069 8.85999 10.0092 8.95349Z" fill="currentColor"/></svg>',
    directory_card_location_icon:
      '<svg viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7073 1.99616C6.79383 1.99616 2 6.78079 2 12.6829C2 13.8655 2.19246 15.0033 2.54783 16.0667H5.87805C6.6728 16.0667 7.31707 15.4236 7.31707 14.6304V11.4658C7.31707 9.57007 8.85678 8.03333 10.7561 8.03333H13.1951C13.9899 8.03333 14.6341 7.39029 14.6341 6.59707V2.45869C14.6341 2.36057 14.6483 2.26576 14.6748 2.17619C14.037 2.05796 13.3793 1.99616 12.7073 1.99616ZM16.6341 2.7377C19.3591 3.81029 21.5379 5.96633 22.6367 8.6756C22.8439 9.18655 23.4269 9.43309 23.9388 9.22627C24.4508 9.01944 24.6978 8.43756 24.4906 7.92661C22.6062 3.28043 18.0418 0 12.7073 0C5.68926 0 0 5.67834 0 12.6829C0 19.6875 5.68926 25.3658 12.7073 25.3658C13.2596 25.3658 13.7073 24.919 13.7073 24.3678C13.7073 23.8165 13.2596 23.3697 12.7073 23.3697C8.75922 23.3697 5.31021 21.237 3.45371 18.0628H5.87805C7.77737 18.0628 9.31707 16.5261 9.31707 14.6304V11.4658C9.31707 10.6725 9.96134 10.0295 10.7561 10.0295H13.1951C15.0944 10.0295 16.6341 8.49275 16.6341 6.59707V2.7377ZM20.3171 13.681C18.2622 13.681 16.6341 15.3018 16.6341 17.2553C16.6341 17.7797 16.8422 18.434 17.2453 19.1775C17.6412 19.9077 18.1818 20.6449 18.7427 21.3143C19.3008 21.9803 19.8619 22.5588 20.2847 22.9716C20.2956 22.9823 20.3064 22.9928 20.3171 23.0032C20.3278 22.9928 20.3386 22.9823 20.3495 22.9716C20.7723 22.5588 21.3333 21.9803 21.8915 21.3143C22.4524 20.6449 22.9929 19.9077 23.3888 19.1775C23.792 18.434 24 17.7797 24 17.2553C24 15.3018 22.3719 13.681 20.3171 13.681ZM20.3171 24.3678C19.6609 25.1209 19.6607 25.1208 19.6606 25.1206L19.6589 25.1192L19.6553 25.116L19.643 25.1053L19.5991 25.0665C19.5616 25.0331 19.5079 24.9849 19.4403 24.9231C19.3053 24.7996 19.1143 24.6214 18.8861 24.3986C18.4308 23.954 17.8211 23.3259 17.2085 22.5949C16.5987 21.8672 15.9685 21.0168 15.4864 20.1276C15.0115 19.2518 14.6341 18.2549 14.6341 17.2553C14.6341 14.1582 17.1993 11.6848 20.3171 11.6848C23.4348 11.6848 26 14.1582 26 17.2553C26 18.2549 25.6227 19.2518 25.1478 20.1276C24.6656 21.0168 24.0354 21.8672 23.4256 22.5949C22.813 23.3259 22.2033 23.954 21.7481 24.3986C21.5198 24.6214 21.3289 24.7996 21.1938 24.9231C21.1262 24.9849 21.0725 25.0331 21.035 25.0665L20.9912 25.1053L20.9789 25.116L20.974 25.1203C20.9738 25.1204 20.9733 25.1209 20.3171 24.3678ZM20.3171 24.3678L20.9733 25.1209C20.597 25.4475 20.0368 25.4472 19.6606 25.1206L20.3171 24.3678ZM20.3171 16.2709C20.8694 16.2709 21.3171 16.7178 21.3171 17.269V17.3569C21.3171 17.9081 20.8694 18.3549 20.3171 18.3549C19.7648 18.3549 19.3171 17.9081 19.3171 17.3569V17.269C19.3171 16.7178 19.7648 16.2709 20.3171 16.2709Z" fill="currentColor"/></svg>'
  };

  var typesEl = document.getElementById(TYPES_ID);
  var hitsEl = document.getElementById(HITS_ID);
  if (!typesEl || !hitsEl) return;

  var selectedType = "";
  var icons = readIcons();
  var moreLink = document.getElementById(MORE_ID);
  var moreText = (moreLink && moreLink.textContent.trim()) || MORE_TEXT_DEFAULT;

  // 2. UTILS -----------------------------------------------------------------
  function readIcons() {
    var out = {};
    Object.keys(FALLBACK_ICONS).forEach(function (cls) {
      var svg = document.querySelector("." + cls + " svg");
      out[cls] = svg ? svg.outerHTML : FALLBACK_ICONS[cls];
    });
    return out;
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // URL de l'index : http(s) seulement, normalisée par URL (guillemets encodés), sinon "".
  function safeUrl(v) {
    if (!v) return "";
    try {
      var u = new URL(String(v || ""), window.location.href);
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
    } catch (e) {
      return "";
    }
  }

  function toArray(v) {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  }

  // short_desc arrive en HTML riche (<p>…) : on n'en garde que le texte. DOMParser
  // n'exécute rien de ce qu'il lit.
  function plainText(html) {
    if (!html) return "";
    var doc = new DOMParser().parseFromString(String(html), "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function truncate(str, max) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max) + "..." : str;
  }

  // les studios enfants stockent le taux dans percentage_invoice_reimbursed
  function getReimbursement(hit) {
    if (hit.reimbursment_percentage != null) return hit.reimbursment_percentage;
    if (hit.percentage_invoice_reimbursed != null) return hit.percentage_invoice_reimbursed;
    return "";
  }

  // `type` est un texte, ou une liste pour une marque à plusieurs catégories (dev_ops D102).
  function isTherapeutes(hit) {
    var types = Array.isArray(hit.type) ? hit.type : [hit.type];
    return types.some(function (t) {
      var n = String(t || "").trim().toLowerCase();
      return n === "thérapeutes" || n === "therapeutes";
    });
  }

  // Mise en page du bloc, et les règles de carte que l'annuaire pose dans sa propre page :
  // 4 colonnes, 2 × 2 sur tablette ; sur mobile, cartes et catégories sur une ligne qui
  // défile à l'horizontale, et la carte « voir plus » au bout.
  function ensureCSS() {
    if (document.getElementById("new-members-style")) return;
    var r = "#" + HITS_ID;
    var t = "#" + TYPES_ID;
    var style = document.createElement("style");
    style.id = "new-members-style";
    style.textContent =
      r + " .new-members-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));" +
      "gap:12px;margin:0;padding:0;list-style:none}" +
      r + " .directory_card_container{display:flex;height:auto;min-width:0}" +
      r + " .directory_card_header{display:flex;justify-content:space-between;" +
      "align-items:flex-start;gap:var(--s)}" +
      r + " .directory_remote_icon," + r + " .directory_at_home_icon{position:relative}" +
      r + " .directory_remote_icon .tooltip," + r + " .directory_at_home_icon .tooltip{" +
      "position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);" +
      "display:none;z-index:20}" +
      r + " .directory_remote_icon:hover .tooltip," + r + " .directory_at_home_icon:hover .tooltip{display:block}" +
      ".directory_card_photo.is-new{border-style:solid;border-color:var(--pink)}" +
      ".directory_card_label_tag.is-new{display:block;left:70%;right:auto;bottom:-6px;" +
      "width:auto;height:auto;padding:3px 8px;border-radius:var(--m);" +
      "background-color:var(--pink);color:var(--dark_green_op_90);" +
      "font-size:var(--fontsize_xs);font-weight:600;line-height:1.15;" +
      "text-align:center;white-space:nowrap}" +
      r + " .new-members-more-item{display:flex}" +
      "@media (min-width:768px){" +
      r + " .new-members-list>li:nth-child(n+" + (HITS_DESKTOP + 1) + ")," + r + " .new-members-more-item{display:none}}" +
      // sous 1200 px, 4 colonnes serrent l'en-tête de carte (photo, icônes, taux) : 2 × 2
      "@media (max-width:1199px){" + r + " .new-members-list{grid-template-columns:repeat(2,minmax(0,1fr))}}" +
      "@media (max-width:767px){" +
      r + " .new-members-list{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;" +
      "-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px}" +
      r + " .new-members-list::-webkit-scrollbar{display:none}" +
      r + " .new-members-list>li{flex:0 0 80%;scroll-snap-align:start}" +
      t + "{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}" +
      t + "::-webkit-scrollbar{display:none}" +
      t + " .directory_category_tag_wrapper{flex:none;white-space:nowrap}}";
    document.head.appendChild(style);
  }

  // 3. CARTE (même balisage que buildCardHTML dans algolia-search.js) ---------
  function labelTagHTML(isNetwork, isNew) {
    if (isNew) {
      return '<div class="directory_card_label_tag is-new">Nouveau<br>partenaire</div>';
    }
    return (
      '<div class="directory_card_label_tag" style="display:' + (isNetwork ? "flex" : "none") + ';">' +
        '<img src="' + NETWORK_LOGO_URL + '" loading="lazy" alt="" class="directory_card_label_tag_logo">' +
      "</div>"
    );
  }

  function buildCardHTML(hit) {
    var photoUrl = safeUrl(hit.photo_url);
    var isNetwork = !!hit.is_elsee_network;
    var isNew = hit.network_new === true;
    var reimbursement = getReimbursement(hit);
    var city = hit.city || "";
    var depNum = hit.department_number || "";
    var Therapeutes = isTherapeutes(hit);

    var containStyle = "background-position:50% 50%;background-size:contain;background-repeat:no-repeat;";
    var coverStyle = "background-position:50% 50%;background-size:cover;background-repeat:no-repeat;";
    var finalStyle;
    if (photoUrl) {
      finalStyle = (Therapeutes ? coverStyle : containStyle) + "background-image:url(&quot;" + esc(photoUrl) + "&quot;);";
    } else {
      finalStyle = coverStyle + "background-image:url(&quot;" + (Therapeutes ? THERAPIST_PLACEHOLDER_URL : DEFAULT_PLACEHOLDER_URL) + "&quot;);";
    }

    var photoClasses = "directory_card_photo";
    if (isNetwork) photoClasses += " is-label";
    if (isNew) photoClasses += " is-new";
    photoClasses += Therapeutes ? " is-cover" : " is-contain";

    var photoDiv =
      '<div class="directory_card_photo_container">' +
        '<div class="' + photoClasses + '" style="' + finalStyle + '">' + labelTagHTML(isNetwork, isNew) + "</div>" +
      "</div>";

    var remoteIcon =
      '<div class="directory_remote_icon" style="display:' + (hit.is_remote ? "block" : "none") + ';">' +
        icons.directory_remote_icon + '<div class="tooltip">Consultation en visio</div>' +
      "</div>";

    var atHomeIcon =
      '<div class="directory_at_home_icon" style="display:' + (hit.is_at_home ? "block" : "none") + ';">' +
        icons.directory_at_home_icon + '<div class="tooltip">Se déplace à votre domicile</div>' +
      "</div>";

    var discountDiv =
      '<div class="directory_card_discount_tag" style="display:' + (reimbursement !== "" ? "flex" : "none") + ';">' +
        '<div class="directory_discount_icon">' + icons.directory_discount_icon + "</div>" +
        "<div>" + (reimbursement !== "" ? esc(reimbursement) + "%" : "") + "</div>" +
      "</div>";

    var titleDiv = '<div class="directory_card_title"><div>' + esc(hit.name) + "</div></div>";

    var partnerDetails1Html, partnerDetails2Html;
    if (Therapeutes) {
      partnerDetails1Html = '<div class="directory_card_partner_details_1"><div>' + esc(hit.mainjob) + "</div></div>";
      var jobsArr = toArray(hit.jobs);
      var jobsTxt = jobsArr.length > 3
        ? jobsArr.slice(0, 3).join(", ") + " +" + (jobsArr.length - 3)
        : jobsArr.join(", ");
      partnerDetails2Html = '<div class="directory_card_partner_details_2"><div>' + esc(jobsTxt) + "</div></div>";
    } else {
      var rawTop = toArray(hit.prestations);
      if (!rawTop.length) rawTop = toArray(hit.specialities);
      var extraTop = rawTop.length > 3 ? rawTop.length - 3 : 0;
      var topHtml = esc(rawTop.slice(0, 3).join(", "));
      if (extraTop > 0) {
        topHtml += ', <span class="directory_card_more_specialities"><span class="directory_remote_icon">+' + extraTop + "</span></span>";
      }
      partnerDetails1Html = '<div class="directory_card_partner_details_1"><div>' + topHtml + "</div></div>";
      partnerDetails2Html =
        '<div class="directory_card_partner_details_2"><div class="directory_card_partner_short_desc">' +
        esc(truncate(plainText(hit.short_desc), 70)) + "</div></div>";
    }

    var showLocation = hit.show_search !== false && (city || depNum);
    var locationText = Therapeutes ? city + (depNum ? " (" + depNum + ")" : "") : city;
    var locationDiv =
      '<div class="directory_card_partner_location" style="display:' + (showLocation ? "flex" : "none") + ';">' +
        '<div class="directory_card_location_icon">' + icons.directory_card_location_icon + "</div>" +
        '<div class="directory_card_location_text"><div>' + esc(locationText) + "</div></div>" +
      "</div>";

    var rawTags = Therapeutes ? toArray(hit.prestations) : toArray(hit.specialities);
    var extraCount = rawTags.length > 2 ? rawTags.length - 2 : 0;
    var prestasHtml = rawTags.slice(0, 2).map(function (p) {
      return '<div class="directory_card_prestation_tag"><div>' + esc(p) + "</div></div>";
    }).join("");
    if (extraCount > 0) {
      prestasHtml += '<div class="directory_card_prestation_tag"><div>+' + extraCount + "</div></div>";
    }
    var prestationsDiv = '<div class="directory_card_prestations_container">' + prestasHtml + "</div>";

    return (
      '<a href="' + esc(safeUrl(hit.url) || "#") + '" class="directory_card_body">' +
        '<div class="directory_card_upper_container">' +
          '<div class="directory_card_header">' +
            photoDiv +
            '<div class="directory_card_options_container">' + remoteIcon + atHomeIcon + discountDiv + "</div>" +
          "</div>" +
          titleDiv + partnerDetails1Html + partnerDetails2Html +
        "</div>" +
        locationDiv + prestationsDiv +
      "</a>"
    );
  }

  // 4. RENDU -----------------------------------------------------------------
  // Rangée de catégories : même balisage que #directory_types de l'annuaire, un seul
  // choix à la fois ; « Toutes les catégories » le retire.
  function renderTypes(results) {
    var values = results.getFacetValues(FILTER_FACET, { sortBy: ["count:desc", "name:asc"] }) || [];
    if (!Array.isArray(values)) values = [];

    var html =
      '<div class="directory_category_tag_wrapper ' + (selectedType ? "" : "is-selected") +
      '" data-facet-value="' + ALL_VALUE + '">Toutes les catégories</div>';

    html += values
      .filter(function (fv) { return fv && fv.name && (fv.count > 0 || fv.name === selectedType); })
      .map(function (fv) {
        return (
          '<div class="directory_category_tag_wrapper ' + (fv.name === selectedType ? "is-selected" : "") +
          '" data-facet-value="' + esc(fv.name) + '">' + esc(fv.name) + "</div>"
        );
      })
      .join("");

    typesEl.innerHTML = html;
  }

  // Carte « voir plus » : même balisage que la 6e carte de renderInto dans l'annuaire.
  function moreCardHTML() {
    return (
      '<li class="new-members-more-item">' +
        '<div class="more-card">' +
          '<a href="' + esc(moreUrl()) + '" class="directory_more_card_body">' +
            '<div class="directory_more_card_title"><div>' + esc(moreText) + "</div></div>" +
          "</a>" +
        "</div>" +
      "</li>"
    );
  }

  function renderHits(results) {
    var hits = (results.hits || []).slice(0, HITS_MOBILE);
    if (!hits.length) {
      hitsEl.innerHTML = "<div>Aucun nouveau partenaire pour le moment.</div>";
      return;
    }
    hitsEl.innerHTML =
      '<ol class="new-members-list">' +
      hits.map(function (hit) {
        return '<li class="directory_card_container">' + buildCardHTML(hit) + "</li>";
      }).join("") +
      moreCardHTML() +
      "</ol>";
  }

  // L'annuaire filtré pareil : ?new=true, et la catégorie choisie.
  function moreUrl() {
    var params = new URLSearchParams({ new: "true" });
    if (selectedType) params.set("type", selectedType);
    return DIRECTORY_BASE_URL + "?" + params.toString();
  }

  function updateMoreLink() {
    if (moreLink) moreLink.setAttribute("href", moreUrl());
  }

  // 5. INIT ------------------------------------------------------------------
  function init() {
    if (typeof algoliasearch === "undefined" || typeof instantsearch === "undefined") {
      setTimeout(init, 200);
      return;
    }

    ensureCSS();

    var search = instantsearch({
      indexName: ALGOLIA_INDEX_NAME,
      searchClient: algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)
    });

    search.addWidgets([
      instantsearch.widgets.configure({
        filters: FILTERS,
        disjunctiveFacets: [FILTER_FACET],
        hitsPerPage: HITS_MOBILE,
        attributesToHighlight: [],
        attributesToRetrieve: [
          "name",
          "url",
          "photo_url",
          "is_elsee_network",
          "is_remote",
          "is_at_home",
          "reimbursment_percentage",
          "percentage_invoice_reimbursed", // studios enfants
          "city",
          "department_number",
          "mainjob",
          "jobs",
          "prestations",
          "specialities",
          "short_desc",
          "show_search",
          "network_new",
          "type"
        ]
      }),
      {
        render: function (opts) {
          if (!opts.results) return;
          renderTypes(opts.results);
          renderHits(opts.results);
          updateMoreLink();
        }
      }
    ]);

    typesEl.addEventListener("click", function (e) {
      var tag = e.target.closest(".directory_category_tag_wrapper");
      if (!tag || !search.helper) return;
      var value = tag.getAttribute("data-facet-value") || "";
      var next = value === ALL_VALUE || value === selectedType ? "" : value;
      if (next === selectedType) return;

      selectedType = next;
      var helper = search.helper.clearRefinements(FILTER_FACET);
      if (selectedType) helper.addDisjunctiveFacetRefinement(FILTER_FACET, selectedType);
      helper.search();
    });

    search.start();
  }

  init();
});
