// Fusion AI — Router, Dashboard Layout, Theme, Mobile Detection
(function() {
  var App = window.FusionApp;
  var icon = App.icon;

  // ==========================================
  // PAGES REGISTRY
  // ==========================================
  App.pages = App.pages || {};

  // ==========================================
  // THEME
  // ==========================================
  var themeKey = 'fusion-theme';

  function getStoredTheme() {
    try { return localStorage.getItem(themeKey) || 'light'; } catch(e) { return 'light'; }
  }

  function setTheme(mode) {
    try { localStorage.setItem(themeKey, mode); } catch(e) {}
    applyTheme(mode);
  }

  function applyTheme(mode) {
    var html = document.documentElement;
    if (mode === 'system') {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.toggle('dark', prefersDark);
    } else {
      html.classList.toggle('dark', mode === 'dark');
    }
    App.currentTheme = mode;
  }

  App.setTheme = setTheme;
  App.getTheme = getStoredTheme;
  App.cycleTheme = function() {
    var current = getStoredTheme();
    var next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
    setTheme(next);
    // Re-render theme button
    var btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      var iconName = next === 'dark' ? 'moon' : next === 'light' ? 'sun' : 'monitor';
      btn.innerHTML = icon(iconName, 20);
    }
  };

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (getStoredTheme() === 'system') applyTheme('system');
  });

  // Apply theme immediately
  applyTheme(getStoredTheme());

  // ==========================================
  // MOBILE DETECTION
  // ==========================================
  var MOBILE_BP = 768;
  App.isMobile = function() {
    return window.innerWidth < MOBILE_BP;
  };

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  var mockNotifications = [
    { id: 1, title: 'New idea submitted', message: 'Marketing team submitted "AI Chatbot Integration"', time: '5 min ago', unread: true },
    { id: 2, title: 'Project approved', message: 'Your project "Mobile App Redesign" was approved', time: '1 hour ago', unread: true },
    { id: 3, title: 'Comment on idea', message: 'John commented on "Customer Portal"', time: '2 hours ago', unread: false },
    { id: 4, title: 'Review requested', message: 'Sarah requested your review on "API Gateway"', time: '1 day ago', unread: false },
  ];

  // ==========================================
  // DASHBOARD LAYOUT
  // ==========================================
  var sidebarCollapsed = false;
  var sidebarSections = ['Journey', 'Tools', 'Settings'];

  var navSections = [
    { label: 'Journey', items: [
      { label: 'Home', icon: 'home', href: '/dashboard' },
      { label: 'Ideas', icon: 'lightbulb', href: '/ideas' },
      { label: 'Projects', icon: 'folderKanban', href: '/projects' },
      { label: 'Teams', icon: 'users', href: '/teams' },
    ]},
    { label: 'Tools', items: [
      { label: 'Edge', icon: 'target', href: '/edge' },
      { label: 'Crunch', icon: 'database', href: '/crunch' },
      { label: 'Flow', icon: 'gitBranch', href: '/flow' },
    ]},
    { label: 'Settings', items: [
      { label: 'Account', icon: 'user', href: '/account' },
      { label: 'Design System', icon: 'palette', href: '/design-system' },
    ]},
  ];

  function isNavActive(href, currentPath) {
    if (href === '/account') return currentPath.indexOf('/account') === 0;
    if (href === '/ideas') return currentPath.indexOf('/ideas') === 0 || currentPath.indexOf('/review') === 0;
    if (href === '/projects') return currentPath.indexOf('/projects') === 0 || currentPath.indexOf('/engineering') === 0;
    if (href === '/teams') return currentPath === '/teams' || currentPath === '/team';
    return currentPath === href;
  }

  App.renderDashboardLayout = function(contentHtml) {
    var currentPath = App.getCurrentPath();
    var mobile = App.isMobile();
    var themeIcon = getStoredTheme() === 'dark' ? 'moon' : getStoredTheme() === 'light' ? 'sun' : 'monitor';
    var unreadCount = mockNotifications.filter(function(n) { return n.unread; }).length;

    var html = '<div class="dashboard-layout">';

    // Desktop Sidebar
    if (!mobile) {
      html += '<aside class="sidebar' + (sidebarCollapsed ? ' collapsed' : '') + '" id="sidebar">';

      // Logo
      html += '<div class="sidebar-logo">';
      html += '<div class="flex items-center gap-3">';
      html += '<div class="sidebar-logo-icon">' + icon('sparkles', 20) + '</div>';
      if (!sidebarCollapsed) html += '<span class="text-xl font-display font-bold text-foreground">Fusion AI</span>';
      html += '</div>';
      if (!sidebarCollapsed) {
        html += '<button class="btn btn-ghost btn-icon-sm" onclick="FusionApp.toggleSidebar()">' + icon('panelLeftClose', 16) + '</button>';
      }
      html += '</div>';

      // Expand button when collapsed
      if (sidebarCollapsed) {
        html += '<div class="flex justify-center py-2 border-b">';
        html += '<button class="btn btn-ghost btn-icon-sm" onclick="FusionApp.toggleSidebar()">' + icon('panelLeft', 16) + '</button>';
        html += '</div>';
      }

      // Nav
      html += '<nav class="sidebar-nav">';
      navSections.forEach(function(section) {
        html += '<div class="sidebar-section">';
        if (!sidebarCollapsed) {
          var expanded = sidebarSections.indexOf(section.label) >= 0;
          html += '<button class="sidebar-section-label" onclick="FusionApp.toggleSidebarSection(\'' + section.label + '\')">';
          html += section.label;
          html += '<span style="transition:transform 0.2s;' + (expanded ? '' : 'transform:rotate(-90deg)') + '">' + icon('chevronDown', 12) + '</span>';
          html += '</button>';
        }
        var show = sidebarCollapsed || sidebarSections.indexOf(section.label) >= 0;
        if (show) {
          html += '<div class="space-y-1' + (sidebarCollapsed ? '' : ' mt-1') + '">';
          section.items.forEach(function(item) {
            var active = isNavActive(item.href, currentPath);
            html += '<button class="sidebar-nav-item' + (active ? ' active' : '') + '"' +
              (sidebarCollapsed ? ' style="justify-content:center;padding:0.625rem 0.5rem"' : '') +
              ' onclick="FusionApp.navigate(\'' + item.href + '\')">' +
              icon(item.icon, 20) +
              (sidebarCollapsed ? '' : ' ' + item.label) +
            '</button>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</nav>';

      // Footer
      html += '<div class="sidebar-footer">';
      if (!sidebarCollapsed) {
        html += '<div class="sidebar-user">';
        html += '<div class="sidebar-avatar">' + icon('user', 20) + '</div>';
        html += '<div class="flex-1 min-w-0">';
        html += '<p class="text-sm font-medium text-foreground truncate">' + App.escapeHtml(App.store.user.name) + '</p>';
        html += '<p class="text-xs text-muted-foreground truncate">' + App.escapeHtml(App.store.company.name) + '</p>';
        html += '</div></div>';
        html += '<button class="btn btn-ghost btn-sm w-full" style="justify-content:flex-start" onclick="FusionApp.navigate(\'/\')">' +
          icon('logOut', 16) + '<span class="ml-2">Sign out</span></button>';
      } else {
        html += '<button class="btn btn-ghost btn-icon w-full" onclick="FusionApp.navigate(\'/\')">' + icon('logOut', 16) + '</button>';
      }
      html += '</div>';

      html += '</aside>';
    }

    // Mobile Header
    if (mobile) {
      html += '<div class="mobile-header">';
      html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp.openMobileSidebar()">' + icon('menu', 20) + '</button>';
      html += '<span class="text-lg font-display font-bold text-foreground">Fusion AI</span>';
      html += '<div class="flex items-center gap-1">';
      html += '<button class="btn btn-ghost btn-icon" id="theme-toggle-btn" onclick="FusionApp.cycleTheme()">' + icon(themeIcon, 20) + '</button>';
      html += '<button class="btn btn-ghost btn-icon relative" onclick="FusionApp.toggleDropdown(\'notif-dropdown\', event)">' +
        icon('bell', 20) +
        (unreadCount > 0 ? '<span class="notification-badge">' + unreadCount + '</span>' : '') +
      '</button>';
      html += '</div>';
      html += '</div>';

      // Notification dropdown (mobile)
      html += '<div class="dropdown-content hidden" id="notif-dropdown" style="position:fixed;top:3.5rem;right:0.5rem;width:18rem;z-index:100">';
      html += renderNotificationDropdownContent();
      html += '</div>';
    }

    // Mobile sidebar sheet placeholder
    html += '<div id="mobile-sidebar-sheet"></div>';

    // Main content
    html += '<div class="dashboard-main' + (sidebarCollapsed && !mobile ? ' sidebar-collapsed' : '') + '"' +
      (mobile ? ' style="margin-left:0;padding-top:3.5rem"' : '') + '>';

    // Desktop Header
    if (!mobile) {
      html += '<header class="dashboard-header">';
      html += '<div class="search-input-wrapper">';
      html += icon('search', 16);
      html += '<input class="input" placeholder="Search ideas, projects, teams..." />';
      html += '</div>';
      html += '<div class="flex items-center gap-2">';
      html += '<button class="btn btn-ghost btn-icon" id="theme-toggle-btn" onclick="FusionApp.cycleTheme()">' + icon(themeIcon, 20) + '</button>';
      html += '<div class="relative">';
      html += '<button class="btn btn-ghost btn-icon relative" onclick="FusionApp.toggleDropdown(\'notif-dropdown\', event)">' +
        icon('bell', 20) +
        (unreadCount > 0 ? '<span class="notification-badge">' + unreadCount + '</span>' : '') +
      '</button>';
      html += '<div class="dropdown-content hidden" id="notif-dropdown" style="right:0;top:100%;width:20rem;margin-top:0.25rem">';
      html += renderNotificationDropdownContent();
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</header>';
    }

    // Page content
    html += '<main class="dashboard-content"' + (mobile ? ' style="padding:1rem"' : '') + '>';
    html += contentHtml;
    html += '</main>';

    html += '</div>'; // dashboard-main
    html += '</div>'; // dashboard-layout

    return html;
  };

  function renderNotificationDropdownContent() {
    var unreadCount = mockNotifications.filter(function(n) { return n.unread; }).length;
    var html = '<div class="dropdown-label flex items-center justify-between">';
    html += '<span>Notifications</span>';
    if (unreadCount > 0) html += '<span class="badge badge-secondary">' + unreadCount + ' new</span>';
    html += '</div>';
    html += '<div class="dropdown-separator"></div>';
    html += '<div style="max-height:20rem;overflow-y:auto">';
    mockNotifications.forEach(function(n) {
      html += '<div class="dropdown-item" style="flex-direction:column;align-items:flex-start;gap:0.25rem;padding:0.75rem">';
      html += '<div class="flex items-start gap-2 w-full">';
      if (n.unread) html += '<span style="width:0.5rem;height:0.5rem;border-radius:9999px;background:hsl(var(--primary));margin-top:0.375rem;flex-shrink:0"></span>';
      html += '<div class="flex-1' + (n.unread ? '' : ' ml-4') + '">';
      html += '<p class="text-sm' + (n.unread ? ' font-medium' : ' text-muted-foreground') + '">' + App.escapeHtml(n.title) + '</p>';
      html += '<p class="text-xs text-muted-foreground">' + App.escapeHtml(n.message) + '</p>';
      html += '<p class="text-xs text-muted-foreground mt-1">' + n.time + '</p>';
      html += '</div></div></div>';
    });
    html += '</div>';
    html += '<div class="dropdown-separator"></div>';
    html += '<button class="dropdown-item justify-center text-primary" onclick="FusionApp.navigate(\'/account/notifications\')">View all notifications</button>';
    return html;
  }

  App.toggleSidebar = function() {
    sidebarCollapsed = !sidebarCollapsed;
    App.render();
  };

  App.toggleSidebarSection = function(label) {
    var idx = sidebarSections.indexOf(label);
    if (idx >= 0) sidebarSections.splice(idx, 1);
    else sidebarSections.push(label);
    App.render();
  };

  App.openMobileSidebar = function() {
    var sheet = document.getElementById('mobile-sidebar-sheet');
    if (!sheet) return;
    var currentPath = App.getCurrentPath();

    var html = '<div class="sheet-overlay" id="mobile-sheet-overlay" onclick="FusionApp.closeMobileSidebar()">';
    html += '<div class="sheet-content sheet-content-left" onclick="event.stopPropagation()">';

    // Mobile logo
    html += '<div class="flex items-center gap-3 p-4 border-b">';
    html += '<div class="sidebar-logo-icon">' + icon('sparkles', 20) + '</div>';
    html += '<span class="text-xl font-display font-bold text-foreground">Fusion AI</span>';
    html += '</div>';

    // Nav
    html += '<nav class="sidebar-nav">';
    navSections.forEach(function(section) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-label">' + section.label + '</div>';
      html += '<div class="space-y-1 mt-1">';
      section.items.forEach(function(item) {
        var active = isNavActive(item.href, currentPath);
        html += '<button class="sidebar-nav-item' + (active ? ' active' : '') + '" onclick="FusionApp.closeMobileSidebar();FusionApp.navigate(\'' + item.href + '\')">' +
          icon(item.icon, 20) + ' ' + item.label +
        '</button>';
      });
      html += '</div></div>';
    });
    html += '</nav>';

    // Footer
    html += '<div class="sidebar-footer">';
    html += '<div class="sidebar-user">';
    html += '<div class="sidebar-avatar">' + icon('user', 20) + '</div>';
    html += '<div class="flex-1 min-w-0">';
    html += '<p class="text-sm font-medium text-foreground truncate">' + App.escapeHtml(App.store.user.name) + '</p>';
    html += '<p class="text-xs text-muted-foreground truncate">' + App.escapeHtml(App.store.company.name) + '</p>';
    html += '</div></div>';
    html += '<button class="btn btn-ghost btn-sm w-full" style="justify-content:flex-start" onclick="FusionApp.closeMobileSidebar();FusionApp.navigate(\'/\')">' +
      icon('logOut', 16) + '<span class="ml-2">Sign out</span></button>';
    html += '</div>';

    html += '</div>'; // sheet-content
    html += '</div>'; // overlay

    sheet.innerHTML = html;
  };

  App.closeMobileSidebar = function() {
    var sheet = document.getElementById('mobile-sidebar-sheet');
    if (sheet) sheet.innerHTML = '';
  };

  // ==========================================
  // ROUTER
  // ==========================================
  var currentCleanup = null;

  App.getCurrentPath = function() {
    var hash = window.location.hash.replace(/^#/, '') || '/';
    return hash;
  };

  App.navigate = function(path) {
    window.location.hash = '#' + path;
  };

  // Route patterns
  var routeTable = [
    { pattern: '/', page: '/' },
    { pattern: '/auth', page: '/auth' },
    { pattern: '/onboarding', page: '/onboarding' },
    { pattern: '/dashboard', page: '/dashboard' },
    { pattern: '/ideas', page: '/ideas' },
    { pattern: '/ideas/new', page: '/ideas/new' },
    { pattern: '/ideas/:ideaId/score', page: '/ideas/:ideaId/score' },
    { pattern: '/ideas/:ideaId/edge', page: '/ideas/:ideaId/edge' },
    { pattern: '/ideas/:ideaId/convert', page: '/ideas/:ideaId/convert' },
    { pattern: '/projects', page: '/projects' },
    { pattern: '/projects/:projectId', page: '/projects/:projectId' },
    { pattern: '/projects/:projectId/engineering', page: '/projects/:projectId/engineering' },
    { pattern: '/team', page: '/team' },
    { pattern: '/teams', page: '/team' },
    { pattern: '/edge', page: '/edge' },
    { pattern: '/crunch', page: '/crunch' },
    { pattern: '/flow', page: '/flow' },
    { pattern: '/account', page: '/account' },
    { pattern: '/account/profile', page: '/account/profile' },
    { pattern: '/account/company', page: '/account/company' },
    { pattern: '/account/users', page: '/account/users' },
    { pattern: '/account/activity', page: '/account/activity' },
    { pattern: '/account/notifications', page: '/account/notifications' },
    { pattern: '/review', page: '/review' },
    { pattern: '/review/:id', page: '/review/:id' },
    { pattern: '/design-system', page: '/design-system' },
  ];

  function matchPath(path) {
    for (var i = 0; i < routeTable.length; i++) {
      var route = routeTable[i];
      var parts = route.pattern.split('/');
      var pathParts = path.split('/');
      if (parts.length !== pathParts.length) continue;
      var params = {};
      var match = true;
      for (var j = 0; j < parts.length; j++) {
        if (parts[j].charAt(0) === ':') {
          params[parts[j].slice(1)] = pathParts[j];
        } else if (parts[j] !== pathParts[j]) {
          match = false;
          break;
        }
      }
      if (match) return { page: route.page, params: params };
    }
    return null;
  }

  App.render = function() {
    // Cleanup previous page
    if (currentCleanup) {
      try { currentCleanup(); } catch(e) {}
      currentCleanup = null;
    }

    var path = App.getCurrentPath();
    var result = matchPath(path);
    var pageKey, params;

    if (result) {
      pageKey = result.page;
      params = result.params;
    } else {
      pageKey = '*';
      params = {};
    }

    var page = App.pages[pageKey];
    if (!page) {
      page = App.pages['*'];
      if (!page) {
        document.getElementById('app').innerHTML = '<div class="flex items-center justify-center min-h-screen"><h1>Page not found</h1></div>';
        return;
      }
    }

    var contentHtml = page.render(params);
    var appEl = document.getElementById('app');

    if (page.layout === 'dashboard') {
      appEl.innerHTML = App.renderDashboardLayout(contentHtml);
    } else {
      appEl.innerHTML = contentHtml;
    }

    // Run page init
    if (page.init) {
      var cleanup = page.init(params);
      if (typeof cleanup === 'function') {
        currentCleanup = cleanup;
      }
    }

    // Scroll to top
    window.scrollTo(0, 0);
  };

  // Listen for hash changes
  window.addEventListener('hashchange', function() {
    App.render();
  });

  // Listen for resize (for mobile/desktop switching)
  var lastMobile = App.isMobile();
  window.addEventListener('resize', App.debounce(function() {
    var nowMobile = App.isMobile();
    if (nowMobile !== lastMobile) {
      lastMobile = nowMobile;
      App.render();
    }
  }, 250));

  // ==========================================
  // INITIAL RENDER
  // ==========================================
  // Set default hash if none
  if (!window.location.hash) {
    window.location.hash = '#/';
  }
  App.render();
})();
