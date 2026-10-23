// ============================================================================
// avis.js — notes et avis : page /avis et modèle CMS « Partenaires » (/partenaires/*)
// ============================================================================
// 10 pages le 2026-10-23. /avis : réglages de la page, Custom code, pied de page ;
// partenaires : réglages du modèle, même endroit. Les deux avaient leur copie des trois mêmes
// blocs de notes ; /avis en avait deux de plus. Repris à l'identique, dans l'ordre de /avis :
//   1. grille Masonry de /avis (.masonry-grid) — la bibliothèque reste chargée par sa propre
//      balise, avant celle-ci (webflow/pages/avis/footer.html) ;
//   2. étoiles de chaque avis (.rating-widget[data-score], note sur 10 → 5 étoiles) ;
//   3. note moyenne sur 5 dans .average-score ;
//   4. étoiles de la moyenne dans .average-stars-widget ;
//   5. données structurées schema.org (Product, AggregateRating, Review) des avis
//      .review-featured, ajoutées dans <head> — seulement sur /avis, où ils existent.
// Les étoiles reprennent le CSS .star-icon et .average-star-icon de l'en-tête de la page.

(function () {
  if (window.__elseeAvis) return;
  window.__elseeAvis = true;

  // Étoile arrondie ; className est .star-icon (avis) ou .average-star-icon (moyenne).
  function createStar(className) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="${className}">
          <path fill="currentColor" d="M12 2.5c.4 0 .8.3.9.6l2 5.1 5.5.4c.8.1 1.1 1.1.5 1.6l-4.2 3.6 1.4 5.3c.2.8-.7 1.5-1.4 1L12 17.8l-4.7 2.4c-.7.4-1.6-.3-1.4-1l1.4-5.3-4.2-3.6c-.6-.5-.3-1.5.5-1.6l5.5-.4 2-5.1c.2-.4.5-.6.9-.6z"/>
        </svg>`;
    return wrapper.firstElementChild;
  }

  // Moyenne sur 10 des .rating-widget[data-score] lisibles, null s'il n'y en a aucun.
  function averageScore10() {
    const scoreList = [];
    document.querySelectorAll(".rating-widget").forEach(widget => {
      const score = parseFloat(widget.getAttribute("data-score"));
      if (!isNaN(score)) {
        scoreList.push(score);
      }
    });
    if (scoreList.length === 0) return null;
    const sum = scoreList.reduce((acc, val) => acc + val, 0);
    return sum / scoreList.length;
  }

  // 1. Grille Masonry (/avis)
  document.addEventListener("DOMContentLoaded", function () {
    const grid = document.querySelector('.masonry-grid');
    if (!grid || typeof Masonry === "undefined") return; // pages partenaires : pas de grille
    new Masonry(grid, {
      itemSelector: '.masonry-item',
      columnWidth: '.masonry-item',
      percentPosition: true,
      gutter: 24
    });
  });

  // 2. Étoiles de chaque avis
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".rating-widget").forEach(widget => {
      const score10 = parseFloat(widget.getAttribute("data-score"));
      const roundedScore10 = Math.round(score10); // Ex: 7.5 → 8
      const score5 = Math.round((roundedScore10 / 10) * 5); // Convert to 5 stars

      for (let i = 1; i <= 5; i++) {
        const star = createStar("star-icon");
        if (i <= score5) {
          star.classList.add("filled");
        }
        widget.appendChild(star);
      }
    });
  });

  // 3. Note moyenne sur 5
  document.addEventListener("DOMContentLoaded", function () {
    const average10 = averageScore10();
    if (average10 === null) return;
    const average5 = (average10 / 10 * 5).toFixed(1); // conversion sur 5

    const display = document.querySelector(".average-score");
    if (display) {
      display.textContent = average5;
    }
  });

  // 4. Étoiles de la moyenne
  document.addEventListener("DOMContentLoaded", function () {
    const average10 = averageScore10();
    if (average10 === null) return;
    const average5 = Math.round((average10 / 10 * 5) * 2) / 2; // ex: 4.3, 4.5…

    const container = document.querySelector(".average-stars-widget");
    if (!container) return;
    for (let i = 1; i <= 5; i++) {
      const star = createStar("average-star-icon");
      if (i <= Math.floor(average5)) {
        star.classList.add("filled");
      } else if (i - 0.5 === average5) {
        star.classList.add("filled");
        star.style.opacity = "0.5"; // optionnel pour simuler une demi-étoile
      }
      container.appendChild(star);
    }
  });

  // 5. Données structurées des avis mis en avant
  document.addEventListener("DOMContentLoaded", function () {
    // Note sur 10 de data-note → sur 5, à une décimale (NaN si absente).
    const note5Of = el => Math.round((parseFloat(el.dataset.note) / 10) * 5 * 10) / 10;

    let totalNote = 0;
    let validNotes = 0;
    document.querySelectorAll(".review-item").forEach(el => {
      const note5 = note5Of(el);
      if (!isNaN(note5)) {
        totalNote += note5;
        validNotes++;
      }
    });

    const reviews = [];
    document.querySelectorAll(".review-featured").forEach(el => {
      const note5 = note5Of(el);
      if (!isNaN(note5)) {
        reviews.push({
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": el.dataset.name
          },
          "datePublished": el.dataset.date,
          "reviewBody": el.dataset.comment,
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": note5,
            "bestRating": "5",
            "worstRating": "1"
          }
        });
      }
    });

    if (reviews.length > 0 && validNotes > 0) {
      const avg = Math.round((totalNote / validNotes) * 10) / 10;

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Elsee",
        "description": "Service de remboursement bien-être simple, rapide et bienveillant.",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": avg,
          "reviewCount": validNotes,
          "bestRating": "5",
          "worstRating": "1"
        },
        "review": reviews
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  });
})();
