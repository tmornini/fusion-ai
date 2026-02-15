// Fusion AI — Edge List (Business Outcomes Overview) Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;
  var store = App.store;

  var searchQuery = '';
  var statusFilter = 'all';

  // Mock edge items matching React SPA data
  var edgeItems = [
    { id: '1', ideaId: '1', ideaTitle: 'AI-Powered Customer Segmentation', status: 'complete', outcomesCount: 2, metricsCount: 4, confidence: 'high', owner: 'Sarah Chen', updatedAt: '2025-02-28' },
    { id: '2', ideaId: '2', ideaTitle: 'Automated Report Generation', status: 'complete', outcomesCount: 3, metricsCount: 5, confidence: 'medium', owner: 'Mike Johnson', updatedAt: '2025-02-25' },
    { id: '3', ideaId: '3', ideaTitle: 'Predictive Maintenance System', status: 'draft', outcomesCount: 1, metricsCount: 2, confidence: 'low', owner: 'Emily Rodriguez', updatedAt: '2025-02-20' },
    { id: '4', ideaId: '4', ideaTitle: 'Real-time Analytics Dashboard', status: 'complete', outcomesCount: 2, metricsCount: 3, confidence: 'high', owner: 'Alex Kim', updatedAt: '2025-02-18' },
    { id: '5', ideaId: '5', ideaTitle: 'Smart Inventory Optimization', status: 'missing', outcomesCount: 0, metricsCount: 0, confidence: null, owner: '', updatedAt: '' },
  ];

  var statusConfig = {
    complete: { label: 'Complete', color: 'success' },
    draft: { label: 'Draft', color: 'warning' },
    missing: { label: 'Missing', color: 'error' }
  };

  var confidenceConfig = {
    high: { label: 'High', color: 'success' },
    medium: { label: 'Medium', color: 'warning' },
    low: { label: 'Low', color: 'error' }
  };

  function getFiltered() {
    return edgeItems.filter(function(e) {
      var matchSearch = !searchQuery ||
        e.ideaTitle.toLowerCase().indexOf(searchQuery.toLowerCase()) >= 0 ||
        e.owner.toLowerCase().indexOf(searchQuery.toLowerCase()) >= 0;
      var matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }

  App.pages['/edge'] = {
    layout: 'dashboard',

    render: function() {
      var filtered = getFiltered();
      var html = '';

      // Header
      html += '<div style="margin-bottom:1.5rem">';
      html += '<div class="flex items-center gap-2 mb-3"><span class="badge badge-info" style="display:inline-flex;align-items:center;gap:0.375rem">' + icon('target', 14) + ' Business Case Definition</span></div>';
      html += '<h1 class="text-2xl font-display font-bold mb-1">Edge</h1>';
      html += '<p class="text-sm text-muted-foreground">Define outcomes, metrics, and expected impact for ideas</p>';
      html += '</div>';

      // Stats
      var stats = { total: edgeItems.length, complete: 0, draft: 0, missing: 0 };
      edgeItems.forEach(function(e) { if (stats[e.status] !== undefined) stats[e.status]++; });

      html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4" style="margin-bottom:2rem">';
      var statDefs = [
        { label: 'Total Ideas', value: stats.total, iconName: 'target', bg: 'primary' },
        { label: 'Complete', value: stats.complete, iconName: 'checkCircle2', bg: 'success' },
        { label: 'In Draft', value: stats.draft, iconName: 'clock', bg: 'warning' },
        { label: 'Missing', value: stats.missing, iconName: 'alertCircle', bg: 'error' },
      ];
      statDefs.forEach(function(s) {
        html += '<div class="fusion-card" style="padding:1rem">';
        html += '<div class="flex items-center gap-3">';
        html += '<div style="padding:0.5rem;border-radius:0.5rem;background:hsl(var(--' + s.bg + ') / 0.1)">';
        html += '<span style="color:hsl(var(--' + s.bg + '))">' + icon(s.iconName, 20) + '</span>';
        html += '</div>';
        html += '<div>';
        html += '<p class="text-2xl font-bold">' + s.value + '</p>';
        html += '<p class="text-sm text-muted-foreground">' + s.label + '</p>';
        html += '</div></div></div>';
      });
      html += '</div>';

      // Filters
      html += '<div class="flex gap-4 mb-6" style="flex-wrap:wrap">';
      html += '<div class="flex-1" style="min-width:12rem;position:relative">';
      html += '<span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:hsl(var(--muted-foreground))">' + icon('search', 16) + '</span>';
      html += '<input class="input w-full" style="padding-left:2.5rem" placeholder="Search ideas or owners..." value="' + escapeHtml(searchQuery) + '" oninput="FusionApp._edgeSearch(this.value)" />';
      html += '</div>';
      html += '<div style="width:10rem">';
      html += App.renderSelect(
        [{ value: 'all', label: 'All Status' }, { value: 'complete', label: 'Complete' }, { value: 'draft', label: 'Draft' }, { value: 'missing', label: 'Missing' }],
        statusFilter, 'edge-status-filter', 'FusionApp._edgeFilterStatus(this.value)'
      );
      html += '</div>';
      html += '</div>';

      // Edge list
      if (filtered.length === 0) {
        html += '<div class="text-center" style="padding:3rem 0">';
        html += '<div class="text-muted-foreground mb-4">' + icon('target', 48) + '</div>';
        html += '<h3 class="text-lg font-semibold mb-2">No Edge definitions found</h3>';
        html += '<p class="text-muted-foreground">Try adjusting your search or filter criteria</p>';
        html += '</div>';
        return html;
      }

      html += '<div style="display:grid;gap:0.75rem">';
      filtered.forEach(function(edge) {
        var cfg = statusConfig[edge.status];
        html += '<div class="fusion-card" style="padding:1rem;cursor:pointer;transition:border-color 0.15s" onclick="FusionApp.navigate(\'/ideas/' + edge.ideaId + '/edge\')" onmouseenter="this.style.borderColor=\'hsl(var(--primary) / 0.3)\'" onmouseleave="this.style.borderColor=\'\'">';
        html += '<div class="flex items-start justify-between gap-4">';
        html += '<div style="flex:1;min-width:0">';

        // Status + confidence badges
        html += '<div class="flex items-center gap-3 mb-2" style="flex-wrap:wrap">';
        html += '<span class="badge badge-' + cfg.color + '" style="display:inline-flex;align-items:center;gap:0.25rem">';
        html += (edge.status === 'complete' ? icon('checkCircle2', 12) : edge.status === 'draft' ? icon('clock', 12) : icon('alertCircle', 12));
        html += ' ' + cfg.label + '</span>';
        if (edge.confidence) {
          var cc = confidenceConfig[edge.confidence];
          html += '<span class="text-xs" style="display:inline-flex;align-items:center;gap:0.25rem;color:hsl(var(--' + cc.color + '))">';
          html += icon('shield', 14) + ' ' + cc.label + ' Confidence</span>';
        }
        html += '</div>';

        // Title
        html += '<h3 class="font-semibold mb-1">' + escapeHtml(edge.ideaTitle) + '</h3>';

        // Meta row
        html += '<div class="flex items-center gap-4 text-sm text-muted-foreground" style="flex-wrap:wrap">';
        if (edge.owner) {
          html += '<span class="flex items-center gap-1.5">' + icon('user', 14) + ' ' + escapeHtml(edge.owner) + '</span>';
        }
        if (edge.status !== 'missing') {
          html += '<span class="flex items-center gap-1.5">' + icon('trendingUp', 14) + ' ' + edge.outcomesCount + ' outcomes</span>';
          html += '<span class="flex items-center gap-1.5">' + icon('barChart3', 14) + ' ' + edge.metricsCount + ' metrics</span>';
        }
        if (edge.updatedAt) {
          html += '<span class="text-xs">Updated ' + edge.updatedAt + '</span>';
        }
        html += '</div>';

        html += '</div>';
        html += '<div class="flex items-center text-muted-foreground">' + icon('chevronRight', 20) + '</div>';
        html += '</div></div>';
      });
      html += '</div>';

      return html;
    }
  };

  App._edgeSearch = function(val) {
    searchQuery = val;
    App.render();
  };

  App._edgeFilterStatus = function(val) {
    statusFilter = val;
    App.render();
  };
})();
