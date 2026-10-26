(function () {
  'use strict';

  var axesRoot = document.getElementById('diag-axes');
  if (!axesRoot) return;

  var AXIS_ORDER = ['presence', 'identite', 'performance'];
  var AXIS_META = {
    presence:    { icon: '◈', label: 'Web presence' },
    identite:    { icon: '✦', label: 'Visual identity' },
    performance: { icon: '◎', label: 'Performance & conversion' }
  };

  var axisAnswers = { presence: [], identite: [], performance: [] };
  var results = {};

  function ce(tag, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  /* ── Decision trees: pure functions (answers -> state) ─── */
  function computePresence(answers) {
    if (answers.length === 0) return { question: 'Do you currently have a website?' };
    if (answers[0] === false) {
      return { leaf: {
        tag: 'Full website creation',
        title: 'No website yet',
        desc: 'This is priority #1: lay solid foundations to exist online.'
      } };
    }
    if (answers.length === 1) return { question: 'Is your site up to date?' };
    if (answers.length === 2) return { question: 'Does it generate traffic?' };

    var upToDate = answers[1], hasTraffic = answers[2];
    if (upToDate && hasTraffic) {
      return { leaf: {
        tag: 'Optional next step',
        title: 'Recent, high-performing site',
        desc: 'Your site is up to date and already generates traffic. Support is still available to go further.',
        optional: true
      } };
    }
    if (upToDate && !hasTraffic) {
      return { leaf: {
        tag: 'SEO & marketing strategy',
        title: 'Recent site, but invisible',
        desc: 'The site is solid: it just needs a strategy to reach your audience.'
      } };
    }
    if (!upToDate && hasTraffic) {
      return { leaf: {
        tag: 'Design & UX redesign',
        title: 'Dated site despite traffic',
        desc: 'The traffic is already there: a design and UX redesign will convert it better.'
      } };
    }
    return { leaf: {
      tag: 'Full redesign',
      title: 'Dated and invisible site',
      desc: 'Neither up to date nor visible: a full technical and strategic redesign is needed.'
    } };
  }

  function computeIdentite(answers) {
    if (answers.length === 0) return { question: 'Do you have a defined visual identity?' };
    if (answers[0] === false) {
      return { leaf: {
        tag: 'Visual identity creation',
        title: 'No visual identity yet',
        desc: "Logo, colors, typography: let's build an identity that truly reflects you."
      } };
    }
    if (answers.length === 1) return { question: 'Is it consistent across all your channels?' };

    if (answers[1]) {
      return { leaf: {
        tag: 'Optional next step',
        title: 'Consistent identity',
        desc: 'Your identity is aligned across all your channels. Nothing urgent on that front.',
        optional: true
      } };
    }
    return { leaf: {
      tag: 'Harmonization & branding',
      title: 'Identity needs harmonizing',
      desc: 'The identity exists, but varies from one channel to another: harmonization work is needed.'
    } };
  }

  function computePerformance(answers) {
    if (answers.length === 0) return { question: 'Do you currently have traffic?' };
    if (answers[0] === false) {
      return { leaf: {
        tag: 'Traffic generation strategy',
        title: 'No traffic yet',
        desc: 'Before optimizing, you first need to attract: an acquisition strategy comes first.'
      } };
    }
    if (answers.length === 1) return { question: 'Do you measure your conversions?' };
    if (answers[1] === false) {
      return { leaf: {
        tag: 'Tracking & data analysis',
        title: 'Traffic not measured',
        desc: "You have traffic, but no visibility on your conversions: let's set up tracking."
      } };
    }
    if (answers.length === 2) return { question: 'Do you optimize your conversion funnel?' };

    if (answers[2]) {
      return { leaf: {
        tag: 'Continuous optimization & advanced strategy',
        title: 'Funnel already optimized',
        desc: "You're already in an advanced stage: let's move on to continuous optimization.",
        optional: true
      } };
    }
    return { leaf: {
      tag: 'Funnel audit & optimization',
      title: 'Conversions measured, funnel to optimize',
      desc: "You're already measuring: it's time to audit and optimize your conversion funnel."
    } };
  }

  var COMPUTE = {
    presence: computePresence,
    identite: computeIdentite,
    performance: computePerformance
  };

  /* ── Rendering ──────────────────────────────────────────────────── */
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
    var yesBtn = makeAnswerBtn('Yes', chosenValue === true);
    var noBtn = makeAnswerBtn('No', chosenValue === false);
    answersEl.appendChild(yesBtn);
    answersEl.appendChild(noBtn);

    step.appendChild(q);
    step.appendChild(answersEl);

    if (resolved) {
      var hint = ce('span', 'diag-step-edit-hint');
      hint.textContent = 'Click to change your answer';
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

  /* ── Progress & summary ─────────────────────────────────── */
  function syncAxisResult(axisId, axisEl, leaf) {
    var statusEl = axisEl.querySelector('.diag-axis-status');
    if (leaf) {
      results[axisId] = leaf;
      axisEl.classList.remove('is-started');
      axisEl.classList.add('is-complete');
      if (statusEl) statusEl.textContent = 'Completed';
    } else {
      delete results[axisId];
      axisEl.classList.add('is-started');
      axisEl.classList.remove('is-complete');
      if (statusEl) statusEl.textContent = 'In progress';
    }
    updateProgress();
  }

  function updateProgress() {
    var done = Object.keys(results).length;
    var label = document.getElementById('diag-progress-label');
    var fill = document.getElementById('diag-progress-fill');
    if (label) label.textContent = done + '/3 areas completed';
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
        return AXIS_META[axisId].label + ': ' + results[axisId].tag;
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

  /* ── Visible "Step X of 3" indicator (beyond the discreet counter) */
  var stepIndicator = document.getElementById('diag-step-indicator');
  function updateStepIndicator(openAxisId) {
    if (!stepIndicator) return;
    if (!openAxisId) { stepIndicator.textContent = ''; return; }
    var position = AXIS_ORDER.indexOf(openAxisId) + 1;
    stepIndicator.textContent = 'Step ' + position + ' of ' + AXIS_ORDER.length + ' · ' + AXIS_META[openAxisId].label;
  }

  /* ── Opening / closing axis cards ─────────────────── */
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
