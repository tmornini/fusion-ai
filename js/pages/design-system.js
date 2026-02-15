// Fusion AI — Design System Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  App.pages['/design-system'] = {
    layout: 'dashboard',

    render: function() {
      var mobile = App.isMobile();
      var html = '';

      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-2">Design System</h1>';
      html += '<p class="text-muted-foreground mb-8">A reference of the visual building blocks used throughout Fusion AI.</p>';

      // ============================
      // Colors
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Colors</h2>';
      html += '<div class="grid grid-cols-2 ' + (mobile ? '' : 'md:grid-cols-4 lg:grid-cols-6') + ' gap-3">';

      var colors = [
        { label: 'Brand Blue', css: 'hsl(217, 36%, 46%)', var: '--primary' },
        { label: 'Brand Yellow', css: 'hsl(38, 92%, 50%)', var: '--accent' },
        { label: 'Success', css: 'hsl(152, 60%, 40%)', var: '--success' },
        { label: 'Warning', css: 'hsl(38, 92%, 50%)', var: '--warning' },
        { label: 'Error', css: 'hsl(0, 72%, 51%)', var: '--error' },
        { label: 'Info', css: 'hsl(217, 36%, 46%)', var: '--info' },
        { label: 'Foreground', css: 'hsl(var(--foreground))', var: '--foreground' },
        { label: 'Muted', css: 'hsl(var(--muted-foreground))', var: '--muted-foreground' },
        { label: 'Background', css: 'hsl(var(--background))', var: '--background' },
        { label: 'Card', css: 'hsl(var(--card))', var: '--card' },
        { label: 'Border', css: 'hsl(var(--border))', var: '--border' },
        { label: 'Ring', css: 'hsl(var(--ring))', var: '--ring' },
      ];

      colors.forEach(function(c) {
        html += '<div class="text-center">';
        html += '<div style="width:100%;aspect-ratio:1;border-radius:var(--radius);background:' + c.css + ';border:1px solid hsl(var(--border));margin-bottom:0.5rem"></div>';
        html += '<p class="text-xs font-medium">' + escapeHtml(c.label) + '</p>';
        html += '<p class="text-xs text-muted-foreground">' + escapeHtml(c.var) + '</p>';
        html += '</div>';
      });
      html += '</div>';
      html += '</section>';

      // ============================
      // Typography
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Typography</h2>';
      html += '<div class="fusion-card p-6 space-y-4">';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">Display / H1 (IBM Plex Sans, Bold)</span><h1 class="text-2xl font-display font-bold">The quick brown fox jumps</h1></div>';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">H2 (Semi-bold)</span><h2 class="text-xl font-semibold">The quick brown fox jumps</h2></div>';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">H3 (Semi-bold)</span><h3 class="text-lg font-semibold">The quick brown fox jumps</h3></div>';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">Body (Inter, Regular)</span><p class="text-sm">The quick brown fox jumps over the lazy dog. This is body text at the default size.</p></div>';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">Small / Caption</span><p class="text-xs text-muted-foreground">The quick brown fox jumps over the lazy dog.</p></div>';
      html += '</div>';
      html += '</section>';

      // ============================
      // Buttons
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Buttons</h2>';
      html += '<div class="fusion-card p-6">';
      html += '<div class="flex flex-wrap gap-3 mb-4">';
      html += '<button class="btn btn-primary">Primary</button>';
      html += '<button class="btn btn-outline">Outline</button>';
      html += '<button class="btn btn-ghost">Ghost</button>';
      html += '<button class="btn btn-primary" disabled>Disabled</button>';
      html += '</div>';
      html += '<p class="text-xs text-muted-foreground mb-4">Small variants:</p>';
      html += '<div class="flex flex-wrap gap-3 mb-4">';
      html += '<button class="btn btn-primary btn-sm">Primary SM</button>';
      html += '<button class="btn btn-outline btn-sm">Outline SM</button>';
      html += '<button class="btn btn-ghost btn-sm">Ghost SM</button>';
      html += '</div>';
      html += '<p class="text-xs text-muted-foreground mb-4">With icons:</p>';
      html += '<div class="flex flex-wrap gap-3">';
      html += '<button class="btn btn-primary">' + icon('plus', 16) + ' <span>New Item</span></button>';
      html += '<button class="btn btn-outline">' + icon('download', 16) + ' <span>Export</span></button>';
      html += '<button class="btn btn-ghost">' + icon('settings', 16) + ' <span>Settings</span></button>';
      html += '</div>';
      html += '</div>';
      html += '</section>';

      // ============================
      // Badges
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Badges</h2>';
      html += '<div class="fusion-card p-6">';
      html += '<div class="flex flex-wrap gap-3">';
      var badgeVariants = ['secondary', 'success', 'warning', 'error', 'info'];
      badgeVariants.forEach(function(v) {
        html += App.renderBadge(v.charAt(0).toUpperCase() + v.slice(1), v);
      });
      html += '</div>';
      html += '<p class="text-xs text-muted-foreground mt-4 mb-2">Status badges (auto-colored):</p>';
      html += '<div class="flex flex-wrap gap-3">';
      var statuses = ['active', 'inactive', 'pending', 'approved', 'rejected', 'in_progress', 'completed', 'on_hold'];
      statuses.forEach(function(s) {
        html += App.renderStatusBadge(s);
      });
      html += '</div>';
      html += '</div>';
      html += '</section>';

      // ============================
      // Form Elements
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Form Elements</h2>';
      html += '<div class="fusion-card p-6" style="max-width:32rem">';
      html += '<div class="space-y-4">';

      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Text Input</label>';
      html += '<input class="input w-full" placeholder="Type something..." />';
      html += '</div>';

      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Search Input</label>';
      html += App.renderSearchInput('Search...', 'ds-search');
      html += '</div>';

      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Select</label>';
      html += App.renderSelect(
        [{ value: '', label: 'Choose an option...' }, { value: 'opt1', label: 'Option 1' }, { value: 'opt2', label: 'Option 2' }, { value: 'opt3', label: 'Option 3' }],
        '', 'ds-select', ''
      );
      html += '</div>';

      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Textarea</label>';
      html += '<textarea class="input w-full" rows="3" placeholder="Write a message..."></textarea>';
      html += '</div>';

      html += '</div></div>';
      html += '</section>';

      // ============================
      // Cards
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Cards</h2>';
      html += '<div class="grid grid-cols-1 ' + (mobile ? '' : 'md:grid-cols-3') + ' gap-4">';

      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-sm font-semibold mb-2">Basic Card</h3>';
      html += '<p class="text-sm text-muted-foreground">This is a basic card component with padding and border radius.</p>';
      html += '</div>';

      html += '<div class="fusion-card p-6">';
      html += '<div class="flex items-center gap-3 mb-3">';
      html += '<div class="w-10 h-10 rounded-lg bg-info-soft flex items-center justify-center text-primary">' + icon('lightbulb', 20) + '</div>';
      html += '<div><h3 class="text-sm font-semibold">Card with Icon</h3><p class="text-xs text-muted-foreground">A descriptive subtitle</p></div>';
      html += '</div>';
      html += '<p class="text-sm text-muted-foreground">Cards can contain icons, headings, and body text.</p>';
      html += '</div>';

      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-sm font-semibold mb-3">Card with Actions</h3>';
      html += '<p class="text-sm text-muted-foreground mb-4">Cards can also include action buttons.</p>';
      html += '<div class="flex gap-2">';
      html += '<button class="btn btn-primary btn-sm">Action</button>';
      html += '<button class="btn btn-ghost btn-sm">Cancel</button>';
      html += '</div>';
      html += '</div>';

      html += '</div>';
      html += '</section>';

      // ============================
      // Spacing
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Spacing</h2>';
      html += '<div class="fusion-card p-6">';
      html += '<p class="text-sm text-muted-foreground mb-4">Spacing is based on a 0.25rem (4px) scale. Common values:</p>';
      var spacings = [
        { label: '1 (0.25rem)', size: '0.25rem' },
        { label: '2 (0.5rem)', size: '0.5rem' },
        { label: '3 (0.75rem)', size: '0.75rem' },
        { label: '4 (1rem)', size: '1rem' },
        { label: '6 (1.5rem)', size: '1.5rem' },
        { label: '8 (2rem)', size: '2rem' },
        { label: '12 (3rem)', size: '3rem' },
        { label: '16 (4rem)', size: '4rem' },
      ];
      html += '<div class="space-y-2">';
      spacings.forEach(function(sp) {
        html += '<div class="flex items-center gap-3">';
        html += '<span class="text-xs text-muted-foreground" style="width:8rem">' + escapeHtml(sp.label) + '</span>';
        html += '<div style="height:0.75rem;width:' + sp.size + ';background:hsl(var(--primary));border-radius:2px"></div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
      html += '</section>';

      // ============================
      // Progress Bars
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Progress Bars</h2>';
      html += '<div class="fusion-card p-6 space-y-4" style="max-width:32rem">';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">25%</span>' + App.renderProgress(25) + '</div>';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">50%</span>' + App.renderProgress(50) + '</div>';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">75%</span>' + App.renderProgress(75) + '</div>';
      html += '<div><span class="text-xs text-muted-foreground block mb-1">100%</span>' + App.renderProgress(100) + '</div>';
      html += '</div>';
      html += '</section>';

      // ============================
      // Icons Sample
      // ============================
      html += '<section class="mb-10">';
      html += '<h2 class="text-lg font-semibold mb-4">Icons (Sample)</h2>';
      html += '<div class="fusion-card p-6">';
      html += '<div class="grid grid-cols-4 ' + (mobile ? '' : 'md:grid-cols-8 lg:grid-cols-12') + ' gap-4">';
      var sampleIcons = ['home', 'lightbulb', 'folderKanban', 'users', 'user', 'target', 'database', 'gitBranch', 'palette', 'search', 'bell', 'settings', 'mail', 'star', 'zap', 'check', 'plus', 'edit', 'trash2', 'upload', 'download', 'eye', 'lock', 'globe'];
      sampleIcons.forEach(function(name) {
        html += '<div class="flex flex-col items-center gap-1">';
        html += '<div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">' + icon(name, 18) + '</div>';
        html += '<span class="text-xs text-muted-foreground">' + escapeHtml(name) + '</span>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
      html += '</section>';

      return html;
    }
  };
})();
