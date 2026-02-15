// Fusion AI — Dashboard Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var animationFrameId = null;

  // SVG half-circle arc path helper
  function arcPath(cx, cy, r) {
    var x1 = cx - r;
    var x2 = cx + r;
    return 'M ' + x1 + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + cy;
  }

  function renderDualGauge(gauge, idx) {
    var outerR = 65, innerR = 45;
    var cx = 80, cy = 75;
    var outerCirc = Math.PI * outerR;
    var innerCirc = Math.PI * innerR;
    var outerOff = outerCirc - (gauge.outerValue / 100) * outerCirc;
    var innerOff = innerCirc - (gauge.innerValue / 100) * innerCirc;

    var gradId1 = 'grad-' + idx + '-1';
    var gradId2 = 'grad-' + idx + '-2';
    var glowId = 'glow-' + idx;

    var html = '<svg width="160" height="90" viewBox="0 0 160 90">';

    // Defs: gradients + glow
    html += '<defs>';
    html += '<linearGradient id="' + gradId1 + '" x1="0%" y1="0%" x2="100%" y2="0%">';
    html += '<stop offset="0%" stop-color="' + gauge.colors[0] + '"/>';
    html += '<stop offset="100%" stop-color="' + gauge.colors[1] + '"/>';
    html += '</linearGradient>';
    html += '<linearGradient id="' + gradId2 + '" x1="0%" y1="0%" x2="100%" y2="0%">';
    html += '<stop offset="0%" stop-color="' + gauge.colors[2] + '"/>';
    html += '<stop offset="100%" stop-color="' + gauge.colors[3] + '"/>';
    html += '</linearGradient>';
    html += '<filter id="' + glowId + '"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    html += '</defs>';

    // Background arcs
    html += '<path d="' + arcPath(cx, cy, outerR) + '" fill="none" stroke="hsl(var(--muted))" stroke-width="8" stroke-linecap="round" opacity="0.3"/>';
    html += '<path d="' + arcPath(cx, cy, innerR) + '" fill="none" stroke="hsl(var(--muted))" stroke-width="6" stroke-linecap="round" opacity="0.3"/>';

    // Foreground arcs with gradient + glow
    html += '<path d="' + arcPath(cx, cy, outerR) + '" fill="none" stroke="url(#' + gradId1 + ')" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + outerCirc.toFixed(1) + '" stroke-dashoffset="' + outerOff.toFixed(1) + '" filter="url(#' + glowId + ')"/>';
    html += '<path d="' + arcPath(cx, cy, innerR) + '" fill="none" stroke="url(#' + gradId2 + ')" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + innerCirc.toFixed(1) + '" stroke-dashoffset="' + innerOff.toFixed(1) + '" filter="url(#' + glowId + ')"/>';

    // Center text
    html += '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor" class="gauge-text">' + gauge.outerValue + '%</text>';
    html += '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" font-size="10" fill="hsl(var(--muted-foreground))">' + gauge.centerLabel + '</text>';

    html += '</svg>';
    return html;
  }

  App.pages['/dashboard'] = {
    layout: 'dashboard',

    render: function() {
      var store = App.store;
      var greeting = App.getGreeting();
      var userName = store.user.name;
      var companyName = store.company.name;
      var mobile = App.isMobile();

      var html = '';

      // Hero welcome card
      html += '<div class="fusion-card p-6 mb-8" style="position:relative;overflow:hidden;background:linear-gradient(135deg, hsl(var(--primary) / 0.04), hsl(var(--accent) / 0.06))">';
      // Decorative blur circles
      html += '<div style="position:absolute;top:-2rem;right:-2rem;width:8rem;height:8rem;border-radius:9999px;background:hsl(var(--primary) / 0.08);filter:blur(40px)"></div>';
      html += '<div style="position:absolute;bottom:-2rem;left:-2rem;width:6rem;height:6rem;border-radius:9999px;background:hsl(var(--accent) / 0.1);filter:blur(30px)"></div>';

      html += '<div class="flex items-start gap-4" style="position:relative">';
      // Sparkles icon
      html += '<div class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style="background:var(--gradient-hero);color:hsl(var(--primary-foreground))">' + icon('sparkles', 24) + '</div>';
      html += '<div class="flex-1">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">' + escapeHtml(greeting) + ', ' + escapeHtml(userName) + '</h1>';
      html += '<p class="text-muted-foreground">' + escapeHtml(companyName) + ' &mdash; Here\'s what\'s happening today</p>';
      html += '</div>';
      html += '</div>';

      // Stats row with dividers
      var stats = [
        { label: 'Ideas', value: store.ideas.length },
        { label: 'Projects', value: store.projects.length },
        { label: 'Done', value: store.projects.filter(function(p) { return p.status === 'completed'; }).length },
        { label: 'Review', value: store.reviews.length },
      ];

      html += '<div class="grid grid-cols-4 gap-0 mt-5" style="position:relative">';
      stats.forEach(function(stat, i) {
        html += '<div class="text-center' + (i > 0 ? '" style="border-left:1px solid hsl(var(--border))"' : '"') + '>';
        html += '<div class="text-xl font-bold font-display" data-counter="' + stat.value + '">0</div>';
        html += '<div class="text-xs text-muted-foreground">' + escapeHtml(stat.label) + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';

      // Gauge cards
      var gauges = [
        {
          title: 'Cost Overview',
          theme: 'blue',
          bgStyle: 'background:linear-gradient(135deg, hsl(210 40% 96% / 0.5), hsl(210 40% 94% / 0.3));border-color:hsl(210 40% 85%)',
          outerValue: 72, innerValue: 58,
          colors: ['hsl(210, 70%, 50%)', 'hsl(210, 60%, 65%)', 'hsl(210, 50%, 40%)', 'hsl(210, 60%, 55%)'],
          centerLabel: 'budget used',
          metrics: [
            { label: 'Budget Spent', value: 83750, prefix: '$', suffix: '', dot: 'hsl(210, 70%, 50%)' },
            { label: 'ROI Generated', value: 41250, prefix: '$', suffix: '', dot: 'hsl(210, 50%, 40%)' },
          ]
        },
        {
          title: 'Time Tracking',
          theme: 'green',
          bgStyle: 'background:linear-gradient(135deg, hsl(152 30% 96% / 0.5), hsl(152 30% 94% / 0.3));border-color:hsl(152 30% 85%)',
          outerValue: 65, innerValue: 45,
          colors: ['hsl(152, 60%, 40%)', 'hsl(152, 50%, 55%)', 'hsl(152, 45%, 35%)', 'hsl(152, 55%, 50%)'],
          centerLabel: 'on schedule',
          metrics: [
            { label: 'Hours Logged', value: 342, prefix: '', suffix: 'h', dot: 'hsl(152, 60%, 40%)' },
            { label: 'Estimated Left', value: 184, prefix: '', suffix: 'h', dot: 'hsl(152, 45%, 35%)' },
          ]
        },
        {
          title: 'Project Impact',
          theme: 'amber',
          bgStyle: 'background:linear-gradient(135deg, hsl(38 40% 96% / 0.5), hsl(38 40% 94% / 0.3));border-color:hsl(38 40% 85%)',
          outerValue: 88, innerValue: 72,
          colors: ['hsl(38, 92%, 45%)', 'hsl(38, 80%, 55%)', 'hsl(38, 85%, 40%)', 'hsl(38, 75%, 50%)'],
          centerLabel: 'impact score',
          metrics: [
            { label: 'Impact Score', value: 88, prefix: '', suffix: '/100', dot: 'hsl(38, 92%, 45%)' },
            { label: 'Active Goals', value: 14, prefix: '', suffix: '', dot: 'hsl(38, 85%, 40%)' },
          ]
        },
      ];

      html += '<div class="grid grid-cols-1 ' + (mobile ? '' : 'md:grid-cols-3') + ' gap-4 mb-8">';
      gauges.forEach(function(gauge, idx) {
        html += '<div class="fusion-card p-5" style="' + gauge.bgStyle + '">';
        html += '<div class="text-sm font-semibold mb-3">' + escapeHtml(gauge.title) + '</div>';

        // Dual gauge SVG
        html += '<div class="flex justify-center mb-4">';
        html += renderDualGauge(gauge, idx);
        html += '</div>';

        // Metrics with dot indicators
        html += '<div class="grid grid-cols-2 gap-3">';
        gauge.metrics.forEach(function(m) {
          html += '<div class="text-center">';
          html += '<div class="flex items-center justify-center gap-1.5">';
          html += '<span style="width:0.5rem;height:0.5rem;border-radius:9999px;background:' + m.dot + ';display:inline-block"></span>';
          html += '<span class="text-lg font-bold font-display" data-counter="' + m.value + '" data-prefix="' + m.prefix + '" data-suffix="' + m.suffix + '">0</span>';
          html += '</div>';
          html += '<div class="text-xs text-muted-foreground">' + escapeHtml(m.label) + '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';

      // Quick Actions as cards
      html += '<h3 class="text-lg font-semibold mb-4">Quick Actions</h3>';
      html += '<div class="grid grid-cols-2 ' + (mobile ? '' : 'lg:grid-cols-4') + ' gap-3">';

      var actions = [
        { label: 'New Idea', icon: 'lightbulb', href: '/ideas/new', color: 'primary' },
        { label: 'Create Project', icon: 'folderKanban', href: '/projects', color: 'primary' },
        { label: 'Invite Team', icon: 'userPlus', href: '/team', color: 'primary' },
        { label: 'View Reports', icon: 'barChart3', href: '/dashboard', color: 'primary' },
      ];

      actions.forEach(function(action) {
        html += '<div class="fusion-card p-4 cursor-pointer transition-all hover:shadow-md" style="text-align:center" onclick="FusionApp.navigate(\'' + action.href + '\')" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">';
        html += '<div class="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style="background:var(--gradient-hero);color:hsl(var(--primary-foreground))">' + icon(action.icon, 20) + '</div>';
        html += '<div class="text-sm font-medium">' + escapeHtml(action.label) + '</div>';
        html += '</div>';
      });

      html += '</div>';

      return html;
    },

    init: function() {
      // Animate counters
      var counters = document.querySelectorAll('[data-counter]');
      var startTime = null;
      var duration = 1500;

      function animateCounters(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
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
