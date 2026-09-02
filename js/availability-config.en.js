/* ============================================================
   AlcalSpark — Availability configuration (EN)
   This value must be updated MANUALLY and REGULARLY
   (whenever a project is signed, delivered, or the slot changes).
   Keep in sync with js/availability-config.js (French version).
   Free format, e.g. "mid-September 2026", "starting October 12, 2026".
   ============================================================ */
window.ALCALSPARK_NEXT_SLOT = 'mid-August 2026';

(function () {
  'use strict';
  var el = document.getElementById('dispo-slot');
  if (!el) return;
  var slot = window.ALCALSPARK_NEXT_SLOT || 'on request';
  el.textContent = 'Next available slot: ' + slot + '.';
})();
