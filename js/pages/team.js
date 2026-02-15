// Fusion AI — Team Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);
  }

  App._teamOpenInvite = function() {
    App.showInviteModal({ title: 'Invite Team Member' });
  };

  App.pages['/team'] = {
    layout: 'dashboard',

    render: function() {
      var store = App.store;
      var mobile = App.isMobile();
      var html = '';

      // Header
      html += '<div class="flex items-center justify-between mb-6">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Team</h1>';
      html += '<button class="btn btn-primary" onclick="FusionApp._teamOpenInvite()">' + icon('userPlus', 18) + ' <span>Invite Member</span></button>';
      html += '</div>';

      // Team grid
      html += '<div class="grid grid-cols-1 ' + (mobile ? '' : 'md:grid-cols-2 lg:grid-cols-3') + ' gap-4">';
      store.team.forEach(function(member) {
        var initials = getInitials(member.name);
        html += '<div class="fusion-card p-5">';
        html += '<div class="flex items-start gap-4">';
        // Avatar
        html += '<div style="width:3rem;height:3rem;border-radius:9999px;background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:600;font-size:0.875rem;flex-shrink:0">' + escapeHtml(initials) + '</div>';
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="flex items-center gap-2 mb-1">';
        html += '<h3 class="text-sm font-semibold truncate">' + escapeHtml(member.name) + '</h3>';
        html += App.renderStatusBadge(member.status);
        html += '</div>';
        html += '<p class="text-sm text-muted-foreground">' + escapeHtml(member.role) + '</p>';
        html += '<p class="text-xs text-muted-foreground">' + escapeHtml(member.department) + '</p>';
        html += '<div class="flex items-center gap-1 mt-2 text-xs text-muted-foreground">';
        html += icon('mail', 12) + ' <span>' + escapeHtml(member.email) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      return html;
    }
  };
})();
