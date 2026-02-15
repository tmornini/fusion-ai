// Fusion AI — Account Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  function getUsageColor(current, limit) {
    var pct = (current / limit) * 100;
    if (pct >= 90) return 'error';
    if (pct >= 70) return 'warning';
    return 'primary';
  }

  App.pages['/account'] = {
    layout: 'dashboard',

    render: function() {
      var store = App.store;
      var company = store.company;
      var usage = company.usage || {};
      var html = '';

      // Header
      html += '<div style="max-width:64rem;margin:0 auto">';
      html += '<div class="mb-6">';
      html += '<h1 class="text-2xl font-display font-bold mb-1">Account Overview</h1>';
      html += '<p class="text-sm text-muted-foreground">Manage your organization, users, and billing settings</p>';
      html += '</div>';

      // Quick Actions (3 cards)
      html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">';

      // My Profile
      html += '<button class="fusion-card flex items-center gap-3 text-left w-full" style="padding:0.875rem;cursor:pointer" onclick="FusionApp.navigate(\'/account/profile\')">';
      html += '<div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--primary) / 0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));flex-shrink:0">' + icon('user', 20) + '</div>';
      html += '<div><p class="font-medium text-sm">My Profile</p><p class="text-xs text-muted-foreground">Personal settings</p></div>';
      html += '</button>';

      // Company Settings
      html += '<button class="fusion-card flex items-center gap-3 text-left w-full" style="padding:0.875rem;cursor:pointer" onclick="FusionApp.navigate(\'/account/company\')">';
      html += '<div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(270 60% 95%);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:hsl(270 60% 50%)">' + icon('settings', 20) + '</span></div>';
      html += '<div><p class="font-medium text-sm">Company Settings</p><p class="text-xs text-muted-foreground">Organization config</p></div>';
      html += '</button>';

      // Billing
      html += '<button class="fusion-card flex items-center gap-3 text-left w-full" style="padding:0.875rem;cursor:pointer" onclick="FusionApp.showToast({title:\'Coming soon\',description:\'Billing page is not yet available.\'})">';
      html += '<div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(142 60% 95%);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:hsl(142 60% 40%)">' + icon('creditCard', 20) + '</span></div>';
      html += '<div><p class="font-medium text-sm">Billing</p><p class="text-xs text-muted-foreground">Plans & invoices</p></div>';
      html += '</button>';

      html += '</div>';

      // Company Overview Card
      html += '<div class="fusion-card p-4 mb-4">';
      html += '<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">';

      // Company name + badges
      html += '<div class="flex items-center gap-4">';
      html += '<div style="width:3.5rem;height:3.5rem;border-radius:0.75rem;background:linear-gradient(135deg,hsl(var(--primary) / 0.2),hsl(var(--primary) / 0.05));display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));flex-shrink:0">' + icon('building', 28) + '</div>';
      html += '<div>';
      html += '<h2 class="text-xl font-display font-semibold">' + escapeHtml(company.name) + '</h2>';
      html += '<div class="flex items-center gap-2 mt-1" style="flex-wrap:wrap">';
      html += '<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.125rem 0.5rem;border-radius:9999px;background:hsl(var(--primary) / 0.1);color:hsl(var(--primary));font-size:0.75rem;font-weight:500">' + icon('crown', 12) + ' ' + escapeHtml(company.plan) + ' Plan</span>';
      html += '<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.125rem 0.5rem;border-radius:9999px;background:hsl(142 60% 95%);color:hsl(142 60% 35%);font-size:0.75rem;font-weight:500;border:1px solid hsl(142 60% 85%)">' + icon('checkCircle2', 12) + ' Active</span>';
      html += '</div></div></div>';

      // Health score badge
      var healthScore = company.healthScore || 92;
      html += '<div style="padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid hsl(142 60% 85%);background:hsl(142 60% 95%);color:hsl(142 60% 35%)">';
      html += '<div class="flex items-center gap-1.5"><span>' + icon('activity', 16) + '</span><span class="text-sm font-medium">Excellent</span></div>';
      html += '<p class="text-xs mt-0.5">Health Score: ' + healthScore + '%</p>';
      html += '</div>';

      html += '</div>';

      // Stats grid (4 columns)
      html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';

      var statsItems = [
        { iconName: 'users', label: 'Active Users', value: (company.activeUsers || 18) + '<span class="text-sm font-normal text-muted-foreground">/' + (company.maxUsers || 25) + '</span>' },
        { iconName: 'folderKanban', label: 'Projects', value: '' + (usage.projects ? usage.projects.current : store.projects.length) },
        { iconName: 'lightbulb', label: 'Ideas', value: '' + (usage.ideas ? usage.ideas.current : store.ideas.length) },
        { iconName: 'calendarDays', label: 'Next Billing', value: formatBillingDate(company.nextBilling) },
      ];

      statsItems.forEach(function(stat) {
        html += '<div style="padding:0.875rem;border-radius:0.5rem;background:hsl(var(--muted) / 0.3)">';
        html += '<div class="flex items-center gap-1.5 text-muted-foreground mb-1"><span>' + icon(stat.iconName, 14) + '</span><span class="text-xs">' + stat.label + '</span></div>';
        html += '<p class="text-xl font-bold">' + stat.value + '</p>';
        html += '</div>';
      });

      html += '</div></div>';

      // Usage & Activity Grid (2 columns)
      html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">';

      // Usage Overview
      html += '<div class="fusion-card p-4">';
      html += '<h3 class="font-display font-semibold text-sm mb-4 flex items-center gap-2"><span class="text-primary">' + icon('trendingUp', 18) + '</span> Usage Overview</h3>';
      html += '<div class="space-y-3">';

      var usageItems = [
        { label: 'User Seats', current: company.activeUsers || 18, limit: company.maxUsers || 25 },
        { label: 'Projects', current: usage.projects ? usage.projects.current : 12, limit: usage.projects ? usage.projects.limit : 50 },
        { label: 'Ideas', current: usage.ideas ? usage.ideas.current : 47, limit: usage.ideas ? usage.ideas.limit : 200 },
        { label: 'AI Credits', current: usage.aiCredits ? usage.aiCredits.current : 850, limit: usage.aiCredits ? usage.aiCredits.limit : 1000 },
        { label: 'Storage (GB)', current: usage.storage ? usage.storage.current : 2.4, limit: usage.storage ? usage.storage.limit : 10 },
      ];

      usageItems.forEach(function(item) {
        var pct = Math.min(100, Math.round((item.current / item.limit) * 100));
        var color = getUsageColor(item.current, item.limit);
        html += '<div>';
        html += '<div class="flex items-center justify-between text-xs mb-1">';
        html += '<span class="text-muted-foreground">' + item.label + '</span>';
        html += '<span class="font-medium">' + item.current + ' / ' + item.limit + '</span>';
        html += '</div>';
        html += '<div class="progress" style="height:0.375rem"><div class="progress-bar" style="width:' + pct + '%;background:hsl(var(--' + color + '))"></div></div>';
        html += '</div>';
      });

      html += '</div></div>';

      // Recent Activity
      html += '<div class="fusion-card p-4">';
      html += '<h3 class="font-display font-semibold text-sm mb-4 flex items-center gap-2"><span class="text-primary">' + icon('activity', 18) + '</span> Recent Activity</h3>';
      html += '<div class="space-y-3">';

      var recentActivity = [
        { type: 'user_added', description: 'Sarah Chen joined the team', time: '2 hours ago' },
        { type: 'project_created', description: 'New project "Q1 Analytics Dashboard" created', time: '5 hours ago' },
        { type: 'billing', description: 'Invoice #2024-089 paid successfully', time: '2 days ago' },
      ];

      recentActivity.forEach(function(act) {
        var actIcon, actBg;
        if (act.type === 'user_added') { actIcon = 'userPlus'; actBg = 'hsl(210 80% 95%)'; }
        else if (act.type === 'project_created') { actIcon = 'folderKanban'; actBg = 'hsl(270 60% 95%)'; }
        else { actIcon = 'creditCard'; actBg = 'hsl(142 60% 95%)'; }

        var actColor;
        if (act.type === 'user_added') actColor = 'hsl(210 80% 45%)';
        else if (act.type === 'project_created') actColor = 'hsl(270 60% 50%)';
        else actColor = 'hsl(142 60% 40%)';

        html += '<div class="flex items-start gap-3">';
        html += '<div style="width:2rem;height:2rem;border-radius:0.5rem;background:' + actBg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="color:' + actColor + '">' + icon(actIcon, 16) + '</span></div>';
        html += '<div style="flex:1;min-width:0"><p class="text-sm">' + escapeHtml(act.description) + '</p>';
        html += '<p class="text-xs text-muted-foreground">' + act.time + '</p></div>';
        html += '</div>';
      });

      html += '</div>';
      html += '<button class="btn btn-ghost btn-sm w-full mt-4" onclick="FusionApp.navigate(\'/account/activity\')">View All Activity</button>';
      html += '</div>';

      html += '</div>';

      // Security & Administration
      html += '<div class="fusion-card p-4">';
      html += '<h3 class="font-display font-semibold text-sm mb-3">Security & Administration</h3>';
      html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';

      var adminLinks = [
        { iconName: 'users', label: 'Manage Users', desc: 'Add, edit, or remove team members', href: '/account/users' },
        { iconName: 'bell', label: 'Notifications', desc: 'Email & push preferences', href: '/account/notifications' },
        { iconName: 'creditCard', label: 'Billing History', desc: 'View invoices and payments', href: '' },
      ];

      adminLinks.forEach(function(link) {
        var onclick = link.href ? 'FusionApp.navigate(\'' + link.href + '\')' : 'FusionApp.showToast({title:"Coming soon",description:"Billing history is not yet available."})';
        html += '<button class="flex items-center gap-3 text-left w-full" style="padding:0.875rem;border-radius:0.5rem;border:1px solid hsl(var(--border));background:none;cursor:pointer;transition:border-color 0.15s,background 0.15s" onmouseenter="this.style.borderColor=\'hsl(var(--primary) / 0.5)\';this.style.background=\'hsl(var(--muted) / 0.3)\'" onmouseleave="this.style.borderColor=\'hsl(var(--border))\';this.style.background=\'\'" onclick="' + onclick + '">';
        html += '<span class="text-muted-foreground flex-shrink-0">' + icon(link.iconName, 20) + '</span>';
        html += '<div style="flex:1;min-width:0"><p class="font-medium text-sm">' + link.label + '</p>';
        html += '<p class="text-xs text-muted-foreground" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + link.desc + '</p></div>';
        html += '<span class="text-muted-foreground flex-shrink-0">' + icon('externalLink', 16) + '</span>';
        html += '</button>';
      });

      html += '</div></div>';

      html += '</div>'; // max-width container

      return html;
    }
  };

  function formatBillingDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      var d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch(e) { return dateStr; }
  }
})();
