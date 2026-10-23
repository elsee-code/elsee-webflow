// ============================================================================
// slider-hero.js — carrousel du haut de /reseau-elsee
// ============================================================================
// Réglages de la page, Custom code, pied de page. Repris à l'identique : carrousel en boucle
// (.js-hero-slider, clones en tête et en queue), points de navigation, défilement automatique
// toutes les 4 s, en pause au survol et quand l'onglet est caché.

(function () {
  if (window.__elseeSliderHero) return;
  window.__elseeSliderHero = true;

  // Carrousel
  document.addEventListener('DOMContentLoaded', function () {
    const slider = document.querySelector('.js-hero-slider');
    if (!slider) return;

    const track = slider.querySelector('.js-hero-slider-track');
    const originalSlides = Array.from(track.querySelectorAll('.js-hero-slide'));
    const dotsContainer = slider.querySelector('.js-hero-dots');

    if (!track || !originalSlides.length || !dotsContainer) return;

    const AUTOPLAY_DELAY = 4000;

    let currentIndex = 1;
    let autoplayTimer = null;

    /* -------------------------
    CLONES POUR LOOP INFINI
    ------------------------- */

    const firstClone = originalSlides[0].cloneNode(true);
    const lastClone = originalSlides[originalSlides.length - 1].cloneNode(true);

    firstClone.classList.add('is-clone');
    lastClone.classList.add('is-clone');

    track.appendChild(firstClone);
    track.insertBefore(lastClone, originalSlides[0]);

    const slides = Array.from(track.querySelectorAll('.js-hero-slide'));

    /* -------------------------
    LARGEUR SLIDE
    ------------------------- */

    function getSlideWidth() {
      return slides[0].getBoundingClientRect().width;
    }

    function updatePosition(animate = true) {
      const offset = -(getSlideWidth() * currentIndex);
      track.style.transition = animate ? "transform 0.7s ease" : "none";
      track.style.transform = `translateX(${offset}px)`;
    }

    /* -------------------------
    DOTS
    ------------------------- */

    const dots = originalSlides.map((_, index) => {
      const dot = document.createElement('button');
      dot.classList.add('hero-dot');

      if (index === 0) dot.classList.add('is-active');

      dot.addEventListener('click', () => {
        goToSlide(index + 1);
        startAutoplay();
      });

      dotsContainer.appendChild(dot);

      return dot;
    });

    function updateDots() {
      let dotIndex = currentIndex - 1;

      if (dotIndex < 0) dotIndex = originalSlides.length - 1;
      if (dotIndex >= originalSlides.length) dotIndex = 0;

      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === dotIndex);
      });
    }

    /* -------------------------
    NAVIGATION
    ------------------------- */

    function goToSlide(index) {
      currentIndex = index;
      updatePosition(true);
      updateDots();
    }

    function nextSlide() {
      currentIndex++;
      updatePosition(true);
    }

    /* -------------------------
    LOOP CORRECTION
    ------------------------- */

    track.addEventListener('transitionend', () => {
      if (slides[currentIndex].classList.contains('is-clone')) {
        if (currentIndex === slides.length - 1) {
          currentIndex = 1;
        }

        if (currentIndex === 0) {
          currentIndex = slides.length - 2;
        }

        updatePosition(false);
      }

      updateDots();
    });

    /* -------------------------
    AUTOPLAY
    ------------------------- */

    // Repart de zéro : un clic sur un point relance aussi le délai.
    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(nextSlide, AUTOPLAY_DELAY);
    }

    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
    }

    /* -------------------------
    HOVER PAUSE
    ------------------------- */

    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);

    /* -------------------------
    RESIZE
    ------------------------- */

    window.addEventListener('resize', () => {
      updatePosition(false);
    });

    /* stop autoplay si l'utilisateur quitte l'onglet */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    /* -------------------------
    INIT
    ------------------------- */

    updatePosition(false);
    startAutoplay();
  });
})();
