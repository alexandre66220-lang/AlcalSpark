(function () {
  'use strict';

  // Desktop uniquement : le CSS gère le mobile (image statique)
  if (window.innerWidth < 768) return;

  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length < 2) return;

  var current = 0;

  function advance() {
    slides[current].classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
  }

  setInterval(advance, 5000);
})();
