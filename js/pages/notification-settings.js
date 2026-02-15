// Fusion AI — Notification Settings Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var categories = null;
  var hasChanges = false;
  var originalJson = '';

  function getCategories() {
    if (!categories) {
      categories = JSON.parse(JSON.stringify(App.store.notifications));
      originalJson = JSON.stringify(categories);
    }
    return categories;
  }

  function checkChanges() {
    hasChanges = JSON.stringify(categories) !== originalJson;
    var bar = document.getElementById('notif-save-bar');
    if (bar) bar.style.display = hasChanges ? 'flex' : 'none';
  }

  var iconMap = { ideas: 'lightbulb', projects: 'folder', teams: 'users', account: 'user' };
  var colorMap = { ideas: 'amber', projects: 'primary', teams: 'indigo', account: 'purple' };

  App._notifToggle = function(catId, prefId, type) {
    var cats = getCategories();
    var cat = cats.find(function(c) { return c.id === catId; });
    if (!cat) return;
    var pref = cat.preferences.find(function(p) { return p.id === prefId; });
    if (!pref) return;
    pref[type] = !pref[type];
    checkChanges();
    // Update just the toggle UI
    var el = document.getElementById('toggle-' + prefId + '-' + type);
    if (el) {
      el.checked = pref[type];
    }
  };

  App._notifEnableAll = function(catId) {
    var cats = getCategories();
    var cat = cats.find(function(c) { return c.id === catId; });
    if (!cat) return;
    cat.preferences.forEach(function(p) { p.email = true; p.push = true; });
    checkChanges();
    App.render();
  };

  App._notifDisableAll = function(catId) {
    var cats = getCategories();
    var cat = cats.find(function(c) { return c.id === catId; });
    if (!cat) return;
    cat.preferences.forEach(function(p) { p.email = false; p.push = false; });
    checkChanges();
    App.render();
  };

  App._notifSave = function() {
    App.store.notifications = JSON.parse(JSON.stringify(categories));
    originalJson = JSON.stringify(categories);
    hasChanges = false;
    var bar = document.getElementById('notif-save-bar');
    if (bar) bar.style.display = 'none';
    App.showToast({ title: 'Settings saved', description: 'Your notification preferences have been updated.' });
  };

  App._notifReset = function() {
    categories = JSON.parse(originalJson);
    hasChanges = false;
    App.render();
  };

  App.pages['/account/notifications'] = {
    layout: 'dashboard',

    render: function() {
      var cats = getCategories();
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Notifications</span>';
      html += '</div>';

      // Header
      html += '<div class="flex items-center gap-3 mb-6">';
      html += '<div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">' + icon('bell', 20) + '</div>';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Notification Settings</h1>';
      html += '<p class="text-sm text-muted-foreground">Choose how and when you want to be notified</p>';
      html += '</div>';
      html += '</div>';

      // Legend
      html += '<div class="flex items-center gap-6 mb-4 text-xs text-muted-foreground">';
      html += '<span class="flex items-center gap-1">' + icon('mail', 12) + ' Email</span>';
      html += '<span class="flex items-center gap-1">' + icon('smartphone', 12) + ' Push</span>';
      html += '</div>';

      // Categories
      html += '<div class="space-y-6" style="max-width:48rem">';
      cats.forEach(function(cat) {
        var colorClass = colorMap[cat.id] || 'primary';
        html += '<div class="fusion-card overflow-hidden">';

        // Category header
        html += '<div class="flex items-center gap-3 p-4" style="border-bottom:1px solid hsl(var(--border))">';
        html += '<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:hsl(var(--' + colorClass + ') / 0.1);color:hsl(var(--' + colorClass + '))">' + icon(iconMap[cat.id] || 'bell', 16) + '</div>';
        html += '<span class="text-sm font-semibold flex-1">' + escapeHtml(cat.label) + '</span>';
        html += '<button class="btn btn-ghost btn-sm text-xs" onclick="FusionApp._notifEnableAll(\'' + cat.id + '\')">Enable all</button>';
        html += '<button class="btn btn-ghost btn-sm text-xs" onclick="FusionApp._notifDisableAll(\'' + cat.id + '\')">Disable all</button>';
        html += '</div>';

        // Preferences
        html += '<div class="divide-y">';
        cat.preferences.forEach(function(pref) {
          html += '<div class="flex items-center gap-4 px-4 py-3">';
          // Label + description
          html += '<div class="flex-1 min-w-0">';
          html += '<div class="text-sm font-medium">' + escapeHtml(pref.label) + '</div>';
          html += '<div class="text-xs text-muted-foreground">' + escapeHtml(pref.description) + '</div>';
          html += '</div>';
          // Email toggle
          html += '<div class="flex items-center gap-1">';
          html += '<span class="text-muted-foreground">' + icon('mail', 12) + '</span>';
          html += App.renderToggleSwitch('toggle-' + pref.id + '-email', pref.email, 'FusionApp._notifToggle(\\\'' + cat.id + '\\\',\\\'' + pref.id + '\\\',\\\'email\\\')');
          html += '</div>';
          // Push toggle
          html += '<div class="flex items-center gap-1">';
          html += '<span class="text-muted-foreground">' + icon('smartphone', 12) + '</span>';
          html += App.renderToggleSwitch('toggle-' + pref.id + '-push', pref.push, 'FusionApp._notifToggle(\\\'' + cat.id + '\\\',\\\'' + pref.id + '\\\',\\\'push\\\')');
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      // Sticky save bar
      html += '<div id="notif-save-bar" class="flex items-center justify-between p-4 mt-6 fusion-card" style="display:' + (hasChanges ? 'flex' : 'none') + ';position:sticky;bottom:1rem;max-width:48rem">';
      html += '<span class="text-sm text-muted-foreground">You have unsaved changes</span>';
      html += '<div class="flex gap-2">';
      html += '<button class="btn btn-ghost" onclick="FusionApp._notifReset()">Reset</button>';
      html += '<button class="btn btn-primary" onclick="FusionApp._notifSave()">' + icon('save', 16) + ' Save Changes</button>';
      html += '</div>';
      html += '</div>';

      return html;
    },

    init: function() {
      categories = null;
      hasChanges = false;
      originalJson = '';
    }
  };
})();
