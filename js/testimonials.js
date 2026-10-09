/* ─────────────────────────────────────────────────────────────
   Temoignages reutilisables.

   Markup attendu (la section reste masquee tant qu'il n'y a rien a afficher) :

     <section class="testimonials-section" data-testimonials="/data/testimonials.json"
              data-lang="fr" hidden>
       ...
       <div class="testimonials-grid" data-testimonials-list></div>
     </section>
     <script src="js/testimonials.js" defer></script>

   Source : data/testimonials.json, un tableau. Une entree n'est affichee que si
   elle est reelle et validee par toi :

     { "publie": true, "nom": "Prénom N.", "metier": "Plombier", "ville": "Castres",
       "texte": "Le témoignage tel que le client l'a écrit.", "texte_en": "(optionnel)" }

   Sans "publie": true, sans "nom" ou sans "texte", l'entree est ignoree.
   Tableau vide ou fichier absent : la section ne s'affiche jamais.
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function str(v) {
    return typeof v === 'string' ? v.trim() : '';
  }

  function render(section, items, lang) {
    var list = section.querySelector('[data-testimonials-list]');
    if (!list) return;

    var shown = 0;
    items.forEach(function (it) {
      if (!it || it.publie !== true) return;
      var name = str(it.nom);
      var text = (lang === 'en' && str(it.texte_en)) || str(it.texte);
      if (!name || !text) return;

      var fig = document.createElement('figure');
      fig.className = 'testimonial-card';

      var quote = document.createElement('blockquote');
      quote.textContent = text;
      fig.appendChild(quote);

      var cap = document.createElement('figcaption');
      var strong = document.createElement('strong');
      strong.textContent = name;
      cap.appendChild(strong);
      var meta = [str(it.metier), str(it.ville)].filter(Boolean).join(', ');
      if (meta) cap.appendChild(document.createTextNode(', ' + meta));
      fig.appendChild(cap);

      list.appendChild(fig);
      shown++;
    });

    if (shown > 0) section.hidden = false;
  }

  document.querySelectorAll('[data-testimonials]').forEach(function (section) {
    var url = section.getAttribute('data-testimonials');
    var lang = section.getAttribute('data-lang') === 'en' ? 'en' : 'fr';
    if (!url) return;
    fetch(url, { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (items) { if (Array.isArray(items)) render(section, items, lang); })
      .catch(function () { /* fichier absent ou invalide : on n'affiche rien */ });
  });
})();
