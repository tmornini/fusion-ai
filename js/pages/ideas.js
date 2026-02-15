// Fusion AI — Ideas Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var currentView = 'priority';

  // Extend ideas with display fields
  function getIdeasWithMeta() {
    return App.store.ideas.map(function(idea) {
      var edgeStatus = 'none';
      var edge = App.store.edges.find(function(e) { return e.ideaId === idea.id; });
      if (edge) edgeStatus = 'defined';

      var impact = idea.score ? Math.round(idea.score * 1.05) : null;
      var time = idea.score ? (idea.score > 80 ? '2-4 weeks' : idea.score > 60 ? '4-8 weeks' : '8-12 weeks') : null;
      var cost = idea.score ? (idea.score > 80 ? '$15-25k' : idea.score > 60 ? '$25-50k' : '$50-100k') : null;

      return {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        status: idea.status,
        category: idea.category,
        priority: idea.priority,
        author: idea.author,
        createdAt: idea.createdAt,
        score: idea.score,
        tags: idea.tags,
        edgeStatus: edgeStatus,
        impact: impact,
        time: time,
        cost: cost
      };
    });
  }

  function renderEdgeBadge(status) {
    if (status === 'defined') {
      return App.renderBadge('Edge Defined', 'success');
    }
    return App.renderBadge('No Edge', 'secondary');
  }

  App.pages['/ideas'] = {
    layout: 'dashboard',

    render: function() {
      var ideas = getIdeasWithMeta();
      var reviewCount = App.store.reviews.filter(function(r) { return r.status === 'pending'; }).length;
      var mobile = App.isMobile();

      var html = '';

      // Header
      html += '<div class="flex flex-col gap-4 mb-6 ' + (mobile ? '' : 'lg:flex-row lg:items-center lg:justify-between') + '">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Ideas</h1>';
      html += '<p class="text-sm text-muted-foreground mt-1">Manage and track your innovation pipeline</p>';
      html += '</div>';
      html += '<div class="flex items-center gap-2 flex-wrap">';
      html += '<button class="btn btn-outline btn-sm" onclick="FusionApp.navigate(\'/review\')">' + icon('eye', 16) + ' Review Queue <span class="badge badge-warning ml-1">' + reviewCount + '</span></button>';
      html += '<button class="btn btn-primary btn-sm" onclick="FusionApp.navigate(\'/ideas/new\')">' + icon('plus', 16) + ' Create Idea</button>';
      html += '<button class="btn btn-outline btn-sm" onclick="FusionApp.navigate(\'/ideas/new\')">' + icon('sparkles', 16) + ' Generate Idea</button>';
      html += '</div>';
      html += '</div>';

      // Flow indicator bar
      var flowSteps = ['Create', 'Score', 'Edge', 'Review', 'Convert'];
      html += '<div class="fusion-card p-4 mb-6">';
      html += '<div class="flex items-center justify-between gap-2">';
      flowSteps.forEach(function(step, idx) {
        var isFirst = idx === 0;
        if (!isFirst) {
          html += '<div class="flex-1 h-0.5" style="height:2px;background:hsl(var(--border))"></div>';
        }
        html += '<div class="flex items-center gap-2">';
        html += '<div class="step-dot' + (idx === 0 ? ' active' : '') + '" style="width:1.5rem;height:1.5rem;font-size:0.625rem">' + (idx + 1) + '</div>';
        html += '<span class="text-xs font-medium ' + (idx === 0 ? 'text-primary' : 'text-muted-foreground') + ' hide-mobile">' + step + '</span>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';

      // View toggle
      html += '<div class="flex items-center justify-between mb-4">';
      html += '<div class="tabs-list">';
      html += '<button class="tab-trigger' + (currentView === 'priority' ? ' active' : '') + '" onclick="FusionApp._ideasSetView(\'priority\')">Priority</button>';
      html += '<button class="tab-trigger' + (currentView === 'performance' ? ' active' : '') + '" onclick="FusionApp._ideasSetView(\'performance\')">Performance</button>';
      html += '</div>';
      html += '<span class="text-sm text-muted-foreground">' + ideas.length + ' ideas</span>';
      html += '</div>';

      // Sort ideas
      var sortedIdeas = ideas.slice();
      if (currentView === 'priority') {
        var priorityOrder = { high: 0, medium: 1, low: 2 };
        sortedIdeas.sort(function(a, b) { return (priorityOrder[a.priority] || 9) - (priorityOrder[b.priority] || 9); });
      } else {
        sortedIdeas.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
      }

      // Idea cards
      html += '<div class="space-y-3">';
      sortedIdeas.forEach(function(idea) {
        html += '<div class="list-card" onclick="FusionApp.navigate(\'/ideas/' + idea.id + '/score\')">';
        html += '<div class="flex flex-col gap-3">';

        // Top row: title + badges
        html += '<div class="flex items-start justify-between gap-2">';
        html += '<div class="flex-1 min-w-0">';
        html += '<h3 class="text-sm font-semibold truncate">' + escapeHtml(idea.title) + '</h3>';
        html += '<p class="text-xs text-muted-foreground mt-0.5">' + escapeHtml(idea.author) + ' &middot; ' + escapeHtml(idea.category) + '</p>';
        html += '</div>';
        html += '<div class="flex items-center gap-2 flex-shrink-0">';
        html += App.renderStatusBadge(idea.status);
        html += renderEdgeBadge(idea.edgeStatus);
        html += '</div>';
        html += '</div>';

        // Score and metrics row
        html += '<div class="flex items-center gap-4 flex-wrap">';
        if (idea.score !== null) {
          var scoreColor = idea.score >= 80 ? 'text-success' : idea.score >= 60 ? 'text-warning' : 'text-error';
          html += '<div class="flex items-center gap-1.5">';
          html += '<span class="text-lg font-bold ' + scoreColor + '">' + idea.score + '</span>';
          html += '<span class="text-xs text-muted-foreground">/100</span>';
          html += '</div>';
        } else {
          html += '<span class="text-xs text-muted-foreground">Not scored</span>';
        }

        if (idea.impact !== null) {
          html += '<div class="flex items-center gap-3 text-xs text-muted-foreground hide-mobile">';
          html += '<span>' + icon('trendingUp', 12) + ' Impact: ' + idea.impact + '</span>';
          html += '<span>' + icon('clock', 12) + ' ' + idea.time + '</span>';
          html += '<span>' + icon('dollarSign', 12) + ' ' + idea.cost + '</span>';
          html += '</div>';
        }
        html += '</div>';

        // Action buttons
        html += '<div class="flex items-center gap-2 flex-wrap">';
        html += '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();FusionApp.navigate(\'/ideas/' + idea.id + '/score\')">' + icon('eye', 14) + ' View</button>';

        if (idea.edgeStatus === 'none') {
          html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();FusionApp.navigate(\'/ideas/' + idea.id + '/edge\')">' + icon('target', 14) + ' Define Edge</button>';
        }

        if (idea.status === 'draft' || idea.status === 'in_review') {
          html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();FusionApp.navigate(\'/review\')">' + icon('checkCircle2', 14) + ' Review</button>';
        }

        if (idea.status === 'approved') {
          html += '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();FusionApp.navigate(\'/ideas/' + idea.id + '/convert\')">' + icon('arrowRight', 14) + ' Convert</button>';
        }
        html += '</div>';

        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      return html;
    },

    init: function() {}
  };

  App._ideasSetView = function(view) {
    currentView = view;
    App.render();
  };
})();
