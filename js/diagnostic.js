(function () {
  'use strict';

  var axesRoot = document.getElementById('diag-axes');
  if (!axesRoot) return;

  var AXIS_ORDER = ['presence', 'identite', 'performance'];
  var AXIS_META = {
    presence:    { icon: '◈', label: 'Présence web' },
    identite:    { icon: '✦', label: 'Identité visuelle' },
    performance: { icon: '◎', label: 'Performance et conversion' }
  };

  var results = {};

  function ce(tag, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  /* ── Rendu d'une question oui/non ──────────────────────────── */
  function askYesNo(bodyEl, question, onAnswer) {
    var step = ce('div', 'diag-step');
    var q = ce('p', 'diag-question');
    q.textContent = question;

    var answers = ce('div', 'diag-answers');
    var yesBtn = ce('button', 'diag-answer');
    yesBtn.type = 'button';
    yesBtn.textContent = 'Oui';
    var noBtn = ce('button', 'diag-answer');
    noBtn.type = 'button';
    noBtn.textContent = 'Non';

    answers.appendChild(yesBtn);
    answers.appendChild(noBtn);
    step.appendChild(q);
    step.appendChild(answers);
    bodyEl.appendChild(step);

    requestAnimationFrame(function () { step.classList.add('is-visible'); });

    function resolve(value, chosenBtn) {
      yesBtn.disabled = true;
      noBtn.disabled = true;
      chosenBtn.classList.add('is-chosen');
      step.classList.add('is-answered');
      onAnswer(value);
    }

    yesBtn.addEventListener('click', function () { resolve(true, yesBtn); });
    noBtn.addEventListener('click', function () { resolve(false, noBtn); });
  }

  /* ── Rendu de la recommandation finale d'un axe ────────────── */
  function renderLeaf(axisId, bodyEl, leaf) {
    var leafEl = ce('div', 'diag-leaf' + (leaf.optional ? ' is-optional' : ''));
    var tag = ce('span', 'diag-leaf-tag');
    tag.textContent = leaf.tag;
    var title = ce('h4', 'diag-leaf-title');
    title.textContent = leaf.title;
    var desc = ce('p', 'diag-leaf-desc');
    desc.textContent = leaf.desc;

    leafEl.appendChild(tag);
    leafEl.appendChild(title);
    leafEl.appendChild(desc);
    bodyEl.appendChild(leafEl);
    requestAnimationFrame(function () { leafEl.classList.add('is-visible'); });

    var axisEl = axesRoot.querySelector('.diag-axis[data-axis="' + axisId + '"]');
    var statusEl = axisEl.querySelector('.diag-axis-status');
    statusEl.textContent = 'Complété';
    axisEl.classList.remove('is-started');
    axisEl.classList.add('is-complete');

    results[axisId] = leaf;
    updateProgress();
  }

  /* ── Axe 1 : Présence web ───────────────────────────────── */
  function startPresence(bodyEl) {
    askYesNo(bodyEl, 'Avez-vous actuellement un site web ?', function (hasSite) {
      if (!hasSite) {
        renderLeaf('presence', bodyEl, {
          tag: "Création complète d'un site web",
          title: 'Pas encore de site web',
          desc: "C'est la priorité n°1 : poser des fondations solides pour exister en ligne."
        });
        return;
      }
      askYesNo(bodyEl, 'Est-ce que votre site est à jour ?', function (upToDate) {
        askYesNo(bodyEl, "Est-ce qu'il génère du trafic ?", function (hasTraffic) {
          var leaf;
          if (upToDate && hasTraffic) {
            leaf = {
              tag: 'Passage optionnel',
              title: 'Site récent et performant',
              desc: 'Votre site est à jour et génère déjà du trafic. Un accompagnement reste possible pour aller plus loin.',
              optional: true
            };
          } else if (upToDate && !hasTraffic) {
            leaf = {
              tag: 'Stratégie SEO et marketing',
              title: 'Site récent, mais invisible',
              desc: "Le site est solide : il manque une stratégie pour l'exposer à votre audience."
            };
          } else if (!upToDate && hasTraffic) {
            leaf = {
              tag: 'Refonte design et UX',
              title: 'Site daté malgré le trafic',
              desc: 'Le trafic existe déjà : une refonte design et UX permettra de mieux le convertir.'
            };
          } else {
            leaf = {
              tag: 'Refonte complète',
              title: 'Site daté et invisible',
              desc: "Ni à jour ni visible : une refonte complète, technique et stratégique, s'impose."
            };
          }
          renderLeaf('presence', bodyEl, leaf);
        });
      });
    });
  }

  /* ── Axe 2 : Identité visuelle ───────────────────────────── */
  function startIdentite(bodyEl) {
    askYesNo(bodyEl, 'Avez-vous une identité visuelle définie ?', function (hasIdentity) {
      if (!hasIdentity) {
        renderLeaf('identite', bodyEl, {
          tag: "Création d'identité visuelle",
          title: "Pas encore d'identité visuelle",
          desc: 'Logo, couleurs, typographies : construisons une identité qui vous ressemble vraiment.'
        });
        return;
      }
      askYesNo(bodyEl, "Est-ce qu'elle est cohérente sur tous vos supports ?", function (isCoherent) {
        if (isCoherent) {
          renderLeaf('identite', bodyEl, {
            tag: 'Passage optionnel',
            title: 'Identité cohérente',
            desc: "Votre identité est alignée sur tous vos supports. Rien d'urgent de ce côté.",
            optional: true
          });
        } else {
          renderLeaf('identite', bodyEl, {
            tag: 'Harmonisation et branding',
            title: 'Identité à harmoniser',
            desc: "L'identité existe, mais varie d'un support à l'autre : un travail d'harmonisation s'impose."
          });
        }
      });
    });
  }

  /* ── Axe 3 : Performance et conversion ─────────────────────── */
  function startPerformance(bodyEl) {
    askYesNo(bodyEl, 'Avez-vous du trafic actuellement ?', function (hasTraffic) {
      if (!hasTraffic) {
        renderLeaf('performance', bodyEl, {
          tag: 'Stratégie de génération de trafic',
          title: 'Pas encore de trafic',
          desc: "Avant d'optimiser, il faut d'abord attirer : une stratégie d'acquisition est prioritaire."
        });
        return;
      }
      askYesNo(bodyEl, 'Est-ce que vous mesurez vos conversions ?', function (measures) {
        if (!measures) {
          renderLeaf('performance', bodyEl, {
            tag: 'Tracking et analyse des données',
            title: 'Trafic non mesuré',
            desc: 'Vous avez du trafic, mais aucune visibilité sur vos conversions : mettons le tracking en place.'
          });
          return;
        }
        askYesNo(bodyEl, 'Est-ce que vous optimisez votre tunnel de conversion ?', function (optimizes) {
          if (optimizes) {
            renderLeaf('performance', bodyEl, {
              tag: 'Optimisation continue et stratégie avancée',
              title: 'Tunnel déjà optimisé',
              desc: "Vous êtes déjà dans une démarche avancée : passons à l'optimisation continue.",
              optional: true
            });
          } else {
            renderLeaf('performance', bodyEl, {
              tag: 'Audit et optimisation du tunnel',
              title: 'Conversions mesurées, tunnel à optimiser',
              desc: "Vous mesurez déjà : il est temps d'auditer et d'optimiser votre tunnel de conversion."
            });
          }
        });
      });
    });
  }

  var STARTERS = {
    presence: startPresence,
    identite: startIdentite,
    performance: startPerformance
  };

  /* ── Progression globale ────────────────────────────────────── */
  function updateProgress() {
    var done = Object.keys(results).length;
    var label = document.getElementById('diag-progress-label');
    var fill = document.getElementById('diag-progress-fill');
    if (label) label.textContent = done + '/3 axes complétés';
    if (fill) fill.style.width = (done / AXIS_ORDER.length * 100) + '%';
    if (done === AXIS_ORDER.length) revealFinal();
  }

  /* ── Synthèse finale ─────────────────────────────────────── */
  function revealFinal() {
    var finalEl = document.getElementById('diag-final');
    if (!finalEl || finalEl.dataset.shown) return;
    finalEl.dataset.shown = '1';

    var list = document.getElementById('diag-recap-list');
    if (list) {
      AXIS_ORDER.forEach(function (axisId) {
        var leaf = results[axisId];
        var meta = AXIS_META[axisId];
        var li = ce('li', 'diag-recap-item card');
        var icon = ce('span', 'diag-recap-icon');
        icon.textContent = meta.icon;
        icon.setAttribute('aria-hidden', 'true');
        var body = ce('div', 'diag-recap-body');
        var axisLabel = ce('span', 'diag-recap-axis');
        axisLabel.textContent = meta.label;
        var tag = ce('strong', 'diag-recap-tag');
        tag.textContent = leaf.tag;
        body.appendChild(axisLabel);
        body.appendChild(tag);
        li.appendChild(icon);
        li.appendChild(body);
        list.appendChild(li);
      });
    }

    var recapField = document.getElementById('diag-recap-field');
    if (recapField) {
      recapField.value = AXIS_ORDER.map(function (axisId) {
        return AXIS_META[axisId].label + ' : ' + results[axisId].tag;
      }).join(' | ');
    }

    finalEl.hidden = false;
    requestAnimationFrame(function () { finalEl.classList.add('is-visible'); });

    setTimeout(function () {
      finalEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 550);
  }

  /* ── Ouverture / fermeture des cartes-axes ─────────────────── */
  axesRoot.querySelectorAll('.diag-axis').forEach(function (axisEl) {
    var toggle = axisEl.querySelector('.diag-axis-toggle');
    var body = axisEl.querySelector('.diag-axis-body');
    var axisId = axisEl.dataset.axis;
    var statusEl = axisEl.querySelector('.diag-axis-status');

    toggle.addEventListener('click', function () {
      var isOpen = axisEl.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      body.hidden = !isOpen;

      if (isOpen && !axisEl.dataset.started) {
        axisEl.dataset.started = '1';
        axisEl.classList.add('is-started');
        if (statusEl) statusEl.textContent = 'En cours';
        STARTERS[axisId](body);
      }
    });
  });
})();
