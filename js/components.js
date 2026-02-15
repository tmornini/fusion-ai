// Fusion AI — Shared UI Components
(function() {
  var App = window.FusionApp = window.FusionApp || {};
  var icon = App.icon;

  // ==========================================
  // TOAST
  // ==========================================
  var toastTimer = null;
  App.showToast = function(opts) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    container.innerHTML = '';
    var isDestructive = opts.variant === 'destructive';
    var el = document.createElement('div');
    el.className = 'toast' + (isDestructive ? ' toast-destructive' : '');
    el.innerHTML =
      '<div style="flex:1">' +
        (opts.title ? '<div class="toast-title">' + escapeHtml(opts.title) + '</div>' : '') +
        (opts.description ? '<div class="toast-description">' + escapeHtml(opts.description) + '</div>' : '') +
      '</div>' +
      '<button class="toast-close" onclick="this.parentElement.remove()">' + icon('x', 16) + '</button>';
    container.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { if (el.parentElement) el.remove(); }, 4000);
  };

  // ==========================================
  // TABS
  // ==========================================
  App.renderTabs = function(tabs, activeTab, onChangeAttr) {
    var html = '<div class="tabs-list">';
    tabs.forEach(function(tab) {
      html += '<button class="tab-trigger' + (tab.value === activeTab ? ' active' : '') + '" ' +
        'onclick="' + onChangeAttr + '(\'' + tab.value + '\')" data-tab="' + tab.value + '">' +
        escapeHtml(tab.label) + '</button>';
    });
    html += '</div>';
    return html;
  };

  // ==========================================
  // SELECT (simple dropdown)
  // ==========================================
  App.renderSelect = function(options, value, id, onChange) {
    var html = '<select class="input" id="' + id + '" onchange="' + onChange + '">';
    options.forEach(function(opt) {
      var val = typeof opt === 'string' ? opt : opt.value;
      var label = typeof opt === 'string' ? opt : opt.label;
      html += '<option value="' + escapeHtml(val) + '"' + (val === value ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
    });
    html += '</select>';
    return html;
  };

  // ==========================================
  // DROPDOWN MENU
  // ==========================================
  App.openDropdown = null;

  App.toggleDropdown = function(id, event) {
    if (event) event.stopPropagation();
    var el = document.getElementById(id);
    if (!el) return;
    var isOpen = !el.classList.contains('hidden');
    App.closeAllDropdowns();
    if (!isOpen) {
      el.classList.remove('hidden');
      App.openDropdown = id;
    }
  };

  App.closeAllDropdowns = function() {
    if (App.openDropdown) {
      var el = document.getElementById(App.openDropdown);
      if (el) el.classList.add('hidden');
      App.openDropdown = null;
    }
    // Also close any visible dropdown-content elements
    document.querySelectorAll('.dropdown-content:not(.hidden)').forEach(function(el) {
      el.classList.add('hidden');
    });
  };

  document.addEventListener('click', function() {
    App.closeAllDropdowns();
  });

  // ==========================================
  // PROGRESS BAR
  // ==========================================
  App.renderProgress = function(value, max, className) {
    max = max || 100;
    var pct = Math.min(Math.max((value / max) * 100, 0), 100);
    return '<div class="progress ' + (className || '') + '">' +
      '<div class="progress-bar" style="width:' + pct + '%"></div>' +
    '</div>';
  };

  // ==========================================
  // BADGE
  // ==========================================
  App.renderBadge = function(text, variant) {
    variant = variant || 'secondary';
    return '<span class="badge badge-' + variant + '">' + escapeHtml(text) + '</span>';
  };

  // Status badge with auto-color
  App.renderStatusBadge = function(status) {
    var map = {
      'draft': 'secondary',
      'in_review': 'warning',
      'pending': 'warning',
      'approved': 'success',
      'rejected': 'error',
      'in_progress': 'info',
      'completed': 'success',
      'on_hold': 'warning',
      'planning': 'secondary',
      'active': 'success',
      'inactive': 'secondary',
      'on_track': 'success',
      'at_risk': 'warning',
      'achieved': 'success',
      'not_started': 'secondary',
    };
    var variant = map[status] || 'secondary';
    var label = status.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    return App.renderBadge(label, variant);
  };

  // Priority badge
  App.renderPriorityBadge = function(priority) {
    var map = { high: 'error', medium: 'warning', low: 'info' };
    return App.renderBadge(priority.charAt(0).toUpperCase() + priority.slice(1), map[priority] || 'secondary');
  };

  // ==========================================
  // MODAL / DIALOG
  // ==========================================
  App.showModal = function(opts) {
    var overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.id = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '400';

    var modal = document.createElement('div');
    modal.className = 'fusion-card p-6 animate-scale-in';
    modal.style.maxWidth = opts.maxWidth || '32rem';
    modal.style.width = '90%';
    modal.style.maxHeight = '90vh';
    modal.style.overflowY = 'auto';
    modal.style.zIndex = '500';
    modal.innerHTML = opts.content;

    overlay.appendChild(modal);
    if (opts.closeOnOverlay !== false) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) App.closeModal();
      });
    }
    document.body.appendChild(overlay);
  };

  App.closeModal = function() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  };

  // ==========================================
  // SEARCH INPUT
  // ==========================================
  App.renderSearchInput = function(placeholder, id) {
    return '<div class="search-input-wrapper">' +
      icon('search', 16) +
      '<input class="input" id="' + (id || 'search-input') + '" type="text" placeholder="' + escapeHtml(placeholder || 'Search...') + '" />' +
    '</div>';
  };

  // ==========================================
  // EMPTY STATE
  // ==========================================
  App.renderEmptyState = function(iconName, title, description, actionHtml) {
    return '<div class="flex flex-col items-center justify-center py-16 text-center">' +
      '<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">' +
        icon(iconName, 32) +
      '</div>' +
      '<h3 class="text-lg font-semibold mb-2">' + escapeHtml(title) + '</h3>' +
      '<p class="text-muted-foreground text-sm mb-6 max-w-md">' + escapeHtml(description) + '</p>' +
      (actionHtml || '') +
    '</div>';
  };

  // ==========================================
  // LOADING SPINNER
  // ==========================================
  App.renderSpinner = function(size) {
    size = size || 24;
    return '<div class="flex items-center justify-center py-8">' +
      '<div class="animate-spin text-primary">' + icon('loader2', size) + '</div>' +
    '</div>';
  };

  // ==========================================
  // UTILITIES
  // ==========================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  App.escapeHtml = escapeHtml;

  App.formatDate = function(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  App.formatRelativeTime = function(dateStr) {
    var now = new Date();
    var d = new Date(dateStr);
    var diffMs = now - d;
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + ' min ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + ' hour' + (diffHr > 1 ? 's' : '') + ' ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + ' day' + (diffDay > 1 ? 's' : '') + ' ago';
    return App.formatDate(dateStr);
  };

  App.getGreeting = function() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Simple debounce
  App.debounce = function(fn, ms) {
    var timer;
    return function() {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
  };
})();
