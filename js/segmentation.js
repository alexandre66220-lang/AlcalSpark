/* ============================================================
   AlcalSpark — Segmentation "Vous êtes..."
   Événements Google Analytics distincts par cible, pour mesurer
   plus tard laquelle des deux cibles convertit le mieux.
   ============================================================ */
(function () {
  'use strict';

  document.querySelectorAll('.segment-btn[data-segment]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (typeof window.gtag !== 'function') return;
      window.gtag('event', 'segment_click', {
        segment: btn.dataset.segment
      });
    });
  });
})();
