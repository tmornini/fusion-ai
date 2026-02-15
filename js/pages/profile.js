// Fusion AI — Profile Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  App._profileSave = function() {
    var name = document.getElementById('profile-name').value.trim();
    var email = document.getElementById('profile-email').value.trim();
    var phone = document.getElementById('profile-phone').value.trim();
    var location = document.getElementById('profile-location').value.trim();
    var bio = document.getElementById('profile-bio').value.trim();

    if (!name || !email) {
      App.showToast({ title: 'Error', description: 'Name and email are required.', variant: 'destructive' });
      return;
    }

    App.store.user.name = name;
    App.store.user.email = email;
    App.store.user.phone = phone;
    App.store.user.location = location;
    App.store.user.bio = bio;

    App.showToast({ title: 'Profile updated', description: 'Your changes have been saved.' });
  };

  App.pages['/account/profile'] = {
    layout: 'dashboard',

    render: function() {
      var profile = App.store.user;
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" style="cursor:pointer" onclick="FusionApp.navigate(\'/account\')">Account</button>';
      html += icon('chevronRight', 14);
      html += '<span class="text-foreground font-medium">Profile</span>';
      html += '</div>';

      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-6">Profile</h1>';

      // Form
      html += '<div class="fusion-card p-6" style="max-width:40rem">';
      html += '<div class="space-y-4">';

      // Name
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Full Name</label>';
      html += '<input class="input w-full" id="profile-name" value="' + escapeHtml(profile.name) + '" />';
      html += '</div>';

      // Email
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Email</label>';
      html += '<input class="input w-full" id="profile-email" type="email" value="' + escapeHtml(profile.email) + '" />';
      html += '</div>';

      // Phone
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Phone</label>';
      html += '<input class="input w-full" id="profile-phone" value="' + escapeHtml(profile.phone || '') + '" placeholder="+1 (555) 000-0000" />';
      html += '</div>';

      // Location
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Location</label>';
      html += '<input class="input w-full" id="profile-location" value="' + escapeHtml(profile.location || '') + '" placeholder="City, State" />';
      html += '</div>';

      // Bio
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Bio</label>';
      html += '<textarea class="input w-full" id="profile-bio" rows="3" placeholder="Tell us about yourself...">' + escapeHtml(profile.bio || '') + '</textarea>';
      html += '</div>';

      // Role (read-only)
      html += '<div>';
      html += '<label class="text-sm font-medium text-foreground block mb-1">Role</label>';
      html += '<div class="input w-full" style="background:hsl(var(--muted));cursor:not-allowed;opacity:0.7">' + escapeHtml(profile.role) + '</div>';
      html += '</div>';

      // Save button
      html += '<div class="flex justify-end pt-2">';
      html += '<button class="btn btn-primary" onclick="FusionApp._profileSave()">' + icon('save', 16) + ' <span>Save Changes</span></button>';
      html += '</div>';

      html += '</div></div>';

      return html;
    }
  };
})();
