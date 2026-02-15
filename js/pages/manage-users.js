// Fusion AI — Manage Users Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var filterRole = 'all';
  var filterStatus = 'all';
  var searchQuery = '';

  var roleConfig = {
    'Admin': { icon: 'crown', color: 'purple' },
    'Manager': { icon: 'userCheck', color: 'primary' },
    'Product Manager': { icon: 'userCheck', color: 'primary' },
    'Project Lead': { icon: 'userCheck', color: 'primary' },
    'Member': { icon: 'user', color: 'success' },
    'Viewer': { icon: 'eye', color: 'muted-foreground' },
  };

  var statusConfig = {
    'active': { icon: 'checkCircle2', color: 'success' },
    'pending': { icon: 'clock', color: 'warning' },
    'inactive': { icon: 'xCircle', color: 'muted-foreground' },
  };

  function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);
  }

  function getFilteredUsers() {
    var users = App.store.team;
    if (filterRole !== 'all') {
      users = users.filter(function(u) { return u.role === filterRole; });
    }
    if (filterStatus !== 'all') {
      users = users.filter(function(u) { return u.status === filterStatus; });
    }
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      users = users.filter(function(u) {
        return u.name.toLowerCase().indexOf(q) >= 0 || u.email.toLowerCase().indexOf(q) >= 0;
      });
    }
    return users;
  }

  App._muOpenInvite = function() {
    var html = '<h2 class="text-lg font-semibold mb-4">Invite User</h2>';
    html += '<div class="space-y-4">';
    html += '<div><label class="text-sm font-medium block mb-1">Email Address</label>';
    html += '<input class="input w-full" id="mu-invite-email" type="email" placeholder="email@example.com" /></div>';
    html += '<div><label class="text-sm font-medium block mb-1">Role</label>';
    html += App.renderSelect([
      { value: 'Member', label: 'Member' },
      { value: 'Viewer', label: 'Viewer' },
      { value: 'Manager', label: 'Manager' },
      { value: 'Admin', label: 'Admin' },
    ], 'Member', 'mu-invite-role', '');
    html += '</div>';
    html += '<div><label class="text-sm font-medium block mb-1">Department</label>';
    html += App.renderSelect([
      { value: 'Engineering', label: 'Engineering' },
      { value: 'Product', label: 'Product' },
      { value: 'Design', label: 'Design' },
      { value: 'Analytics', label: 'Analytics' },
      { value: 'Operations', label: 'Operations' },
    ], 'Engineering', 'mu-invite-dept', '');
    html += '</div>';
    html += '<div class="flex gap-2 justify-end mt-4">';
    html += '<button class="btn btn-ghost" onclick="FusionApp.closeModal()">Cancel</button>';
    html += '<button class="btn btn-primary" onclick="FusionApp._muSubmitInvite()">Send Invite</button>';
    html += '</div></div>';
    App.showModal({ content: html });
  };

  App._muSubmitInvite = function() {
    var email = document.getElementById('mu-invite-email').value.trim();
    if (!email) { App.showToast({ title: 'Error', description: 'Email is required.', variant: 'destructive' }); return; }
    var role = document.getElementById('mu-invite-role').value;
    var dept = document.getElementById('mu-invite-dept').value;
    var name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    App.store.team.push({ id: String(App.store.team.length + 1), name: name, email: email, role: role, department: dept, status: 'active', avatar: null, joinedAt: new Date().toISOString().split('T')[0], availability: 100, performanceScore: 0, projectsCompleted: 0, currentProjects: 0, strengths: [], teamDimensions: { driver: 50, analytical: 50, expressive: 50, amiable: 50 }, recentAchievements: [] });
    App.closeModal();
    App.showToast({ title: 'Invitation sent', description: 'Invite sent to ' + email });
    App.render();
  };

  App._muFilterRole = function(val) { filterRole = val; App.render(); };
  App._muFilterStatus = function(val) { filterStatus = val; App.render(); };
  App._muSearch = function(val) { searchQuery = val; App.render(); };

  App._muSetRole = function(userId, role) {
    var m = App.store.team.find(function(u) { return u.id === userId; });
    if (m) { m.role = role; App.render(); App.showToast({ title: 'Role updated', description: m.name + ' is now ' + role }); }
  };

  App._muToggleStatus = function(userId) {
    var m = App.store.team.find(function(u) { return u.id === userId; });
    if (m) { m.status = m.status === 'active' ? 'inactive' : 'active'; App.render(); App.showToast({ title: 'Status updated', description: m.name + ' is now ' + m.status }); }
  };

  function renderRoleBadge(role) {
    var cfg = roleConfig[role];
    if (!cfg) cfg = { icon: 'user', color: 'secondary' };
    return '<span class="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md" style="background:hsl(var(--' + cfg.color + ') / 0.1);color:hsl(var(--' + cfg.color + '))">' +
      icon(cfg.icon, 12) + ' ' + escapeHtml(role) + '</span>';
  }

  function renderStatusIcon(status) {
    var cfg = statusConfig[status] || { icon: 'circle', color: 'muted-foreground' };
    return '<span class="inline-flex items-center gap-1.5 text-xs"><span style="color:hsl(var(--' + cfg.color + '))">' + icon(cfg.icon, 14) + '</span> ' +
      escapeHtml(status.charAt(0).toUpperCase() + status.slice(1)) + '</span>';
  }

  App.pages['/account/users'] = {
    layout: 'dashboard',

    render: function() {
      var mobile = App.isMobile();
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Manage Users</span>';
      html += '</div>';

      // Header with stats
      var activeCount = App.store.team.filter(function(u) { return u.status === 'active'; }).length;
      var pendingCount = App.store.team.filter(function(u) { return u.status === 'pending'; }).length;

      html += '<div class="flex items-center justify-between mb-2">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Manage Users</h1>';
      html += '<button class="btn btn-primary" onclick="FusionApp._muOpenInvite()">' + icon('userPlus', 18) + ' <span>Invite User</span></button>';
      html += '</div>';
      html += '<p class="text-sm text-muted-foreground mb-6">' + activeCount + ' active user' + (activeCount !== 1 ? 's' : '') + (pendingCount > 0 ? ' &middot; ' + pendingCount + ' pending invitation' + (pendingCount !== 1 ? 's' : '') : '') + '</p>';

      // Filters
      html += '<div class="flex flex-wrap gap-3 mb-4">';
      html += '<div class="search-input-wrapper" style="max-width:16rem">' + icon('search', 16);
      html += '<input class="input" id="mu-search" type="text" placeholder="Search users..." value="' + escapeHtml(searchQuery) + '" oninput="FusionApp._muSearch(this.value)" />';
      html += '</div>';

      // Role filter
      var roles = ['all'];
      var roleSet = {};
      App.store.team.forEach(function(u) { if (!roleSet[u.role]) { roleSet[u.role] = true; roles.push(u.role); } });
      html += App.renderSelect(
        roles.map(function(r) { return { value: r, label: r === 'all' ? 'All Roles' : r }; }),
        filterRole, 'mu-role-filter', 'FusionApp._muFilterRole(this.value)'
      );

      // Status filter
      html += App.renderSelect([
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'inactive', label: 'Deactivated' },
      ], filterStatus, 'mu-status-filter', 'FusionApp._muFilterStatus(this.value)');
      html += '</div>';

      var users = getFilteredUsers();

      if (users.length === 0) {
        html += App.renderEmptyState('users', 'No users found', 'Try adjusting your filters or invite a new user.');
        return html;
      }

      // User list as grid cards
      html += '<div class="space-y-2">';
      users.forEach(function(u) {
        var initials = getInitials(u.name);
        html += '<div class="fusion-card p-4">';
        html += '<div class="flex items-center gap-4">';

        // Avatar
        html += '<div style="width:2.5rem;height:2.5rem;border-radius:9999px;background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:600;font-size:0.75rem;flex-shrink:0">' + escapeHtml(initials) + '</div>';

        // Name + email
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="text-sm font-semibold">' + escapeHtml(u.name) + '</div>';
        html += '<div class="text-xs text-muted-foreground">' + escapeHtml(u.email) + '</div>';
        html += '</div>';

        // Role badge
        if (!mobile) html += '<div>' + renderRoleBadge(u.role) + '</div>';

        // Department
        if (!mobile) html += '<div class="text-sm text-muted-foreground" style="width:6rem">' + escapeHtml(u.department) + '</div>';

        // Status
        html += '<div style="width:6rem">' + renderStatusIcon(u.status) + '</div>';

        // Actions dropdown
        var actions = [
          { label: 'Make Admin', onclick: 'FusionApp._muSetRole(\\\'' + u.id + '\\\',\\\'Admin\\\')' },
          { label: 'Make Manager', onclick: 'FusionApp._muSetRole(\\\'' + u.id + '\\\',\\\'Manager\\\')' },
          { label: 'Make Member', onclick: 'FusionApp._muSetRole(\\\'' + u.id + '\\\',\\\'Member\\\')' },
          { label: 'Make Viewer', onclick: 'FusionApp._muSetRole(\\\'' + u.id + '\\\',\\\'Viewer\\\')' },
          { separator: true },
        ];
        if (u.status === 'pending') actions.push({ label: 'Resend Invite', onclick: 'FusionApp.showToast({title:\\\'Invite resent\\\',description:\\\'A new invite has been sent.\\\'})' });
        actions.push({ label: u.status === 'active' ? 'Deactivate User' : 'Reactivate User', onclick: 'FusionApp._muToggleStatus(\\\'' + u.id + '\\\')', destructive: u.status === 'active' });

        html += App.renderDropdownMenu('mu-actions-' + u.id, actions);

        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      return html;
    },

    init: function() {
      filterRole = 'all';
      filterStatus = 'all';
      searchQuery = '';
    }
  };
})();
