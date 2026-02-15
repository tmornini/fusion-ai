// Fusion AI — 404 Not Found Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;

  App.pages['*'] = {
    layout: 'none',

    render: function() {
      var html = '';
      html += '<div class="min-h-screen bg-background flex items-center justify-center px-4">';
      html += '<div class="text-center">';
      html += '<div class="flex justify-center mb-6">';
      html += '<div class="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">' + icon('alertCircle', 40) + '</div>';
      html += '</div>';
      html += '<h1 class="text-4xl font-display font-bold mb-2">404</h1>';
      html += '<p class="text-lg text-muted-foreground mb-6">Page not found</p>';
      html += '<p class="text-sm text-muted-foreground mb-8 max-w-md">The page you\'re looking for doesn\'t exist or has been moved.</p>';
      html += '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/\')">' + icon('home', 18) + ' Return to Home</button>';
      html += '</div>';
      html += '</div>';
      return html;
    },

    init: function() {}
  };
})();
