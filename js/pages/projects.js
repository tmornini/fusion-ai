// Fusion AI — Projects List Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var viewMode = 'priority'; // 'priority' | 'performance'

  var statusConfig = {
    in_progress: { icon: 'activity', color: 'warning' },
    completed: { icon: 'checkCircle2', color: 'success' },
    planning: { icon: 'penTool', color: 'secondary' },
    on_hold: { icon: 'pauseCircle', color: 'warning' },
  };

  function getSortedProjects() {
    var projects = store.projects.slice();
    if (viewMode === 'priority') {
      projects.sort(function(a, b) { return (a.priority || 99) - (b.priority || 99); });
    } else {
      projects.sort(function(a, b) { return (b.priorityScore || 0) - (a.priorityScore || 0); });
    }
    return projects;
  }

  function renderProgressRing(value, size) {
    size = size || 44;
    var r = (size - 8) / 2;
    var cx = size / 2;
    var circ = 2 * Math.PI * r;
    var offset = circ - (value / 100) * circ;
    return '<svg width="' + size + '" height="' + size + '" style="flex-shrink:0">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="hsl(var(--muted))" stroke-width="4"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="hsl(var(--primary))" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
      '<text x="' + cx + '" y="' + (cx + 4) + '" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">' + value + '%</text>' +
    '</svg>';
  }

  App._projectsSetView = function(mode) {
    viewMode = mode;
    App.render();
  };

  App.pages['/projects'] = {
    layout: 'dashboard',

    render: function() {
      var projects = getSortedProjects();
      var mobile = App.isMobile();
      var html = '';

      // Header
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold">Projects</h1>';
      html += '<p class="text-sm text-muted-foreground mt-1">Manage and track all your projects</p>';
      html += '</div>';

      // View toggle + new button
      html += '<div class="flex items-center gap-2">';
      html += '<div class="flex rounded-lg overflow-hidden" style="border:1px solid hsl(var(--border))">';
      html += '<button class="btn btn-sm' + (viewMode === 'priority' ? ' btn-primary' : ' btn-ghost') + '" style="border-radius:0" onclick="FusionApp._projectsSetView(\'priority\')">' + icon('layoutGrid', 14) + ' Priority</button>';
      html += '<button class="btn btn-sm' + (viewMode === 'performance' ? ' btn-primary' : ' btn-ghost') + '" style="border-radius:0" onclick="FusionApp._projectsSetView(\'performance\')">' + icon('barChart3', 14) + ' Performance</button>';
      html += '</div>';
      html += '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/ideas\')">' + icon('plus', 16) + ' New Project</button>';
      html += '</div>';
      html += '</div>';

      if (projects.length === 0) {
        html += App.renderEmptyState('folderKanban', 'No Projects Yet', 'Convert approved ideas into projects to get started.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/ideas\')">Browse Ideas</button>');
        return html;
      }

      // Project cards
      html += '<div style="display:grid;gap:1rem">';

      projects.forEach(function(project) {
        var sc = statusConfig[project.status] || { icon: 'circle', color: 'secondary' };
        var metrics = project.metrics || {};

        html += '<div class="fusion-card" style="padding:1.25rem;transition:box-shadow 0.15s,transform 0.15s" onmouseenter="this.style.boxShadow=\'0 4px 12px hsl(var(--foreground)/0.1)\';this.style.transform=\'translateY(-1px)\'" onmouseleave="this.style.boxShadow=\'\';this.style.transform=\'\'">';

        html += '<div class="flex items-start gap-4">';

        // Drag handle (desktop only)
        if (!mobile) {
          html += '<span class="text-muted-foreground mt-1 cursor-grab" style="opacity:0.4">' + icon('gripVertical', 16) + '</span>';
        }

        // Progress ring
        html += renderProgressRing(project.progress);

        // Content
        html += '<div class="flex-1 min-w-0">';

        // Name + status badge
        html += '<div class="flex items-center gap-2 mb-1">';
        html += '<h3 class="text-base font-semibold truncate">' + escapeHtml(project.name) + '</h3>';
        html += '<span class="badge badge-' + sc.color + ' flex items-center gap-1">' + icon(sc.icon, 12) + ' ' + escapeHtml(project.status.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); })) + '</span>';
        html += '</div>';

        html += '<p class="text-xs text-muted-foreground mb-3">' + escapeHtml(project.description) + '</p>';

        // Metric badges
        html += '<div class="flex flex-wrap gap-2">';
        if (metrics.impact) {
          html += '<span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md" style="background:hsl(var(--muted) / 0.5)">';
          html += '<span class="w-5 h-5 rounded flex items-center justify-center" style="background:hsl(var(--primary)/0.1);color:hsl(var(--primary))">' + icon('target', 12) + '</span>';
          html += 'Impact: ' + metrics.impact.current + '/' + metrics.impact.baseline + ' pts</span>';
        }
        if (metrics.time) {
          html += '<span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md" style="background:hsl(var(--muted) / 0.5)">';
          html += '<span class="w-5 h-5 rounded flex items-center justify-center" style="background:hsl(var(--warning)/0.1);color:hsl(var(--warning))">' + icon('clock', 12) + '</span>';
          html += metrics.time.current + '/' + metrics.time.baseline + 'h</span>';
        }
        if (metrics.cost) {
          html += '<span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md" style="background:hsl(var(--muted) / 0.5)">';
          html += '<span class="w-5 h-5 rounded flex items-center justify-center" style="background:hsl(var(--success)/0.1);color:hsl(var(--success))">' + icon('dollarSign', 12) + '</span>';
          html += '$' + App.formatNumber(metrics.cost.current) + '/$' + App.formatNumber(metrics.cost.baseline) + '</span>';
        }
        html += '</div>';

        html += '</div>'; // content

        // View button
        html += '<button class="btn btn-outline btn-sm' + (mobile ? '' : ' opacity-0') + '" style="flex-shrink:0;transition:opacity 0.15s" onclick="event.stopPropagation();FusionApp.navigate(\'/projects/' + project.id + '\')" onmouseenter="this.style.opacity=1" data-view-btn>' + icon('arrowRight', 14) + (mobile ? ' View' : ' View Details') + '</button>';

        html += '</div>'; // flex row
        html += '</div>'; // card
      });

      html += '</div>';

      return html;
    },

    init: function() {
      // Show view buttons on card hover (desktop)
      if (!App.isMobile()) {
        document.querySelectorAll('.fusion-card').forEach(function(card) {
          var btn = card.querySelector('[data-view-btn]');
          if (btn) {
            card.addEventListener('mouseenter', function() { btn.style.opacity = '1'; });
            card.addEventListener('mouseleave', function() { btn.style.opacity = '0'; });
          }
        });
      }
      viewMode = 'priority';
    }
  };
})();
