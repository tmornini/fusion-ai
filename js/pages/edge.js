// Fusion AI — Edge (Business Outcomes) Detail Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var edgeState = {
    outcomes: [],
    loading: true
  };

  var statusOptions = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_track', label: 'On Track' },
    { value: 'at_risk', label: 'At Risk' },
    { value: 'achieved', label: 'Achieved' }
  ];

  App.pages['/ideas/:ideaId/edge'] = {
    layout: 'none',

    render: function(params) {
      var idea = store.ideas.find(function(i) { return i.id === params.ideaId; });
      if (!idea) {
        return '<div class="min-h-screen flex items-center justify-center">' +
          '<div class="text-center">' +
          '<h2 class="text-xl font-semibold mb-2">Idea Not Found</h2>' +
          '<p class="text-muted-foreground mb-4">The idea you are looking for does not exist.</p>' +
          '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/ideas\')">Back to Ideas</button>' +
          '</div></div>';
      }

      var html = '<div class="min-h-screen" style="background:hsl(var(--background))">';

      // Header
      html += '<div style="border-bottom:1px solid hsl(var(--border));padding:1rem 1.5rem;display:flex;align-items:center;gap:0.75rem">';
      html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 20) + '</button>';
      html += '<div style="flex:1">';
      html += '<h1 class="text-xl font-display font-bold">Business Edge</h1>';
      html += '<p class="text-sm text-muted-foreground">Define and track business outcomes</p>';
      html += '</div>';
      html += '</div>';

      // Content
      html += '<div style="max-width:48rem;margin:0 auto;padding:1.5rem">';

      // Idea info
      html += '<div class="fusion-card" style="padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem">';
      html += '<div style="width:2.25rem;height:2.25rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));flex-shrink:0">' + icon('target', 18) + '</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<h3 class="text-base font-semibold">' + escapeHtml(idea.title) + '</h3>';
      html += '<p class="text-xs text-muted-foreground">' + escapeHtml(idea.category) + ' &middot; ' + escapeHtml(idea.author) + '</p>';
      html += '</div>';
      html += App.renderStatusBadge(idea.status);
      html += '</div>';

      // Outcomes section
      html += '<div class="fusion-card" style="padding:1.5rem" id="edge-outcomes-container">';

      if (edgeState.loading) {
        html += App.renderSpinner();
      } else {
        html += renderOutcomes(params.ideaId);
      }

      html += '</div>';

      html += '</div>'; // container
      html += '</div>'; // page

      return html;
    },

    init: function(params) {
      edgeState.loading = true;
      edgeState.outcomes = [];

      fetch('/api/ideas/' + params.ideaId + '/edge')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          edgeState.loading = false;
          edgeState.outcomes = data.edge && data.edge.outcomes ? data.edge.outcomes.map(function(o, idx) {
            return { id: idx, label: o.label, target: o.target, current: o.current, status: o.status };
          }) : [];
          var container = document.getElementById('edge-outcomes-container');
          if (container) {
            container.innerHTML = renderOutcomes(params.ideaId);
          }
        })
        .catch(function() {
          edgeState.loading = false;
          var container = document.getElementById('edge-outcomes-container');
          if (container) {
            container.innerHTML = '<p class="text-sm text-muted-foreground">Failed to load edge data.</p>';
          }
        });
    }
  };

  function renderOutcomes(ideaId) {
    var html = '';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">';
    html += '<h2 class="text-lg font-semibold">Outcomes</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="FusionApp._edgeAddOutcome(\'' + ideaId + '\')">' + icon('plus', 14) + ' Add Outcome</button>';
    html += '</div>';

    if (edgeState.outcomes.length === 0) {
      html += '<div class="flex flex-col items-center justify-center py-8 text-center">';
      html += '<div style="width:3rem;height:3rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;margin-bottom:0.75rem;color:hsl(var(--muted-foreground))">' + icon('target', 24) + '</div>';
      html += '<p class="text-sm text-muted-foreground">No outcomes defined yet. Add your first outcome to start tracking.</p>';
      html += '</div>';
      return html;
    }

    edgeState.outcomes.forEach(function(outcome, idx) {
      html += '<div style="border:1px solid hsl(var(--border));border-radius:0.5rem;padding:1rem;margin-bottom:0.75rem" id="outcome-row-' + idx + '">';

      // Label
      html += '<div style="margin-bottom:0.75rem">';
      html += '<label class="text-xs font-medium text-muted-foreground" style="display:block;margin-bottom:0.25rem">Outcome Label</label>';
      html += '<input class="input" type="text" value="' + escapeHtml(outcome.label) + '" style="width:100%" onchange="FusionApp._edgeUpdateField(' + idx + ',\'label\',this.value)" />';
      html += '</div>';

      // Target, current, status row
      html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem">';

      // Target value
      html += '<div>';
      html += '<label class="text-xs font-medium text-muted-foreground" style="display:block;margin-bottom:0.25rem">Target Value</label>';
      html += '<input class="input" type="text" value="' + escapeHtml(outcome.target) + '" style="width:100%" onchange="FusionApp._edgeUpdateField(' + idx + ',\'target\',this.value)" />';
      html += '</div>';

      // Current value
      html += '<div>';
      html += '<label class="text-xs font-medium text-muted-foreground" style="display:block;margin-bottom:0.25rem">Current Value</label>';
      html += '<input class="input" type="text" value="' + escapeHtml(outcome.current) + '" style="width:100%" onchange="FusionApp._edgeUpdateField(' + idx + ',\'current\',this.value)" />';
      html += '</div>';

      // Status dropdown
      html += '<div>';
      html += '<label class="text-xs font-medium text-muted-foreground" style="display:block;margin-bottom:0.25rem">Status</label>';
      html += '<select class="input" style="width:100%" onchange="FusionApp._edgeUpdateField(' + idx + ',\'status\',this.value)">';
      statusOptions.forEach(function(opt) {
        html += '<option value="' + opt.value + '"' + (outcome.status === opt.value ? ' selected' : '') + '>' + escapeHtml(opt.label) + '</option>';
      });
      html += '</select>';
      html += '</div>';

      html += '</div>'; // grid

      // Delete button
      html += '<div style="margin-top:0.5rem;text-align:right">';
      html += '<button class="btn btn-ghost btn-sm" style="color:hsl(var(--destructive))" onclick="FusionApp._edgeRemoveOutcome(' + idx + ',\'' + ideaId + '\')">' + icon('trash2', 14) + ' Remove</button>';
      html += '</div>';

      html += '</div>'; // outcome row
    });

    // Save button
    html += '<div style="display:flex;justify-content:flex-end;margin-top:1rem;padding-top:1rem;border-top:1px solid hsl(var(--border))">';
    html += '<button class="btn btn-primary" id="edge-save-btn" onclick="FusionApp._edgeSave(\'' + ideaId + '\')">' + icon('save', 16) + ' Save Outcomes</button>';
    html += '</div>';

    return html;
  }

  App._edgeUpdateField = function(idx, field, value) {
    if (edgeState.outcomes[idx]) {
      edgeState.outcomes[idx][field] = value;
    }
  };

  App._edgeAddOutcome = function(ideaId) {
    edgeState.outcomes.push({
      id: edgeState.outcomes.length,
      label: '',
      target: '',
      current: '',
      status: 'not_started'
    });
    var container = document.getElementById('edge-outcomes-container');
    if (container) {
      container.innerHTML = renderOutcomes(ideaId);
    }
  };

  App._edgeRemoveOutcome = function(idx, ideaId) {
    edgeState.outcomes.splice(idx, 1);
    var container = document.getElementById('edge-outcomes-container');
    if (container) {
      container.innerHTML = renderOutcomes(ideaId);
    }
  };

  App._edgeSave = function(ideaId) {
    var btn = document.getElementById('edge-save-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = icon('loader2', 16) + ' Saving...';
    }

    var outcomes = edgeState.outcomes.map(function(o) {
      return { label: o.label, target: o.target, current: o.current, status: o.status };
    });

    fetch('/api/ideas/' + ideaId + '/edge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcomes: outcomes })
    })
    .then(function(res) { return res.json(); })
    .then(function() {
      App.showToast({ title: 'Outcomes Saved', description: 'Business outcomes have been saved successfully.' });
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = icon('save', 16) + ' Save Outcomes';
      }
    })
    .catch(function() {
      App.showToast({ title: 'Error', description: 'Failed to save outcomes. Please try again.', variant: 'destructive' });
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = icon('save', 16) + ' Save Outcomes';
      }
    });
  };
})();
