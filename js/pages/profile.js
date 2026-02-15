// Fusion AI — Profile Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var allStrengths = ['Strategic Planning', 'Data Analysis', 'Stakeholder Management', 'Agile Methods', 'Team Leadership', 'Risk Management', 'Budget Planning', 'Technical Writing', 'User Research', 'Prototyping'];
  var selectedStrengths = null; // Initialized from store on first render

  var saveState = 'idle'; // idle | saving | saved

  App._profileSave = function() {
    var firstName = document.getElementById('profile-first-name');
    var lastName = document.getElementById('profile-last-name');
    var email = document.getElementById('profile-email');

    if (firstName) App.store.user.firstName = firstName.value.trim();
    if (lastName) App.store.user.lastName = lastName.value.trim();
    if (firstName && lastName) App.store.user.name = firstName.value.trim() + ' ' + lastName.value.trim();
    if (email) App.store.user.email = email.value.trim();

    var phone = document.getElementById('profile-phone');
    if (phone) App.store.user.phone = phone.value.trim();
    var role = document.getElementById('profile-role');
    if (role) App.store.user.role = role.value.trim();
    var dept = document.getElementById('profile-department');
    if (dept) App.store.user.department = dept.value;
    var bio = document.getElementById('profile-bio');
    if (bio) App.store.user.bio = bio.value.trim();

    App.store.user.strengths = selectedStrengths.slice();

    // Animate save button
    saveState = 'saving';
    var btn = document.getElementById('profile-save-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Saving...';
    }

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

  App._profileToggleStrength = function(strength) {
    var idx = selectedStrengths.indexOf(strength);
    if (idx >= 0) selectedStrengths.splice(idx, 1);
    else selectedStrengths.push(strength);
    // Update button in-place
    var btnId = 'strength-' + strength.replace(/\s+/g, '-').toLowerCase();
    var btn = document.getElementById(btnId);
    if (btn) {
      var isActive = selectedStrengths.indexOf(strength) >= 0;
      btn.className = 'strength-btn' + (isActive ? ' active' : '');
      btn.innerHTML = (isActive ? icon('checkCircle2', 12) + ' ' : '') + escapeHtml(strength);
    }
  };

  App.pages['/account/profile'] = {
    layout: 'dashboard',

    render: function() {
      var profile = App.store.user;
      if (selectedStrengths === null) {
        selectedStrengths = (profile.strengths || []).slice();
      }

      var initials = (profile.firstName || 'D').charAt(0) + (profile.lastName || 'U').charAt(0);
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer;background:none;border:none;padding:0;font:inherit;color:inherit" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Profile</span>';
      html += '</div>';

      // Header with save button
      html += '<div class="flex items-center justify-between mb-8" style="flex-wrap:wrap;gap:1rem">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold mb-1">My Profile</h1>';
      html += '<p class="text-sm text-muted-foreground">Update your personal information and preferences</p>';
      html += '</div>';
      html += '<button class="btn btn-primary" id="profile-save-btn" onclick="FusionApp._profileSave()">' + icon('save', 16) + ' Save Changes</button>';
      html += '</div>';

      // Personal Information Card
      html += '<div class="fusion-card p-6 mb-6" style="max-width:48rem">';
      html += '<h3 class="font-display font-semibold mb-4">Personal Information</h3>';

      // Avatar + First/Last name row
      html += '<div class="flex items-start gap-6 mb-6" style="flex-wrap:wrap">';
      // Avatar
      html += '<div style="position:relative;flex-shrink:0">';
      html += '<div style="width:6rem;height:6rem;border-radius:1rem;display:flex;align-items:center;justify-content:center;font-size:1.75rem;font-weight:700;color:hsl(var(--primary-foreground));background:linear-gradient(135deg,hsl(var(--primary) / 0.2),hsl(var(--primary) / 0.05))">';
      html += '<span class="text-primary">' + escapeHtml(initials) + '</span>';
      html += '</div>';
      html += '<button style="position:absolute;bottom:-0.5rem;right:-0.5rem;width:2rem;height:2rem;border-radius:9999px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));border:2px solid hsl(var(--card));display:flex;align-items:center;justify-content:center;cursor:pointer" onclick="FusionApp.showToast({title:\'Coming soon\',description:\'Avatar upload is not yet available.\'})">';
      html += icon('camera', 14);
      html += '</button>';
      html += '</div>';

      // First/Last name next to avatar
      html += '<div class="flex-1" style="min-width:12rem">';
      html += '<div class="grid grid-cols-2 gap-4">';
      html += '<div><label class="text-sm font-medium block mb-2">First Name</label>';
      html += '<input class="input w-full" id="profile-first-name" value="' + escapeHtml(profile.firstName || '') + '" /></div>';
      html += '<div><label class="text-sm font-medium block mb-2">Last Name</label>';
      html += '<input class="input w-full" id="profile-last-name" value="' + escapeHtml(profile.lastName || '') + '" /></div>';
      html += '</div></div>';
      html += '</div>';

      // Email + Phone row
      html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">';
      html += '<div><label class="text-sm font-medium mb-2 flex items-center gap-2"><span class="text-muted-foreground">' + icon('mail', 14) + '</span> Email</label>';
      html += '<input class="input w-full" id="profile-email" type="email" value="' + escapeHtml(profile.email) + '" /></div>';
      html += '<div><label class="text-sm font-medium mb-2 flex items-center gap-2"><span class="text-muted-foreground">' + icon('phone', 14) + '</span> Phone</label>';
      html += '<input class="input w-full" id="profile-phone" value="' + escapeHtml(profile.phone || '') + '" /></div>';
      html += '</div>';

      // Role + Department row
      html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">';
      html += '<div><label class="text-sm font-medium mb-2 flex items-center gap-2"><span class="text-muted-foreground">' + icon('briefcase', 14) + '</span> Role</label>';
      html += '<input class="input w-full" id="profile-role" value="' + escapeHtml(profile.role) + '" /></div>';
      html += '<div><label class="text-sm font-medium block mb-2">Department</label>';
      html += App.renderSelect(
        [{ value: 'Product', label: 'Product' }, { value: 'Engineering', label: 'Engineering' }, { value: 'Design', label: 'Design' }, { value: 'Sales', label: 'Sales' }],
        profile.department || 'Product', 'profile-department', ''
      );
      html += '</div></div>';

      // Bio
      html += '<div>';
      html += '<label class="text-sm font-medium block mb-2">Bio</label>';
      html += '<textarea class="input w-full" id="profile-bio" rows="3" style="resize:none">' + escapeHtml(profile.bio || '') + '</textarea>';
      html += '</div>';

      html += '</div>';

      // My Strengths Card
      html += '<div class="fusion-card p-6" style="max-width:48rem">';
      html += '<h3 class="font-display font-semibold mb-4 flex items-center gap-2"><span class="text-primary">' + icon('star', 20) + '</span> My Strengths</h3>';
      html += '<div class="flex gap-2" style="flex-wrap:wrap">';
      allStrengths.forEach(function(strength) {
        var isActive = selectedStrengths.indexOf(strength) >= 0;
        var btnId = 'strength-' + strength.replace(/\s+/g, '-').toLowerCase();
        html += '<button class="strength-btn' + (isActive ? ' active' : '') + '" id="' + btnId + '" onclick="FusionApp._profileToggleStrength(\'' + escapeHtml(strength) + '\')">';
        if (isActive) html += icon('checkCircle2', 12) + ' ';
        html += escapeHtml(strength);
        html += '</button>';
      });
      html += '</div></div>';

      return html;
    },

    init: function() {
      selectedStrengths = null;
      saveState = 'idle';
    }
  };
})();
