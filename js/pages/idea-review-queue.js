// Fusion AI — Idea Review Queue Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  App.pages['/review'] = {
    layout: 'dashboard',

    render: function() {
      var reviews = App.store.reviews;
      var mobile = App.isMobile();
      var html = '';

      // Stats
      var totalPending = reviews.filter(function(r) { return r.status === 'pending'; }).length;
      var readyToReview = reviews.filter(function(r) { return r.status === 'pending'; }).length;
      var highPriority = reviews.filter(function(r) { return r.priority === 'high' && r.status === 'pending'; }).length;

      // Calculate average wait time in days
      var now = new Date();
      var totalWaitDays = 0;
      reviews.forEach(function(r) {
        var submitted = new Date(r.submittedAt);
        totalWaitDays += Math.floor((now - submitted) / (1000 * 60 * 60 * 24));
      });
      var avgWait = reviews.length > 0 ? Math.round(totalWaitDays / reviews.length) : 0;

      // Title with stats
      html += '<div class="mb-8">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">' + icon('clipboard', 24) + ' Review Queue</h1>';
      html += '<p class="text-muted-foreground">Review and approve submitted ideas</p>';
      html += '</div>';

      // Stat cards
      var stats = [
        { label: 'Total Pending', value: totalPending, icon: 'clock', color: 'warning' },
        { label: 'Ready to Review', value: readyToReview, icon: 'eye', color: 'info' },
        { label: 'High Priority', value: highPriority, icon: 'alertTriangle', color: 'error' },
        { label: 'Avg Wait', value: avgWait + 'd', icon: 'activity', color: 'secondary' },
      ];

      html += '<div class="grid grid-cols-2 ' + (mobile ? '' : 'lg:grid-cols-4') + ' gap-4 mb-8">';
      stats.forEach(function(stat) {
        var bgClass = stat.color === 'warning' ? 'bg-warning-soft' : stat.color === 'error' ? 'bg-error-soft' : stat.color === 'info' ? 'bg-info-soft' : 'bg-muted';
        var textClass = stat.color === 'warning' ? 'text-warning' : stat.color === 'error' ? 'text-error' : stat.color === 'info' ? 'text-primary' : 'text-muted-foreground';
        html += '<div class="fusion-card p-4">';
        html += '<div class="flex items-center gap-3 mb-2">';
        html += '<div class="w-10 h-10 rounded-lg ' + bgClass + ' flex items-center justify-center ' + textClass + '">' + icon(stat.icon, 20) + '</div>';
        html += '</div>';
        html += '<div class="text-2xl font-bold font-display">' + stat.value + '</div>';
        html += '<div class="text-sm text-muted-foreground">' + escapeHtml(stat.label) + '</div>';
        html += '</div>';
      });
      html += '</div>';

      // Review items list
      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-lg font-semibold mb-4">Pending Reviews</h3>';

      if (reviews.length === 0) {
        html += App.renderEmptyState('checkCircle2', 'All caught up!', 'There are no ideas waiting for review.');
      } else {
        html += '<div class="space-y-3">';
        reviews.forEach(function(review) {
          html += '<div class="list-card" style="border:1px solid hsl(var(--border));border-radius:var(--radius);padding:1rem">';
          html += '<div class="flex items-center justify-between ' + (mobile ? 'flex-col gap-3 align-start' : '') + '">';

          html += '<div class="flex items-center gap-3 ' + (mobile ? 'w-full' : 'flex-1') + '">';
          html += '<div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground" style="flex-shrink:0">' + icon('lightbulb', 20) + '</div>';
          html += '<div class="flex-1 min-w-0">';
          html += '<p class="font-semibold">' + escapeHtml(review.ideaTitle) + '</p>';
          html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">';
          html += '<span>' + escapeHtml(review.submittedBy) + '</span>';
          html += '<span>&middot;</span>';
          html += '<span>' + App.formatDate(review.submittedAt) + '</span>';
          html += '<span>&middot;</span>';
          html += '<span>' + escapeHtml(review.category) + '</span>';
          html += '</div>';
          html += '</div>';
          html += '</div>';

          html += '<div class="flex items-center gap-2 ' + (mobile ? 'w-full justify-between' : '') + '">';
          html += App.renderPriorityBadge(review.priority);
          html += App.renderStatusBadge(review.status);
          html += '<button class="btn btn-outline btn-sm" onclick="FusionApp.navigate(\'/review/' + escapeHtml(review.id) + '\')">' + icon('eye', 14) + ' Review</button>';
          html += '</div>';

          html += '</div>'; // flex row
          html += '</div>'; // list-card
        });
        html += '</div>';
      }

      html += '</div>'; // card

      return html;
    },

    init: function() {
      // No special init needed
    }
  };
})();
