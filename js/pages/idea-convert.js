// Fusion AI — Idea Convert to Project Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var formState = {
    projectName: '', projectLead: '', startDate: '', targetEndDate: '',
    budget: '', priority: '', firstMilestone: '', successCriteria: '',
    teamMembers: []
  };

  var requiredFields = ['projectName', 'projectLead', 'startDate', 'targetEndDate', 'budget', 'priority'];

  function getCompletedCount() {
    return requiredFields.filter(function(f) { return formState[f] && formState[f].trim(); }).length;
  }

  function getCompletionPct() {
    return Math.round((getCompletedCount() / requiredFields.length) * 100);
  }

  function isFieldDone(field) {
    return formState[field] && formState[field].trim();
  }

  App._convertUpdate = function(field, value) {
    formState[field] = value;
    // Update progress bar
    var bar = document.getElementById('convert-progress-bar');
    var label = document.getElementById('convert-progress-label');
    if (bar) bar.style.width = getCompletionPct() + '%';
    if (label) label.textContent = getCompletedCount() + '/' + requiredFields.length + ' required fields';
    // Update confirmation card
    var card = document.getElementById('convert-confirm-card');
    if (card) card.innerHTML = renderConfirmCard();
  };

  function renderFieldCheck(field) {
    return '<span class="' + (isFieldDone(field) ? 'text-success' : 'text-muted-foreground') + '" style="flex-shrink:0">' + (isFieldDone(field) ? icon('checkCircle2', 16) : icon('circle', 16)) + '</span>';
  }

  function renderConfirmCard() {
    var done = getCompletedCount();
    var allDone = done === requiredFields.length;
    return '<div class="p-5 rounded-lg text-center" style="border:2px solid hsl(var(--' + (allDone ? 'success' : 'border') + '));background:hsl(var(--' + (allDone ? 'success' : 'muted') + ') / 0.05)">' +
      '<div class="mb-3 ' + (allDone ? 'text-success' : 'text-muted-foreground') + '">' + icon('rocket', 32) + '</div>' +
      '<h3 class="font-semibold mb-1">' + (allDone ? 'Ready to Create Project' : 'Complete Required Fields') + '</h3>' +
      '<p class="text-sm text-muted-foreground mb-4">' + (allDone ? 'All fields completed. Click below to create the project.' : done + ' of ' + requiredFields.length + ' required fields completed') + '</p>' +
      '<div class="flex gap-2 justify-center">' +
      '<button class="btn btn-ghost" onclick="FusionApp.navigate(\'/ideas\')">Back</button>' +
      '<button class="btn btn-primary' + (allDone ? '' : ' opacity-50') + '" ' + (allDone ? '' : 'disabled') + ' onclick="FusionApp._convertSubmit()">' + icon('rocket', 16) + ' Create Project</button>' +
      '</div></div>';
  }

  App.pages['/ideas/:ideaId/convert'] = {
    layout: 'none',

    render: function(params) {
      var idea = store.ideas.find(function(i) { return i.id === params.ideaId; });
      if (!idea) {
        return '<div class="min-h-screen flex items-center justify-center"><div class="text-center">' +
          '<h2 class="text-xl font-semibold mb-2">Idea Not Found</h2>' +
          '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/ideas\')">Back to Ideas</button>' +
        '</div></div>';
      }

      if (!formState.projectName) formState.projectName = idea.title;

      var pct = getCompletionPct();
      var completed = getCompletedCount();

      var html = '<div class="min-h-screen" style="background:hsl(var(--background))">';

      // Header with progress
      html += '<div style="border-bottom:1px solid hsl(var(--border));padding:1rem 1.5rem">';
      html += '<div class="flex items-center gap-3 mb-2">';
      html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 20) + '</button>';
      html += '<div class="flex-1">';
      html += '<h1 class="text-xl font-display font-bold">Convert to Project</h1>';
      html += '<span class="text-sm text-muted-foreground" id="convert-progress-label">' + completed + '/' + requiredFields.length + ' required fields</span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="progress" style="height:4px"><div id="convert-progress-bar" class="progress-bar" style="width:' + pct + '%;background:hsl(var(--success));transition:width 0.3s"></div></div>';
      html += '</div>';

      // Content — 2-column layout
      html += '<div style="max-width:72rem;margin:0 auto;padding:1.5rem">';
      html += '<div class="grid grid-cols-1 lg:grid-cols-5 gap-6">';

      // Left sidebar — idea summary (2/5)
      html += '<div class="lg:col-span-2"><div class="fusion-card p-5 lg:sticky" style="top:5rem">';
      html += '<h3 class="text-sm font-semibold text-muted-foreground mb-3">IDEA SUMMARY</h3>';
      html += '<h4 class="font-semibold mb-3">' + escapeHtml(idea.title) + '</h4>';

      if (idea.problemStatement) {
        html += '<div class="mb-3"><span class="text-xs font-semibold text-muted-foreground">Problem</span>';
        html += '<p class="text-sm mt-0.5">' + escapeHtml(idea.problemStatement) + '</p></div>';
      }
      if (idea.proposedSolution) {
        html += '<div class="mb-3"><span class="text-xs font-semibold text-muted-foreground">Solution</span>';
        html += '<p class="text-sm mt-0.5">' + escapeHtml(idea.proposedSolution) + '</p></div>';
      }
      if (idea.expectedOutcome) {
        html += '<div class="mb-3"><span class="text-xs font-semibold text-muted-foreground">Expected Outcome</span>';
        html += '<p class="text-sm mt-0.5">' + escapeHtml(idea.expectedOutcome) + '</p></div>';
      }

      html += '<div style="border-top:1px solid hsl(var(--border));padding-top:0.75rem;margin-top:0.75rem">';
      if (idea.score) html += '<div class="flex items-center justify-between mb-2"><span class="text-xs text-muted-foreground">Priority Score</span><span class="badge badge-success">' + idea.score + '/100</span></div>';
      if (idea.estimatedTime) html += '<div class="flex items-center justify-between mb-2"><span class="text-xs text-muted-foreground flex items-center gap-1">' + icon('clock', 12) + ' Est. Time</span><span class="text-sm font-medium">' + escapeHtml(idea.estimatedTime) + '</span></div>';
      if (idea.estimatedCost) html += '<div class="flex items-center justify-between"><span class="text-xs text-muted-foreground flex items-center gap-1">' + icon('dollarSign', 12) + ' Est. Cost</span><span class="text-sm font-medium">' + escapeHtml(idea.estimatedCost) + '</span></div>';
      html += '</div>';
      html += '</div></div>';

      // Right main — form (3/5)
      html += '<div class="lg:col-span-3">';

      // Required fields card
      html += '<div class="fusion-card p-5 mb-4">';
      html += '<h3 class="text-base font-semibold mb-4">Required Fields</h3>';
      html += '<div class="space-y-4">';

      // Project Name
      html += '<div class="flex items-start gap-2">' + renderFieldCheck('projectName');
      html += '<div class="flex-1"><label class="text-sm font-medium block mb-1">Project Name</label>';
      html += '<input class="input w-full" value="' + escapeHtml(formState.projectName) + '" onchange="FusionApp._convertUpdate(\'projectName\',this.value)" /></div></div>';

      // Project Lead
      html += '<div class="flex items-start gap-2">' + renderFieldCheck('projectLead');
      html += '<div class="flex-1"><label class="text-sm font-medium block mb-1">Project Lead</label>';
      html += '<select class="input w-full" onchange="FusionApp._convertUpdate(\'projectLead\',this.value)">';
      html += '<option value="">Select lead...</option>';
      html += '<option value="' + escapeHtml(store.user.name) + '"' + (formState.projectLead === store.user.name ? ' selected' : '') + '>' + escapeHtml(store.user.name) + ' (You)</option>';
      store.team.forEach(function(m) {
        if (m.status === 'active') html += '<option value="' + escapeHtml(m.name) + '"' + (formState.projectLead === m.name ? ' selected' : '') + '>' + escapeHtml(m.name) + '</option>';
      });
      html += '</select></div></div>';

      // Start Date + Target End Date
      html += '<div class="grid grid-cols-2 gap-3">';
      html += '<div class="flex items-start gap-2">' + renderFieldCheck('startDate');
      html += '<div class="flex-1"><label class="text-sm font-medium block mb-1">' + icon('calendar', 12) + ' Start Date</label>';
      html += '<input class="input w-full" type="date" value="' + escapeHtml(formState.startDate) + '" onchange="FusionApp._convertUpdate(\'startDate\',this.value)" /></div></div>';
      html += '<div class="flex items-start gap-2">' + renderFieldCheck('targetEndDate');
      html += '<div class="flex-1"><label class="text-sm font-medium block mb-1">' + icon('target', 12) + ' Target End Date</label>';
      html += '<input class="input w-full" type="date" value="' + escapeHtml(formState.targetEndDate) + '" onchange="FusionApp._convertUpdate(\'targetEndDate\',this.value)" /></div></div>';
      html += '</div>';

      // Budget + Priority
      html += '<div class="grid grid-cols-2 gap-3">';
      html += '<div class="flex items-start gap-2">' + renderFieldCheck('budget');
      html += '<div class="flex-1"><label class="text-sm font-medium block mb-1">Budget</label>';
      html += App.renderSelect([{ value: '', label: 'Select range...' }, { value: '$0 - $25K', label: '$0 - $25K' }, { value: '$25K - $50K', label: '$25K - $50K' }, { value: '$50K - $100K', label: '$50K - $100K' }, { value: '$100K - $250K', label: '$100K - $250K' }, { value: '$250K+', label: '$250K+' }], formState.budget, 'convert-budget', 'FusionApp._convertUpdate(\'budget\',this.value)');
      html += '</div></div>';
      html += '<div class="flex items-start gap-2">' + renderFieldCheck('priority');
      html += '<div class="flex-1"><label class="text-sm font-medium block mb-1">Priority</label>';
      html += App.renderSelect([{ value: '', label: 'Select...' }, { value: 'Critical', label: 'Critical' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }], formState.priority, 'convert-priority', 'FusionApp._convertUpdate(\'priority\',this.value)');
      html += '</div></div>';
      html += '</div>';

      html += '</div></div>';

      // Optional fields card
      html += '<div class="fusion-card p-5 mb-4">';
      html += '<h3 class="text-sm font-semibold text-muted-foreground mb-3">OPTIONAL DETAILS</h3>';
      html += '<div class="space-y-4">';
      // Team Members
      html += '<div><label class="text-sm font-medium block mb-2">' + icon('users', 14) + ' Team Members</label>';
      html += '<div class="space-y-2">';
      store.team.forEach(function(m) {
        if (m.status !== 'active') return;
        var checked = formState.teamMembers.indexOf(m.id) >= 0;
        html += '<label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer" style="background:hsl(var(--muted) / ' + (checked ? '0.3' : '0') + ')">';
        html += '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="FusionApp._convertToggleTeam(\'' + m.id + '\')" style="accent-color:hsl(var(--primary))" />';
        html += '<div class="flex-1 min-w-0"><span class="text-sm font-medium">' + escapeHtml(m.name) + '</span>';
        html += '<span class="text-xs text-muted-foreground ml-2">' + escapeHtml(m.role) + '</span></div>';
        html += '</label>';
      });
      html += '</div></div>';

      html += '<div><label class="text-sm font-medium block mb-1">First Milestone</label>';
      html += '<input class="input w-full" value="' + escapeHtml(formState.firstMilestone) + '" placeholder="e.g. Complete requirements gathering" onchange="FusionApp._convertUpdate(\'firstMilestone\',this.value)" /></div>';
      html += '<div><label class="text-sm font-medium block mb-1">Success Criteria</label>';
      html += '<textarea class="input w-full" rows="3" placeholder="How will you measure success?" onchange="FusionApp._convertUpdate(\'successCriteria\',this.value)">' + escapeHtml(formState.successCriteria) + '</textarea></div>';
      html += '</div></div>';

      // Confirmation card
      html += '<div id="convert-confirm-card">' + renderConfirmCard() + '</div>';

      html += '</div>'; // main
      html += '</div></div></div>';
      return html;
    },

    init: function(params) {
      var idea = store.ideas.find(function(i) { return i.id === params.ideaId; });
      formState = { projectName: idea ? idea.title : '', projectLead: '', startDate: '', targetEndDate: '', budget: '', priority: '', firstMilestone: '', successCriteria: '', teamMembers: [] };
      formState._ideaId = params.ideaId;
    }
  };

  App._convertToggleTeam = function(memberId) {
    var idx = formState.teamMembers.indexOf(memberId);
    if (idx >= 0) formState.teamMembers.splice(idx, 1);
    else formState.teamMembers.push(memberId);
    App.render();
  };

  App._convertSubmit = function() {
    var ideaId = formState._ideaId;
    var btn = document.querySelector('#convert-confirm-card .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = icon('loader2', 16) + ' Creating...'; }

    fetch('/api/ideas/' + ideaId + '/convert', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formState.projectName, owner: formState.projectLead, targetDate: formState.targetEndDate, budget: formState.budget })
    }).then(function(res) { return res.json(); }).then(function() {
      App.showToast({ title: 'Project Created', description: 'Successfully converted to project.' });
      App.navigate('/projects');
    }).catch(function() {
      App.showToast({ title: 'Error', description: 'Failed to convert. Try again.', variant: 'destructive' });
      if (btn) { btn.disabled = false; btn.innerHTML = icon('rocket', 16) + ' Create Project'; }
    });
  };
})();
