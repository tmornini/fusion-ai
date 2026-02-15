// Fusion AI — Engineering Requirements Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var newQuestion = '';
  var isSubmitting = false;

  function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);
  }

  App.pages['/projects/:projectId/engineering'] = {
    layout: 'dashboard',

    render: function(params) {
      var project = App.store.projects.find(function(p) { return p.id === params.projectId; });
      if (!project) {
        return App.renderEmptyState('alertCircle', 'Project not found', 'The requested project could not be found.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/projects\')">Back to Projects</button>');
      }

      var ctx = project.businessContext || {};
      var clarifications = project.clarifications || [];
      var teamMembers = project.teamMembers || [];
      var linkedIdea = project.linkedIdea;
      var pendingCount = clarifications.filter(function(c) { return c.status === 'pending'; }).length;
      var answeredCount = clarifications.filter(function(c) { return c.status === 'answered'; }).length;

      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" onclick="FusionApp.navigate(\'/projects\')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font:inherit">Projects</button>';
      html += '<span>' + icon('chevronRight', 14) + '</span>';
      html += '<button class="hover:text-foreground" onclick="FusionApp.navigate(\'/projects/' + project.id + '\')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font:inherit">' + escapeHtml(project.name) + '</button>';
      html += '<span>' + icon('chevronRight', 14) + '</span>';
      html += '<span class="text-foreground font-medium">Engineering Requirements</span>';
      html += '</div>';

      // Header
      html += '<div class="flex items-center justify-between mb-6">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Engineering Requirements</h1>';
      html += '<p class="text-sm text-muted-foreground mt-1">Business-to-engineering bridge for ' + escapeHtml(project.name) + '</p>';
      html += '</div>';
      html += '<button class="btn btn-ghost" onclick="FusionApp.navigate(\'/projects/' + project.id + '\')">' + icon('arrowLeft', 16) + ' Back to Project</button>';
      html += '</div>';

      // Quick stats
      html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">';
      var stats = [
        { label: 'Timeline', value: project.timeline || '3-4 months', icon: 'clock', color: 'primary' },
        { label: 'Budget', value: project.budgetLabel || '$' + App.formatNumber(project.budget), icon: 'dollarSign', color: 'success' },
        { label: 'Pending Qs', value: pendingCount, icon: 'messageSquare', color: 'warning' },
        { label: 'Answered', value: answeredCount, icon: 'checkCircle2', color: 'success' },
      ];
      stats.forEach(function(s) {
        html += '<div class="fusion-card p-3">';
        html += '<div class="flex items-center gap-2 mb-1">';
        html += '<span style="color:hsl(var(--' + s.color + '))">' + icon(s.icon, 14) + '</span>';
        html += '<span class="text-xs text-muted-foreground">' + s.label + '</span>';
        html += '</div>';
        html += '<div class="text-lg font-bold">' + escapeHtml(String(s.value)) + '</div>';
        html += '</div>';
      });
      html += '</div>';

      // Business context
      if (ctx.problem || ctx.expectedOutcome) {
        html += '<div class="fusion-card p-5 mb-4">';
        html += '<h3 class="text-base font-semibold mb-3">' + icon('fileText', 18) + ' Business Context</h3>';
        if (ctx.problem) {
          html += '<div class="mb-3"><span class="text-xs font-semibold text-muted-foreground">Problem Statement</span>';
          html += '<p class="text-sm mt-1">' + escapeHtml(ctx.problem) + '</p></div>';
        }
        if (ctx.expectedOutcome) {
          html += '<div><span class="text-xs font-semibold text-muted-foreground">Expected Outcome</span>';
          html += '<p class="text-sm mt-1">' + escapeHtml(ctx.expectedOutcome) + '</p></div>';
        }
        html += '</div>';
      }

      // Success metrics + constraints
      html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">';
      if (ctx.successMetrics && ctx.successMetrics.length) {
        html += '<div class="fusion-card p-5">';
        html += '<h3 class="text-sm font-semibold mb-3">' + icon('target', 16) + ' Success Metrics</h3>';
        html += '<ul class="space-y-2">';
        ctx.successMetrics.forEach(function(m) {
          html += '<li class="flex items-start gap-2 text-sm"><span class="text-success mt-0.5">' + icon('checkCircle2', 14) + '</span> ' + escapeHtml(m) + '</li>';
        });
        html += '</ul></div>';
      }
      if (ctx.constraints && ctx.constraints.length) {
        html += '<div class="fusion-card p-5">';
        html += '<h3 class="text-sm font-semibold mb-3">' + icon('alertTriangle', 16) + ' Constraints</h3>';
        html += '<ul class="space-y-2">';
        ctx.constraints.forEach(function(c) {
          html += '<li class="flex items-start gap-2 text-sm"><span class="text-warning mt-0.5" style="width:0.5rem;height:0.5rem;border-radius:9999px;background:hsl(var(--warning));display:inline-block;margin-top:0.375rem;flex-shrink:0"></span> ' + escapeHtml(c) + '</li>';
        });
        html += '</ul></div>';
      }
      html += '</div>';

      // Team contacts
      if (teamMembers.length) {
        html += '<div class="fusion-card p-5 mb-4">';
        html += '<h3 class="text-sm font-semibold mb-3">' + icon('users', 16) + ' Team Contacts</h3>';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
        teamMembers.forEach(function(m) {
          var initials = getInitials(m.name);
          var teamMember = App.store.team.find(function(t) { return t.name === m.name; });
          var memberType = teamMember ? teamMember.memberType : 'engineering';
          var typeColor = memberType === 'business' ? 'warning' : 'primary';
          html += '<div class="flex items-center gap-3 p-2 rounded-lg" style="background:hsl(var(--muted) / 0.3)">';
          html += '<div style="width:2.25rem;height:2.25rem;border-radius:9999px;background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:600;font-size:0.7rem;flex-shrink:0">' + initials + '</div>';
          html += '<div class="flex-1 min-w-0">';
          html += '<div class="text-sm font-medium">' + escapeHtml(m.name) + '</div>';
          html += '<div class="text-xs text-muted-foreground">' + escapeHtml(m.role) + '</div>';
          html += '</div>';
          html += '<span class="badge badge-' + typeColor + '" style="font-size:0.6rem">' + memberType + '</span>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Linked idea
      if (linkedIdea) {
        html += '<div class="fusion-card p-4 mb-4 cursor-pointer hover:shadow-sm" onclick="FusionApp.navigate(\'/ideas\')">';
        html += '<div class="flex items-center gap-3">';
        html += '<span class="text-primary">' + icon('lightbulb', 18) + '</span>';
        html += '<div class="flex-1"><span class="text-sm font-medium">Source Idea: ' + escapeHtml(linkedIdea.title) + '</span></div>';
        if (linkedIdea.score) html += '<span class="badge badge-success">' + linkedIdea.score + '/100</span>';
        html += icon('chevronRight', 16);
        html += '</div></div>';
      }

      // Clarification threads
      html += '<div class="fusion-card p-5">';
      html += '<div class="flex items-center justify-between mb-4">';
      html += '<h3 class="text-base font-semibold">' + icon('messageSquare', 18) + ' Clarification Threads</h3>';
      if (pendingCount) html += '<span class="badge badge-warning">' + pendingCount + ' pending</span>';
      html += '</div>';

      // Ask question form
      html += '<div class="mb-4 p-3 rounded-lg" style="background:hsl(var(--muted) / 0.3)">';
      html += '<textarea class="input w-full mb-2" id="eng-new-question" rows="2" placeholder="Ask a question to the engineering or business team...">' + escapeHtml(newQuestion) + '</textarea>';
      html += '<div class="flex justify-end">';
      html += '<button class="btn btn-primary btn-sm" onclick="FusionApp._engSubmitQuestion(\'' + params.projectId + '\')">' + icon('send', 14) + ' Send Question</button>';
      html += '</div></div>';

      // Threads
      if (clarifications.length) {
        html += '<div class="space-y-3">';
        clarifications.forEach(function(c) {
          var isPending = c.status === 'pending';
          html += '<div class="p-4 rounded-lg" style="background:hsl(var(--' + (isPending ? 'warning' : 'muted') + ') / 0.08);border:1px solid hsl(var(--' + (isPending ? 'warning' : 'border') + ') / 0.3)">';
          html += '<div class="flex items-start gap-2 mb-2">';
          html += '<span class="badge badge-' + (isPending ? 'warning' : 'success') + '" style="font-size:0.6rem">' + (isPending ? 'Pending' : 'Answered') + '</span>';
          html += '<p class="text-sm font-medium flex-1">' + escapeHtml(c.question) + '</p>';
          html += '</div>';
          html += '<div class="text-xs text-muted-foreground mb-2">Asked by ' + escapeHtml(c.askedBy) + ' on ' + App.formatDate(c.askedAt) + '</div>';

          if (c.answer) {
            html += '<div class="ml-4 pl-3 mt-2" style="border-left:2px solid hsl(var(--primary) / 0.3)">';
            html += '<p class="text-sm">' + escapeHtml(c.answer) + '</p>';
            html += '<div class="text-xs text-muted-foreground mt-1">Answered by ' + escapeHtml(c.answeredBy) + ' on ' + App.formatDate(c.answeredAt) + '</div>';
            html += '</div>';
          }
          html += '</div>';
        });
        html += '</div>';
      } else {
        html += '<p class="text-sm text-muted-foreground text-center py-4">No clarification threads yet</p>';
      }
      html += '</div>';

      // Action bar
      html += '<div class="flex items-center justify-between mt-6">';
      html += '<button class="btn btn-ghost" onclick="FusionApp.navigate(\'/projects/' + project.id + '\')">' + icon('arrowLeft', 16) + ' Back to Project</button>';
      html += '<button class="btn btn-primary" onclick="FusionApp.showToast({title:\'Requirements saved\',description:\'Engineering requirements have been updated.\'})">' + icon('checkCircle2', 16) + ' Mark Requirements Complete</button>';
      html += '</div>';

      return html;
    },

    init: function() {
      newQuestion = '';
      isSubmitting = false;
    }
  };

  App._engSubmitQuestion = function(projectId) {
    var input = document.getElementById('eng-new-question');
    if (!input || !input.value.trim()) {
      App.showToast({ title: 'Error', description: 'Please enter a question', variant: 'destructive' });
      return;
    }

    var project = App.store.projects.find(function(p) { return p.id === projectId; });
    if (!project) return;
    if (!project.clarifications) project.clarifications = [];

    project.clarifications.push({
      id: 'q' + Date.now(),
      question: input.value.trim(),
      askedBy: App.store.user.name,
      askedAt: new Date().toISOString().split('T')[0],
      status: 'pending'
    });

    newQuestion = '';
    App.render();
    App.showToast({ title: 'Question submitted', description: 'Your question has been sent to the team' });
  };
})();
