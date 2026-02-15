// Fusion AI — Approval Detail Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var approving = false;
  var rejecting = false;

  App.pages['/review/:id'] = {
    layout: 'dashboard',

    render: function(params) {
      var review = App.store.reviews.find(function(r) { return r.id === params.id; });
      if (!review) {
        return App.renderEmptyState('alertCircle', 'Review not found', 'The requested review item could not be found.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/review\')">Back to Review Queue</button>');
      }

      var idea = App.store.ideas.find(function(i) { return i.id === review.ideaId; });
      var edge = App.store.edges.find(function(e) { return e.ideaId === review.ideaId; });
      var mobile = App.isMobile();
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" onclick="FusionApp.navigate(\'/review\')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font:inherit">Review Queue</button>';
      html += '<span>' + icon('chevronRight', 14) + '</span>';
      html += '<span class="text-foreground font-medium">' + escapeHtml(review.ideaTitle) + '</span>';
      html += '</div>';

      // Title and actions
      html += '<div class="flex items-center justify-between mb-8 ' + (mobile ? 'flex-col gap-4 items-start' : '') + '">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">' + escapeHtml(review.ideaTitle) + '</h1>';
      html += '<p class="text-muted-foreground">Submitted by ' + escapeHtml(review.submittedBy) + ' on ' + App.formatDate(review.submittedAt) + '</p>';
      html += '</div>';

      if (review.status === 'pending') {
        html += '<div class="flex items-center gap-2">';
        html += '<button class="btn btn-outline" onclick="FusionApp._approvalReject(\'' + escapeHtml(params.id) + '\')" ' + (rejecting ? 'disabled' : '') + ' style="border-color:hsl(var(--destructive));color:hsl(var(--destructive))">';
        if (rejecting) {
          html += '<span class="animate-spin">' + icon('loader2', 16) + '</span> Rejecting...';
        } else {
          html += icon('thumbsDown', 16) + ' Reject';
        }
        html += '</button>';
        html += '<button class="btn btn-primary" onclick="FusionApp._approvalApprove(\'' + escapeHtml(params.id) + '\')" ' + (approving ? 'disabled' : '') + '>';
        if (approving) {
          html += '<span class="animate-spin">' + icon('loader2', 16) + '</span> Approving...';
        } else {
          html += icon('thumbsUp', 16) + ' Approve';
        }
        html += '</button>';
        html += '</div>';
      } else {
        html += '<div>' + App.renderStatusBadge(review.status) + '</div>';
      }
      html += '</div>';

      // Idea details card
      html += '<div class="' + (mobile ? '' : 'grid grid-cols-3 gap-6') + '">';

      // Main content (2/3)
      html += '<div class="' + (mobile ? 'mb-6' : 'col-span-2') + '">';

      // Description
      html += '<div class="fusion-card p-6 mb-6">';
      html += '<h3 class="text-lg font-semibold mb-3">Description</h3>';
      if (idea && idea.description) {
        html += '<p class="text-muted-foreground leading-relaxed">' + escapeHtml(idea.description) + '</p>';
      } else {
        html += '<p class="text-muted-foreground">' + escapeHtml(review.summary) + '</p>';
      }
      html += '</div>';

      // Score display
      if (idea && idea.score) {
        html += '<div class="fusion-card p-6 mb-6">';
        html += '<h3 class="text-lg font-semibold mb-3">' + icon('barChart3', 18) + ' AI Score</h3>';
        html += '<div class="flex items-center gap-4 mb-3">';
        html += '<div class="text-4xl font-bold font-display">' + idea.score + '</div>';
        html += '<div class="flex-1">';
        html += App.renderProgress(idea.score, 100);
        html += '</div>';
        html += '<div class="text-sm text-muted-foreground">/100</div>';
        html += '</div>';
        var scoreLabel = idea.score >= 80 ? 'Excellent' : idea.score >= 60 ? 'Good' : idea.score >= 40 ? 'Fair' : 'Needs Work';
        var scoreBadge = idea.score >= 80 ? 'success' : idea.score >= 60 ? 'info' : idea.score >= 40 ? 'warning' : 'error';
        html += '<div>' + App.renderBadge(scoreLabel, scoreBadge) + '</div>';
        html += '</div>';
      }

      // Edge / Outcomes display
      if (edge) {
        html += '<div class="fusion-card p-6">';
        html += '<h3 class="text-lg font-semibold mb-3">' + icon('target', 18) + ' Edge &mdash; ' + escapeHtml(edge.title) + '</h3>';
        html += '<div class="space-y-3">';
        edge.outcomes.forEach(function(outcome) {
          html += '<div style="border:1px solid hsl(var(--border));border-radius:var(--radius);padding:0.75rem">';
          html += '<div class="flex items-center justify-between mb-2">';
          html += '<span class="font-medium text-sm">' + escapeHtml(outcome.label) + '</span>';
          html += App.renderStatusBadge(outcome.status);
          html += '</div>';
          html += '<div class="flex items-center gap-4 text-sm text-muted-foreground">';
          html += '<span>Target: <strong class="text-foreground">' + escapeHtml(outcome.target) + '</strong></span>';
          html += '<span>Current: <strong class="text-foreground">' + escapeHtml(outcome.current) + '</strong></span>';
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';
      }

      html += '</div>'; // main content

      // Sidebar (1/3)
      html += '<div>';
      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-lg font-semibold mb-4">Details</h3>';
      html += '<div class="space-y-3">';

      // Submitter
      html += '<div>';
      html += '<div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Submitter</div>';
      html += '<div class="flex items-center gap-2">';
      html += '<div class="w-6 h-6 rounded-full bg-muted flex items-center justify-center">' + icon('user', 14) + '</div>';
      html += '<span class="text-sm font-medium">' + escapeHtml(review.submittedBy) + '</span>';
      html += '</div>';
      html += '</div>';

      // Date
      html += '<div>';
      html += '<div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Submitted</div>';
      html += '<div class="text-sm">' + App.formatDate(review.submittedAt) + '</div>';
      html += '</div>';

      // Category
      html += '<div>';
      html += '<div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category</div>';
      html += '<div>' + App.renderBadge(review.category, 'secondary') + '</div>';
      html += '</div>';

      // Priority
      html += '<div>';
      html += '<div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Priority</div>';
      html += '<div>' + App.renderPriorityBadge(review.priority) + '</div>';
      html += '</div>';

      // Status
      html += '<div>';
      html += '<div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>';
      html += '<div>' + App.renderStatusBadge(review.status) + '</div>';
      html += '</div>';

      // Tags
      if (idea && idea.tags && idea.tags.length > 0) {
        html += '<div>';
        html += '<div class="text-xs text-muted-foreground uppercase tracking-wider mb-1">Tags</div>';
        html += '<div class="flex flex-wrap gap-1">';
        idea.tags.forEach(function(tag) {
          html += App.renderBadge(tag, 'secondary');
        });
        html += '</div>';
        html += '</div>';
      }

      html += '</div>'; // space-y
      html += '</div>'; // card
      html += '</div>'; // sidebar

      html += '</div>'; // grid

      return html;
    },

    init: function() {
      return function() {
        approving = false;
        rejecting = false;
      };
    }
  };

  App._approvalApprove = function(reviewId) {
    if (!confirm('Are you sure you want to approve this idea?')) return;

    approving = true;
    App.render();

    fetch('/api/review/' + reviewId + '/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
    .then(function(res) { return res.json(); })
    .then(function() {
      approving = false;
      App.showToast({ title: 'Approved', description: 'The idea has been approved successfully' });
      App.navigate('/review');
    });
  };

  App._approvalReject = function(reviewId) {
    if (!confirm('Are you sure you want to reject this idea?')) return;

    rejecting = true;
    App.render();

    fetch('/api/review/' + reviewId + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
    .then(function(res) { return res.json(); })
    .then(function() {
      rejecting = false;
      App.showToast({ title: 'Rejected', description: 'The idea has been rejected', variant: 'destructive' });
      App.navigate('/review');
    });
  };
})();
