// Fusion AI — Notification Settings Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  // Local state for toggles
  var settings = null;

  function getSettings() {
    if (!settings) {
      // Deep clone from store
      var n = App.store.notifications;
      settings = {
        ideas:    { email: n.email.ideas,    push: n.inApp.ideas },
        projects: { email: n.email.projects, push: n.inApp.projects },
        teams:    { email: n.email.team,     push: n.inApp.team },
        account:  { email: n.email.weekly_digest, push: n.inApp.mentions },
      };
    }
    return settings;
  }

  function renderToggle(id, checked) {
    var bg = checked ? 'background:hsl(var(--primary))' : 'background:hsl(var(--muted))';
    var translate = checked ? 'translateX(1.25rem)' : 'translateX(0.125rem)';
    return '<button id="' + id + '" class="toggle-btn" style="width:2.75rem;height:1.5rem;border-radius:9999px;' + bg + ';position:relative;border:none;cursor:pointer;transition:background 0.2s" onclick="FusionApp._notifToggle(\'' + id + '\')">' +
      '<span style="display:block;width:1.125rem;height:1.125rem;border-radius:9999px;background:white;position:absolute;top:0.1875rem;left:0;transform:' + translate + ';transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></span>' +
    '</button>';
  }

  App._notifToggle = function(id) {
    // Parse id: "notif-{category}-{type}"
    var parts = id.replace('notif-', '').split('-');
    var category = parts[0];
    var type = parts[1]; // email or push
    var s = getSettings();
    if (s[category]) {
      s[category][type] = !s[category][type];
    }
    App.render();
  };

  App._notifSave = function() {
    var s = getSettings();
    App.store.notifications.email.ideas = s.ideas.email;
    App.store.notifications.email.projects = s.projects.email;
    App.store.notifications.email.team = s.teams.email;
    App.store.notifications.email.weekly_digest = s.account.email;
    App.store.notifications.inApp.ideas = s.ideas.push;
    App.store.notifications.inApp.projects = s.projects.push;
    App.store.notifications.inApp.team = s.teams.push;
    App.store.notifications.inApp.mentions = s.account.push;

    App.showToast({ title: 'Notifications saved', description: 'Your notification preferences have been updated.' });
  };

  App.pages['/account/notifications'] = {
    layout: 'dashboard',

    render: function() {
      var s = getSettings();
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Notifications</span>';
      html += '</div>';

      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-6">Notification Settings</h1>';

      html += '<div class="fusion-card p-6" style="max-width:40rem">';

      // Table header
      html += '<div class="flex items-center gap-4 pb-3 mb-4 border-b text-sm font-medium text-muted-foreground">';
      html += '<div class="flex-1">Category</div>';
      html += '<div style="width:5rem;text-align:center">Email</div>';
      html += '<div style="width:5rem;text-align:center">Push</div>';
      html += '</div>';

      var categories = [
        { key: 'ideas',    label: 'Ideas',    desc: 'New ideas, scoring results, status changes', icon: 'lightbulb' },
        { key: 'projects', label: 'Projects', desc: 'Project updates, milestones, assignments', icon: 'folderKanban' },
        { key: 'teams',    label: 'Teams',    desc: 'Team invites, member changes, mentions', icon: 'users' },
        { key: 'account',  label: 'Account',  desc: 'Weekly digest, security alerts, billing', icon: 'shield' },
      ];

      html += '<div class="space-y-4">';
      categories.forEach(function(cat) {
        html += '<div class="flex items-center gap-4 py-2">';
        // Label
        html += '<div class="flex-1">';
        html += '<div class="flex items-center gap-2">';
        html += '<span class="text-muted-foreground">' + icon(cat.icon, 16) + '</span>';
        html += '<span class="text-sm font-medium">' + escapeHtml(cat.label) + '</span>';
        html += '</div>';
        html += '<p class="text-xs text-muted-foreground mt-0.5 ml-6">' + escapeHtml(cat.desc) + '</p>';
        html += '</div>';
        // Email toggle
        html += '<div style="width:5rem;display:flex;justify-content:center">';
        html += renderToggle('notif-' + cat.key + '-email', s[cat.key].email);
        html += '</div>';
        // Push toggle
        html += '<div style="width:5rem;display:flex;justify-content:center">';
        html += renderToggle('notif-' + cat.key + '-push', s[cat.key].push);
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      // Save button
      html += '<div class="flex justify-end pt-6 mt-4 border-t">';
      html += '<button class="btn btn-primary" onclick="FusionApp._notifSave()">' + icon('save', 16) + ' <span>Save Preferences</span></button>';
      html += '</div>';

      html += '</div>';

      return html;
    }
  };
})();
