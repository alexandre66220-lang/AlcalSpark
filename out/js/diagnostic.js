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

  var axisAnswers = { presence: [], identite: [], performance: [] };
  var results = {};

  function ce(tag, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  /* ── Arbres de décision : fonctions pures (réponses -> état) ─── */
  function computePresence(answers) {
    if (answers.length === 0) return { question: 'Avez-vous actuellement un site web ?' };
    if (answers[0] === false) {
      return { leaf: {
        tag: "Création complète d'un site web",
        title: 'Pas encore de site web',
        desc: "C'est la priorité n°1 : poser des fondations solides pour exister en ligne."
      } };
    }
    if (answers.length === 1) return { question: 'Est-ce que votre site est à jour ?' };
    if (answers.length === 2) return { question: "Est-ce qu'il génère du trafic ?" };

    var upToDate = answers[1], hasTraffic = answers[2];
    if (upToDate && hasTraffic) {
      return { leaf: {
        tag: 'Passage optionnel',
        title: 'Site récent et performant',
        desc: 'Votre site est à jour et génère déjà du trafic. Un accompagnement reste possible pour aller plus loin.',
        optional: true
      } };
    }
    if (upToDate && !hasTraffic) {
      return { leaf: {
        tag: 'Stratégie SEO et marketing',
        title: 'Site récent, mais invisible',
        desc: "Le site est solide : il manque une stratégie pour l'exposer à votre audience."
      } };
    }
    if (!upToDate && hasTraffic) {
      return { leaf: {
        tag: 'Refonte design et UX',
        title: 'Site daté malgré le trafic',
        desc: 'Le trafic existe déjà : une refonte design et UX permettra de mieux le convertir.'
      } };
    }
    return { leaf: {
      tag: 'Refonte complète',
      title: 'Site daté et invisible',
      desc: "Ni à jour ni visible : une refonte complète, technique et stratégique, s'impose."
    } };
  }

  function computeIdentite(answers) {
    if (answers.length === 0) return { question: 'Avez-vous une identité visuelle définie ?' };
    if (answers[0] === false) {
      return { leaf: {
        tag: "Création d'identité visuelle",
        title: "Pas encore d'identité visuelle",
        desc: 'Logo, couleurs, typographies : construisons une identité qui vous ressemble vraiment.'
      } };
    }
    if (answers.length === 1) return { question: "Est-ce qu'elle est cohérente sur tous vos supports ?" };

    if (answers[1]) {
      return { leaf: {
        tag: 'Passage optionnel',
        title: 'Identité cohérente',
        desc: "Votre identité est alignée sur tous vos supports. Rien d'urgent de ce côté.",
        optional: true
      } };
    }
    return { leaf: {
      tag: 'Harmonisation et branding',
      title: 'Identité à harmoniser',
      desc: "L'identité existe, mais varie d'un support à l'autre : un travail d'harmonisation s'impose."
    } };
  }

  function computePerformance(answers) {
    if (answers.length === 0) return { question: 'Avez-vous du trafic actuellement ?' };
    if (answers[0] === false) {
      return { leaf: {
        tag: 'Stratégie de génération de trafic',
        title: 'Pas encore de trafic',
        desc: "Avant d'optimiser, il faut d'abord attirer : une stratégie d'acquisition est prioritaire."
      } };
    }
    if (answers.length === 1) return { question: 'Est-ce que vous mesurez vos conversions ?' };
    if (answers[1] === false) {
      return { leaf: {
        tag: 'Tracking et analyse des données',
        title: 'Trafic non mesuré',
        desc: 'Vous avez du trafic, mais aucune visibilité sur vos conversions : mettons le tracking en place.'
      } };
    }
    if (answers.length === 2) return { question: 'Est-ce que vous optimisez votre tunnel de conversion ?' };

    if (answers[2]) {
      return { leaf: {
        tag: 'Optimisation continue et stratégie avancée',
        title: 'Tunnel déjà optimisé',
        desc: "Vous êtes déjà dans une démarche avancée : passons à l'optimisation continue.",
        optional: true
      } };
    }
    return { leaf: {
      tag: 'Audit et optimisation du tunnel',
      title: 'Conversions mesurées, tunnel à optimiser',
      desc: "Vous mesurez déjà : il est temps d'auditer et d'optimiser votre tunnel de conversion."
    } };
  }

  var COMPUTE = {
    presence: computePresence,
    identite: computeIdentite,
    performance: computePerformance
  };

  /* ── Rendu ──────────────────────────────────────────────────── */
  function makeAnswerBtn(label, isChosen) {
    var btn = ce('button', 'diag-answer' + (isChosen ? ' is-chosen' : ''));
    btn.type = 'button';
    btn.textContent = label;
    return btn;
  }

  function renderStep(bodyEl, axisId, index, questionText, chosenValue) {
    var resolved = chosenValue !== null;
    var step = ce('div', 'diag-step' + (resolved ? ' is-answered' : ''));
    var q = ce('p', 'diag-question');
    q.textContent = questionText;

    var answersEl = ce('div', 'diag-answers');
    var yesBtn = makeAnswerBtn('Oui', chosenValue === true);
    var noBtn = makeAnswerBtn('Non', chosenValue === false);
    answersEl.appendChild(yesBtn);
    answersEl.appendChild(noBtn);

    step.appendChild(q);
    step.appendChild(answersEl);

    if (resolved) {
      var hint = ce('span', 'diag-step-edit-hint');
      hint.textContent = 'Cliquez pour modifier votre réponse';
      step.appendChild(hint);
    }

    bodyEl.appendChild(step);
    requestAnimationFrame(function () { step.classList.add('is-visible'); });

    function pick(value) {
      if (chosenValue === value) return;
      axisAnswers[axisId] = axisAnswers[axisId].slice(0, index);
      axisAnswers[axisId].push(value);
      renderAxis(axisId);
    }
    yesBtn.addEventListener('click', function () { pick(true); });
    noBtn.addEventListener('click', function () { pick(false); });
  }

  function renderLeaf(bodyEl, leaf) {
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
  }

  function renderAxis(axisId) {
    var axisEl = axesRoot.querySelector('.diag-axis[data-axis="' + axisId + '"]');
    var bodyEl = axisEl.querySelector('.diag-axis-body');
    var answers = axisAnswers[axisId];
    var compute = COMPUTE[axisId];

    bodyEl.innerHTML = '';

    for (var i = 0; i < answers.length; i++) {
      var priorState = compute(answers.slice(0, i));
      renderStep(bodyEl, axisId, i, priorState.question, answers[i]);
    }

    var current = compute(answers);
    if (current.leaf) {
      renderLeaf(bodyEl, current.leaf);
    } else {
      renderStep(bodyEl, axisId, answers.length, current.question, null);
    }

    syncAxisResult(axisId, axisEl, current.leaf || null);
  }

  /* ── Progression & synthèse ─────────────────────────────────── */
  function syncAxisResult(axisId, axisEl, leaf) {
    var statusEl = axisEl.querySelector('.diag-axis-status');
    if (leaf) {
      results[axisId] = leaf;
      axisEl.classList.remove('is-started');
      axisEl.classList.add('is-complete');
      if (statusEl) statusEl.textContent = 'Complété';
    } else {
      delete results[axisId];
      axisEl.classList.add('is-started');
      axisEl.classList.remove('is-complete');
      if (statusEl) statusEl.textContent = 'En cours';
    }
    updateProgress();
  }

  function updateProgress() {
    var done = Object.keys(results).length;
    var label = document.getElementById('diag-progress-label');
    var fill = document.getElementById('diag-progress-fill');
    if (label) label.textContent = done + '/3 axes complétés';
    if (fill) fill.style.width = (done / AXIS_ORDER.length * 100) + '%';

    if (done === AXIS_ORDER.length) revealFinal();
    else hideFinal();
  }

  function revealFinal() {
    var finalEl = document.getElementById('diag-final');
    if (!finalEl) return;

    var list = document.getElementById('diag-recap-list');
    if (list) {
      list.innerHTML = '';
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

    var firstReveal = !finalEl.dataset.shown;
    finalEl.dataset.shown = '1';
    finalEl.hidden = false;
    requestAnimationFrame(function () { finalEl.classList.add('is-visible'); });

    if (firstReveal) {
      setTimeout(function () {
        finalEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 550);
    }
  }

  function hideFinal() {
    var finalEl = document.getElementById('diag-final');
    if (!finalEl || finalEl.hidden) return;
    finalEl.classList.remove('is-visible');
    setTimeout(function () {
      if (Object.keys(results).length < AXIS_ORDER.length) {
        finalEl.hidden = true;
        delete finalEl.dataset.shown;
      }
    }, 400);
  }

  /* ── Indicateur visible "Axe X sur 3" (au-delà du compteur discret) */
  var stepIndicator = document.getElementById('diag-step-indicator');
  function updateStepIndicator(openAxisId) {
    if (!stepIndicator) return;
    if (!openAxisId) { stepIndicator.textContent = ''; return; }
    var position = AXIS_ORDER.indexOf(openAxisId) + 1;
    stepIndicator.textContent = 'Axe ' + position + ' sur ' + AXIS_ORDER.length + ' · ' + AXIS_META[openAxisId].label;
  }

  /* ── Ouverture / fermeture des cartes-axes ─────────────────── */
  axesRoot.querySelectorAll('.diag-axis').forEach(function (axisEl) {
    var toggle = axisEl.querySelector('.diag-axis-toggle');
    var body = axisEl.querySelector('.diag-axis-body');
    var axisId = axisEl.dataset.axis;

    toggle.addEventListener('click', function () {
      var isOpen = axisEl.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      body.hidden = !isOpen;
      updateStepIndicator(isOpen ? axisId : null);

      if (isOpen && !axisEl.dataset.started) {
        axisEl.dataset.started = '1';
        renderAxis(axisId);
      }
    });
  });
})();
