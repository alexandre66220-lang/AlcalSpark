(function () {
  'use strict';

  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      var answer = btn.nextElementSibling;
      var icon = btn.querySelector('.faq-icon');

      document.querySelectorAll('.faq-question').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        b.nextElementSibling.hidden = true;
        b.querySelector('.faq-icon').textContent = '+';
        b.closest('.faq-item').classList.remove('open');
      });

      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
        icon.textContent = '−';
        btn.closest('.faq-item').classList.add('open');
      }
    });
  });
})();
