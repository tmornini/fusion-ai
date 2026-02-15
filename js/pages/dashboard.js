// Fusion AI — Dashboard Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var animationFrameId = null;

  App.pages['/dashboard'] = {
    layout: 'dashboard',

    render: function() {
      var store = App.store;
      var greeting = App.getGreeting();
      var userName = store.user.name;
      var companyName = store.company.name;
      var mobile = App.isMobile();

      var html = '';

      // Welcome section
      html += '<div class="mb-8">';
      html += '<div class="flex flex-col gap-4 ' + (mobile ? '' : 'lg:flex-row lg:items-center lg:justify-between') + '">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">' + escapeHtml(greeting) + ', ' + escapeHtml(userName) + '</h1>';
      html += '<p class="text-muted-foreground">' + escapeHtml(companyName) + ' &mdash; Here\'s what\'s happening today</p>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Key stats
      var stats = [
        { label: 'Ideas', value: 12, change: '+3', icon: 'lightbulb', color: 'primary' },
        { label: 'Projects', value: 5, change: '+1', icon: 'folderKanban', color: 'primary' },
        { label: 'Done', value: 8, change: '', icon: 'checkCircle2', color: 'success' },
        { label: 'Review', value: 3, change: '', icon: 'clock', color: 'warning' },
      ];

      html += '<div class="grid grid-cols-2 ' + (mobile ? '' : 'lg:grid-cols-4') + ' gap-4 mb-8">';
      stats.forEach(function(stat) {
        var bgClass = stat.color === 'success' ? 'bg-success-soft' : stat.color === 'warning' ? 'bg-warning-soft' : 'bg-info-soft';
        var textClass = stat.color === 'success' ? 'text-success' : stat.color === 'warning' ? 'text-warning' : 'text-primary';
        html += '<div class="fusion-card p-4">';
        html += '<div class="flex items-center justify-between mb-3">';
        html += '<div class="w-10 h-10 rounded-lg ' + bgClass + ' flex items-center justify-center ' + textClass + '">' + icon(stat.icon, 20) + '</div>';
        if (stat.change) {
          html += '<span class="badge badge-success text-xs">' + escapeHtml(stat.change) + '</span>';
        }
        html += '</div>';
        html += '<div class="text-2xl font-bold font-display" data-counter="' + stat.value + '">0</div>';
        html += '<div class="text-sm text-muted-foreground">' + escapeHtml(stat.label) + '</div>';
        html += '</div>';
      });
      html += '</div>';

      // Gauge cards
      var gauges = [
        {
          title: 'Cost Overview',
          cls: 'gauge-card-blue',
          strokeColor: 'hsl(217, 36%, 46%)',
          value: 72,
          metrics: [
            { label: 'Budget Used', value: 83750, prefix: '$', suffix: '' },
            { label: 'Remaining', value: 41250, prefix: '$', suffix: '' },
          ]
        },
        {
          title: 'Time Tracking',
          cls: 'gauge-card-green',
          strokeColor: 'hsl(152, 60%, 40%)',
          value: 65,
          metrics: [
            { label: 'Hours Logged', value: 342, prefix: '', suffix: 'h' },
            { label: 'Estimated Left', value: 184, prefix: '', suffix: 'h' },
          ]
        },
        {
          title: 'Project Impact',
          cls: 'gauge-card-amber',
          strokeColor: 'hsl(38, 92%, 45%)',
          value: 88,
          metrics: [
            { label: 'Impact Score', value: 88, prefix: '', suffix: '/100' },
            { label: 'Active Goals', value: 14, prefix: '', suffix: '' },
          ]
        },
      ];

      html += '<div class="grid grid-cols-1 ' + (mobile ? '' : 'md:grid-cols-3') + ' gap-4 mb-8">';
      gauges.forEach(function(gauge, idx) {
        html += '<div class="gauge-card ' + gauge.cls + '">';
        html += '<div class="text-sm font-semibold mb-4">' + escapeHtml(gauge.title) + '</div>';

        // SVG half-circle arc gauge
        var r = 54;
        var cx = 70;
        var cy = 70;
        var circumference = Math.PI * r;
        var dashOffset = circumference - (gauge.value / 100) * circumference;

        html += '<div class="flex justify-center mb-4">';
        html += '<svg width="140" height="80" viewBox="0 0 140 80">';
        // Background arc
        html += '<path d="M 16 70 A 54 54 0 0 1 124 70" fill="none" stroke="hsl(var(--muted))" stroke-width="10" stroke-linecap="round"/>';
        // Foreground arc
        html += '<path d="M 16 70 A 54 54 0 0 1 124 70" fill="none" stroke="' + gauge.strokeColor + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + dashOffset.toFixed(1) + '" class="gauge-arc" data-gauge-idx="' + idx + '" data-gauge-value="' + gauge.value + '"/>';
        // Center text
        html += '<text x="70" y="65" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor" class="gauge-text" data-gauge-idx="' + idx + '">' + gauge.value + '%</text>';
        html += '</svg>';
        html += '</div>';

        // Metrics
        html += '<div class="grid grid-cols-2 gap-3">';
        gauge.metrics.forEach(function(m) {
          html += '<div class="text-center">';
          html += '<div class="text-lg font-bold font-display" data-counter="' + m.value + '" data-prefix="' + m.prefix + '" data-suffix="' + m.suffix + '">0</div>';
          html += '<div class="text-xs text-muted-foreground">' + escapeHtml(m.label) + '</div>';
          html += '</div>';
        });
        html += '</div>';

        html += '</div>';
      });
      html += '</div>';

      // Quick Actions
      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-lg font-semibold mb-4">Quick Actions</h3>';
      html += '<div class="grid grid-cols-2 ' + (mobile ? '' : 'lg:grid-cols-4') + ' gap-3">';

      var actions = [
        { label: 'New Idea', icon: 'lightbulb', href: '/ideas/new', cls: 'btn-primary' },
        { label: 'Create Project', icon: 'folderKanban', href: '/projects', cls: 'btn-outline' },
        { label: 'Invite Team', icon: 'userPlus', href: '/team', cls: 'btn-outline' },
        { label: 'View Reports', icon: 'barChart3', href: '/dashboard', cls: 'btn-outline' },
      ];

      actions.forEach(function(action) {
        html += '<button class="btn ' + action.cls + ' w-full" onclick="FusionApp.navigate(\'' + action.href + '\')">';
        html += icon(action.icon, 18);
        html += '<span>' + escapeHtml(action.label) + '</span>';
        html += '</button>';
      });

      html += '</div>';
      html += '</div>';

      return html;
    },

    init: function() {
      // Animate counters
      var counters = document.querySelectorAll('[data-counter]');
      var startTime = null;
      var duration = 1200;

      function animateCounters(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        // Ease out cubic
        var eased = 1 - Math.pow(1 - progress, 3);

        counters.forEach(function(el) {
          var target = parseFloat(el.getAttribute('data-counter'));
          var prefix = el.getAttribute('data-prefix') || '';
          var suffix = el.getAttribute('data-suffix') || '';
          var current = Math.round(target * eased);
          el.textContent = prefix + current.toLocaleString() + suffix;
        });

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animateCounters);
        }
      }

      animationFrameId = requestAnimationFrame(animateCounters);

      return function() {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };
    }
  };
})();
