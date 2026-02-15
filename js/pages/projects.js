// Fusion AI — Projects List Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  App.pages['/projects'] = {
    layout: 'dashboard',

    render: function() {
      var projects = store.projects;
      var html = '';

      // Header
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold">Projects</h1>';
      html += '<p class="text-sm text-muted-foreground mt-1">Manage and track all your projects</p>';
      html += '</div>';
      html += '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/ideas\')">' + icon('plus', 16) + ' New Project</button>';
      html += '</div>';

      if (projects.length === 0) {
        html += App.renderEmptyState('folderKanban', 'No Projects Yet', 'Convert approved ideas into projects to get started.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/ideas\')">Browse Ideas</button>');
        return html;
      }

      // Summary stats
      var inProgress = projects.filter(function(p) { return p.status === 'in_progress'; }).length;
      var completed = projects.filter(function(p) { return p.status === 'completed'; }).length;
      var totalBudget = projects.reduce(function(sum, p) { return sum + (p.budget || 0); }, 0);
      var totalSpent = projects.reduce(function(sum, p) { return sum + (p.spent || 0); }, 0);

      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem;margin-bottom:1.5rem">';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground">' + icon('folderKanban', 14) + ' Total Projects</div>';
      html += '<div class="text-2xl font-bold mt-1">' + projects.length + '</div>';
      html += '</div>';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground">' + icon('activity', 14) + ' In Progress</div>';
      html += '<div class="text-2xl font-bold mt-1">' + inProgress + '</div>';
      html += '</div>';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground">' + icon('checkCircle2', 14) + ' Completed</div>';
      html += '<div class="text-2xl font-bold mt-1">' + completed + '</div>';
      html += '</div>';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground">' + icon('dollarSign', 14) + ' Budget Used</div>';
      html += '<div class="text-2xl font-bold mt-1">$' + App.formatNumber(totalSpent) + '</div>';
      html += '<div class="text-xs text-muted-foreground">of $' + App.formatNumber(totalBudget) + '</div>';
      html += '</div>';

      html += '</div>';

      // Project cards
      html += '<div style="display:grid;gap:1rem">';

      projects.forEach(function(project) {
        var budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;

        html += '<div class="fusion-card" style="padding:1.25rem;cursor:pointer;transition:box-shadow 0.15s" onclick="FusionApp.navigate(\'/projects/' + project.id + '\')" onmouseenter="this.style.boxShadow=\'0 4px 12px hsl(var(--foreground)/0.1)\'" onmouseleave="this.style.boxShadow=\'\'">';

        // Top row: name + status
        html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;margin-bottom:0.75rem">';
        html += '<div style="flex:1;min-width:0">';
        html += '<h3 class="text-base font-semibold">' + escapeHtml(project.name) + '</h3>';
        html += '<p class="text-sm text-muted-foreground mt-0.5">' + escapeHtml(project.description) + '</p>';
        html += '</div>';
        html += App.renderStatusBadge(project.status);
        html += '</div>';

        // Progress bar
        html += '<div style="margin-bottom:0.75rem">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem">';
        html += '<span class="text-xs text-muted-foreground">Progress</span>';
        html += '<span class="text-xs font-medium">' + project.progress + '%</span>';
        html += '</div>';
        html += App.renderProgress(project.progress, 100);
        html += '</div>';

        // Details grid
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:0.75rem">';

        // Owner
        html += '<div style="display:flex;align-items:center;gap:0.5rem">';
        html += '<div style="width:1.5rem;height:1.5rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;flex-shrink:0">' + icon('user', 12) + '</div>';
        html += '<div>';
        html += '<div class="text-xs text-muted-foreground">Owner</div>';
        html += '<div class="text-sm font-medium">' + escapeHtml(project.owner) + '</div>';
        html += '</div>';
        html += '</div>';

        // Team
        html += '<div style="display:flex;align-items:center;gap:0.5rem">';
        html += '<div style="width:1.5rem;height:1.5rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;flex-shrink:0">' + icon('users', 12) + '</div>';
        html += '<div>';
        html += '<div class="text-xs text-muted-foreground">Team</div>';
        html += '<div class="text-sm font-medium">' + project.team.length + ' member' + (project.team.length !== 1 ? 's' : '') + '</div>';
        html += '</div>';
        html += '</div>';

        // Timeline
        html += '<div style="display:flex;align-items:center;gap:0.5rem">';
        html += '<div style="width:1.5rem;height:1.5rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;flex-shrink:0">' + icon('calendarDays', 12) + '</div>';
        html += '<div>';
        html += '<div class="text-xs text-muted-foreground">Timeline</div>';
        html += '<div class="text-sm font-medium">' + App.formatDate(project.startDate) + ' - ' + App.formatDate(project.targetDate) + '</div>';
        html += '</div>';
        html += '</div>';

        // Budget
        html += '<div style="display:flex;align-items:center;gap:0.5rem">';
        html += '<div style="width:1.5rem;height:1.5rem;border-radius:9999px;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center;flex-shrink:0">' + icon('dollarSign', 12) + '</div>';
        html += '<div>';
        html += '<div class="text-xs text-muted-foreground">Budget</div>';
        html += '<div class="text-sm font-medium">$' + App.formatNumber(project.spent) + ' / $' + App.formatNumber(project.budget) + ' (' + budgetPct + '%)</div>';
        html += '</div>';
        html += '</div>';

        html += '</div>'; // details grid

        html += '</div>'; // card
      });

      html += '</div>'; // cards grid

      return html;
    }
  };

})();
