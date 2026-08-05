/* ============================================================
   AlcalSpark — Configuration de disponibilité
   Cette valeur doit être mise à jour MANUELLEMENT et RÉGULIÈREMENT
   (dès qu'un projet est signé, livré, ou que le créneau change).
   Ne jamais la laisser statique et fausse.
   Format libre, ex : "mi-septembre 2026", "à partir du 12 octobre 2026".
   ============================================================ */
window.ALCALSPARK_NEXT_SLOT = 'mi-août 2026';

(function () {
  'use strict';
  var el = document.getElementById('dispo-slot');
  if (!el) return;
  var slot = window.ALCALSPARK_NEXT_SLOT || 'sur demande';
  el.textContent = 'Prochain créneau disponible : ' + slot + '.';
})();
