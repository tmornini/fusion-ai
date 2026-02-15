// Fusion AI — Edge (Business Case Definition) Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var edgeData = {
    outcomes: [],
    impact: { shortTerm: '', midTerm: '', longTerm: '' },
    confidence: '',
    owner: ''
  };
  var loading = true;
  var ideaCache = null;

  var outcomeTemplates = [
    'Reduce operational cost',
    'Increase customer retention',
    'Improve delivery speed',
    'Reduce errors or risk',
    'Increase revenue',
    'Improve customer satisfaction'
  ];

  function getCompletionPct() {
    var total = 4;
    var done = 0;
    if (edgeData.outcomes.length > 0 && edgeData.outcomes.some(function(o) { return o.description; })) done++;
    if (edgeData.outcomes.some(function(o) { return o.metrics && o.metrics.length > 0 && o.metrics.some(function(m) { return m.name && m.target; }); })) done++;
    if (edgeData.impact.shortTerm || edgeData.impact.midTerm || edgeData.impact.longTerm) done++;
    if (edgeData.confidence && edgeData.owner) done++;
    return Math.round((done / total) * 100);
  }

  function getStatusLabel() {
    var pct = getCompletionPct();
    if (pct === 100) return { label: 'Complete', variant: 'success' };
    if (pct > 0) return { label: 'In Progress', variant: 'warning' };
    return { label: 'Incomplete', variant: 'secondary' };
  }

  function genId() { return 'id_' + Math.random().toString(36).slice(2, 8); }

  // --- Render sidebar ---
  function renderSidebar(idea) {
    var pct = getCompletionPct();
    var status = getStatusLabel();
    var html = '';

    // Progress card
    html += '<div class="fusion-card p-4 mb-4">';
    html += '<div class="flex items-center justify-between mb-2">';
    html += '<span class="text-sm font-semibold">Completion</span>';
    html += App.renderBadge(status.label, status.variant);
    html += '</div>';
    html += App.renderProgress(pct, 100);
    html += '<div class="text-xs text-muted-foreground mt-2">' + pct + '% complete</div>';

    // Checklist
    html += '<div class="mt-3 space-y-1">';
    var checks = [
      { done: edgeData.outcomes.length > 0 && edgeData.outcomes.some(function(o) { return o.description; }), label: 'Outcomes defined' },
      { done: edgeData.outcomes.some(function(o) { return o.metrics && o.metrics.length > 0; }), label: 'Metrics added' },
      { done: edgeData.impact.shortTerm || edgeData.impact.midTerm || edgeData.impact.longTerm, label: 'Impact timeline' },
      { done: edgeData.confidence && edgeData.owner, label: 'Owner & confidence' }
    ];
    checks.forEach(function(c) {
      html += '<div class="flex items-center gap-2 text-xs">';
      html += '<span class="' + (c.done ? 'text-success' : 'text-muted-foreground') + '">' + (c.done ? icon('checkCircle2', 14) : icon('circle', 14)) + '</span>';
      html += '<span class="' + (c.done ? '' : 'text-muted-foreground') + '">' + c.label + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // Linked idea
    if (idea) {
      html += '<div class="fusion-card p-4">';
      html += '<div class="flex items-center gap-2 mb-3">';
      html += '<span class="text-primary">' + icon('lightbulb', 16) + '</span>';
      html += '<span class="text-sm font-semibold">Linked Idea</span>';
      html += '</div>';
      html += '<h4 class="text-sm font-medium">' + escapeHtml(idea.title) + '</h4>';
      if (idea.score) html += '<div class="flex items-center gap-2 mt-2"><span class="badge badge-success">' + idea.score + '/100</span></div>';
      if (idea.problemStatement) {
        html += '<p class="text-xs text-muted-foreground mt-2">' + escapeHtml(idea.problemStatement).substring(0, 120) + '...</p>';
      }
      html += '</div>';
    }

    return html;
  }

  // --- Render outcomes ---
  function renderOutcomesSection(ideaId) {
    var html = '';
    html += '<div class="flex items-center justify-between mb-4">';
    html += '<h2 class="text-lg font-semibold">' + icon('target', 20) + ' Outcomes</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="FusionApp._edgeAddOutcome(\'' + ideaId + '\')">' + icon('plus', 14) + ' Add Outcome</button>';
    html += '</div>';

    if (edgeData.outcomes.length === 0) {
      html += '<div class="text-center py-6 text-muted-foreground">';
      html += '<p class="text-sm mb-3">No outcomes defined. Start with a template:</p>';
      html += '<div class="flex flex-wrap gap-2 justify-center">';
      outcomeTemplates.forEach(function(t) {
        html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._edgeAddFromTemplate(\'' + ideaId + '\',\'' + escapeHtml(t) + '\')">' + icon('plus', 12) + ' ' + escapeHtml(t) + '</button>';
      });
      html += '</div></div>';
      return html;
    }

    edgeData.outcomes.forEach(function(outcome, oi) {
      html += '<div class="fusion-card p-4 mb-3">';
      html += '<div class="flex items-center gap-2 mb-3">';
      html += '<span class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">' + (oi + 1) + '</span>';
      html += '<input class="input flex-1" value="' + escapeHtml(outcome.description) + '" placeholder="Describe this outcome" onchange="FusionApp._edgeUpdateOutcome(' + oi + ',\'description\',this.value)" />';
      html += '<button class="btn btn-ghost btn-sm" style="color:hsl(var(--destructive))" onclick="FusionApp._edgeRemoveOutcome(' + oi + ',\'' + ideaId + '\')">' + icon('trash2', 14) + '</button>';
      html += '</div>';

      // Metrics
      html += '<div class="ml-8">';
      html += '<div class="text-xs font-semibold text-muted-foreground mb-2">METRICS</div>';
      if (outcome.metrics && outcome.metrics.length) {
        outcome.metrics.forEach(function(m, mi) {
          html += '<div class="flex items-center gap-2 mb-2">';
          html += '<input class="input flex-1" value="' + escapeHtml(m.name) + '" placeholder="Metric name" style="font-size:0.8125rem" onchange="FusionApp._edgeUpdateMetric(' + oi + ',' + mi + ',\'name\',this.value)" />';
          html += '<input class="input" style="width:5rem;font-size:0.8125rem" value="' + escapeHtml(m.target) + '" placeholder="Target" onchange="FusionApp._edgeUpdateMetric(' + oi + ',' + mi + ',\'target\',this.value)" />';
          html += '<input class="input" style="width:4rem;font-size:0.8125rem" value="' + escapeHtml(m.unit) + '" placeholder="Unit" onchange="FusionApp._edgeUpdateMetric(' + oi + ',' + mi + ',\'unit\',this.value)" />';
          html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._edgeRemoveMetric(' + oi + ',' + mi + ',\'' + ideaId + '\')">' + icon('x', 12) + '</button>';
          html += '</div>';
        });
      }
      html += '<button class="btn btn-ghost btn-sm text-xs" onclick="FusionApp._edgeAddMetric(' + oi + ',\'' + ideaId + '\')">' + icon('plus', 12) + ' Add Metric</button>';
      html += '</div>';
      html += '</div>';
    });

    return html;
  }

  // --- Render impact ---
  function renderImpactSection() {
    var html = '<h2 class="text-lg font-semibold mb-4">' + icon('clock', 20) + ' Impact Timeline</h2>';
    html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';

    var timelines = [
      { key: 'shortTerm', label: 'Short-term', sub: '0-3 months', color: 'success' },
      { key: 'midTerm', label: 'Mid-term', sub: '3-12 months', color: 'warning' },
      { key: 'longTerm', label: 'Long-term', sub: '12+ months', color: 'info' }
    ];
    timelines.forEach(function(t) {
      html += '<div class="fusion-card p-4" style="border-left:3px solid hsl(var(--' + t.color + '))">';
      html += '<div class="flex items-center gap-2 mb-2">';
      html += '<span class="text-' + t.color + '">' + icon('clock', 14) + '</span>';
      html += '<span class="text-sm font-semibold">' + t.label + '</span>';
      html += '</div>';
      html += '<span class="text-xs text-muted-foreground">' + t.sub + '</span>';
      html += '<textarea class="input w-full mt-2" rows="3" placeholder="Describe expected impact..." onchange="FusionApp._edgeUpdateImpact(\'' + t.key + '\',this.value)">' + escapeHtml(edgeData.impact[t.key] || '') + '</textarea>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // --- Render confidence & owner ---
  function renderConfidenceSection() {
    var html = '<h2 class="text-lg font-semibold mb-4">' + icon('shield', 20) + ' Confidence & Ownership</h2>';
    html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';

    // Confidence
    html += '<div>';
    html += '<label class="text-sm font-medium block mb-1">Confidence Level</label>';
    html += App.renderSelect([
      { value: '', label: 'Select...' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' }
    ], edgeData.confidence, 'edge-confidence', 'FusionApp._edgeSetConfidence(this.value)');
    html += '</div>';

    // Owner
    html += '<div>';
    html += '<label class="text-sm font-medium block mb-1">Edge Owner</label>';
    html += '<input class="input w-full" value="' + escapeHtml(edgeData.owner) + '" placeholder="Who owns this business case?" onchange="FusionApp._edgeSetOwner(this.value)" />';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // --- Event handlers ---
  App._edgeAddOutcome = function(ideaId) {
    edgeData.outcomes.push({ id: genId(), description: '', metrics: [] });
    var c = document.getElementById('edge-main');
    if (c) c.innerHTML = renderMainContent(ideaId);
    updateSidebar(ideaId);
  };

  App._edgeAddFromTemplate = function(ideaId, desc) {
    edgeData.outcomes.push({ id: genId(), description: desc, metrics: [{ id: genId(), name: '', target: '', unit: '' }] });
    var c = document.getElementById('edge-main');
    if (c) c.innerHTML = renderMainContent(ideaId);
    updateSidebar(ideaId);
  };

  App._edgeRemoveOutcome = function(oi, ideaId) {
    edgeData.outcomes.splice(oi, 1);
    var c = document.getElementById('edge-main');
    if (c) c.innerHTML = renderMainContent(ideaId);
    updateSidebar(ideaId);
  };

  App._edgeUpdateOutcome = function(oi, field, value) {
    if (edgeData.outcomes[oi]) edgeData.outcomes[oi][field] = value;
    updateSidebar(null);
  };

  App._edgeAddMetric = function(oi, ideaId) {
    if (edgeData.outcomes[oi]) {
      if (!edgeData.outcomes[oi].metrics) edgeData.outcomes[oi].metrics = [];
      edgeData.outcomes[oi].metrics.push({ id: genId(), name: '', target: '', unit: '' });
      var c = document.getElementById('edge-main');
      if (c) c.innerHTML = renderMainContent(ideaId);
    }
  };

  App._edgeUpdateMetric = function(oi, mi, field, value) {
    if (edgeData.outcomes[oi] && edgeData.outcomes[oi].metrics[mi]) {
      edgeData.outcomes[oi].metrics[mi][field] = value;
    }
    updateSidebar(null);
  };

  App._edgeRemoveMetric = function(oi, mi, ideaId) {
    if (edgeData.outcomes[oi] && edgeData.outcomes[oi].metrics) {
      edgeData.outcomes[oi].metrics.splice(mi, 1);
      var c = document.getElementById('edge-main');
      if (c) c.innerHTML = renderMainContent(ideaId);
    }
  };

  App._edgeUpdateImpact = function(key, value) {
    edgeData.impact[key] = value;
    updateSidebar(null);
  };

  App._edgeSetConfidence = function(val) { edgeData.confidence = val; updateSidebar(null); };
  App._edgeSetOwner = function(val) { edgeData.owner = val; updateSidebar(null); };

  App._edgeSave = function(ideaId) {
    var btn = document.getElementById('edge-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = icon('loader2', 16) + ' Saving...'; }
    fetch('/api/ideas/' + ideaId + '/edge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edgeData)
    }).then(function() {
      App.showToast({ title: 'Edge Saved', description: 'Business case has been saved successfully.' });
      if (btn) { btn.disabled = false; btn.innerHTML = icon('save', 16) + ' Save & Continue'; }
    }).catch(function() {
      App.showToast({ title: 'Error', description: 'Failed to save. Please try again.', variant: 'destructive' });
      if (btn) { btn.disabled = false; btn.innerHTML = icon('save', 16) + ' Save & Continue'; }
    });
  };

  function updateSidebar(ideaId) {
    var el = document.getElementById('edge-sidebar');
    if (el && ideaCache) el.innerHTML = renderSidebar(ideaCache);
  }

  function renderMainContent(ideaId) {
    var html = '';
    html += renderOutcomesSection(ideaId);
    html += '<div class="my-6">' + renderImpactSection() + '</div>';
    html += renderConfidenceSection();

    // Save bar
    var pct = getCompletionPct();
    html += '<div class="flex items-center justify-between mt-6 pt-4" style="border-top:1px solid hsl(var(--border))">';
    html += '<button class="btn btn-ghost" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 16) + ' Back</button>';
    html += '<button class="btn btn-primary' + (pct < 100 ? ' opacity-60' : '') + '" id="edge-save-btn" onclick="FusionApp._edgeSave(\'' + ideaId + '\')">' + icon('save', 16) + ' Save & Continue</button>';
    html += '</div>';
    return html;
  }

  // --- Page ---
  App.pages['/ideas/:ideaId/edge'] = {
    layout: 'none',

    render: function(params) {
      var idea = store.ideas.find(function(i) { return i.id === params.ideaId; });
      ideaCache = idea;
      if (!idea) {
        return '<div class="min-h-screen flex items-center justify-center"><div class="text-center">' +
          '<h2 class="text-xl font-semibold mb-2">Idea Not Found</h2>' +
          '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/ideas\')">Back to Ideas</button>' +
        '</div></div>';
      }

      var html = '<div class="min-h-screen" style="background:hsl(var(--background))">';

      // Header
      html += '<div style="border-bottom:1px solid hsl(var(--border));padding:1rem 1.5rem;display:flex;align-items:center;gap:0.75rem">';
      html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 20) + '</button>';
      html += '<div style="flex:1">';
      html += '<div class="flex items-center gap-2">';
      html += '<h1 class="text-xl font-display font-bold">Edge</h1>';
      html += '<span class="badge badge-info">Business Case Definition</span>';
      html += App.renderBadge(getStatusLabel().label, getStatusLabel().variant);
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Content — 1/3 + 2/3 layout
      html += '<div style="max-width:72rem;margin:0 auto;padding:1.5rem">';
      html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';

      // Sidebar (1/3)
      html += '<div class="lg:col-span-1 order-2 lg:order-1"><div id="edge-sidebar" class="lg:sticky" style="top:5rem">';
      html += loading ? App.renderSpinner() : renderSidebar(idea);
      html += '</div></div>';

      // Main (2/3)
      html += '<div class="lg:col-span-2 order-1 lg:order-2" id="edge-main">';
      html += loading ? App.renderSpinner() : renderMainContent(params.ideaId);
      html += '</div>';

      html += '</div></div></div>';
      return html;
    },

    init: function(params) {
      loading = true;
      edgeData = { outcomes: [], impact: { shortTerm: '', midTerm: '', longTerm: '' }, confidence: '', owner: '' };

      fetch('/api/ideas/' + params.ideaId + '/edge')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          loading = false;
          var edge = data.edge || {};
          edgeData.outcomes = (edge.outcomes || []).map(function(o) {
            return {
              id: o.id || genId(),
              description: o.description || o.label || '',
              metrics: (o.metrics || []).map(function(m) {
                return { id: m.id || genId(), name: m.name || '', target: m.target || '', unit: m.unit || '' };
              })
            };
          });
          edgeData.impact = edge.impact || { shortTerm: '', midTerm: '', longTerm: '' };
          edgeData.confidence = edge.confidence || '';
          edgeData.owner = edge.owner || '';

          var main = document.getElementById('edge-main');
          var sidebar = document.getElementById('edge-sidebar');
          if (main) main.innerHTML = renderMainContent(params.ideaId);
          if (sidebar) sidebar.innerHTML = renderSidebar(ideaCache);
        });
    }
  };
})();
