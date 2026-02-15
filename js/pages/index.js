// Fusion AI — Landing Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  App.pages = App.pages || {};

  var mobileMenuOpen = false;

  App.pages['/'] = {
    layout: 'none',

    render: function() {
      var mobile = App.isMobile();
      var html = '<div style="min-height:100vh">';

      // ==========================================
      // NAVBAR
      // ==========================================
      html += '<nav class="landing-nav" id="landing-nav">';
      html += '<div class="flex items-center gap-3">';
      html += '<div style="width:2.25rem;height:2.25rem;border-radius:var(--radius);background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:700;font-size:var(--text-lg);font-family:var(--font-display)">F</div>';
      html += '<span class="text-xl font-display font-bold text-foreground">Fusion AI</span>';
      html += '</div>';

      // Desktop nav links
      html += '<div class="flex items-center gap-6 hide-mobile">';
      html += '<a href="#features" class="text-sm font-medium text-muted-foreground" style="transition:color 0.15s" onmouseover="this.style.color=\'hsl(var(--foreground))\'" onmouseout="this.style.color=\'\'">Features</a>';
      html += '<a href="#how-it-works" class="text-sm font-medium text-muted-foreground" style="transition:color 0.15s" onmouseover="this.style.color=\'hsl(var(--foreground))\'" onmouseout="this.style.color=\'\'">How It Works</a>';
      html += '<a href="#about" class="text-sm font-medium text-muted-foreground" style="transition:color 0.15s" onmouseover="this.style.color=\'hsl(var(--foreground))\'" onmouseout="this.style.color=\'\'">About</a>';
      html += '</div>';

      // Desktop buttons
      html += '<div class="flex items-center gap-3 hide-mobile">';
      html += '<button class="btn btn-ghost" onclick="FusionApp.navigate(\'/auth\')">Sign In</button>';
      html += '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/auth\')">Get Started</button>';
      html += '</div>';

      // Mobile hamburger
      if (mobile) {
        html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp._toggleLandingMenu()">' + icon('menu', 20) + '</button>';
      }

      html += '</nav>';

      // Mobile menu
      if (mobile) {
        html += '<div id="landing-mobile-menu" class="' + (mobileMenuOpen ? '' : 'hidden') + '" style="position:fixed;top:3.5rem;left:0;right:0;z-index:49;background:hsl(var(--card));border-bottom:1px solid hsl(var(--border));padding:1rem;box-shadow:var(--shadow-lg)">';
        html += '<div class="flex flex-col gap-2">';
        html += '<a href="#features" class="text-sm font-medium text-muted-foreground p-2" onclick="FusionApp._toggleLandingMenu()">Features</a>';
        html += '<a href="#how-it-works" class="text-sm font-medium text-muted-foreground p-2" onclick="FusionApp._toggleLandingMenu()">How It Works</a>';
        html += '<a href="#about" class="text-sm font-medium text-muted-foreground p-2" onclick="FusionApp._toggleLandingMenu()">About</a>';
        html += '<div class="divider mt-2 mb-2"></div>';
        html += '<button class="btn btn-ghost w-full" onclick="FusionApp.navigate(\'/auth\')">Sign In</button>';
        html += '<button class="btn btn-primary w-full" onclick="FusionApp.navigate(\'/auth\')">Get Started</button>';
        html += '</div>';
        html += '</div>';
      }

      // ==========================================
      // HERO SECTION
      // ==========================================
      html += '<section class="hero-section" style="padding-top:7rem;padding-bottom:4rem">';
      html += '<div class="container" style="max-width:64rem;margin:0 auto">';

      // Badge
      html += '<div class="flex justify-center mb-6">';
      html += '<span class="badge badge-secondary" style="padding:0.375rem 1rem;font-size:var(--text-sm)">' + icon('sparkles', 14) + ' Human-Intelligence First</span>';
      html += '</div>';

      // Heading
      html += '<h1 class="font-display font-bold tracking-tight text-center" style="font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;margin-bottom:1.5rem">';
      html += 'AI That Amplifies<br><span class="text-primary">Human Intelligence</span>';
      html += '</h1>';

      // Subtext
      html += '<p class="text-muted-foreground text-center" style="font-size:clamp(1rem,2vw,1.25rem);max-width:40rem;margin:0 auto 2rem">';
      html += 'Fusion AI empowers teams to innovate faster by combining human creativity with intelligent automation. Transform ideas into impact.';
      html += '</p>';

      // CTA buttons
      html += '<div class="flex items-center justify-center gap-4 flex-wrap mb-12">';
      html += '<button class="btn btn-primary btn-lg" onclick="FusionApp.navigate(\'/auth\')">' + icon('arrowRight', 18) + ' Get Started Free</button>';
      html += '<button class="btn btn-outline btn-lg" onclick="document.getElementById(\'how-it-works\').scrollIntoView({behavior:\'smooth\'})">' + icon('eye', 18) + ' See How It Works</button>';
      html += '</div>';

      // Trust indicators
      html += '<div class="text-center">';
      html += '<p class="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">Trusted by innovative teams</p>';
      html += '<div class="flex items-center justify-center gap-8 flex-wrap">';
      var trustNames = ['TechCorp', 'InnovateLab', 'DataFlow', 'NexGen', 'Synergi'];
      trustNames.forEach(function(name) {
        html += '<span class="text-sm font-semibold text-muted-foreground opacity-50" style="letter-spacing:0.05em">' + App.escapeHtml(name) + '</span>';
      });
      html += '</div>';
      html += '</div>';

      html += '</div>'; // container
      html += '</section>';

      // ==========================================
      // FEATURES SECTION
      // ==========================================
      html += '<section id="features" class="py-20" style="background:hsl(var(--background-subtle))">';
      html += '<div class="container" style="max-width:72rem;margin:0 auto">';
      html += '<div class="text-center mb-12">';
      html += '<span class="badge badge-secondary mb-4">Features</span>';
      html += '<h2 class="font-display font-bold text-3xl tracking-tight mb-4">Everything You Need to Innovate</h2>';
      html += '<p class="text-muted-foreground" style="max-width:36rem;margin:0 auto">Powerful tools designed to capture, evaluate, and execute on your team\'s best ideas.</p>';
      html += '</div>';

      var features = [
        { icon: 'brain', title: 'Intelligent Augmentation', desc: 'AI-powered scoring and analysis that enhances human decision-making without replacing it.' },
        { icon: 'users', title: 'Collaborative Workflows', desc: 'Streamlined processes that bring teams together around shared innovation goals.' },
        { icon: 'zap', title: 'Real-Time Insights', desc: 'Instant analytics and dashboards that keep you informed about what matters most.' },
        { icon: 'shield', title: 'Enterprise Security', desc: 'Bank-grade encryption and compliance features to protect your intellectual property.' },
        { icon: 'barChart3', title: 'Transparent Analytics', desc: 'Clear, explainable metrics so you always understand how decisions are made.' },
        { icon: 'messageSquare', title: 'Natural Communication', desc: 'Intuitive interfaces that make complex workflows feel simple and natural.' },
      ];

      html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
      features.forEach(function(f) {
        html += '<div class="fusion-card fusion-card-hover p-6">';
        html += '<div style="width:3rem;height:3rem;border-radius:var(--radius-lg);background:hsl(var(--primary) / 0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary));margin-bottom:1rem">';
        html += icon(f.icon, 24);
        html += '</div>';
        html += '<h3 class="font-semibold text-lg mb-2">' + App.escapeHtml(f.title) + '</h3>';
        html += '<p class="text-sm text-muted-foreground leading-relaxed">' + App.escapeHtml(f.desc) + '</p>';
        html += '</div>';
      });
      html += '</div>';

      html += '</div>'; // container
      html += '</section>';

      // ==========================================
      // HOW IT WORKS SECTION
      // ==========================================
      html += '<section id="how-it-works" class="py-20">';
      html += '<div class="container" style="max-width:72rem;margin:0 auto">';
      html += '<div class="text-center mb-12">';
      html += '<span class="badge badge-secondary mb-4">How It Works</span>';
      html += '<h2 class="font-display font-bold text-3xl tracking-tight mb-4">Three Steps to Transform Your Team</h2>';
      html += '<p class="text-muted-foreground" style="max-width:36rem;margin:0 auto">Get started in minutes and see results from day one.</p>';
      html += '</div>';

      var steps = [
        {
          num: '01',
          title: 'Connect Your Data',
          desc: 'Integrate with your existing tools and data sources to create a unified innovation platform.',
          bullets: [
            'Import from 50+ popular tools and platforms',
            'Automatic data syncing and normalization',
            'Secure API connections with full encryption'
          ]
        },
        {
          num: '02',
          title: 'Configure Your Workflows',
          desc: 'Set up custom workflows that match how your team actually works.',
          bullets: [
            'Drag-and-drop workflow builder',
            'Customizable approval processes',
            'Automated notifications and escalations'
          ]
        },
        {
          num: '03',
          title: 'Amplify Your Team',
          desc: 'Let AI handle the heavy lifting while your team focuses on creative problem-solving.',
          bullets: [
            'AI-powered idea scoring and prioritization',
            'Smart recommendations based on team patterns',
            'Real-time progress tracking and reporting'
          ]
        },
      ];

      html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">';
      steps.forEach(function(s) {
        html += '<div class="fusion-card p-6">';
        html += '<div style="width:3.5rem;height:3.5rem;border-radius:var(--radius-lg);background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:700;font-size:var(--text-lg);font-family:var(--font-display);margin-bottom:1.25rem">' + s.num + '</div>';
        html += '<h3 class="font-semibold text-xl mb-2">' + App.escapeHtml(s.title) + '</h3>';
        html += '<p class="text-sm text-muted-foreground mb-4">' + App.escapeHtml(s.desc) + '</p>';
        html += '<ul class="space-y-2">';
        s.bullets.forEach(function(b) {
          html += '<li class="flex items-start gap-2 text-sm">';
          html += '<span class="text-primary mt-0.5 flex-shrink-0">' + icon('check', 16) + '</span>';
          html += '<span class="text-muted-foreground">' + App.escapeHtml(b) + '</span>';
          html += '</li>';
        });
        html += '</ul>';
        html += '</div>';
      });
      html += '</div>';

      html += '</div>'; // container
      html += '</section>';

      // ==========================================
      // CTA SECTION
      // ==========================================
      html += '<section class="py-20 gradient-hero" style="color:hsl(var(--primary-foreground))">';
      html += '<div class="container text-center" style="max-width:48rem;margin:0 auto">';
      html += '<h2 class="font-display font-bold tracking-tight mb-4" style="font-size:clamp(1.5rem,4vw,2.5rem);color:hsl(var(--primary-foreground))">Ready to Transform How Your Team Works?</h2>';
      html += '<p style="opacity:0.9;margin-bottom:2rem;font-size:clamp(0.9rem,2vw,1.125rem)">Join thousands of teams already using Fusion AI to turn ideas into impact.</p>';
      html += '<div class="flex items-center justify-center gap-4 flex-wrap">';
      html += '<button class="btn btn-lg" style="background:hsl(var(--primary-foreground));color:hsl(var(--primary))" onclick="FusionApp.navigate(\'/auth\')">Get Started Free</button>';
      html += '<button class="btn btn-lg" style="border:1px solid hsl(var(--primary-foreground) / 0.3);color:hsl(var(--primary-foreground));background:transparent" onclick="FusionApp.navigate(\'/auth\')">Schedule a Demo</button>';
      html += '</div>';
      html += '</div>';
      html += '</section>';

      // ==========================================
      // FOOTER
      // ==========================================
      html += '<footer id="about" class="py-16" style="background:hsl(var(--foreground));color:hsl(var(--background))">';
      html += '<div class="container" style="max-width:72rem;margin:0 auto">';

      html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">';

      // Brand column
      html += '<div>';
      html += '<div class="flex items-center gap-3 mb-4">';
      html += '<div style="width:2.25rem;height:2.25rem;border-radius:var(--radius);background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:700;font-size:var(--text-lg);font-family:var(--font-display)">F</div>';
      html += '<span class="text-xl font-display font-bold">Fusion AI</span>';
      html += '</div>';
      html += '<p class="text-sm" style="opacity:0.7;line-height:1.6">AI that amplifies human intelligence. Transform how your team innovates and delivers impact.</p>';
      html += '</div>';

      // Product column
      html += '<div>';
      html += '<h4 class="font-semibold mb-4" style="color:inherit">Product</h4>';
      html += '<ul class="space-y-2">';
      ['Features', 'Pricing', 'Integrations', 'Changelog'].forEach(function(item) {
        html += '<li><a href="#" class="text-sm" style="opacity:0.7;transition:opacity 0.15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">' + item + '</a></li>';
      });
      html += '</ul>';
      html += '</div>';

      // Company column
      html += '<div>';
      html += '<h4 class="font-semibold mb-4" style="color:inherit">Company</h4>';
      html += '<ul class="space-y-2">';
      ['About', 'Blog', 'Careers', 'Contact'].forEach(function(item) {
        html += '<li><a href="#" class="text-sm" style="opacity:0.7;transition:opacity 0.15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">' + item + '</a></li>';
      });
      html += '</ul>';
      html += '</div>';

      // Legal column
      html += '<div>';
      html += '<h4 class="font-semibold mb-4" style="color:inherit">Legal</h4>';
      html += '<ul class="space-y-2">';
      ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'].forEach(function(item) {
        html += '<li><a href="#" class="text-sm" style="opacity:0.7;transition:opacity 0.15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">' + item + '</a></li>';
      });
      html += '</ul>';
      html += '</div>';

      html += '</div>'; // grid

      // Copyright
      html += '<div class="border-t" style="border-color:hsl(var(--background) / 0.15);padding-top:2rem">';
      html += '<p class="text-sm text-center" style="opacity:0.5">&copy; 2026 Fusion AI. All rights reserved.</p>';
      html += '</div>';

      html += '</div>'; // container
      html += '</footer>';

      html += '</div>'; // root
      return html;
    },

    init: function() {
      mobileMenuOpen = false;

      // Navbar scroll effect
      function onScroll() {
        var nav = document.getElementById('landing-nav');
        if (nav) {
          if (window.scrollY > 20) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
          }
        }
      }
      window.addEventListener('scroll', onScroll);
      onScroll();

      return function() {
        window.removeEventListener('scroll', onScroll);
      };
    }
  };

  App._toggleLandingMenu = function() {
    mobileMenuOpen = !mobileMenuOpen;
    var el = document.getElementById('landing-mobile-menu');
    if (el) {
      el.classList.toggle('hidden', !mobileMenuOpen);
    }
  };
})();
