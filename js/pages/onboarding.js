// Fusion AI — Onboarding Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  App.pages = App.pages || {};

  App.pages['/onboarding'] = {
    layout: 'none',

    render: function() {
      var html = '<div class="flex items-center justify-center min-h-screen" style="background:hsl(var(--background));padding:2rem">';
      html += '<div class="text-center" style="max-width:28rem">';

      // Icon in gradient box
      html += '<div class="flex justify-center mb-6">';
      html += '<div style="width:4rem;height:4rem;border-radius:var(--radius-xl);background:var(--gradient-hero);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary-foreground))">';
      html += icon('sparkles', 28);
      html += '</div>';
      html += '</div>';

      // Heading
      html += '<h1 class="font-display font-bold text-3xl tracking-tight mb-4">Welcome to Fusion AI</h1>';

      // Description
      html += '<p class="text-muted-foreground mb-8 leading-relaxed">Your account is all set up. Explore your dashboard to start capturing ideas, building projects, and amplifying your team\'s potential with intelligent automation.</p>';

      // Button
      html += '<button class="btn btn-primary btn-lg" onclick="FusionApp.navigate(\'/dashboard\')">';
      html += icon('arrowRight', 18) + ' Go to Dashboard';
      html += '</button>';

      html += '</div>'; // content
      html += '</div>'; // root
      return html;
    }
  };
})();
