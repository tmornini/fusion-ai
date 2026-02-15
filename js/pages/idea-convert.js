// Fusion AI — Idea Convert to Project Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var formState = {
    name: '',
    owner: '',
    targetDate: '',
    budget: '',
    selectedTeam: []
  };

  App.pages['/ideas/:ideaId/convert'] = {
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

      // Initialize form state
      if (!formState.name) formState.name = idea.title;
      if (!formState.owner) formState.owner = store.user.name;

      var html = '<div class="min-h-screen" style="background:hsl(var(--background))">';

      // Header
      html += '<div style="border-bottom:1px solid hsl(var(--border));padding:1rem 1.5rem;display:flex;align-items:center;gap:0.75rem">';
      html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 20) + '</button>';
      html += '<div>';
      html += '<h1 class="text-xl font-display font-bold">Convert to Project</h1>';
      html += '<p class="text-sm text-muted-foreground">Create a project from an approved idea</p>';
      html += '</div>';
      html += '</div>';

      // Content
      html += '<div style="max-width:48rem;margin:0 auto;padding:1.5rem">';

      // Idea info card
      html += '<div class="fusion-card" style="padding:1.25rem;margin-bottom:1.5rem">';
      html += '<div class="flex items-start gap-3">';
      html += '<div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));flex-shrink:0">' + icon('lightbulb', 20) + '</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<h3 class="text-base font-semibold">' + escapeHtml(idea.title) + '</h3>';
      html += '<p class="text-sm text-muted-foreground mt-1">' + escapeHtml(idea.description) + '</p>';
      html += '<div class="flex items-center gap-2 mt-2">';
      html += App.renderStatusBadge(idea.status);
      if (idea.score !== null) {
        html += App.renderBadge('Score: ' + idea.score, idea.score >= 80 ? 'success' : idea.score >= 60 ? 'warning' : 'error');
      }
      html += App.renderBadge(idea.category, 'secondary');
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Form
      html += '<div class="fusion-card" style="padding:1.5rem">';
      html += '<h2 class="text-lg font-semibold mb-4">Project Details</h2>';

      // Project name
      html += '<div style="margin-bottom:1.25rem">';
      html += '<label class="text-sm font-medium" style="display:block;margin-bottom:0.375rem">Project Name</label>';
      html += '<input class="input" id="convert-name" type="text" value="' + escapeHtml(formState.name) + '" placeholder="Enter project name" style="width:100%" />';
      html += '</div>';

      // Owner
      html += '<div style="margin-bottom:1.25rem">';
      html += '<label class="text-sm font-medium" style="display:block;margin-bottom:0.375rem">Project Owner</label>';
      html += '<select class="input" id="convert-owner" style="width:100%">';
      html += '<option value="' + escapeHtml(store.user.name) + '"' + (formState.owner === store.user.name ? ' selected' : '') + '>' + escapeHtml(store.user.name) + ' (You)</option>';
      store.team.forEach(function(member) {
        if (member.status === 'active') {
          html += '<option value="' + escapeHtml(member.name) + '"' + (formState.owner === member.name ? ' selected' : '') + '>' + escapeHtml(member.name) + '</option>';
        }
      });
      html += '</select>';
      html += '</div>';

      // Target date and budget row
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem">';

      // Target date
      html += '<div>';
      html += '<label class="text-sm font-medium" style="display:block;margin-bottom:0.375rem">Target Date</label>';
      html += '<input class="input" id="convert-target-date" type="date" value="' + escapeHtml(formState.targetDate) + '" style="width:100%" />';
      html += '</div>';

      // Budget
      html += '<div>';
      html += '<label class="text-sm font-medium" style="display:block;margin-bottom:0.375rem">Budget ($)</label>';
      html += '<input class="input" id="convert-budget" type="number" value="' + escapeHtml(formState.budget) + '" placeholder="e.g. 50000" min="0" style="width:100%" />';
      html += '</div>';

      html += '</div>';

      // Team member selector
      html += '<div style="margin-bottom:1.5rem">';
      html += '<label class="text-sm font-medium" style="display:block;margin-bottom:0.375rem">Team Members</label>';
      html += '<p class="text-xs text-muted-foreground" style="margin-bottom:0.5rem">Select team members to assign to this project</p>';
      html += '<div style="border:1px solid hsl(var(--border));border-radius:0.5rem;padding:0.75rem;max-height:16rem;overflow-y:auto">';
      store.team.forEach(function(member) {
        if (member.status !== 'active') return;
        var checked = formState.selectedTeam.indexOf(member.id) >= 0;
        html += '<label style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;border-radius:0.375rem;cursor:pointer" class="list-card">';
        html += '<input type="checkbox" id="team-member-' + member.id + '" value="' + member.id + '"' + (checked ? ' checked' : '') + ' onchange="FusionApp._convertToggleTeam(\'' + member.id + '\')" />';
        html += '<div style="width:2rem;height:2rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;flex-shrink:0">' + icon('user', 14) + '</div>';
        html += '<div style="flex:1;min-width:0">';
        html += '<p class="text-sm font-medium">' + escapeHtml(member.name) + '</p>';
        html += '<p class="text-xs text-muted-foreground">' + escapeHtml(member.role) + ' &middot; ' + escapeHtml(member.department) + '</p>';
        html += '</div>';
        html += '</label>';
      });
      html += '</div>';
      html += '</div>';

      // Actions
      html += '<div style="display:flex;gap:0.75rem;justify-content:flex-end;padding-top:1rem;border-top:1px solid hsl(var(--border))">';
      html += '<button class="btn btn-outline" onclick="FusionApp.navigate(\'/ideas\')">Cancel</button>';
      html += '<button class="btn btn-primary" id="convert-submit-btn" onclick="FusionApp._convertSubmit(\'' + params.ideaId + '\')">' + icon('rocket', 16) + ' Convert to Project</button>';
      html += '</div>';

      html += '</div>'; // card
      html += '</div>'; // container
      html += '</div>'; // page

      return html;
    },

    init: function(params) {
      // Reset form state on page load
      var idea = store.ideas.find(function(i) { return i.id === params.ideaId; });
      if (idea) {
        formState.name = idea.title;
        formState.owner = store.user.name;
        formState.targetDate = '';
        formState.budget = '';
        formState.selectedTeam = [];
      }
    }
  };

  App._convertToggleTeam = function(memberId) {
    var idx = formState.selectedTeam.indexOf(memberId);
    if (idx >= 0) {
      formState.selectedTeam.splice(idx, 1);
    } else {
      formState.selectedTeam.push(memberId);
    }
  };

  App._convertSubmit = function(ideaId) {
    var nameEl = document.getElementById('convert-name');
    var ownerEl = document.getElementById('convert-owner');
    var dateEl = document.getElementById('convert-target-date');
    var budgetEl = document.getElementById('convert-budget');

    var name = nameEl ? nameEl.value.trim() : '';
    var owner = ownerEl ? ownerEl.value : store.user.name;
    var targetDate = dateEl ? dateEl.value : '';
    var budget = budgetEl ? parseFloat(budgetEl.value) || 0 : 0;

    if (!name) {
      App.showToast({ title: 'Validation Error', description: 'Project name is required.', variant: 'destructive' });
      return;
    }

    // Get selected team member names
    var teamNames = [owner];
    formState.selectedTeam.forEach(function(memberId) {
      var member = store.team.find(function(m) { return m.id === memberId; });
      if (member && teamNames.indexOf(member.name) < 0) {
        teamNames.push(member.name);
      }
    });

    var btn = document.getElementById('convert-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = icon('loader2', 16) + ' Converting...';
    }

    fetch('/api/ideas/' + ideaId + '/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        owner: owner,
        targetDate: targetDate,
        budget: budget,
        team: teamNames
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      App.showToast({ title: 'Project Created', description: 'Successfully converted idea to project "' + name + '".' });
      // Reset form state
      formState.name = '';
      formState.owner = '';
      formState.targetDate = '';
      formState.budget = '';
      formState.selectedTeam = [];
      App.navigate('/projects');
    })
    .catch(function(err) {
      App.showToast({ title: 'Error', description: 'Failed to convert idea. Please try again.', variant: 'destructive' });
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = icon('rocket', 16) + ' Convert to Project';
      }
    });
  };
})();
