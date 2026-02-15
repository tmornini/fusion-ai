// Fusion AI — Project Detail Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var activeTab = 'overview';

  var mockComments = [
    { id: '1', author: 'Sarah Chen', text: 'Great progress on the initial milestone. The team has been very productive this sprint.', timestamp: '2025-02-12T10:30:00Z' },
    { id: '2', author: 'Alex Kim', text: 'I have some concerns about the timeline for the API integration phase. We might need to adjust.', timestamp: '2025-02-11T15:45:00Z' },
    { id: '3', author: 'Demo User', text: 'Let us schedule a sync meeting to discuss the blockers. I think we can resolve them quickly.', timestamp: '2025-02-10T09:20:00Z' },
  ];

  var mockMilestones = [
    { id: '1', title: 'Project Kickoff', date: '2025-02-01', status: 'completed', description: 'Initial planning and team onboarding' },
    { id: '2', title: 'Design Phase Complete', date: '2025-02-28', status: 'completed', description: 'UI/UX designs finalized and approved' },
    { id: '3', title: 'MVP Development', date: '2025-03-31', status: 'in_progress', description: 'Core features implemented and tested' },
    { id: '4', title: 'Beta Launch', date: '2025-04-15', status: 'not_started', description: 'Internal beta release for testing' },
    { id: '5', title: 'Production Release', date: '2025-04-30', status: 'not_started', description: 'Full production deployment' },
  ];

  var mockKpis = [
    { label: 'Sprint Velocity', value: '42', target: '45', unit: 'pts' },
    { label: 'Bug Count', value: '7', target: '< 10', unit: '' },
    { label: 'Code Coverage', value: '83', target: '80', unit: '%' },
    { label: 'Team Satisfaction', value: '4.2', target: '4.0', unit: '/5' },
  ];

  App.pages['/projects/:projectId'] = {
    layout: 'dashboard',

    render: function(params) {
      var project = store.projects.find(function(p) { return p.id === params.projectId; });
      if (!project) {
        return App.renderEmptyState('folderKanban', 'Project Not Found', 'The project you are looking for does not exist.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/projects\')">Back to Projects</button>');
      }

      var html = '';

      // Breadcrumb
      html += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">';
      html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp.navigate(\'/projects\')" style="padding:0.25rem 0.5rem">Projects</button>';
      html += '<span class="text-muted-foreground">' + icon('chevronRight', 14) + '</span>';
      html += '<span class="text-sm font-medium">' + escapeHtml(project.name) + '</span>';
      html += '</div>';

      // Project header
      html += '<div class="fusion-card" style="padding:1.5rem;margin-bottom:1.5rem">';
      html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">';
      html += '<h1 class="text-2xl font-display font-bold">' + escapeHtml(project.name) + '</h1>';
      html += App.renderStatusBadge(project.status);
      html += '</div>';
      html += '<p class="text-sm text-muted-foreground mt-1">' + escapeHtml(project.description) + '</p>';
      html += '</div>';
      html += '</div>';

      // Progress bar
      html += '<div style="margin-top:1rem">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem">';
      html += '<span class="text-sm text-muted-foreground">Overall Progress</span>';
      html += '<span class="text-sm font-semibold">' + project.progress + '%</span>';
      html += '</div>';
      html += App.renderProgress(project.progress, 100);
      html += '</div>';

      html += '</div>'; // header card

      // Tabs
      var tabs = [
        { value: 'overview', label: 'Overview' },
        { value: 'team', label: 'Team' },
        { value: 'timeline', label: 'Timeline' },
        { value: 'discussion', label: 'Discussion' }
      ];
      html += App.renderTabs(tabs, activeTab, 'FusionApp._projectDetailTab');

      // Tab content
      html += '<div style="margin-top:1.5rem">';
      if (activeTab === 'overview') {
        html += renderOverviewTab(project);
      } else if (activeTab === 'team') {
        html += renderTeamTab(project);
      } else if (activeTab === 'timeline') {
        html += renderTimelineTab(project);
      } else if (activeTab === 'discussion') {
        html += renderDiscussionTab(project);
      }
      html += '</div>';

      return html;
    },

    init: function(params) {
      // Reset to overview tab on page load
      activeTab = 'overview';
    }
  };

  function renderOverviewTab(project) {
    var html = '';
    var budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;

    // Description
    html += '<div class="fusion-card" style="padding:1.25rem;margin-bottom:1rem">';
    html += '<h3 class="text-base font-semibold mb-2">Description</h3>';
    html += '<p class="text-sm text-muted-foreground">' + escapeHtml(project.description) + '</p>';
    html += '</div>';

    // Key metrics grid
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem;margin-bottom:1rem">';

    // Budget metric
    html += '<div class="fusion-card" style="padding:1.25rem">';
    html += '<div class="flex items-center gap-2 mb-2">';
    html += '<div style="width:2rem;height:2rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary))">' + icon('dollarSign', 16) + '</div>';
    html += '<span class="text-sm font-medium">Budget</span>';
    html += '</div>';
    html += '<div class="text-2xl font-bold">$' + App.formatNumber(project.spent) + '</div>';
    html += '<div class="text-xs text-muted-foreground mb-2">of $' + App.formatNumber(project.budget) + ' (' + budgetPct + '% used)</div>';
    html += App.renderProgress(project.spent, project.budget);
    html += '</div>';

    // Timeline metric
    html += '<div class="fusion-card" style="padding:1.25rem">';
    html += '<div class="flex items-center gap-2 mb-2">';
    html += '<div style="width:2rem;height:2rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary))">' + icon('calendarDays', 16) + '</div>';
    html += '<span class="text-sm font-medium">Timeline</span>';
    html += '</div>';
    html += '<div class="text-sm font-semibold">' + App.formatDate(project.startDate) + '</div>';
    html += '<div class="text-xs text-muted-foreground mb-1">to ' + App.formatDate(project.targetDate) + '</div>';
    var totalDays = daysBetween(project.startDate, project.targetDate);
    var elapsed = daysBetween(project.startDate, new Date().toISOString().split('T')[0]);
    var timelinePct = totalDays > 0 ? Math.min(Math.round((elapsed / totalDays) * 100), 100) : 0;
    html += '<div class="text-xs text-muted-foreground mb-1">' + timelinePct + '% elapsed</div>';
    html += App.renderProgress(timelinePct, 100);
    html += '</div>';

    // Progress metric
    html += '<div class="fusion-card" style="padding:1.25rem">';
    html += '<div class="flex items-center gap-2 mb-2">';
    html += '<div style="width:2rem;height:2rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary))">' + icon('trendingUp', 16) + '</div>';
    html += '<span class="text-sm font-medium">Progress</span>';
    html += '</div>';
    html += '<div class="text-2xl font-bold">' + project.progress + '%</div>';
    html += '<div class="text-xs text-muted-foreground mb-2">Overall completion</div>';
    html += App.renderProgress(project.progress, 100);
    html += '</div>';

    html += '</div>'; // metrics grid

    // KPIs
    html += '<div class="fusion-card" style="padding:1.25rem">';
    html += '<h3 class="text-base font-semibold mb-3">Key Performance Indicators</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:1rem">';
    mockKpis.forEach(function(kpi) {
      html += '<div style="padding:0.75rem;background:hsl(var(--muted)/0.5);border-radius:0.5rem">';
      html += '<div class="text-xs text-muted-foreground">' + escapeHtml(kpi.label) + '</div>';
      html += '<div class="text-xl font-bold mt-0.5">' + escapeHtml(kpi.value) + escapeHtml(kpi.unit) + '</div>';
      html += '<div class="text-xs text-muted-foreground">Target: ' + escapeHtml(kpi.target) + escapeHtml(kpi.unit) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    return html;
  }

  function renderTeamTab(project) {
    var html = '';

    html += '<div class="fusion-card" style="padding:1.25rem">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">';
    html += '<h3 class="text-base font-semibold">Team Members (' + project.team.length + ')</h3>';
    html += '</div>';

    html += '<div style="display:flex;flex-direction:column;gap:0.5rem">';
    project.team.forEach(function(memberName, idx) {
      var memberData = store.team.find(function(m) { return m.name === memberName; });
      var isOwner = memberName === project.owner;

      html += '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border:1px solid hsl(var(--border));border-radius:0.5rem">';
      html += '<div style="width:2.5rem;height:2.5rem;border-radius:9999px;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));flex-shrink:0">' + icon('user', 16) + '</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div class="text-sm font-semibold">' + escapeHtml(memberName) + '</div>';
      if (memberData) {
        html += '<div class="text-xs text-muted-foreground">' + escapeHtml(memberData.role) + ' &middot; ' + escapeHtml(memberData.department) + '</div>';
      }
      html += '</div>';
      html += '<div class="flex items-center gap-2">';
      if (isOwner) {
        html += App.renderBadge('Owner', 'info');
      }
      if (memberData) {
        html += App.renderStatusBadge(memberData.status);
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '</div>'; // card

    return html;
  }

  function renderTimelineTab(project) {
    var html = '';

    html += '<div class="fusion-card" style="padding:1.25rem">';
    html += '<h3 class="text-base font-semibold mb-3">Milestones</h3>';

    html += '<div style="position:relative;padding-left:1.5rem">';

    // Vertical line
    html += '<div style="position:absolute;left:0.5rem;top:0.25rem;bottom:0.25rem;width:2px;background:hsl(var(--border))"></div>';

    mockMilestones.forEach(function(milestone, idx) {
      var dotColor = 'var(--muted-foreground)';
      var dotBg = 'hsl(var(--muted))';
      if (milestone.status === 'completed') {
        dotColor = 'var(--success)';
        dotBg = 'hsl(var(--success))';
      } else if (milestone.status === 'in_progress') {
        dotColor = 'var(--primary)';
        dotBg = 'hsl(var(--primary))';
      }

      html += '<div style="position:relative;padding-bottom:' + (idx < mockMilestones.length - 1 ? '1.5rem' : '0') + '">';

      // Dot
      html += '<div style="position:absolute;left:-1.25rem;top:0.25rem;width:0.75rem;height:0.75rem;border-radius:9999px;background:' + dotBg + ';border:2px solid hsl(var(--background));z-index:1">';
      if (milestone.status === 'completed') {
        html += '<div style="position:absolute;inset:-2px;display:flex;align-items:center;justify-content:center;color:white">' + icon('check', 8) + '</div>';
      }
      html += '</div>';

      // Content
      html += '<div style="padding:0.25rem 0 0 0.5rem">';
      html += '<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">';
      html += '<h4 class="text-sm font-semibold">' + escapeHtml(milestone.title) + '</h4>';
      html += App.renderStatusBadge(milestone.status);
      html += '</div>';
      html += '<p class="text-xs text-muted-foreground mt-0.5">' + escapeHtml(milestone.description) + '</p>';
      html += '<p class="text-xs text-muted-foreground mt-0.5">' + icon('calendarDays', 12) + ' ' + App.formatDate(milestone.date) + '</p>';
      html += '</div>';

      html += '</div>';
    });

    html += '</div>'; // timeline container
    html += '</div>'; // card

    return html;
  }

  function renderDiscussionTab(project) {
    var html = '';

    html += '<div class="fusion-card" style="padding:1.25rem">';
    html += '<h3 class="text-base font-semibold mb-3">Discussion</h3>';

    // Comment input
    html += '<div style="display:flex;gap:0.75rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid hsl(var(--border))">';
    html += '<div style="width:2.25rem;height:2.25rem;border-radius:9999px;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));flex-shrink:0">' + icon('user', 14) + '</div>';
    html += '<div style="flex:1">';
    html += '<textarea class="input" id="project-comment-input" rows="3" placeholder="Add a comment..." style="width:100%;resize:vertical"></textarea>';
    html += '<div style="display:flex;justify-content:flex-end;margin-top:0.5rem">';
    html += '<button class="btn btn-primary btn-sm" onclick="FusionApp._projectAddComment(\'' + project.id + '\')">' + icon('send', 14) + ' Post Comment</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Comments list
    html += '<div style="display:flex;flex-direction:column;gap:1rem">';
    mockComments.forEach(function(comment) {
      html += '<div style="display:flex;gap:0.75rem">';
      html += '<div style="width:2.25rem;height:2.25rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;flex-shrink:0">' + icon('user', 14) + '</div>';
      html += '<div style="flex:1">';
      html += '<div style="display:flex;align-items:center;gap:0.5rem">';
      html += '<span class="text-sm font-semibold">' + escapeHtml(comment.author) + '</span>';
      html += '<span class="text-xs text-muted-foreground">' + App.formatRelativeTime(comment.timestamp) + '</span>';
      html += '</div>';
      html += '<p class="text-sm text-muted-foreground mt-0.5">' + escapeHtml(comment.text) + '</p>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '</div>'; // card

    return html;
  }

  App._projectDetailTab = function(tab) {
    activeTab = tab;
    App.render();
  };

  App._projectAddComment = function(projectId) {
    var input = document.getElementById('project-comment-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) {
      App.showToast({ title: 'Empty Comment', description: 'Please write something before posting.', variant: 'destructive' });
      return;
    }

    mockComments.unshift({
      id: String(mockComments.length + 1),
      author: store.user.name,
      text: text,
      timestamp: new Date().toISOString()
    });

    App.showToast({ title: 'Comment Posted', description: 'Your comment has been added to the discussion.' });
    activeTab = 'discussion';
    App.render();
  };

  function daysBetween(dateStr1, dateStr2) {
    var d1 = new Date(dateStr1);
    var d2 = new Date(dateStr2);
    var diff = d2 - d1;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
})();
