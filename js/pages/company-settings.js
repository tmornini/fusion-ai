// Fusion AI — Company Settings Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var expandedSection = 'company';
  var departments = null; // cloned from store on init
  var permissions = null; // cloned from store on init
  var saveState = 'idle';

  function ensureState() {
    if (departments === null) departments = (App.store.company.departments || []).slice();
    if (permissions === null) permissions = {
      requireApprovalForProjects: App.store.company.requireApprovalForProjects !== false,
      allowGuestAccess: App.store.company.allowGuestAccess === true
    };
  }

  App._companyToggleSection = function(section) {
    expandedSection = expandedSection === section ? null : section;
    App.render();
  };

  App._companyAddDept = function() {
    ensureState();
    departments.push('');
    App.render();
  };

  App._companyRemoveDept = function(index) {
    ensureState();
    departments.splice(index, 1);
    App.render();
  };

  App._companyUpdateDept = function(index, value) {
    ensureState();
    departments[index] = value;
  };

  App._companyTogglePerm = function(key) {
    ensureState();
    permissions[key] = !permissions[key];
    App.render();
  };

  App._companySave = function() {
    ensureState();
    var nameEl = document.getElementById('company-name');
    var industryEl = document.getElementById('company-industry');
    var descEl = document.getElementById('company-description');

    if (nameEl) App.store.company.name = nameEl.value.trim();
    if (industryEl) App.store.company.industry = industryEl.value;
    if (descEl) App.store.company.description = descEl.value.trim();
    App.store.company.departments = departments.slice();
    App.store.company.requireApprovalForProjects = permissions.requireApprovalForProjects;
    App.store.company.allowGuestAccess = permissions.allowGuestAccess;

    saveState = 'saving';
    var btn = document.getElementById('company-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Saving...'; }

    setTimeout(function() {
      saveState = 'saved';
      if (btn) {
        btn.innerHTML = icon('checkCircle2', 16) + ' Saved!';
        btn.style.background = 'hsl(var(--success))';
        btn.style.borderColor = 'hsl(var(--success))';
      }
      setTimeout(function() {
        saveState = 'idle';
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = icon('save', 16) + ' Save Changes';
          btn.style.background = '';
          btn.style.borderColor = '';
        }
      }, 2000);
    }, 800);
  };

  function renderSectionHeader(id, iconName, title, description) {
    var isOpen = expandedSection === id;
    var html = '<button class="flex items-center justify-between w-full" style="padding:1rem;background:none;border:none;cursor:pointer;text-align:left;transition:background 0.15s" onmouseenter="this.style.background=\'hsl(var(--muted) / 0.3)\'" onmouseleave="this.style.background=\'\'" onclick="FusionApp._companyToggleSection(\'' + id + '\')">';
    html += '<div class="flex items-center gap-3">';
    html += '<div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--primary) / 0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary))">' + icon(iconName, 20) + '</div>';
    html += '<div><p class="font-medium text-foreground">' + title + '</p>';
    html += '<p class="text-xs text-muted-foreground">' + description + '</p></div>';
    html += '</div>';
    html += '<span class="text-muted-foreground" style="transition:transform 0.2s;transform:rotate(' + (isOpen ? '0' : '-90') + 'deg)">' + icon('chevronDown', 20) + '</span>';
    html += '</button>';
    return html;
  }

  App.pages['/account/company'] = {
    layout: 'dashboard',

    render: function() {
      ensureState();
      var company = App.store.company;
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer;background:none;border:none;padding:0;font:inherit;color:inherit" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Company Settings</span>';
      html += '</div>';

      // Header with save button
      html += '<div class="flex items-center justify-between mb-8" style="flex-wrap:wrap;gap:1rem">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold mb-1">Company Settings</h1>';
      html += '<p class="text-sm text-muted-foreground">Configure your organization\'s preferences and defaults</p>';
      html += '</div>';
      html += '<button class="btn btn-primary" id="company-save-btn" onclick="FusionApp._companySave()">' + icon('save', 16) + ' Save Changes</button>';
      html += '</div>';

      html += '<div style="max-width:48rem">';

      // Section 1: Company Details
      html += '<div class="fusion-card mb-4" style="overflow:hidden">';
      html += renderSectionHeader('company', 'building', 'Company Details', 'Basic information about your organization');
      if (expandedSection === 'company') {
        html += '<div style="padding:1.5rem;border-top:1px solid hsl(var(--border));background:hsl(var(--muted) / 0.1)">';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">';
        html += '<div><label class="text-sm font-medium block mb-2">Company Name</label>';
        html += '<input class="input w-full" id="company-name" value="' + escapeHtml(company.name) + '" /></div>';
        html += '<div><label class="text-sm font-medium block mb-2">Industry</label>';
        html += App.renderSelect(
          [{ value: 'Technology', label: 'Technology' }, { value: 'Finance', label: 'Finance' }, { value: 'Healthcare', label: 'Healthcare' }],
          company.industry, 'company-industry', ''
        );
        html += '</div></div>';
        html += '<div><label class="text-sm font-medium block mb-2">Description</label>';
        html += '<textarea class="input w-full" id="company-description" rows="2" style="resize:none">' + escapeHtml(company.description || '') + '</textarea>';
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';

      // Section 2: Team Structure
      html += '<div class="fusion-card mb-4" style="overflow:hidden">';
      html += renderSectionHeader('team', 'users', 'Team Structure', 'Departments and organizational units');
      if (expandedSection === 'team') {
        html += '<div style="padding:1.5rem;border-top:1px solid hsl(var(--border));background:hsl(var(--muted) / 0.1)">';
        html += '<div class="space-y-2 mb-4">';
        departments.forEach(function(dept, idx) {
          html += '<div class="flex items-center gap-2">';
          html += '<input class="input flex-1" value="' + escapeHtml(dept) + '" oninput="FusionApp._companyUpdateDept(' + idx + ',this.value)" />';
          html += '<button class="btn btn-ghost btn-sm" style="color:hsl(var(--error))" onclick="FusionApp._companyRemoveDept(' + idx + ')">' + icon('trash2', 16) + '</button>';
          html += '</div>';
        });
        html += '</div>';
        html += '<button class="btn btn-outline btn-sm" onclick="FusionApp._companyAddDept()">' + icon('plus', 16) + ' Add Department</button>';
        html += '</div>';
      }
      html += '</div>';

      // Section 3: Security & Permissions
      html += '<div class="fusion-card mb-4" style="overflow:hidden">';
      html += renderSectionHeader('permissions', 'shield', 'Security & Permissions', 'Access controls and security settings');
      if (expandedSection === 'permissions') {
        html += '<div style="padding:1.5rem;border-top:1px solid hsl(var(--border));background:hsl(var(--muted) / 0.1)">';
        var permDefs = [
          { key: 'requireApprovalForProjects', label: 'Require Approval for Projects', desc: 'Projects must be approved before starting' },
          { key: 'allowGuestAccess', label: 'Allow Guest Access', desc: 'External users can view shared content' },
        ];
        permDefs.forEach(function(perm) {
          html += '<div class="flex items-center justify-between" style="padding:0.75rem;border-radius:0.5rem;transition:background 0.15s" onmouseenter="this.style.background=\'hsl(var(--muted) / 0.3)\'" onmouseleave="this.style.background=\'\'">';
          html += '<div><p class="text-sm font-medium">' + perm.label + '</p>';
          html += '<p class="text-xs text-muted-foreground">' + perm.desc + '</p></div>';
          html += App.renderToggleSwitch('company-perm-' + perm.key, permissions[perm.key], 'FusionApp._companyTogglePerm(\'' + perm.key + '\')');
          html += '</div>';
        });
        html += '</div>';
      }
      html += '</div>';

      html += '</div>'; // max-width container

      return html;
    },

    init: function() {
      departments = null;
      permissions = null;
      saveState = 'idle';
      expandedSection = 'company';
    }
  };
})();
