// Fusion AI — Account Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  App.pages['/account'] = {
    layout: 'dashboard',

    render: function() {
      var store = App.store;
      var mobile = App.isMobile();
      var html = '';

      // Title
      html += '<div class="mb-6">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Account</h1>';
      html += '</div>';

      // Quick links grid
      var links = [
        { label: 'Profile', icon: 'user', href: '/account/profile', desc: 'Manage your personal info' },
        { label: 'Company Settings', icon: 'building', href: '/account/company', desc: 'Update company details' },
        { label: 'Manage Users', icon: 'users', href: '/account/users', desc: 'Add and manage team members' },
        { label: 'Activity Feed', icon: 'activity', href: '/account/activity', desc: 'View recent activity' },
        { label: 'Notifications', icon: 'bell', href: '/account/notifications', desc: 'Configure notification preferences' },
      ];

      html += '<div class="grid grid-cols-1 ' + (mobile ? 'gap-3' : 'md:grid-cols-3 lg:grid-cols-5 gap-4') + ' mb-8">';
      links.forEach(function(link) {
        html += '<button class="fusion-card p-4 text-left w-full" style="cursor:pointer" onclick="FusionApp.navigate(\'' + link.href + '\')">';
        html += '<div class="w-10 h-10 rounded-lg bg-info-soft flex items-center justify-center text-primary mb-3">' + icon(link.icon, 20) + '</div>';
        html += '<h3 class="text-sm font-semibold mb-1">' + escapeHtml(link.label) + '</h3>';
        html += '<p class="text-xs text-muted-foreground">' + escapeHtml(link.desc) + '</p>';
        html += '</button>';
      });
      html += '</div>';

      // Account overview
      html += '<div class="grid grid-cols-1 ' + (mobile ? '' : 'md:grid-cols-2') + ' gap-4">';

      // User info card
      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-lg font-semibold mb-4">Account Overview</h3>';
      html += '<div class="space-y-3">';
      var fields = [
        { label: 'Name', value: store.profile.name },
        { label: 'Email', value: store.profile.email },
        { label: 'Role', value: store.profile.role },
        { label: 'Company', value: store.company.name },
        { label: 'Plan', value: store.company.plan },
      ];
      fields.forEach(function(f) {
        html += '<div class="flex justify-between">';
        html += '<span class="text-sm text-muted-foreground">' + escapeHtml(f.label) + '</span>';
        html += '<span class="text-sm font-medium">' + escapeHtml(f.value) + '</span>';
        html += '</div>';
      });
      html += '</div></div>';

      // Usage stats
      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-lg font-semibold mb-4">Usage Statistics</h3>';
      html += '<div class="space-y-4">';
      var usageStats = [
        { label: 'Ideas Created', value: store.ideas.length, max: 50 },
        { label: 'Projects Active', value: store.projects.filter(function(p) { return p.status === 'in_progress'; }).length, max: 20 },
        { label: 'Team Members', value: store.team.length, max: 25 },
        { label: 'Storage Used', value: 34, max: 100 },
      ];
      usageStats.forEach(function(stat) {
        var pct = Math.round((stat.value / stat.max) * 100);
        html += '<div>';
        html += '<div class="flex justify-between text-sm mb-1">';
        html += '<span class="text-muted-foreground">' + escapeHtml(stat.label) + '</span>';
        html += '<span class="font-medium">' + stat.value + ' / ' + stat.max + '</span>';
        html += '</div>';
        html += App.renderProgress(stat.value, stat.max);
        html += '</div>';
      });
      html += '</div></div>';

      html += '</div>';

      return html;
    }
  };
})();
