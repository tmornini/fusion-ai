// Fusion AI — Company Settings Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  App._companySave = function() {
    var name = document.getElementById('company-name').value.trim();
    var industry = document.getElementById('company-industry').value;
    var size = document.getElementById('company-size').value;

    if (!name) {
      App.showToast({ title: 'Error', description: 'Company name is required.', variant: 'destructive' });
      return;
    }

    App.store.company.name = name;
    App.store.company.industry = industry;
    App.store.company.size = size;

    App.showToast({ title: 'Company updated', description: 'Company settings have been saved.' });
  };

  App.pages['/account/company'] = {
    layout: 'dashboard',

    render: function() {
      var company = App.store.company;
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Company Settings</span>';
      html += '</div>';

      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-6">Company Settings</h1>';

      // Form
      html += '<div class="fusion-card p-6" style="max-width:40rem">';
      html += '<div class="space-y-4">';

      // Company name
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Company Name</label>';
      html += '<input class="input w-full" id="company-name" value="' + escapeHtml(company.name) + '" />';
      html += '</div>';

      // Industry
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Industry</label>';
      var industries = [
        { value: 'Technology', label: 'Technology' },
        { value: 'Finance', label: 'Finance' },
        { value: 'Healthcare', label: 'Healthcare' },
        { value: 'Education', label: 'Education' },
        { value: 'Manufacturing', label: 'Manufacturing' },
        { value: 'Retail', label: 'Retail' },
        { value: 'Other', label: 'Other' },
      ];
      html += App.renderSelect(industries, company.industry, 'company-industry', '');
      html += '</div>';

      // Company size
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Company Size</label>';
      var sizes = [
        { value: '1-10', label: '1-10 employees' },
        { value: '11-50', label: '11-50 employees' },
        { value: '50-200', label: '50-200 employees' },
        { value: '200-1000', label: '200-1000 employees' },
        { value: '1000+', label: '1000+ employees' },
      ];
      html += App.renderSelect(sizes, company.size, 'company-size', '');
      html += '</div>';

      // Plan display
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Current Plan</label>';
      html += '<div class="flex items-center gap-2">';
      html += '<div class="input flex-1" style="background:hsl(var(--muted));cursor:not-allowed;opacity:0.7">' + escapeHtml(company.plan) + '</div>';
      html += App.renderBadge(company.plan, 'success');
      html += '</div>';
      html += '</div>';

      // Save button
      html += '<div class="flex justify-end pt-2">';
      html += '<button class="btn btn-primary" onclick="FusionApp._companySave()">' + icon('save', 16) + ' <span>Save Changes</span></button>';
      html += '</div>';

      html += '</div></div>';

      return html;
    }
  };
})();
