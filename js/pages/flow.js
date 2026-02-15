// Fusion AI — Flow (Process Design) Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var localSteps = null;
  var saving = false;
  var viewMode = 'edit'; // 'edit' | 'preview'
  var expandedStep = null;
  var processInfo = { name: '', description: '', department: '' };

  var stepTypes = [
    { value: 'start', label: 'Start', color: 'success' },
    { value: 'action', label: 'Action', color: 'primary' },
    { value: 'decision', label: 'Decision', color: 'warning' },
    { value: 'end', label: 'End', color: 'error' },
  ];

  var allTools = ['Email', 'Database', 'Website', 'Phone', 'Chat', 'Files', 'Document'];
  var toolIcons = { Email: 'mail', Database: 'database', Website: 'globe', Phone: 'phone', Chat: 'messageSquare', Files: 'folderOpen', Document: 'fileText' };

  function getSteps() {
    if (!localSteps) {
      var flow = App.store.flows[0];
      processInfo.name = flow.name || flow.title;
      processInfo.description = flow.description || '';
      processInfo.department = flow.department || '';
      localSteps = flow.steps.map(function(s) {
        return { id: s.id, title: s.title, description: s.description, order: s.order, owner: s.owner || '', role: s.role || '', tools: (s.tools || []).slice(), duration: s.duration || '', type: s.type || 'action' };
      });
    }
    return localSteps;
  }

  function reorderSteps() {
    var steps = getSteps();
    steps.sort(function(a, b) { return a.order - b.order; });
    steps.forEach(function(s, i) { s.order = i + 1; });
  }

  function getStepTypeColor(type) {
    var t = stepTypes.find(function(st) { return st.value === type; });
    return t ? t.color : 'primary';
  }

  App._flowSetView = function(mode) { viewMode = mode; App.render(); };
  App._flowToggleExpand = function(stepId) { expandedStep = expandedStep === stepId ? null : stepId; App.render(); };
  App._flowUpdateProcess = function(field, value) { processInfo[field] = value; };

  App._flowUpdateStep = function(stepId, field, value) {
    var step = getSteps().find(function(s) { return s.id === stepId; });
    if (step) step[field] = value;
  };

  App._flowToggleTool = function(stepId, tool) {
    var step = getSteps().find(function(s) { return s.id === stepId; });
    if (!step) return;
    var idx = step.tools.indexOf(tool);
    if (idx >= 0) step.tools.splice(idx, 1);
    else step.tools.push(tool);
    App.render();
  };

  // --- Edit mode ---
  function renderEditMode() {
    var steps = getSteps();
    reorderSteps();
    var html = '';

    // Process info form
    html += '<div class="fusion-card p-5 mb-6">';
    html += '<h3 class="text-sm font-semibold mb-3">Process Information</h3>';
    html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';
    html += '<div><label class="text-xs font-medium block mb-1">Process Name</label>';
    html += '<input class="input w-full" value="' + escapeHtml(processInfo.name) + '" onchange="FusionApp._flowUpdateProcess(\'name\',this.value)" /></div>';
    html += '<div><label class="text-xs font-medium block mb-1">Department</label>';
    html += App.renderSelect(['Customer Success', 'Engineering', 'Sales', 'Product', 'Operations', 'Marketing'].map(function(d) { return { value: d, label: d }; }), processInfo.department, 'flow-dept', 'FusionApp._flowUpdateProcess(\'department\',this.value)');
    html += '</div>';
    html += '<div class="sm:col-span-1"><label class="text-xs font-medium block mb-1">Description</label>';
    html += '<input class="input w-full" value="' + escapeHtml(processInfo.description) + '" placeholder="Brief description" onchange="FusionApp._flowUpdateProcess(\'description\',this.value)" /></div>';
    html += '</div></div>';

    // Steps
    html += '<div class="space-y-3">';
    steps.forEach(function(step, idx) {
      var isExpanded = expandedStep === step.id;
      var typeColor = getStepTypeColor(step.type);

      html += '<div class="fusion-card overflow-hidden">';
      // Header row
      html += '<div class="flex items-center gap-3 p-4 cursor-pointer" onclick="FusionApp._flowToggleExpand(\'' + step.id + '\')">';
      html += '<span class="text-muted-foreground cursor-grab" style="opacity:0.4">' + icon('gripVertical', 16) + '</span>';
      html += '<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style="background:hsl(var(--' + typeColor + ') / 0.15);color:hsl(var(--' + typeColor + '))">' + step.order + '</div>';
      html += '<div class="flex-1 min-w-0">';
      html += '<div class="flex items-center gap-2">';
      html += '<span class="font-semibold text-sm">' + escapeHtml(step.title) + '</span>';
      html += '<span class="badge badge-' + typeColor + '" style="font-size:0.6rem">' + escapeHtml(step.type.toUpperCase()) + '</span>';
      html += '</div>';
      if (step.owner) html += '<p class="text-xs text-muted-foreground">' + escapeHtml(step.owner) + (step.duration ? ' &middot; ' + escapeHtml(step.duration) : '') + '</p>';
      html += '</div>';

      // Move + delete
      html += '<div class="flex items-center gap-1">';
      if (idx > 0) html += '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();FusionApp._flowMoveStep(\'' + step.id + '\',-1)">' + icon('chevronUp', 14) + '</button>';
      if (idx < steps.length - 1) html += '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();FusionApp._flowMoveStep(\'' + step.id + '\',1)">' + icon('chevronDown', 14) + '</button>';
      html += '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();FusionApp._flowRemoveStep(\'' + step.id + '\')" style="color:hsl(var(--destructive))">' + icon('trash2', 14) + '</button>';
      html += '</div>';
      html += '<span class="text-muted-foreground">' + (isExpanded ? icon('chevronDown', 16) : icon('chevronRight', 16)) + '</span>';
      html += '</div>';

      // Expanded detail form
      if (isExpanded) {
        html += '<div class="px-4 pb-4" style="border-top:1px solid hsl(var(--border));background:hsl(var(--muted) / 0.3)">';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">';
        html += '<div><label class="text-xs font-medium block mb-1">What happens in this step?</label>';
        html += '<input class="input w-full" value="' + escapeHtml(step.title) + '" onchange="FusionApp._flowUpdateStep(\'' + step.id + '\',\'title\',this.value)" /></div>';
        html += '<div><label class="text-xs font-medium block mb-1">Step Type</label>';
        html += App.renderSelect(stepTypes, step.type, 'flow-type-' + step.id, 'FusionApp._flowUpdateStep(\'' + step.id + '\',\'type\',this.value)');
        html += '</div>';
        html += '<div class="sm:col-span-2"><label class="text-xs font-medium block mb-1">Describe this step in detail</label>';
        html += '<textarea class="input w-full" rows="2" onchange="FusionApp._flowUpdateStep(\'' + step.id + '\',\'description\',this.value)">' + escapeHtml(step.description) + '</textarea></div>';
        html += '<div><label class="text-xs font-medium block mb-1">Who is responsible?</label>';
        html += '<input class="input w-full" value="' + escapeHtml(step.owner) + '" placeholder="Team or person" onchange="FusionApp._flowUpdateStep(\'' + step.id + '\',\'owner\',this.value)" /></div>';
        html += '<div><label class="text-xs font-medium block mb-1">Specific Role</label>';
        html += '<input class="input w-full" value="' + escapeHtml(step.role) + '" placeholder="e.g. Account Executive" onchange="FusionApp._flowUpdateStep(\'' + step.id + '\',\'role\',this.value)" /></div>';
        html += '<div><label class="text-xs font-medium block mb-1">How long does this take?</label>';
        html += '<input class="input w-full" value="' + escapeHtml(step.duration) + '" placeholder="e.g. 15 minutes" onchange="FusionApp._flowUpdateStep(\'' + step.id + '\',\'duration\',this.value)" /></div>';

        // Tools
        html += '<div><label class="text-xs font-medium block mb-1">Tools Used</label>';
        html += '<div class="flex flex-wrap gap-2">';
        allTools.forEach(function(tool) {
          var active = step.tools.indexOf(tool) >= 0;
          html += '<button class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors' + (active ? '" style="background:hsl(var(--primary) / 0.1);color:hsl(var(--primary));border-color:hsl(var(--primary) / 0.3)"' : '" style="background:transparent;color:hsl(var(--muted-foreground));border-color:hsl(var(--border))"') + ' onclick="FusionApp._flowToggleTool(\'' + step.id + '\',\'' + tool + '\')">';
          html += icon(toolIcons[tool] || 'circle', 12) + ' ' + tool;
          html += '</button>';
        });
        html += '</div></div>';
        html += '</div></div>';
      }
      html += '</div>';
    });
    html += '</div>';

    if (steps.length === 0) {
      html += App.renderEmptyState('gitBranch', 'No steps yet', 'Add your first step to design your process flow.', '<button class="btn btn-primary" onclick="FusionApp._flowAddStep()">' + icon('plus', 16) + ' Add Step</button>');
    }

    return html;
  }

  // --- Preview mode ---
  function renderPreviewMode() {
    var steps = getSteps();
    reorderSteps();
    var html = '';

    // Process info card
    html += '<div class="fusion-card p-5 mb-6">';
    html += '<h2 class="text-lg font-semibold">' + escapeHtml(processInfo.name) + '</h2>';
    if (processInfo.department) html += '<p class="text-sm text-muted-foreground">' + escapeHtml(processInfo.department) + '</p>';
    if (processInfo.description) html += '<p class="text-sm text-muted-foreground mt-1">' + escapeHtml(processInfo.description) + '</p>';
    html += '<div class="flex gap-2 mt-3">';
    html += '<button class="btn btn-outline btn-sm">' + icon('share2', 14) + ' Share</button>';
    html += '<button class="btn btn-outline btn-sm">' + icon('download', 14) + ' Export</button>';
    html += '</div>';
    html += '</div>';

    // Timeline
    html += '<div style="position:relative;padding-left:2rem">';
    // Vertical line
    html += '<div style="position:absolute;left:0.875rem;top:0;bottom:0;width:2px;background:hsl(var(--border))"></div>';

    steps.forEach(function(step) {
      var typeColor = getStepTypeColor(step.type);
      html += '<div style="position:relative;padding-bottom:1.5rem">';
      // Dot on timeline
      html += '<div style="position:absolute;left:-1.625rem;top:0.25rem;width:1.5rem;height:1.5rem;border-radius:9999px;background:hsl(var(--' + typeColor + '));display:flex;align-items:center;justify-content:center;color:white;font-size:0.625rem;font-weight:700">' + step.order + '</div>';

      html += '<div class="fusion-card p-4">';
      html += '<div class="flex items-center gap-2 mb-1">';
      html += '<span class="font-semibold text-sm">' + escapeHtml(step.title) + '</span>';
      html += '<span class="badge badge-' + typeColor + '" style="font-size:0.6rem">' + escapeHtml(step.type.toUpperCase()) + '</span>';
      html += '</div>';
      html += '<p class="text-xs text-muted-foreground mb-2">' + escapeHtml(step.description) + '</p>';

      // Details row
      var details = [];
      if (step.owner) details.push(icon('user', 12) + ' ' + escapeHtml(step.owner) + (step.role ? ' (' + escapeHtml(step.role) + ')' : ''));
      if (step.duration) details.push(icon('clock', 12) + ' ' + escapeHtml(step.duration));
      if (details.length) html += '<div class="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">' + details.map(function(d) { return '<span class="flex items-center gap-1">' + d + '</span>'; }).join('') + '</div>';

      // Tool badges
      if (step.tools && step.tools.length) {
        html += '<div class="flex flex-wrap gap-1">';
        step.tools.forEach(function(tool) {
          html += '<span class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style="background:hsl(var(--muted) / 0.5)">' + icon(toolIcons[tool] || 'circle', 10) + ' ' + escapeHtml(tool) + '</span>';
        });
        html += '</div>';
      }
      html += '</div></div>';
    });
    html += '</div>';

    return html;
  }

  App.pages['/flow'] = {
    layout: 'dashboard',

    render: function() {
      getSteps();
      var html = '';

      // Title + controls
      html += '<div class="flex items-center justify-between mb-6">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">' + icon('gitBranch', 24) + ' Flow</h1>';
      html += '<p class="text-muted-foreground">Design and visualize process workflows</p>';
      html += '</div>';
      html += '<div class="flex items-center gap-2">';

      // Edit/Preview toggle
      html += '<div class="flex rounded-lg overflow-hidden" style="border:1px solid hsl(var(--border))">';
      html += '<button class="btn btn-sm' + (viewMode === 'edit' ? ' btn-primary' : ' btn-ghost') + '" style="border-radius:0" onclick="FusionApp._flowSetView(\'edit\')">' + icon('edit3', 14) + ' Edit</button>';
      html += '<button class="btn btn-sm' + (viewMode === 'preview' ? ' btn-primary' : ' btn-ghost') + '" style="border-radius:0" onclick="FusionApp._flowSetView(\'preview\')">' + icon('eye', 14) + ' Preview</button>';
      html += '</div>';

      if (viewMode === 'edit') {
        html += '<button class="btn btn-outline" onclick="FusionApp._flowAddStep()">' + icon('plus', 16) + ' Add Step</button>';
        html += '<button class="btn btn-primary" onclick="FusionApp._flowSave()" ' + (saving ? 'disabled' : '') + '>';
        html += saving ? '<span class="animate-spin">' + icon('loader2', 16) + '</span> Saving...' : icon('save', 16) + ' Save';
        html += '</button>';
      }
      html += '</div></div>';

      html += viewMode === 'edit' ? renderEditMode() : renderPreviewMode();
      return html;
    },

    init: function() {
      return function() { localSteps = null; saving = false; viewMode = 'edit'; expandedStep = null; };
    }
  };

  App._flowMoveStep = function(stepId, direction) {
    var steps = getSteps();
    var idx = steps.findIndex(function(s) { return s.id === stepId; });
    if (idx < 0) return;
    var target = idx + direction;
    if (target < 0 || target >= steps.length) return;
    var tmp = steps[idx].order;
    steps[idx].order = steps[target].order;
    steps[target].order = tmp;
    App.render();
  };

  App._flowRemoveStep = function(stepId) {
    localSteps = getSteps().filter(function(s) { return s.id !== stepId; });
    reorderSteps();
    App.render();
    App.showToast({ title: 'Step removed', description: 'Step has been removed' });
  };

  App._flowAddStep = function() {
    var steps = getSteps();
    steps.push({ id: 's' + Date.now(), title: 'New Step', description: 'Describe what happens in this step', order: steps.length + 1, owner: '', role: '', tools: [], duration: '', type: 'action' });
    expandedStep = steps[steps.length - 1].id;
    App.render();
  };

  App._flowSave = function() {
    saving = true;
    App.render();
    var steps = getSteps();
    fetch('/api/flows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: processInfo.name, steps: steps }) })
      .then(function(res) { return res.json(); })
      .then(function() {
        App.store.flows[0].steps = steps.map(function(s) { return { id: s.id, title: s.title, description: s.description, order: s.order, owner: s.owner, role: s.role, tools: s.tools.slice(), duration: s.duration, type: s.type }; });
        App.store.flows[0].name = processInfo.name;
        saving = false;
        App.render();
        App.showToast({ title: 'Flow saved', description: 'Process design has been saved' });
      });
  };
})();
