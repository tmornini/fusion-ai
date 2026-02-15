// Fusion AI — Project Detail Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var activeTab = 'tasks';
  var newComment = '';

  function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);
  }

  function getVariance(baseline, current, isLowerBetter) {
    var diff = current - baseline;
    if (diff === 0) return { icon: 'minus', color: 'muted-foreground', value: 0 };
    var good = isLowerBetter ? diff < 0 : diff > 0;
    return {
      icon: good ? 'arrowDownRight' : 'arrowUpRight',
      color: good ? 'success' : 'destructive',
      value: Math.abs(diff)
    };
  }

  var confidenceConfig = {
    high: { label: 'High Confidence', color: 'success' },
    medium: { label: 'Medium Confidence', color: 'warning' },
    low: { label: 'Low Confidence', color: 'destructive' }
  };

  App.pages['/projects/:projectId'] = {
    layout: 'dashboard',

    render: function(params) {
      var project = store.projects.find(function(p) { return p.id === params.projectId; });
      if (!project) {
        return App.renderEmptyState('folderKanban', 'Project Not Found', 'The project you are looking for does not exist.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/projects\')">Back to Projects</button>');
      }

      var metrics = project.metrics || {};
      var edge = project.edge || {};
      var teamMembers = project.teamMembers || [];
      var milestones = project.milestones || [];
      var discussions = project.discussions || [];
      var versions = project.versions || [];
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">';
      html += '<button class="hover:text-foreground" onclick="FusionApp.navigate(\'/projects\')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font:inherit">Projects</button>';
      html += '<span>' + icon('chevronRight', 14) + '</span>';
      html += '<span class="text-foreground font-medium">' + escapeHtml(project.name) + '</span>';
      html += '</div>';

      // Header
      html += '<div class="flex items-start justify-between gap-4 mb-6">';
      html += '<div>';
      html += '<div class="flex items-center gap-3 mb-2">';
      html += '<h1 class="text-2xl font-display font-bold">' + escapeHtml(project.name) + '</h1>';
      html += App.renderStatusBadge(project.status);
      html += '</div>';
      html += '<p class="text-sm text-muted-foreground">Led by ' + escapeHtml(project.owner) + ' &bull; ' + project.progress + '% complete</p>';
      html += '</div>';
      html += '</div>';

      // Quick Actions
      html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">';
      var actions = [
        { label: 'Engineering', desc: 'Requirements & clarifications', icon: 'code2', route: '/projects/' + project.id + '/engineering' },
        { label: 'Team', desc: 'Manage assignments', icon: 'users', route: '/teams' },
        { label: 'Flow', desc: 'Document processes', icon: 'gitBranch', route: '/flow' },
        { label: 'Crunch', desc: 'Data inputs', icon: 'database', route: '/crunch' }
      ];
      actions.forEach(function(a) {
        html += '<div class="fusion-card p-4 cursor-pointer" onclick="FusionApp.navigate(\'' + a.route + '\')" style="transition:border-color 0.15s" onmouseenter="this.style.borderColor=\'hsl(var(--primary) / 0.3)\'" onmouseleave="this.style.borderColor=\'\'">';
        html += '<div class="flex items-center gap-3">';
        html += '<div class="p-2 rounded-lg" style="background:hsl(var(--primary) / 0.1)">';
        html += '<span style="color:hsl(var(--primary))">' + icon(a.icon, 20) + '</span>';
        html += '</div>';
        html += '<div class="min-w-0">';
        html += '<p class="text-sm font-medium">' + a.label + '</p>';
        html += '<p class="text-xs text-muted-foreground">' + a.desc + '</p>';
        html += '</div></div></div>';
      });
      html += '</div>';

      // 2/3 + 1/3 layout
      html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';

      // ==================== Main Content (2/3) ====================
      html += '<div class="lg:col-span-2 space-y-4">';

      // Project Summary
      html += '<div class="fusion-card p-5">';
      html += '<h2 class="text-base font-semibold mb-3">Project Summary</h2>';
      html += '<p class="text-sm text-muted-foreground mb-4">' + escapeHtml(project.description) + '</p>';
      html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">';
      html += '<div class="flex items-center gap-3 p-3 rounded-lg" style="background:hsl(var(--muted) / 0.5)">';
      html += '<span style="color:hsl(var(--primary))">' + icon('calendar', 20) + '</span>';
      html += '<div><p class="text-xs text-muted-foreground">Start Date</p>';
      html += '<p class="text-sm font-medium">' + App.formatDate(project.startDate) + '</p></div></div>';
      html += '<div class="flex items-center gap-3 p-3 rounded-lg" style="background:hsl(var(--muted) / 0.5)">';
      html += '<span style="color:hsl(var(--primary))">' + icon('target', 20) + '</span>';
      html += '<div><p class="text-xs text-muted-foreground">Target End</p>';
      html += '<p class="text-sm font-medium">' + App.formatDate(project.targetDate) + '</p></div></div>';
      html += '</div>';
      // Progress
      html += '<div class="flex items-center justify-between mb-2">';
      html += '<span class="text-sm font-medium">Overall Progress</span>';
      html += '<span class="text-sm font-bold" style="color:hsl(var(--primary))">' + project.progress + '%</span>';
      html += '</div>';
      html += App.renderProgress(project.progress, 100);
      html += '</div>';

      // Baseline vs Current
      if (metrics.time || metrics.cost || metrics.impact) {
        html += '<div class="fusion-card p-5">';
        html += '<div class="flex items-center justify-between mb-4">';
        html += '<h2 class="text-base font-semibold">Baseline vs Current</h2>';
        html += '<span class="text-xs text-muted-foreground">Real-time comparison</span>';
        html += '</div>';
        html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';

        var metricItems = [
          { key: 'time', label: 'Time', icon: 'clock', unit: 'h', lowerBetter: true, format: function(v) { return v + 'h'; } },
          { key: 'cost', label: 'Cost', icon: 'dollarSign', unit: '$', lowerBetter: true, format: function(v) { return '$' + Math.round(v / 1000) + 'k'; } },
          { key: 'impact', label: 'Impact', icon: 'trendingUp', unit: 'pts', lowerBetter: false, format: function(v) { return v + ' pts'; } }
        ];

        metricItems.forEach(function(m) {
          var d = metrics[m.key];
          if (!d) return;
          var v = getVariance(d.baseline, d.current, m.lowerBetter);
          html += '<div class="p-4 rounded-xl" style="background:hsl(var(--muted) / 0.3);border:1px solid hsl(var(--border))">';
          html += '<div class="flex items-center gap-2 mb-3">';
          html += '<span style="color:hsl(var(--primary))">' + icon(m.icon, 20) + '</span>';
          html += '<span class="font-medium">' + m.label + '</span>';
          html += '</div>';
          html += '<div class="space-y-2">';
          html += '<div class="flex items-center justify-between"><span class="text-xs text-muted-foreground">Baseline</span><span class="text-sm font-medium">' + m.format(d.baseline) + '</span></div>';
          html += '<div class="flex items-center justify-between"><span class="text-xs text-muted-foreground">Current</span><span class="text-sm font-medium">' + m.format(d.current) + '</span></div>';
          html += '<div style="padding-top:0.5rem;border-top:1px solid hsl(var(--border))" class="flex items-center justify-between">';
          html += '<span class="text-xs font-medium text-muted-foreground">Variance</span>';
          html += '<div class="flex items-center gap-1" style="color:hsl(var(--' + v.color + '))">';
          html += icon(v.icon, 16);
          var varFormatted = m.key === 'cost' ? '$' + Math.round(v.value / 1000) + 'k' : (m.key === 'time' ? v.value + 'h' : v.value + ' pts');
          html += '<span class="text-sm font-bold">' + varFormatted + '</span>';
          html += '</div></div></div></div>';
        });
        html += '</div></div>';
      }

      // Edge Baseline KPIs
      if (edge.outcomes || edge.impact) {
        var conf = confidenceConfig[edge.confidence] || confidenceConfig.medium;
        html += '<div class="fusion-card p-5">';
        html += '<div class="flex items-center justify-between mb-4">';
        html += '<div class="flex items-center gap-3">';
        html += '<div class="p-2 rounded-lg" style="background:hsl(var(--primary) / 0.1)"><span style="color:hsl(var(--primary))">' + icon('target', 20) + '</span></div>';
        html += '<div><h2 class="text-base font-semibold">Edge Baseline KPIs</h2>';
        html += '<p class="text-xs text-muted-foreground">Original success criteria from idea approval</p></div>';
        html += '</div>';
        html += '<span class="badge badge-' + conf.color + '">' + icon('shield', 12) + ' ' + conf.label + '</span>';
        html += '</div>';

        // Outcomes with Metrics
        if (edge.outcomes && edge.outcomes.length) {
          html += '<h3 class="text-sm font-medium flex items-center gap-2 mb-3">' + icon('barChart3', 16) + ' Business Outcomes & Metrics</h3>';
          html += '<div class="space-y-3 mb-4">';
          edge.outcomes.forEach(function(outcome, idx) {
            html += '<div class="p-4 rounded-lg" style="background:hsl(var(--muted) / 0.3);border:1px solid hsl(var(--border))">';
            html += '<div class="flex items-start gap-3 mb-3">';
            html += '<div style="width:1.5rem;height:1.5rem;border-radius:9999px;background:hsl(var(--primary) / 0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span class="text-xs font-bold" style="color:hsl(var(--primary))">' + (idx + 1) + '</span></div>';
            html += '<p class="font-medium">' + escapeHtml(outcome.description) + '</p>';
            html += '</div>';
            if (outcome.metrics && outcome.metrics.length) {
              html += '<div style="padding-left:2.25rem" class="space-y-2">';
              outcome.metrics.forEach(function(metric) {
                var target = parseFloat(metric.target);
                var current = parseFloat(metric.current);
                var isOnTrack = metric.unit === '$' ? current <= target : current >= target * 0.9;
                html += '<div class="flex items-center justify-between gap-2 p-2 rounded" style="background:hsl(var(--background));border:1px solid hsl(var(--border))">';
                html += '<div class="flex items-center gap-2"><span class="text-muted-foreground">' + icon('gauge', 16) + '</span><span class="text-sm">' + escapeHtml(metric.name) + '</span></div>';
                html += '<div class="flex items-center gap-4">';
                html += '<div class="text-right"><p class="text-xs text-muted-foreground">Target</p><p class="text-sm font-medium">' + (metric.unit === '$' ? '$' + metric.target : metric.target + metric.unit) + '</p></div>';
                html += '<div class="text-right"><p class="text-xs text-muted-foreground">Current</p><p class="text-sm font-medium" style="color:hsl(var(--' + (isOnTrack ? 'success' : 'warning') + '))">' + (metric.unit === '$' ? '$' + metric.current : metric.current + metric.unit) + '</p></div>';
                html += '<div style="width:0.5rem;height:0.5rem;border-radius:9999px;background:hsl(var(--' + (isOnTrack ? 'success' : 'warning') + '));flex-shrink:0"></div>';
                html += '</div></div>';
              });
              html += '</div>';
            }
            html += '</div>';
          });
          html += '</div>';
        }

        // Impact Timeline
        if (edge.impact) {
          html += '<h3 class="text-sm font-medium flex items-center gap-2 mb-3">' + icon('trendingUp', 16) + ' Expected Impact Timeline</h3>';
          html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';
          var timelines = [
            { label: 'Short-term (0-3mo)', text: edge.impact.shortTerm, color: 'success' },
            { label: 'Mid-term (3-12mo)', text: edge.impact.midTerm, color: 'warning' },
            { label: 'Long-term (12+mo)', text: edge.impact.longTerm, color: 'primary' }
          ];
          timelines.forEach(function(t) {
            html += '<div class="p-3 rounded-lg" style="background:hsl(var(--' + t.color + ') / 0.05);border:1px solid hsl(var(--' + t.color + ') / 0.2)">';
            html += '<div class="flex items-center gap-1.5 mb-2">';
            html += '<span style="color:hsl(var(--' + t.color + '))">' + icon('clock', 14) + '</span>';
            html += '<span class="text-xs font-medium" style="color:hsl(var(--' + t.color + '))">' + t.label + '</span>';
            html += '</div>';
            html += '<p class="text-xs" style="line-height:1.5">' + escapeHtml(t.text) + '</p>';
            html += '</div>';
          });
          html += '</div>';
        }

        // Owner
        if (edge.owner) {
          html += '<div class="flex items-center justify-between mt-4 pt-4" style="border-top:1px solid hsl(var(--border))">';
          html += '<span class="text-xs text-muted-foreground">Edge Owner</span>';
          html += '<span class="text-sm font-medium">' + escapeHtml(edge.owner) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }

      // Tabs card
      html += '<div class="fusion-card p-5">';
      var tabs = [
        { value: 'tasks', label: icon('listTodo', 14) + ' Tasks' },
        { value: 'discussion', label: icon('messageSquare', 14) + ' Discussion' },
        { value: 'history', label: icon('history', 14) + ' History' },
        { value: 'linked', label: icon('fileText', 14) + ' Linked Data' }
      ];
      html += '<div class="flex gap-1 mb-4" style="border-bottom:1px solid hsl(var(--border));padding-bottom:0.5rem;overflow-x:auto">';
      tabs.forEach(function(t) {
        var isActive = activeTab === t.value;
        html += '<button class="btn btn-sm' + (isActive ? ' btn-primary' : ' btn-ghost') + '" style="white-space:nowrap;gap:0.25rem" onclick="FusionApp._projectDetailTab(\'' + t.value + '\')">' + t.label + '</button>';
      });
      html += '</div>';

      // Tab content
      if (activeTab === 'tasks') {
        html += renderTasksTab(project);
      } else if (activeTab === 'discussion') {
        html += renderDiscussionTab(project, discussions);
      } else if (activeTab === 'history') {
        html += renderHistoryTab(versions);
      } else if (activeTab === 'linked') {
        html += renderLinkedTab();
      }
      html += '</div>';

      html += '</div>'; // main col

      // ==================== Sidebar (1/3) ====================
      html += '<div class="space-y-4">';

      // Team
      html += '<div class="fusion-card p-5">';
      html += '<div class="flex items-center justify-between mb-4">';
      html += '<h3 class="text-sm font-semibold">Team</h3>';
      html += '<button class="btn btn-ghost btn-sm" style="height:1.75rem;font-size:0.7rem">' + icon('plus', 12) + ' Add</button>';
      html += '</div>';
      html += '<div class="space-y-3">';
      teamMembers.forEach(function(m) {
        var initials = getInitials(m.name);
        html += '<div class="flex items-center gap-3">';
        html += '<div style="width:2.25rem;height:2.25rem;border-radius:0.5rem;background:hsl(var(--primary) / 0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span class="text-xs font-bold" style="color:hsl(var(--primary))">' + initials + '</span></div>';
        html += '<div class="flex-1 min-w-0">';
        html += '<p class="text-sm font-medium truncate">' + escapeHtml(m.name) + '</p>';
        html += '<p class="text-xs text-muted-foreground truncate">' + escapeHtml(m.role) + '</p>';
        html += '</div></div>';
      });
      html += '</div></div>';

      // Milestones
      if (milestones.length) {
        html += '<div class="fusion-card p-5">';
        html += '<h3 class="text-sm font-semibold mb-4">Milestones</h3>';
        html += '<div class="relative">';
        milestones.forEach(function(ms, idx) {
          var msColor, msBg;
          if (ms.status === 'completed') { msColor = 'success'; msBg = 'hsl(var(--success))'; }
          else if (ms.status === 'in_progress') { msColor = 'warning'; msBg = 'hsl(var(--warning))'; }
          else { msColor = 'muted-foreground'; msBg = 'hsl(var(--muted))'; }

          html += '<div class="flex gap-3" style="padding-bottom:' + (idx < milestones.length - 1 ? '1rem' : '0') + '">';
          html += '<div class="flex flex-col items-center">';
          html += '<div style="width:1.5rem;height:1.5rem;border-radius:9999px;background:' + msBg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">';
          if (ms.status === 'completed') html += '<span style="color:white">' + icon('check', 10) + '</span>';
          else if (ms.status === 'in_progress') html += '<span style="color:white">' + icon('alertCircle', 10) + '</span>';
          else html += '<span style="color:hsl(var(--muted-foreground))">' + icon('clock', 10) + '</span>';
          html += '</div>';
          if (idx < milestones.length - 1) html += '<div style="width:2px;flex:1;background:hsl(var(--border));margin-top:0.25rem"></div>';
          html += '</div>';
          html += '<div style="padding-bottom:0.5rem">';
          html += '<p class="text-sm font-medium" style="color:hsl(var(--' + msColor + '))">' + escapeHtml(ms.title) + '</p>';
          html += '<p class="text-xs text-muted-foreground">' + App.formatDate(ms.date) + '</p>';
          html += '</div></div>';
        });
        html += '</div></div>';
      }

      html += '</div>'; // sidebar
      html += '</div>'; // grid

      return html;
    },

    init: function() {
      activeTab = 'tasks';
      newComment = '';
    }
  };

  function renderTasksTab(project) {
    var html = '';
    html += '<div class="space-y-3">';
    // Simple task list from project data or placeholder
    var tasks = [
      { title: 'Complete API integration', assignee: 'David Martinez', status: 'in_progress', priority: 'high' },
      { title: 'Write unit tests for ML model', assignee: 'Jessica Park', status: 'completed', priority: 'medium' },
      { title: 'Setup CI/CD pipeline', assignee: 'Mike Thompson', status: 'in_progress', priority: 'high' },
      { title: 'User acceptance testing', assignee: 'Sarah Chen', status: 'pending', priority: 'medium' },
      { title: 'Documentation updates', assignee: 'David Martinez', status: 'pending', priority: 'low' }
    ];
    tasks.forEach(function(task) {
      var statusColors = { completed: 'success', in_progress: 'warning', pending: 'muted-foreground' };
      var statusIcons = { completed: 'checkCircle2', in_progress: 'activity', pending: 'circle' };
      var priorityColors = { high: 'destructive', medium: 'warning', low: 'muted-foreground' };
      html += '<div class="flex items-center gap-3 p-3 rounded-lg" style="border:1px solid hsl(var(--border))">';
      html += '<span style="color:hsl(var(--' + (statusColors[task.status] || 'muted-foreground') + '))">' + icon(statusIcons[task.status] || 'circle', 16) + '</span>';
      html += '<div class="flex-1 min-w-0">';
      html += '<p class="text-sm font-medium">' + escapeHtml(task.title) + '</p>';
      html += '<p class="text-xs text-muted-foreground">' + escapeHtml(task.assignee) + '</p>';
      html += '</div>';
      html += '<span class="badge badge-' + (priorityColors[task.priority] || 'secondary') + '" style="font-size:0.6rem">' + task.priority + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderDiscussionTab(project, discussions) {
    var html = '';
    // New comment
    html += '<div class="flex gap-3 mb-4">';
    html += '<div style="width:2.5rem;height:2.5rem;border-radius:9999px;background:hsl(var(--primary) / 0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span class="text-sm font-bold" style="color:hsl(var(--primary))">' + getInitials(store.user.name) + '</span></div>';
    html += '<div class="flex-1">';
    html += '<textarea class="input w-full" id="pd-comment" rows="3" placeholder="Add a comment or update...">' + escapeHtml(newComment) + '</textarea>';
    html += '<div class="flex justify-end mt-2">';
    html += '<button class="btn btn-primary btn-sm" onclick="FusionApp._projectAddComment()">' + icon('send', 14) + ' Post Comment</button>';
    html += '</div></div></div>';

    // Comments
    if (discussions.length) {
      html += '<div style="border-top:1px solid hsl(var(--border));padding-top:1rem" class="space-y-4">';
      discussions.forEach(function(c) {
        html += '<div class="flex gap-3">';
        html += '<div style="width:2.5rem;height:2.5rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;flex-shrink:0"><span class="text-sm font-bold text-muted-foreground">' + getInitials(c.author) + '</span></div>';
        html += '<div class="flex-1">';
        html += '<div class="flex items-center gap-2 mb-1"><span class="font-medium text-sm">' + escapeHtml(c.author) + '</span><span class="text-xs text-muted-foreground">' + App.formatDate(c.date) + '</span></div>';
        html += '<p class="text-sm text-muted-foreground">' + escapeHtml(c.message) + '</p>';
        html += '</div></div>';
      });
      html += '</div>';
    }
    return html;
  }

  function renderHistoryTab(versions) {
    var html = '';
    if (!versions.length) {
      html += '<p class="text-sm text-muted-foreground text-center py-6">No version history yet</p>';
      return html;
    }
    html += '<div class="space-y-3">';
    versions.forEach(function(v, idx) {
      var isLatest = idx === 0;
      html += '<div class="flex items-start gap-4 p-4 rounded-lg" style="background:hsl(var(--' + (isLatest ? 'primary' : 'muted') + ') / ' + (isLatest ? '0.05' : '0.3') + ');' + (isLatest ? 'border:1px solid hsl(var(--primary) / 0.2)' : '') + '">';
      html += '<div class="px-2 py-1 rounded text-xs font-bold" style="background:hsl(var(--' + (isLatest ? 'primary' : 'muted') + '));color:hsl(var(--' + (isLatest ? 'primary-foreground' : 'muted-foreground') + '))">' + escapeHtml(v.version) + '</div>';
      html += '<div class="flex-1">';
      html += '<p class="font-medium text-sm">' + escapeHtml(v.changes) + '</p>';
      html += '<p class="text-xs text-muted-foreground mt-1">' + escapeHtml(v.author) + ' &bull; ' + App.formatDate(v.date) + '</p>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderLinkedTab() {
    return '<div class="text-center py-8">' +
      '<div class="text-muted-foreground mb-3" style="opacity:0.5">' + icon('fileText', 48) + '</div>' +
      '<p class="text-muted-foreground mb-4">No linked data yet</p>' +
      '<button class="btn btn-outline btn-sm">' + icon('plus', 14) + ' Link Data Source</button>' +
    '</div>';
  }

  function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);
  }

  App._projectDetailTab = function(tab) {
    activeTab = tab;
    App.render();
  };

  App._projectAddComment = function() {
    var input = document.getElementById('pd-comment');
    if (!input) return;
    var text = input.value.trim();
    if (!text) {
      App.showToast({ title: 'Empty Comment', description: 'Please write something before posting.', variant: 'destructive' });
      return;
    }
    // Find the current project from the URL
    var hash = window.location.hash || '';
    var match = hash.match(/\/projects\/([^\/]+)/);
    if (!match) return;
    var project = store.projects.find(function(p) { return p.id === match[1]; });
    if (!project) return;
    if (!project.discussions) project.discussions = [];
    project.discussions.unshift({
      id: 'd' + Date.now(),
      author: store.user.name,
      date: new Date().toISOString().split('T')[0],
      message: text
    });
    newComment = '';
    App.showToast({ title: 'Comment Posted', description: 'Your comment has been added.' });
    App.render();
  };
})();
