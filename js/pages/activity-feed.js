// Fusion AI — Activity Feed Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var filterType = 'all';

  var typeConfig = {
    idea_created:     { icon: 'lightbulb',    label: 'Idea Created',     color: 'text-primary' },
    idea_approved:    { icon: 'checkCircle2',  label: 'Idea Approved',    color: 'text-success' },
    idea_rejected:    { icon: 'x',            label: 'Idea Rejected',    color: 'text-error' },
    idea_scored:      { icon: 'star',         label: 'Idea Scored',      color: 'text-warning' },
    project_updated:  { icon: 'folderKanban', label: 'Project Updated',  color: 'text-primary' },
    project_completed:{ icon: 'checkCircle2', label: 'Project Completed', color: 'text-success' },
    review_submitted: { icon: 'eye',          label: 'Review Submitted', color: 'text-info' },
    team_invited:     { icon: 'userPlus',     label: 'Team Invited',     color: 'text-primary' },
  };

  function getActivityDescription(item) {
    var map = {
      idea_created: 'created idea',
      idea_approved: 'approved idea',
      idea_rejected: 'rejected idea',
      idea_scored: 'scored idea',
      project_updated: 'updated project',
      project_completed: 'completed project',
      review_submitted: 'submitted review for',
      team_invited: 'invited',
    };
    return (map[item.type] || item.type) + ' "' + item.target + '"';
  }

  App._activityFilter = function(val) {
    filterType = val;
    App.render();
  };

  App.pages['/account/activity'] = {
    layout: 'dashboard',

    render: function() {
      var store = App.store;
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Activity</span>';
      html += '</div>';

      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-6">Activity Feed</h1>';

      // Filter
      var types = ['all'];
      var typeSet = {};
      store.activity.forEach(function(a) { if (!typeSet[a.type]) { typeSet[a.type] = true; types.push(a.type); } });

      html += '<div class="mb-4">';
      html += App.renderSelect(
        types.map(function(t) {
          var cfg = typeConfig[t];
          return { value: t, label: t === 'all' ? 'All Activity' : (cfg ? cfg.label : t) };
        }),
        filterType, 'activity-type-filter', 'FusionApp._activityFilter(this.value)'
      );
      html += '</div>';

      // Activity list
      var activities = store.activity;
      if (filterType !== 'all') {
        activities = activities.filter(function(a) { return a.type === filterType; });
      }

      if (activities.length === 0) {
        html += App.renderEmptyState('activity', 'No activity found', 'Try changing the filter to see more results.');
        return html;
      }

      html += '<div class="space-y-2">';
      activities.forEach(function(item) {
        var cfg = typeConfig[item.type] || { icon: 'activity', label: item.type, color: 'text-muted-foreground' };
        html += '<div class="fusion-card p-4">';
        html += '<div class="flex items-start gap-3">';
        // Icon
        html += '<div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ' + cfg.color + '">' + icon(cfg.icon, 16) + '</div>';
        // Content
        html += '<div class="flex-1 min-w-0">';
        html += '<p class="text-sm"><span class="font-medium">' + escapeHtml(item.user) + '</span> <span class="text-muted-foreground">' + escapeHtml(getActivityDescription(item)) + '</span></p>';
        html += '<p class="text-xs text-muted-foreground mt-1">' + App.formatRelativeTime(item.timestamp) + '</p>';
        html += '</div>';
        // Badge
        html += '<div>' + App.renderBadge(cfg.label, 'secondary') + '</div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      return html;
    }
  };
})();
