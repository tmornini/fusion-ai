// Fusion AI — Approval Detail Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var feedback = '';

  var severityConfig = {
    high: { color: 'destructive' },
    medium: { color: 'warning' },
    low: { color: 'muted-foreground' }
  };

  var confidenceConfig = {
    high: { label: 'High Confidence', color: 'success' },
    medium: { label: 'Medium Confidence', color: 'warning' },
    low: { label: 'Low Confidence', color: 'destructive' }
  };

  App.pages['/review/:id'] = {
    layout: 'dashboard',

    render: function(params) {
      var review = App.store.reviews.find(function(r) { return r.id === params.id; });
      if (!review) {
        return App.renderEmptyState('alertCircle', 'Review not found', 'The requested review item could not be found.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/review\')">Back to Review Queue</button>');
      }

      var idea = App.store.ideas.find(function(i) { return i.id === review.ideaId; });
      var edge = App.store.edges.find(function(e) { return e.ideaId === review.ideaId; });
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" onclick="FusionApp.navigate(\'/review\')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font:inherit">' + icon('arrowLeft', 16) + ' Review Queue</button>';
      html += '<span>' + icon('chevronRight', 14) + '</span>';
      html += '<span class="text-foreground font-medium">' + escapeHtml(review.ideaTitle) + '</span>';
      html += '</div>';

      // Meta info row
      html += '<div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">';
      html += '<div class="flex items-center gap-1.5">' + icon('user', 14) + ' <span class="text-foreground font-medium">' + escapeHtml(review.submittedBy) + '</span></div>';
      html += '<div class="flex items-center gap-1.5">' + icon('calendar', 14) + ' ' + App.formatDate(review.submittedAt) + '</div>';
      html += '<div class="flex items-center gap-1.5">' + icon('target', 14) + ' ' + escapeHtml(review.category) + '</div>';
      html += '<div class="flex items-center gap-1.5">' + icon('messageSquare', 14) + ' ' + (review.comments || 0) + ' comments</div>';
      html += '</div>';

      // Score Banner
      if (review.score) {
        html += '<div class="fusion-card p-5 mb-6" style="background:linear-gradient(to right, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.1));border-color:hsl(var(--primary) / 0.2)">';
        html += '<div class="flex items-center justify-between flex-wrap gap-4">';
        html += '<div>';
        html += '<p class="text-xs text-muted-foreground mb-1">Innovation Score</p>';
        html += '<div class="flex items-baseline gap-2">';
        html += '<span class="text-4xl font-bold" style="color:hsl(var(--primary))">' + review.score + '</span>';
        html += '<span class="text-muted-foreground">/100</span>';
        html += '</div></div>';
        html += '<div class="grid grid-cols-3 gap-6 text-center">';
        html += '<div><p class="text-xs text-muted-foreground mb-1">Impact</p><p class="text-lg font-semibold">' + escapeHtml(review.impact || 'High') + '</p></div>';
        html += '<div><p class="text-xs text-muted-foreground mb-1">Effort</p><p class="text-lg font-semibold">' + escapeHtml(review.effort || 'Medium') + '</p></div>';
        html += '<div><p class="text-xs text-muted-foreground mb-1">Timeline</p><p class="text-lg font-semibold">' + escapeHtml(review.timeEstimate || '3-4 months') + '</p></div>';
        html += '</div></div></div>';
      }

      // Idea Overview
      html += '<div class="fusion-card p-5 mb-4">';
      html += '<h3 class="text-base font-semibold flex items-center gap-2 mb-3">' + icon('lightbulb', 18) + ' Idea Overview</h3>';
      if (idea && idea.description) {
        html += '<p class="text-sm" style="line-height:1.6">' + escapeHtml(idea.description) + '</p>';
      } else {
        html += '<p class="text-sm text-muted-foreground">' + escapeHtml(review.summary) + '</p>';
      }
      html += '</div>';

      // Impact & Effort side-by-side
      html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">';
      html += '<div class="fusion-card p-5">';
      html += '<h3 class="text-sm font-semibold flex items-center gap-2 mb-3"><span style="color:hsl(var(--success))">' + icon('trendingUp', 16) + '</span> Expected Impact</h3>';
      if (idea && idea.expectedOutcome) {
        html += '<p class="text-sm">' + escapeHtml(idea.expectedOutcome) + '</p>';
      } else {
        html += '<p class="text-sm text-muted-foreground">High impact expected</p>';
      }
      html += '</div>';
      html += '<div class="fusion-card p-5">';
      html += '<h3 class="text-sm font-semibold flex items-center gap-2 mb-3"><span style="color:hsl(var(--warning))">' + icon('clock', 16) + '</span> Effort Required</h3>';
      html += '<div class="space-y-2">';
      html += '<div class="flex justify-between"><span class="text-sm text-muted-foreground">Timeline</span><span class="text-sm font-medium">' + escapeHtml(review.timeEstimate || idea && idea.estimatedTime || '3-4 months') + '</span></div>';
      html += '<div class="flex justify-between"><span class="text-sm text-muted-foreground">Team Size</span><span class="text-sm font-medium">4-5 engineers</span></div>';
      html += '</div></div></div>';

      // Cost Estimate
      if (review.costEstimate) {
        html += '<div class="fusion-card p-5 mb-4">';
        html += '<h3 class="text-sm font-semibold flex items-center gap-2 mb-3">' + icon('dollarSign', 16) + ' Cost Estimate</h3>';
        html += '<p class="text-xl font-bold mb-1">' + escapeHtml(review.costEstimate) + '</p>';
        if (review.costBreakdown) {
          html += '<p class="text-xs text-muted-foreground">' + escapeHtml(review.costBreakdown) + '</p>';
        }
        html += '</div>';
      }

      // Edge: Business Outcomes & Success Criteria
      if (edge && (edge.outcomes || edge.impact)) {
        var conf = confidenceConfig[edge.confidence] || confidenceConfig.medium;
        html += '<div class="fusion-card p-5 mb-4" style="background:linear-gradient(to right, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.1));border-color:hsl(var(--primary) / 0.2)">';
        html += '<div class="flex items-center justify-between mb-4">';
        html += '<h3 class="text-base font-semibold flex items-center gap-2">' + icon('target', 18) + ' Edge: Business Outcomes & Success Criteria</h3>';
        html += '<span class="badge badge-' + conf.color + '">' + icon('shield', 12) + ' ' + conf.label + '</span>';
        html += '</div>';

        // Outcomes with Metrics
        if (edge.outcomes && edge.outcomes.length) {
          html += '<div class="space-y-3 mb-4">';
          edge.outcomes.forEach(function(outcome, idx) {
            html += '<div class="p-4 rounded-lg" style="background:hsl(var(--background));border:1px solid hsl(var(--border))">';
            html += '<div class="flex items-start gap-2 mb-3">';
            html += '<div style="width:1.25rem;height:1.25rem;border-radius:9999px;background:hsl(var(--primary) / 0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span class="text-xs font-bold" style="color:hsl(var(--primary))">' + (idx + 1) + '</span></div>';
            html += '<p class="font-medium text-sm">' + escapeHtml(outcome.description || outcome.label) + '</p>';
            html += '</div>';
            if (outcome.metrics && outcome.metrics.length) {
              html += '<div style="padding-left:1.75rem" class="flex flex-wrap gap-2">';
              outcome.metrics.forEach(function(m) {
                html += '<div class="flex items-center gap-2 px-3 py-1.5 rounded-full" style="background:hsl(var(--muted) / 0.5);border:1px solid hsl(var(--border))">';
                html += '<span style="color:hsl(var(--primary))">' + icon('gauge', 14) + '</span>';
                html += '<span class="text-xs">' + escapeHtml(m.name) + ': <strong style="color:hsl(var(--primary))">' + (m.unit === '$' ? '$' + m.target : m.target + m.unit) + '</strong></span>';
                html += '</div>';
              });
              html += '</div>';
            }
            html += '</div>';
          });
          html += '</div>';
        }

        // Impact Timeline
        if (edge.impact) {
          html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">';
          var timelines = [
            { label: 'Short-term (0-3mo)', text: edge.impact.shortTerm, color: 'success' },
            { label: 'Mid-term (3-12mo)', text: edge.impact.midTerm, color: 'warning' },
            { label: 'Long-term (12+mo)', text: edge.impact.longTerm, color: 'primary' }
          ];
          timelines.forEach(function(t) {
            html += '<div class="p-3 rounded-lg" style="background:hsl(var(--' + t.color + ') / 0.05);border:1px solid hsl(var(--' + t.color + ') / 0.2)">';
            html += '<div class="flex items-center gap-1.5 mb-2">';
            html += '<span style="color:hsl(var(--' + t.color + '))">' + icon('clock', 14) + '</span>';
            html += '<span class="text-xs font-medium" style="color:hsl(var(--' + t.color + '))">' + t.label + '</span>';
            html += '</div>';
            html += '<p class="text-xs">' + escapeHtml(t.text) + '</p>';
            html += '</div>';
          });
          html += '</div>';
        }

        // Owner
        if (edge.owner) {
          html += '<div class="flex items-center justify-between pt-3" style="border-top:1px solid hsl(var(--border))">';
          html += '<span class="text-xs text-muted-foreground">Edge Owner</span>';
          html += '<span class="text-sm font-medium">' + escapeHtml(edge.owner) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }

      // Risks
      if (review.risks && review.risks.length) {
        html += '<div class="fusion-card p-5 mb-4">';
        html += '<h3 class="text-sm font-semibold flex items-center gap-2 mb-3"><span style="color:hsl(var(--warning))">' + icon('alertTriangle', 16) + '</span> Identified Risks</h3>';
        html += '<div class="space-y-3">';
        review.risks.forEach(function(risk) {
          var sev = severityConfig[risk.severity] || severityConfig.medium;
          html += '<div class="p-4 rounded-lg" style="background:hsl(var(--muted) / 0.3);border:1px solid hsl(var(--border))">';
          html += '<div class="flex items-center justify-between mb-2">';
          html += '<h4 class="text-sm font-medium">' + escapeHtml(risk.title) + '</h4>';
          html += '<span class="badge badge-' + sev.color + '" style="font-size:0.6rem">' + risk.severity + '</span>';
          html += '</div>';
          html += '<p class="text-xs text-muted-foreground"><span class="font-medium">Mitigation:</span> ' + escapeHtml(risk.mitigation) + '</p>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Assumptions
      if (review.assumptions && review.assumptions.length) {
        html += '<div class="fusion-card p-5 mb-4">';
        html += '<h3 class="text-sm font-semibold mb-3">Key Assumptions</h3>';
        html += '<ul class="space-y-2">';
        review.assumptions.forEach(function(a) {
          html += '<li class="flex items-start gap-2 text-sm"><span style="color:hsl(var(--primary));margin-top:0.25rem">&bull;</span> ' + escapeHtml(a) + '</li>';
        });
        html += '</ul></div>';
      }

      // Strategic Alignment
      if (review.alignments && review.alignments.length) {
        html += '<div class="fusion-card p-5 mb-4">';
        html += '<h3 class="text-sm font-semibold flex items-center gap-2 mb-3">' + icon('users', 16) + ' Strategic Alignment</h3>';
        html += '<div class="flex flex-wrap gap-2">';
        review.alignments.forEach(function(a) {
          html += '<span class="badge" style="background:hsl(var(--primary) / 0.1);color:hsl(var(--primary));border:none">' + escapeHtml(a) + '</span>';
        });
        html += '</div></div>';
      }

      // Decision Bar
      if (review.status === 'pending') {
        html += '<div class="fusion-card p-4 mt-6" style="position:sticky;bottom:1rem;background:hsl(var(--background) / 0.95);backdrop-filter:blur(8px);z-index:10">';
        html += '<div class="flex items-center justify-between flex-wrap gap-3">';
        html += '<button class="btn btn-outline btn-sm" onclick="FusionApp._approvalClarify(\'' + escapeHtml(params.id) + '\')">' + icon('messageSquare', 14) + ' Request Clarification</button>';
        html += '<div class="flex gap-2">';
        html += '<button class="btn btn-outline btn-sm" onclick="FusionApp._approvalReject(\'' + escapeHtml(params.id) + '\')" style="border-color:hsl(var(--destructive) / 0.3);color:hsl(var(--destructive))">' + icon('xCircle', 14) + ' Send Back</button>';
        html += '<button class="btn btn-sm" onclick="FusionApp._approvalApprove(\'' + escapeHtml(params.id) + '\')" style="background:hsl(142 71% 35%);color:white">' + icon('checkCircle2', 14) + ' Approve</button>';
        html += '</div></div></div>';
      } else {
        html += '<div class="flex justify-center mt-6">' + App.renderStatusBadge(review.status) + '</div>';
      }

      return html;
    },

    init: function() {
      feedback = '';
    }
  };

  App._approvalApprove = function(reviewId) {
    var review = App.store.reviews.find(function(r) { return r.id === reviewId; });
    if (review) review.status = 'approved';
    App.showToast({ title: 'Idea approved', description: 'The submitter has been notified and the idea is moving to project planning.' });
    App.navigate('/review');
  };

  App._approvalReject = function(reviewId) {
    var html = '<h2 class="text-lg font-semibold mb-2">Send Back for Revision</h2>';
    html += '<p class="text-sm text-muted-foreground mb-4">Provide feedback to help the submitter improve their idea.</p>';
    html += '<textarea class="input w-full" id="ad-reject-feedback" rows="4" placeholder="Explain what changes or additional information is needed...">' + escapeHtml(feedback) + '</textarea>';
    html += '<div class="flex gap-2 justify-end mt-4">';
    html += '<button class="btn btn-ghost" onclick="FusionApp.closeModal()">Cancel</button>';
    html += '<button class="btn" style="background:hsl(var(--destructive));color:white" onclick="FusionApp._approvalDoReject(\'' + reviewId + '\')">Send Back</button>';
    html += '</div>';
    App.showModal({ content: html });
  };

  App._approvalDoReject = function(reviewId) {
    var review = App.store.reviews.find(function(r) { return r.id === reviewId; });
    if (review) review.status = 'rejected';
    App.closeModal();
    App.showToast({ title: 'Idea sent back', description: 'The submitter has been notified with your feedback.' });
    App.navigate('/review');
  };

  App._approvalClarify = function(reviewId) {
    var html = '<h2 class="text-lg font-semibold mb-2">Request Clarification</h2>';
    html += '<p class="text-sm text-muted-foreground mb-4">Ask the submitter for additional details before making a decision.</p>';
    html += '<textarea class="input w-full" id="ad-clarify-feedback" rows="4" placeholder="What additional information do you need?">' + escapeHtml(feedback) + '</textarea>';
    html += '<div class="flex gap-2 justify-end mt-4">';
    html += '<button class="btn btn-ghost" onclick="FusionApp.closeModal()">Cancel</button>';
    html += '<button class="btn btn-primary" onclick="FusionApp._approvalDoClarify()">Send Request</button>';
    html += '</div>';
    App.showModal({ content: html });
  };

  App._approvalDoClarify = function() {
    App.closeModal();
    App.showToast({ title: 'Clarification requested', description: 'The submitter has been notified to provide additional information.' });
  };
})();
