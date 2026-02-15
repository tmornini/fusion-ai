// Fusion AI — Flow (Process Design) Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var localSteps = null;
  var saving = false;

  function getSteps() {
    if (!localSteps) {
      var flow = App.store.flows[0];
      localSteps = flow.steps.map(function(s) {
        return { id: s.id, title: s.title, description: s.description, order: s.order };
      });
    }
    return localSteps;
  }

  function reorderSteps() {
    var steps = getSteps();
    steps.sort(function(a, b) { return a.order - b.order; });
    steps.forEach(function(s, i) { s.order = i + 1; });
  }

  App.pages['/flow'] = {
    layout: 'dashboard',

    render: function() {
      var flow = App.store.flows[0];
      var steps = getSteps();
      reorderSteps();
      var mobile = App.isMobile();
      var html = '';

      // Title
      html += '<div class="flex items-center justify-between mb-8">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">' + icon('gitBranch', 24) + ' Flow &mdash; Process Design</h1>';
      html += '<p class="text-muted-foreground">' + escapeHtml(flow.title) + '</p>';
      html += '</div>';
      html += '<div class="flex items-center gap-2">';
      html += '<button class="btn btn-outline" onclick="FusionApp._flowAddStep()">' + icon('plus', 16) + ' Add Step</button>';
      html += '<button class="btn btn-primary" onclick="FusionApp._flowSave()" ' + (saving ? 'disabled' : '') + '>';
      if (saving) {
        html += '<span class="animate-spin">' + icon('loader2', 16) + '</span> Saving...';
      } else {
        html += icon('save', 16) + ' Save';
      }
      html += '</button>';
      html += '</div>';
      html += '</div>';

      // Steps list
      html += '<div class="space-y-3" id="flow-steps-list">';
      steps.forEach(function(step, idx) {
        html += '<div class="fusion-card flow-step" style="padding:1rem 1.25rem" data-step-id="' + escapeHtml(step.id) + '">';
        html += '<div class="flex items-center gap-4">';

        // Grip handle
        html += '<div class="text-muted-foreground cursor-grab" style="flex-shrink:0">' + icon('gripVertical', 20) + '</div>';

        // Step number
        html += '<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm" style="flex-shrink:0;background:hsl(var(--primary));color:hsl(var(--primary-foreground))">' + step.order + '</div>';

        // Content
        html += '<div class="flex-1 min-w-0">';
        html += '<p class="font-semibold">' + escapeHtml(step.title) + '</p>';
        html += '<p class="text-sm text-muted-foreground">' + escapeHtml(step.description) + '</p>';
        html += '</div>';

        // Move buttons
        html += '<div class="flex items-center gap-1" style="flex-shrink:0">';
        if (idx > 0) {
          html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._flowMoveStep(\'' + escapeHtml(step.id) + '\', -1)" title="Move up">' + icon('chevronUp', 16) + '</button>';
        }
        if (idx < steps.length - 1) {
          html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._flowMoveStep(\'' + escapeHtml(step.id) + '\', 1)" title="Move down">' + icon('chevronDown', 16) + '</button>';
        }
        html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._flowRemoveStep(\'' + escapeHtml(step.id) + '\')" title="Remove step">' + icon('trash2', 16) + '</button>';
        html += '</div>';

        html += '</div>'; // flex row
        html += '</div>'; // card
      });
      html += '</div>';

      if (steps.length === 0) {
        html += App.renderEmptyState('workflow', 'No steps yet', 'Add your first step to design your process flow.', '<button class="btn btn-primary" onclick="FusionApp._flowAddStep()">' + icon('plus', 16) + ' Add Step</button>');
      }

      return html;
    },

    init: function() {
      return function() {
        localSteps = null;
        saving = false;
      };
    }
  };

  App._flowMoveStep = function(stepId, direction) {
    var steps = getSteps();
    var idx = -1;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].id === stepId) { idx = i; break; }
    }
    if (idx < 0) return;
    var targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    // Swap orders
    var tmpOrder = steps[idx].order;
    steps[idx].order = steps[targetIdx].order;
    steps[targetIdx].order = tmpOrder;

    App.render();
  };

  App._flowRemoveStep = function(stepId) {
    var steps = getSteps();
    localSteps = steps.filter(function(s) { return s.id !== stepId; });
    reorderSteps();
    App.render();
    App.showToast({ title: 'Step removed', description: 'Step has been removed from the flow' });
  };

  App._flowAddStep = function() {
    var steps = getSteps();
    var newId = 's' + (Date.now());
    steps.push({
      id: newId,
      title: 'New Step',
      description: 'Describe what happens in this step',
      order: steps.length + 1
    });
    App.render();

    // Focus the new step for visibility
    App.showToast({ title: 'Step added', description: 'New step added to the flow' });
  };

  App._flowSave = function() {
    saving = true;
    App.render();

    var steps = getSteps();
    fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: App.store.flows[0].title, steps: steps })
    })
    .then(function(res) { return res.json(); })
    .then(function() {
      // Update store with local steps
      App.store.flows[0].steps = steps.map(function(s) {
        return { id: s.id, title: s.title, description: s.description, order: s.order };
      });
      saving = false;
      App.render();
      App.showToast({ title: 'Flow saved', description: 'Process design has been saved successfully' });
    });
  };
})();
