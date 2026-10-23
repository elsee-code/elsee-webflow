// ============================================================================
// video-presentation.js — vidéo flottante de présentation (accueil, /avantages)
// ============================================================================
// Le lecteur #psWidget apparaît en bas à gauche 2 s après le chargement, en aperçu muet qui
// boucle ; un clic lance la vidéo principale avec le son, et un second bouton (#psHowItWorks)
// bascule vers une autre vidéo. Le HTML du lecteur et son CSS restent dans le bloc Embed
// (webflow/embeds/video-presentation.html).
//
// Les deux pages avaient chacune leur copie du script, qui ne différaient que par les vidéos,
// les libellés du bouton et le nom de la variante. Ces réglages passent sur la balise :
//   data-apercu               aperçu muet en boucle
//   data-principale           vidéo lancée au clic
//   data-secondaire           vidéo du second bouton
//   data-libelle-secondaire   texte du second bouton quand la vidéo principale est choisie
//   data-libelle-principale   texte du second bouton quand la vidéo secondaire joue
//   data-variante-secondaire  valeur de video.dataset.variant pendant la vidéo secondaire
// Le reste est repris à l'identique.

(function () {
  if (window.__elseeVideoPresentation) return;
  window.__elseeVideoPresentation = true;

  // Réglages lus sur la balise elle-même, pendant son exécution (document.currentScript
  // n'existe plus dans les écouteurs).
  const config = (document.currentScript && document.currentScript.dataset) || {};

  document.addEventListener("DOMContentLoaded", function () {
    const PREVIEW_SRC = config.apercu;
    const FULL_SRC = config.principale;
    const HOW_IT_WORKS_SRC = config.secondaire;
    const LABEL_TO_SECONDARY = config.libelleSecondaire;
    const LABEL_TO_MAIN = config.libellePrincipale;
    const SECONDARY_VARIANT = config.varianteSecondaire;

    if (!PREVIEW_SRC || !FULL_SRC || !HOW_IT_WORKS_SRC || !LABEL_TO_SECONDARY || !LABEL_TO_MAIN || !SECONDARY_VARIANT) {
      console.error("[video-presentation] réglage manquant sur la balise : data-apercu, data-principale, data-secondaire, data-libelle-secondaire, data-libelle-principale, data-variante-secondaire");
      return;
    }

    const START_AT = 0;
    const DELAY = 2000;

    const widget = document.getElementById("psWidget");
    const video = document.getElementById("psVideo");
    const closeBtn = document.getElementById("psClose");
    const controlBtn = document.getElementById("psControl");
    const icon = document.getElementById("psIcon");
    const progress = document.getElementById("psProgress");
    const progressBar = document.getElementById("psProgressBar");
    const actionButtons = document.getElementById("psActionButtons");
    const howItWorksBtn = document.getElementById("psHowItWorks");

    if (!widget || !video || !closeBtn || !controlBtn || !icon || !progress || !progressBar || !actionButtons || !howItWorksBtn) return;

    let secondaryVideoActive = false;

    function showWidget() {
      widget.classList.remove("is-hidden");
      widget.classList.add("is-visible");
    }

    function showActionButtons() {
      actionButtons.classList.add("is-visible");
      actionButtons.setAttribute("aria-hidden", "false");
    }

    function hideActionButtons() {
      actionButtons.classList.remove("is-visible");
      actionButtons.setAttribute("aria-hidden", "true");
    }

    function setHowItWorksButtonLabel() {
      howItWorksBtn.textContent = secondaryVideoActive ? LABEL_TO_MAIN : LABEL_TO_SECONDARY;
    }

    function setControlState(state) {
      controlBtn.classList.remove("is-preview", "is-playing", "is-paused");

      if (state === "preview") {
        controlBtn.classList.add("is-preview");
        icon.className = "fa-solid fa-play";
        controlBtn.setAttribute("aria-label", "Lire la vidéo");
        progress.classList.remove("is-visible");
        hideActionButtons();
        return;
      }

      if (state === "playing") {
        controlBtn.classList.add("is-playing");
        icon.className = "fa-solid fa-pause";
        controlBtn.setAttribute("aria-label", "Mettre en pause");
        progress.classList.add("is-visible");
        hideActionButtons();
        return;
      }

      if (state === "paused") {
        controlBtn.classList.add("is-paused");
        icon.className = "fa-solid fa-play";
        controlBtn.setAttribute("aria-label", "Relancer la vidéo");
        progress.classList.add("is-visible");
        showActionButtons();
      }
    }

    function resetProgress() {
      progressBar.style.width = "0%";
      progress.classList.remove("is-visible");
    }

    function updateProgress() {
      if (video.dataset.mode !== "full" || !video.duration || !isFinite(video.duration)) {
        progressBar.style.width = "0%";
        return;
      }

      const percent = Math.max(0, Math.min(100, (video.currentTime / video.duration) * 100));
      progressBar.style.width = percent + "%";
    }

    function loadPreview() {
      if (video.dataset.mode === "preview") return;

      video.src = PREVIEW_SRC;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.dataset.mode = "preview";
      video.dataset.variant = "preview";
      secondaryVideoActive = false;
      setHowItWorksButtonLabel();
      resetProgress();
      setControlState("preview");

      video.play().catch(() => {});
    }

    function startVideoSource(src, startAt) {
      video.pause();
      video.loop = false;
      video.muted = true;

      const onReady = function () {
        try {
          const maxTime = Math.max(0, (video.duration || startAt) - 0.25);
          video.currentTime = Math.min(startAt, maxTime);
        } catch (e) {}

        updateProgress();
        video.muted = false;
        video.play().catch(() => {});
      };

      video.src = src;
      video.dataset.mode = "full";
      video.load();
      video.addEventListener("loadedmetadata", onReady, { once: true });
    }

    function startFullVideo() {
      secondaryVideoActive = false;
      setHowItWorksButtonLabel();
      video.dataset.variant = "main";
      startVideoSource(FULL_SRC, START_AT);
    }

    function startHowItWorksVideo() {
      secondaryVideoActive = true;
      setHowItWorksButtonLabel();
      video.dataset.variant = SECONDARY_VARIANT;
      startVideoSource(HOW_IT_WORKS_SRC, 0);
    }

    function toggleFullVideo() {
      if (video.dataset.mode === "preview") {
        startFullVideo();
        return;
      }

      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    window.addEventListener("load", function () {
      setTimeout(function () {
        showWidget();
        setTimeout(loadPreview, 800);
      }, DELAY);
    });

    controlBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleFullVideo();
      controlBtn.blur();
    });

    video.addEventListener("click", function () {
      if (video.dataset.mode === "preview") {
        startFullVideo();
      } else if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });

    video.addEventListener("play", function () {
      if (video.dataset.mode === "preview") {
        setControlState("preview");
      } else {
        setControlState("playing");
      }
    });

    video.addEventListener("pause", function () {
      if (video.dataset.mode === "full") {
        setControlState("paused");
      }
    });

    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("loadedmetadata", updateProgress);

    video.addEventListener("ended", function () {
      if (video.dataset.mode === "full") {
        setControlState("paused");
        updateProgress();
      }
    });

    howItWorksBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      hideActionButtons();

      if (secondaryVideoActive) {
        startFullVideo();
      } else {
        startHowItWorksVideo();
      }
    });

    closeBtn.addEventListener("click", function () {
      video.pause();
      widget.remove();
    });
  });
})();
