// ============================================================================
// carte-cadeau.js — page /carte-cadeau
// ============================================================================
// Réglages de la page, Custom code, pied de page. Quatre blocs collés là, repris à l'identique
// et dans le même ordre :
//   1. défilement continu des logos (#carousel-track), en pause au survol ;
//   2. boutons .pass-fbcid : vers app.elsee.care/pricing/cartecadeau, avec les identifiants
//      Meta fbcid / fbp (paramètre d'URL ou cookies _fbc, _fbp) ;
//   3. onglets des cartes (.giftcard-tabs-menu) : le bouton radio suit l'onglet courant ;
//   4. bouton « J'offre une carte cadeau » (.tab-button) : vers le panier de l'app avec le plan
//      Stripe de l'onglet courant. Les numéros de plan (selectedPlan, feesStripeRef) sont ceux
//      d'Odoo : un changement d'offre se reporte ici.

(function () {
  if (window.__elseeCarteCadeau) return;
  window.__elseeCarteCadeau = true;

  // 1. Défilement des logos
  (function () {
  // Sélection des éléments
  const carouselTrack = document.getElementById('carousel-track');
  const carouselContainer = document.getElementById('carousel-container');
  if (!carouselTrack || !carouselContainer) return;


  // Variables pour le défilement
  let isHovered = false;
  let scrollSpeed = 1; // Ajustez la vitesse de défilement

  // Fonction de défilement
  function autoScroll() {
    if (!isHovered) {
      carouselTrack.scrollLeft += scrollSpeed; // Défilement horizontal
      if (carouselTrack.scrollLeft >= carouselTrack.scrollWidth - carouselContainer.offsetWidth) {
        carouselTrack.scrollLeft = 0; // Revenir au début pour un effet infini
      }
    }
    requestAnimationFrame(autoScroll);
  }

  // Gestion du survol
  carouselContainer.addEventListener('mouseenter', () => {
    isHovered = true; // Stoppe le défilement
  });
  carouselContainer.addEventListener('mouseleave', () => {
    isHovered = false; // Relance le défilement
  });

  // Lancer le défilement
  autoScroll();
  })();

  // 2. Liens .pass-fbcid (identifiants Meta)
  (function() {
      // Utilitaire pour lire les cookies
      function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
        return null;
      }

      // Fonction pour récupérer `fbcid` dans l'URL ou dans les cookies
      function getFbcid() {
        const urlParams = new URLSearchParams(window.location.search);
        const fbcidFromUrl = urlParams.get('fbcid');
        if (fbcidFromUrl) return fbcidFromUrl;

        const fbcidFromCookie = getCookie('_fbc');
        return fbcidFromCookie || null;
      }

      // Fonction pour récupérer `fbp`
      function getFbp() {
        const fbpCookie = getCookie('_fbp');
        return fbpCookie || null;
      }

      // Fonction pour rediriger l'utilisateur
      function navigateToTarget() {
        const fbcid = getFbcid();
        const fbp = getFbp();

        let targetUrl = "https://app.elsee.care/pricing/cartecadeau";

        if (fbcid || fbp) {
          const params = new URLSearchParams();
          if (fbcid) params.append('fbcid', fbcid);
          if (fbp) params.append('fbp', fbp);

          targetUrl += `?${params.toString()}`;
        }

        window.location.href = targetUrl;
      }

      // Ajout de l'écouteur de clic à tous les boutons avec la classe `.pass-fbcid`
      document.querySelectorAll('.pass-fbcid').forEach(function(button) {
        button.addEventListener('click', function(e) {
          e.preventDefault(); // Empêche la navigation par défaut
          navigateToTarget();
        });
      });
    })();

  // 3. Bouton radio des onglets
  (function () {
    document.addEventListener('DOMContentLoaded', function () {

      function updateGiftcardMenu(menuEl) {
        if (!menuEl) return;

        // Reset de tous les radios dans CE menu
        const radios = menuEl.querySelectorAll('.giftcard-tab-option-radio');
        radios.forEach(function (radio) {
          radio.classList.remove('is-selected');
          const bullets = radio.querySelectorAll('.giftcard-tab-option-radio-selected');
          bullets.forEach(function (b) {
            b.style.display = 'none';
          });
        });

        // On cherche le tab courant dans CE menu
        let currentLink = menuEl.querySelector('.giftcard-tablink.w--current');
        // fallback : si pour une raison X il n'y a pas de w--current, on prend le premier tab
        if (!currentLink) {
          currentLink = menuEl.querySelector('.giftcard-tablink');
        }
        if (!currentLink) return;

        const activeRadio = currentLink.querySelector('.giftcard-tab-option-radio');
        if (!activeRadio) return;

        activeRadio.classList.add('is-selected');
        const activeBullets = activeRadio.querySelectorAll('.giftcard-tab-option-radio-selected');
        activeBullets.forEach(function (b) {
          b.style.display = 'block';
        });
      }

      // Init : on passe sur tous les menus de cartes cadeau de la page
      document.querySelectorAll('.giftcard-tabs-menu').forEach(function (menuEl) {
        updateGiftcardMenu(menuEl);
      });

      // Clic sur un tab de carte cadeau (Ess, Lib, etc.)
      document.addEventListener('click', function (e) {
        const link = e.target.closest('.giftcard-tablink.w-tab-link');
        if (!link) return;

        const menuEl = link.closest('.giftcard-tabs-menu');
        if (!menuEl) return;

        // On laisse Webflow mettre à jour w--current, puis on sync nos radios
        setTimeout(function () {
          updateGiftcardMenu(menuEl);
        }, 0);
      });
    });
  })();

  // 4. Lien du bouton vers le panier
  (function () {
    document.addEventListener('DOMContentLoaded', function () {
      // Mapping des plans par groupe de tabs + tab courant
      const planMap = {
        essTab: {
          ess1: 'https://app.elsee.care/mon-panier?selectedPlan=115&feesStripeRef=121&isGiftCard=true',
          ess2: 'https://app.elsee.care/mon-panier?selectedPlan=117&feesStripeRef=118&isGiftCard=true',
          ess3: 'https://app.elsee.care/mon-panier?selectedPlan=116&feesStripeRef=119&isGiftCard=true'
        },
        libTab: {
          lib1: 'https://app.elsee.care/mon-panier?selectedPlan=111&feesStripeRef=118&isGiftCard=true',
          lib2: 'https://app.elsee.care/mon-panier?selectedPlan=113&feesStripeRef=119&isGiftCard=true',
          lib3: 'https://app.elsee.care/mon-panier?selectedPlan=114&feesStripeRef=120&isGiftCard=true'
        }
      };

      // Cible tous les boutons "J'offre une carte cadeau"
      const buttons = document.querySelectorAll('.tab-button');

      buttons.forEach(function (btn) {
        // On neutralise le comportement de tab Webflow pour ce bouton
        if (btn.hasAttribute('data-w-tab')) {
          btn.setAttribute('data-original-w-tab', btn.getAttribute('data-w-tab'));
          btn.removeAttribute('data-w-tab');
        }

        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          // On remonte au menu de cartes cadeau (essTab ou libTab)
          const menuEl = btn.closest('.giftcard-tabs-menu');
          if (!menuEl) {
            console.warn('tab-button sans menu .giftcard-tabs-menu parent');
            return;
          }

          const menuId = menuEl.id; // essTab ou libTab
          const currentTab = menuEl.querySelector('.giftcard-tablink.w--current');
          if (!currentTab) {
            console.warn('Aucun tab .giftcard-tablink.w--current trouvé dans', menuId);
            return;
          }

          const currentId = currentTab.id; // ess1 / ess2 / ess3 / lib1 / lib2 / lib3
          const url =
            planMap[menuId] &&
            planMap[menuId][currentId];

          if (!url) {
            console.warn('Pas d’URL configurée pour', menuId, currentId);
            return;
          }

          // Redirection vers l’URL correspondant au tab courant
          window.location.href = url;
        });
      });
    });
  })();
})();
