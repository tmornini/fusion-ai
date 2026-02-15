// Fusion AI — Team Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var searchQuery = '';
  var selectedMemberId = null;
  var detailTab = 'dimensions';

  function getInitials(name) {
    return name.split(' ').map(function(w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);
  }

  function getStatusColor(status) {
    if (status === 'active' || status === 'available') return 'hsl(var(--success))';
    if (status === 'busy' || status === 'limited') return 'hsl(var(--warning))';
    return 'hsl(var(--muted-foreground))';
  }

  function getFilteredMembers() {
    var q = searchQuery.toLowerCase();
    if (!q) return App.store.team;
    return App.store.team.filter(function(m) {
      return m.name.toLowerCase().indexOf(q) !== -1 ||
        m.role.toLowerCase().indexOf(q) !== -1 ||
        m.department.toLowerCase().indexOf(q) !== -1;
    });
  }

  function getSelectedMember() {
    if (!selectedMemberId) return null;
    return App.store.team.find(function(m) { return m.id === selectedMemberId; }) || null;
  }

  // --- Event handlers ---
  App._teamSearch = function(val) {
    searchQuery = val;
    var listEl = document.getElementById('team-list');
    if (listEl) listEl.innerHTML = renderMemberList();
  };

  App._teamSelect = function(id) {
    selectedMemberId = id;
    detailTab = 'dimensions';
    if (App.isMobile()) {
      App.showModal({ content: renderDetailPanel(getSelectedMember()), maxWidth: '28rem' });
    } else {
      var panel = document.getElementById('team-detail');
      if (panel) panel.innerHTML = renderDetailContent(getSelectedMember());
    }
  };

  App._teamDetailTab = function(tab) {
    detailTab = tab;
    var member = getSelectedMember();
    if (!member) return;
    if (App.isMobile()) {
      var modal = document.querySelector('#modal-overlay .fusion-card');
      if (modal) modal.innerHTML = renderDetailPanel(member);
    } else {
      var panel = document.getElementById('team-detail');
      if (panel) panel.innerHTML = renderDetailContent(member);
    }
  };

  App._teamOpenInvite = function() {
    App.showInviteModal({ title: 'Add Team Member' });
  };

  // --- Render helpers ---
  function renderMemberCard(member) {
    var initials = getInitials(member.name);
    var statusColor = getStatusColor(member.status);
    var availability = member.availability || 0;
    var isSelected = member.id === selectedMemberId;

    var html = '<div class="fusion-card p-4 cursor-pointer transition-all hover:shadow-md' + (isSelected ? ' ring-2 ring-primary' : '') + '" onclick="FusionApp._teamSelect(\'' + member.id + '\')">';
    html += '<div class="flex items-start gap-3">';

    // Avatar with status dot
    html += '<div style="position:relative;flex-shrink:0">';
    html += '<div style="width:2.75rem;height:2.75rem;border-radius:9999px;background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:600;font-size:0.8rem">' + escapeHtml(initials) + '</div>';
    html += '<div style="position:absolute;bottom:0;right:0;width:0.75rem;height:0.75rem;border-radius:9999px;border:2px solid hsl(var(--card));background:' + statusColor + '"></div>';
    html += '</div>';

    html += '<div class="flex-1 min-w-0">';
    // Name + availability
    html += '<div class="flex items-center gap-2">';
    html += '<h3 class="text-sm font-semibold truncate">' + escapeHtml(member.name) + '</h3>';
    html += '<span class="badge badge-' + (availability >= 70 ? 'success' : availability >= 40 ? 'warning' : 'error') + '" style="font-size:0.625rem">' + availability + '%</span>';
    html += '</div>';

    // Role + department
    html += '<p class="text-xs text-muted-foreground mt-0.5">' + escapeHtml(member.role) + ' &middot; ' + escapeHtml(member.department) + '</p>';

    // Strengths
    if (member.strengths && member.strengths.length) {
      html += '<div class="flex flex-wrap gap-1 mt-2">';
      member.strengths.slice(0, 3).forEach(function(s) {
        html += '<span class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">' + icon('star', 10) + ' ' + escapeHtml(s) + '</span>';
      });
      html += '</div>';
    }

    // Stats row
    html += '<div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">';
    html += '<span class="flex items-center gap-1">' + icon('trendingUp', 12) + ' ' + (member.performanceScore || 0) + '%</span>';
    html += '<span class="flex items-center gap-1">' + icon('briefcase', 12) + ' ' + (member.currentProjects || 0) + ' active</span>';
    html += '<span class="flex items-center gap-1">' + icon('checkCircle2', 12) + ' ' + (member.projectsCompleted || 0) + ' done</span>';
    html += '</div>';

    html += '</div>';
    html += icon('chevronRight', 16);
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderMemberList() {
    var members = getFilteredMembers();
    if (!members.length) {
      return '<div class="text-center text-muted-foreground py-8 text-sm">No members found</div>';
    }
    var html = '<div class="space-y-3">';
    members.forEach(function(m) { html += renderMemberCard(m); });
    html += '</div>';
    return html;
  }

  function renderDISCBar(label, iconName, value) {
    return '<div class="flex items-center gap-3 mb-3">' +
      '<div class="flex items-center gap-2 w-28 text-sm">' + icon(iconName, 16) + ' <span>' + escapeHtml(label) + '</span></div>' +
      '<div class="flex-1">' + App.renderProgress(value, 100) + '</div>' +
      '<span class="text-sm font-medium w-10 text-right">' + value + '%</span>' +
    '</div>';
  }

  function renderDetailContent(member) {
    if (!member) {
      return '<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">' +
        '<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">' + icon('users', 32) + '</div>' +
        '<p class="text-sm">Select a team member to view details</p>' +
      '</div>';
    }

    var initials = getInitials(member.name);
    var html = '';

    // Avatar + info
    html += '<div class="text-center mb-6">';
    html += '<div style="width:4rem;height:4rem;border-radius:9999px;background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:700;font-size:1.25rem;margin:0 auto 0.75rem">' + escapeHtml(initials) + '</div>';
    html += '<h3 class="text-lg font-semibold">' + escapeHtml(member.name) + '</h3>';
    html += '<p class="text-sm text-muted-foreground">' + escapeHtml(member.role) + '</p>';
    html += '<p class="text-xs text-muted-foreground mt-1">' + icon('mail', 12) + ' ' + escapeHtml(member.email) + '</p>';
    html += '</div>';

    // Tabs
    html += App.renderTabs([
      { value: 'dimensions', label: 'Dimensions' },
      { value: 'performance', label: 'Performance' }
    ], detailTab, 'FusionApp._teamDetailTab');

    html += '<div class="mt-4">';
    if (detailTab === 'dimensions') {
      var dims = member.teamDimensions || {};
      html += renderDISCBar('Driver', 'target', dims.driver || 0);
      html += renderDISCBar('Analytical', 'brain', dims.analytical || 0);
      html += renderDISCBar('Expressive', 'zap', dims.expressive || 0);
      html += renderDISCBar('Amiable', 'heart', dims.amiable || 0);
    } else {
      // Performance tab
      html += '<div class="space-y-4">';
      html += '<div class="fusion-card p-4 text-center">';
      html += '<div class="text-3xl font-bold text-primary">' + (member.performanceScore || 0) + '%</div>';
      html += '<div class="text-sm text-muted-foreground">Performance Score</div>';
      html += '</div>';

      html += '<div class="grid grid-cols-2 gap-3">';
      html += '<div class="fusion-card p-3 text-center"><div class="text-xl font-semibold">' + (member.projectsCompleted || 0) + '</div><div class="text-xs text-muted-foreground">Completed</div></div>';
      html += '<div class="fusion-card p-3 text-center"><div class="text-xl font-semibold">' + (member.currentProjects || 0) + '</div><div class="text-xs text-muted-foreground">Active</div></div>';
      html += '</div>';

      if (member.recentAchievements && member.recentAchievements.length) {
        html += '<div>';
        html += '<h4 class="text-sm font-semibold mb-2">Recent Achievements</h4>';
        html += '<ul class="space-y-2">';
        member.recentAchievements.forEach(function(a) {
          html += '<li class="flex items-start gap-2 text-sm"><span class="text-primary mt-0.5">' + icon('award', 14) + '</span> ' + escapeHtml(a) + '</li>';
        });
        html += '</ul>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderDetailPanel(member) {
    return renderDetailContent(member);
  }

  // --- Page ---
  App.pages['/team'] = {
    layout: 'dashboard',

    render: function() {
      var store = App.store;
      var mobile = App.isMobile();
      var activeCount = store.team.filter(function(m) { return m.status !== 'inactive'; }).length;
      var html = '';

      // Header
      html += '<div class="flex items-center justify-between mb-6">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">Team <span class="text-muted-foreground text-lg font-normal">(' + activeCount + ')</span></h1>';
      html += '<p class="text-sm text-muted-foreground mt-1">Manage roles, strengths, and availability</p>';
      html += '</div>';
      html += '<button class="btn btn-primary" onclick="FusionApp._teamOpenInvite()">' + icon('plus', 18) + ' <span>Add Member</span></button>';
      html += '</div>';

      // Search
      html += '<div class="mb-4">';
      html += '<div class="search-input-wrapper">';
      html += icon('search', 16);
      html += '<input class="input" id="team-search" type="text" placeholder="Search by name, role, or department..." value="' + escapeHtml(searchQuery) + '" oninput="FusionApp._teamSearch(this.value)" />';
      html += '</div>';
      html += '</div>';

      if (mobile) {
        // Mobile: single column list only
        html += '<div id="team-list">';
        html += renderMemberList();
        html += '</div>';
      } else {
        // Desktop: 2/3 list + 1/3 detail
        html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">';
        html += '<div class="lg:col-span-2" id="team-list">';
        html += renderMemberList();
        html += '</div>';
        html += '<div class="lg:col-span-1"><div class="fusion-card p-5 lg:sticky" style="top:5rem" id="team-detail">';
        html += renderDetailContent(getSelectedMember());
        html += '</div></div>';
        html += '</div>';
      }

      return html;
    },

    init: function() {
      searchQuery = '';
      selectedMemberId = null;
      detailTab = 'dimensions';
    }
  };
})();
