// Fusion AI — Auth Page (Login / Sign Up)
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  App.pages = App.pages || {};

  var isSignup = false;
  var formErrors = {};

  App.pages['/auth'] = {
    layout: 'none',

    render: function() {
      var html = '<div class="flex min-h-screen">';

      // ==========================================
      // LEFT PANEL — Branding (hidden on mobile)
      // ==========================================
      html += '<div class="auth-branding hide-mobile" style="width:50%;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:3rem;position:relative">';

      // Background pattern overlay
      html += '<div class="hero-pattern" style="position:absolute;inset:0;opacity:0.3"></div>';

      // Content
      html += '<div style="position:relative;z-index:1;max-width:28rem;text-align:center;color:hsl(var(--primary-foreground))">';

      // Logo
      html += '<div class="flex items-center justify-center gap-3 mb-8">';
      html += '<div style="width:3rem;height:3rem;border-radius:var(--radius-lg);background:hsl(var(--primary-foreground) / 0.15);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:700;font-size:var(--text-2xl);font-family:var(--font-display)">F</div>';
      html += '<span class="text-2xl font-display font-bold">Fusion AI</span>';
      html += '</div>';

      // Heading
      html += '<h1 class="font-display font-bold text-3xl tracking-tight mb-6" style="color:hsl(var(--primary-foreground))">Transform your business with intelligent automation</h1>';
      html += '<p style="opacity:0.85;margin-bottom:3rem;line-height:1.6">Harness the power of AI to amplify your team\'s creativity, streamline workflows, and deliver measurable results.</p>';

      // Stats
      html += '<div class="flex items-center justify-center gap-8">';

      var stats = [
        { value: '10K+', label: 'Active Users' },
        { value: '98%', label: 'Satisfaction' },
        { value: '50+', label: 'Integrations' },
      ];
      stats.forEach(function(s) {
        html += '<div class="text-center">';
        html += '<div class="text-2xl font-bold font-display">' + s.value + '</div>';
        html += '<div class="text-xs" style="opacity:0.7">' + App.escapeHtml(s.label) + '</div>';
        html += '</div>';
      });

      html += '</div>';
      html += '</div>'; // content
      html += '</div>'; // left panel

      // ==========================================
      // RIGHT PANEL — Form
      // ==========================================
      html += '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:2rem;background:hsl(var(--background))">';
      html += '<div style="width:100%;max-width:24rem">';

      // Mobile logo
      html += '<div class="flex items-center justify-center gap-3 mb-8" style="display:none">';
      html += '<div style="width:2.25rem;height:2.25rem;border-radius:var(--radius);background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:700;font-family:var(--font-display)">F</div>';
      html += '<span class="text-xl font-display font-bold text-foreground">Fusion AI</span>';
      html += '</div>';

      // Mobile-only logo (shown via CSS)
      html += '<div class="flex items-center justify-center gap-3 mb-8 md:hidden" id="auth-mobile-logo">';
      html += '<div style="width:2.25rem;height:2.25rem;border-radius:var(--radius);background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground));font-weight:700;font-family:var(--font-display)">F</div>';
      html += '<span class="text-xl font-display font-bold text-foreground">Fusion AI</span>';
      html += '</div>';

      // Title
      html += '<div class="text-center mb-8">';
      html += '<h2 class="font-display font-bold text-2xl tracking-tight mb-2">' + (isSignup ? 'Create your account' : 'Welcome back') + '</h2>';
      html += '<p class="text-sm text-muted-foreground">' + (isSignup ? 'Start your free trial today' : 'Sign in to your account') + '</p>';
      html += '</div>';

      // Form
      html += '<form id="auth-form" onsubmit="return FusionApp._handleAuthSubmit(event)">';

      // Email
      html += '<div class="form-group">';
      html += '<label class="label" for="auth-email">Email</label>';
      html += '<input class="input' + (formErrors.email ? ' input-error' : '') + '" id="auth-email" type="email" placeholder="you@company.com" autocomplete="email" />';
      if (formErrors.email) {
        html += '<p class="text-xs text-destructive mt-1">' + App.escapeHtml(formErrors.email) + '</p>';
      }
      html += '</div>';

      // Password
      html += '<div class="form-group">';
      html += '<label class="label" for="auth-password">Password</label>';
      html += '<div style="position:relative">';
      html += '<input class="input' + (formErrors.password ? ' input-error' : '') + '" id="auth-password" type="password" placeholder="' + (isSignup ? 'Min 6 characters' : 'Enter your password') + '" autocomplete="' + (isSignup ? 'new-password' : 'current-password') + '" />';
      html += '<button type="button" class="btn btn-ghost btn-icon-sm" style="position:absolute;right:0.25rem;top:50%;transform:translateY(-50%)" onclick="FusionApp._togglePasswordVisibility()">' + icon('eye', 16) + '</button>';
      html += '</div>';
      if (formErrors.password) {
        html += '<p class="text-xs text-destructive mt-1">' + App.escapeHtml(formErrors.password) + '</p>';
      }
      html += '</div>';

      // Company name (signup only)
      if (isSignup) {
        html += '<div class="form-group">';
        html += '<label class="label" for="auth-company">Company Name</label>';
        html += '<input class="input' + (formErrors.company ? ' input-error' : '') + '" id="auth-company" type="text" placeholder="Your company name" />';
        if (formErrors.company) {
          html += '<p class="text-xs text-destructive mt-1">' + App.escapeHtml(formErrors.company) + '</p>';
        }
        html += '</div>';
      }

      // Submit
      html += '<button class="btn btn-primary btn-lg w-full mt-2" type="submit">';
      html += isSignup ? 'Create Account' : 'Sign In';
      html += '</button>';

      html += '</form>';

      // Toggle link
      html += '<div class="text-center mt-6">';
      html += '<p class="text-sm text-muted-foreground">';
      if (isSignup) {
        html += 'Already have an account? <button class="btn-link text-sm" onclick="FusionApp._toggleAuthMode()">Sign in</button>';
      } else {
        html += 'Don\'t have an account? <button class="btn-link text-sm" onclick="FusionApp._toggleAuthMode()">Sign up</button>';
      }
      html += '</p>';
      html += '</div>';

      html += '</div>'; // form container
      html += '</div>'; // right panel

      html += '</div>'; // root flex
      return html;
    },

    init: function() {
      // Reset state on page enter
      formErrors = {};
    }
  };

  App._toggleAuthMode = function() {
    isSignup = !isSignup;
    formErrors = {};
    App.render();
  };

  App._togglePasswordVisibility = function() {
    var input = document.getElementById('auth-password');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  };

  App._handleAuthSubmit = function(e) {
    e.preventDefault();
    formErrors = {};

    var email = (document.getElementById('auth-email').value || '').trim();
    var password = (document.getElementById('auth-password').value || '').trim();

    // Validate email
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      formErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      formErrors.email = 'Please enter a valid email address';
    }

    // Validate password
    if (!password) {
      formErrors.password = 'Password is required';
    } else if (password.length < 6) {
      formErrors.password = 'Password must be at least 6 characters';
    }

    // Validate company name (signup only)
    if (isSignup) {
      var company = (document.getElementById('auth-company').value || '').trim();
      if (!company) {
        formErrors.company = 'Company name is required';
      }
    }

    // If errors, re-render
    if (Object.keys(formErrors).length > 0) {
      App.render();
      return false;
    }

    // Success — navigate to dashboard
    App.showToast({ title: isSignup ? 'Account created' : 'Welcome back!', description: 'Redirecting to dashboard...' });
    App.navigate('/dashboard');
    return false;
  };
})();
