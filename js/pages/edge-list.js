// Fusion AI — Edge List (Business Outcomes Overview) Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  App.pages['/edge'] = {
    layout: 'dashboard',

    render: function() {
      var edges = store.edges;
      var html = '';

      // Header
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold">Edge - Business Outcomes</h1>';
      html += '<p class="text-sm text-muted-foreground mt-1">Track and manage business outcomes across your ideas</p>';
      html += '</div>';
      html += '</div>';

      if (edges.length === 0) {
        html += App.renderEmptyState('target', 'No Business Outcomes', 'Business outcomes will appear here once you define them for your ideas.');
        return html;
      }

      // Summary stats
      var totalOutcomes = 0;
      var achievedCount = 0;
      var atRiskCount = 0;
      edges.forEach(function(edge) {
        edge.outcomes.forEach(function(o) {
          totalOutcomes++;
          if (o.status === 'achieved') achievedCount++;
          if (o.status === 'at_risk') atRiskCount++;
        });
      });

      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem;margin-bottom:1.5rem">';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="text-sm text-muted-foreground">Total Outcomes</div>';
      html += '<div class="text-2xl font-bold mt-1">' + totalOutcomes + '</div>';
      html += '</div>';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="text-sm text-muted-foreground">Achieved</div>';
      html += '<div class="text-2xl font-bold mt-1" style="color:hsl(var(--success))">' + achievedCount + '</div>';
      html += '</div>';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="text-sm text-muted-foreground">At Risk</div>';
      html += '<div class="text-2xl font-bold mt-1" style="color:hsl(var(--warning))">' + atRiskCount + '</div>';
      html += '</div>';

      html += '<div class="fusion-card" style="padding:1rem">';
      html += '<div class="text-sm text-muted-foreground">Ideas Tracked</div>';
      html += '<div class="text-2xl font-bold mt-1">' + edges.length + '</div>';
      html += '</div>';

      html += '</div>';

      // Edge cards
      html += '<div style="display:grid;gap:1rem">';

      edges.forEach(function(edge) {
        var idea = store.ideas.find(function(i) { return i.id === edge.ideaId; });
        var ideaTitle = idea ? idea.title : 'Unknown Idea';

        html += '<div class="fusion-card" style="padding:1.25rem;cursor:pointer;transition:box-shadow 0.15s" onclick="FusionApp.navigate(\'/ideas/' + edge.ideaId + '/edge\')" onmouseenter="this.style.boxShadow=\'0 4px 12px hsl(var(--foreground)/0.1)\'" onmouseleave="this.style.boxShadow=\'\'">';

        // Card header
        html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">';
        html += '<div style="width:2.25rem;height:2.25rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));flex-shrink:0">' + icon('target', 18) + '</div>';
        html += '<div style="flex:1;min-width:0">';
        html += '<h3 class="text-base font-semibold">' + escapeHtml(edge.title) + '</h3>';
        html += '<p class="text-xs text-muted-foreground">' + escapeHtml(ideaTitle) + '</p>';
        html += '</div>';
        html += '<div style="color:hsl(var(--muted-foreground))">' + icon('chevronRight', 16) + '</div>';
        html += '</div>';

        // Outcomes list
        html += '<div style="display:flex;flex-direction:column;gap:0.5rem">';
        edge.outcomes.forEach(function(outcome) {
          html += '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0.75rem;background:hsl(var(--muted)/0.5);border-radius:0.375rem">';

          // Status indicator dot
          var dotColor = 'var(--muted-foreground)';
          if (outcome.status === 'achieved') dotColor = 'var(--success)';
          else if (outcome.status === 'on_track') dotColor = 'var(--success)';
          else if (outcome.status === 'in_progress') dotColor = 'var(--info)';
          else if (outcome.status === 'at_risk') dotColor = 'var(--warning)';

          html += '<span style="width:0.5rem;height:0.5rem;border-radius:9999px;background:hsl(' + dotColor + ');flex-shrink:0"></span>';

          html += '<span class="text-sm" style="flex:1;min-width:0">' + escapeHtml(outcome.label) + '</span>';
          html += '<span class="text-xs text-muted-foreground">' + escapeHtml(outcome.current) + ' / ' + escapeHtml(outcome.target) + '</span>';
          html += App.renderStatusBadge(outcome.status);
          html += '</div>';
        });
        html += '</div>';

        html += '</div>'; // card
      });

      html += '</div>'; // grid

      return html;
    }
  };
})();
