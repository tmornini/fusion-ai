// Fusion AI — Manage Users Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var filterRole = 'all';
  var searchQuery = '';

  function getFilteredUsers() {
    var users = App.store.team;
    if (filterRole !== 'all') {
      users = users.filter(function(u) { return u.role === filterRole; });
    }
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      users = users.filter(function(u) {
        return u.name.toLowerCase().indexOf(q) >= 0 || u.email.toLowerCase().indexOf(q) >= 0;
      });
    }
    return users;
  }

  function openInviteModal() {
    var html = '<h2 class="text-lg font-semibold mb-4">Invite User</h2>';
    html += '<div class="space-y-4">';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Name</label>';
    html += '<input class="input w-full" id="mu-invite-name" placeholder="Full name" /></div>';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Email</label>';
    html += '<input class="input w-full" id="mu-invite-email" type="email" placeholder="email@example.com" /></div>';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Role</label>';
    html += '<input class="input w-full" id="mu-invite-role" placeholder="e.g. Engineer" /></div>';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Department</label>';
    html += App.renderSelect(
      [{ value: 'Engineering', label: 'Engineering' }, { value: 'Product', label: 'Product' }, { value: 'Design', label: 'Design' }, { value: 'Data', label: 'Data' }, { value: 'Marketing', label: 'Marketing' }, { value: 'General', label: 'General' }],
      'Engineering', 'mu-invite-dept', ''
    );
    html += '</div>';
    html += '<div class="flex gap-2 justify-end mt-4">';
    html += '<button class="btn btn-ghost" onclick="FusionApp.closeModal()">Cancel</button>';
    html += '<button class="btn btn-primary" onclick="FusionApp._muInviteSubmit()">Send Invite</button>';
    html += '</div></div>';
    App.showModal({ content: html });
  }

  App._muInviteSubmit = function() {
    var name = document.getElementById('mu-invite-name').value.trim();
    var email = document.getElementById('mu-invite-email').value.trim();
    var role = document.getElementById('mu-invite-role').value.trim();
    var dept = document.getElementById('mu-invite-dept').value;
    if (!name || !email) {
      App.showToast({ title: 'Error', description: 'Name and email are required.', variant: 'destructive' });
      return;
    }
    App.store.team.push({
      id: String(App.store.team.length + 1),
      name: name,
      email: email,
      role: role || 'Member',
      department: dept,
      status: 'active',
      avatar: null,
      joinedAt: new Date().toISOString().split('T')[0]
    });
    App.closeModal();
    App.showToast({ title: 'Invitation sent', description: name + ' has been invited.' });
    App.render();
  };

  App._muOpenInvite = function() {
    openInviteModal();
  };

  App._muFilterRole = function(val) {
    filterRole = val;
    App.render();
  };

  App._muSearch = function() {
    var el = document.getElementById('mu-search');
    if (el) searchQuery = el.value;
    App.render();
  };

  App._muToggleStatus = function(userId) {
    var member = App.store.team.find(function(m) { return m.id === userId; });
    if (member) {
      member.status = member.status === 'active' ? 'inactive' : 'active';
      App.render();
      App.showToast({ title: 'User updated', description: member.name + ' is now ' + member.status + '.' });
    }
  };

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

      // Header
      html += '<div class="flex items-center justify-between mb-6">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Manage Users</h1>';
      html += '<button class="btn btn-primary" onclick="FusionApp._muOpenInvite()">' + icon('userPlus', 18) + ' <span>Invite User</span></button>';
      html += '</div>';

      // Filters
      html += '<div class="flex flex-wrap gap-3 mb-4">';
      html += '<div class="search-input-wrapper" style="max-width:16rem">' + icon('search', 16);
      html += '<input class="input" id="mu-search" type="text" placeholder="Search users..." value="' + escapeHtml(searchQuery) + '" oninput="FusionApp._muSearch()" />';
      html += '</div>';

      // Role filter
      var roles = ['all'];
      var roleSet = {};
      App.store.team.forEach(function(u) { if (!roleSet[u.role]) { roleSet[u.role] = true; roles.push(u.role); } });
      html += App.renderSelect(
        roles.map(function(r) { return { value: r, label: r === 'all' ? 'All Roles' : r }; }),
        filterRole, 'mu-role-filter', 'FusionApp._muFilterRole(this.value)'
      );
      html += '</div>';

      var users = getFilteredUsers();

      if (users.length === 0) {
        html += App.renderEmptyState('users', 'No users found', 'Try adjusting your filters or invite a new user.');
        return html;
      }

      // Table
      html += '<div class="fusion-card" style="overflow-x:auto">';
      html += '<table class="data-table w-full">';
      html += '<thead><tr>';
      html += '<th>Name</th><th>Email</th>';
      if (!mobile) { html += '<th>Role</th><th>Department</th>'; }
      html += '<th>Status</th><th>Actions</th>';
      html += '</tr></thead>';
      html += '<tbody>';
      users.forEach(function(u) {
        html += '<tr>';
        html += '<td class="font-medium">' + escapeHtml(u.name) + '</td>';
        html += '<td class="text-muted-foreground">' + escapeHtml(u.email) + '</td>';
        if (!mobile) {
          html += '<td>' + escapeHtml(u.role) + '</td>';
          html += '<td>' + escapeHtml(u.department) + '</td>';
        }
        html += '<td>' + App.renderStatusBadge(u.status) + '</td>';
        html += '<td>';
        html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._muToggleStatus(\'' + u.id + '\')">';
        html += u.status === 'active' ? 'Deactivate' : 'Activate';
        html += '</button>';
        html += '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';

      return html;
    }
  };
})();
