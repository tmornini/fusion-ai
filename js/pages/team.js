// Fusion AI — Team Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);
  }

  function openInviteModal() {
    var html = '<h2 class="text-lg font-semibold mb-4">Invite Team Member</h2>';
    html += '<div class="space-y-4">';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Name</label>';
    html += '<input class="input w-full" id="invite-name" placeholder="Full name" /></div>';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Email</label>';
    html += '<input class="input w-full" id="invite-email" type="email" placeholder="email@example.com" /></div>';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Role</label>';
    html += '<input class="input w-full" id="invite-role" placeholder="e.g. Engineer" /></div>';
    html += '<div><label class="text-sm font-medium text-foreground block mb-1">Department</label>';
    html += App.renderSelect(
      [{ value: 'Engineering', label: 'Engineering' }, { value: 'Product', label: 'Product' }, { value: 'Design', label: 'Design' }, { value: 'Data', label: 'Data' }, { value: 'Marketing', label: 'Marketing' }, { value: 'General', label: 'General' }],
      'Engineering', 'invite-department', ''
    );
    html += '</div>';
    html += '<div class="flex gap-2 justify-end mt-4">';
    html += '<button class="btn btn-ghost" onclick="FusionApp.closeModal()">Cancel</button>';
    html += '<button class="btn btn-primary" onclick="FusionApp._teamInviteSubmit()">Send Invite</button>';
    html += '</div></div>';
    App.showModal({ content: html });
  }

  App._teamInviteSubmit = function() {
    var name = document.getElementById('invite-name').value.trim();
    var email = document.getElementById('invite-email').value.trim();
    var role = document.getElementById('invite-role').value.trim();
    var dept = document.getElementById('invite-department').value;
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
    App.showToast({ title: 'Invitation sent', description: name + ' has been invited to the team.' });
    App.render();
  };

  App._teamOpenInvite = function() {
    openInviteModal();
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
