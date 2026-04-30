window.onload = function () {
  var pieces        = document.querySelectorAll('.human-body svg');
  var panel         = document.getElementById('triage-panel');
  var titleEl       = document.getElementById('triage-title');
  var stepsEl       = document.getElementById('triage-steps');
  var closeBtn      = document.getElementById('close-panel');
  var dataEl        = document.getElementById('data');

  var currentRegion = null;
  var currentStep   = 1;
  var answers       = {};

  // ── Wizard step definitions ──────────────────────────────────────────────
  var STEPS = [
    {
      key:      'type',
      question: 'What type of issue?',
      options:  ['Pain', 'Swelling', 'Limited mobility', 'Numbness', 'Other'],
    },
    {
      key:      'severity',
      question: 'How severe?',
      options:  ['Mild', 'Moderate', 'Severe'],
    },
    {
      key:      'duration',
      question: 'How long has this been happening?',
      options:  ['Today', 'A few days', 'A week or more', 'Chronic'],
    },
  ];

  var TOTAL_STEPS = STEPS.length + 1; // +1 for summary

  // ── Helpers ──────────────────────────────────────────────────────────────
  function formatRegion(id) {
    return id.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.entries(props || {}).forEach(function (_ref) {
      var k = _ref[0], v = _ref[1];
      if (k === 'className') node.className = v;
      else if (k === 'textContent') node.textContent = v;
      else if (k === 'onclick') node.onclick = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  // ── Open panel for a region ───────────────────────────────────────────────
  function openPanel(region) {
    var isNewRegion = region !== currentRegion;
    currentRegion   = region;
    if (isNewRegion) {
      currentStep = 1;
      answers     = {};
    }
    titleEl.textContent = formatRegion(region);
    panel.classList.add('open');
    render();
  }

  function closePanel() {
    panel.classList.remove('open');
  }

  // ── Render current step ───────────────────────────────────────────────────
  function render() {
    stepsEl.innerHTML = '';

    // Progress dots
    var dots = el('div', { className: 'step-progress' });
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      dots.appendChild(el('div', { className: 'step-dot' + (i <= currentStep ? ' active' : '') }));
    }
    stepsEl.appendChild(dots);

    // Step indicator
    stepsEl.appendChild(el('p', {
      className: 'step-indicator',
      textContent: 'Step ' + currentStep + ' of ' + TOTAL_STEPS,
    }));

    if (currentStep <= STEPS.length) {
      renderQuestionStep(STEPS[currentStep - 1]);
    } else {
      renderSummary();
    }
  }

  function renderQuestionStep(step) {
    // Back button (not on step 1)
    if (currentStep > 1) {
      stepsEl.appendChild(el('button', {
        className: 'back-btn',
        textContent: '← Back',
        onclick: function () { currentStep--; render(); },
      }));
    }

    // Question
    stepsEl.appendChild(el('p', { className: 'wizard-question', textContent: step.question }));

    // Option buttons
    step.options.forEach(function (opt) {
      stepsEl.appendChild(el('button', {
        className: 'wizard-btn',
        textContent: opt,
        onclick: function () {
          answers[step.key] = opt;
          currentStep++;
          render();
        },
      }));
    });
  }

  function renderSummary() {
    // Back button
    stepsEl.appendChild(el('button', {
      className: 'back-btn',
      textContent: '← Back',
      onclick: function () { currentStep--; render(); },
    }));

    stepsEl.appendChild(el('p', { className: 'wizard-question', textContent: 'Summary' }));

    // Summary card
    var card = el('div', { className: 'summary-card' });
    var rows = [
      ['Region',   formatRegion(currentRegion)],
      ['Issue',    answers.type],
      ['Severity', answers.severity],
      ['Duration', answers.duration],
    ];
    rows.forEach(function (row) {
      card.appendChild(el('div', { className: 'summary-row' }, [
        el('span', { className: 'summary-label', textContent: row[0] }),
        el('span', { className: 'summary-value', textContent: row[1] }),
      ]));
    });
    stepsEl.appendChild(card);

    // Submit button
    stepsEl.appendChild(el('button', {
      className: 'submit-btn',
      textContent: 'Submit',
      onclick: function () {
        var result = {
          region:   currentRegion,
          type:     answers.type,
          severity: answers.severity,
          duration: answers.duration,
        };
        console.log('Triage submission:', result);
        // Replace alert with your own submission handler
        alert('Submitted!\n\n' + JSON.stringify(result, null, 2));
      },
    }));
  }

  // ── SVG click handlers ────────────────────────────────────────────────────
  pieces.forEach(function (piece) {
    piece.addEventListener('click', function (e) {
      var position =
        e.target.getAttribute('data-position') ||
        e.target.parentElement.getAttribute('data-position');

      if (!position) return;

      pieces.forEach(function (p) { p.classList.remove('selected'); });
      piece.classList.add('selected');
      dataEl.textContent = position;

      openPanel(position);
    });
  });

  // ── Close button ──────────────────────────────────────────────────────────
  closeBtn.addEventListener('click', closePanel);

  // ── Click outside panel to close (desktop) ───────────────────────────────
  document.addEventListener('click', function (e) {
    if (panel.classList.contains('open') &&
        !panel.contains(e.target) &&
        !e.target.closest('.human-body')) {
      closePanel();
    }
  });
};
