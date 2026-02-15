// Fusion AI — Create Idea Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var currentStep = 0;
  var formData = {
    title: '',
    problem: '',
    targetUsers: '',
    solution: '',
    expectedOutcome: '',
    successMetrics: ''
  };

  var steps = [
    { label: 'The Problem', icon: 'alertCircle' },
    { label: 'The Solution', icon: 'lightbulb' },
    { label: 'The Impact', icon: 'trendingUp' },
  ];

  App.pages['/ideas/new'] = {
    layout: 'none',

    render: function() {
      var mobile = App.isMobile();
      var html = '';

      // Full page layout
      html += '<div class="min-h-screen bg-background flex flex-col">';

      // Header
      html += '<header class="flex items-center justify-between px-4 py-3 border-b" style="border-bottom:1px solid hsl(var(--border))">';
      html += '<div class="flex items-center gap-3">';
      html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 20) + '</button>';
      html += '<div class="flex items-center gap-2">';
      html += '<div class="sidebar-logo-icon" style="width:1.75rem;height:1.75rem">' + icon('sparkles', 14) + '</div>';
      html += '<span class="font-display font-bold text-foreground">New Idea</span>';
      html += '</div>';
      html += '</div>';
      html += '<button class="btn btn-outline btn-sm">' + icon('sparkles', 14) + ' Generate with AI</button>';
      html += '</header>';

      // Step indicator
      html += '<div class="flex items-center justify-center py-6 px-4">';
      html += '<div class="step-indicator" style="max-width:28rem;width:100%">';
      steps.forEach(function(step, idx) {
        if (idx > 0) {
          html += '<div class="step-line' + (idx <= currentStep ? ' completed' : '') + '"></div>';
        }
        var dotClass = idx < currentStep ? 'completed' : idx === currentStep ? 'active' : '';
        html += '<div class="flex flex-col items-center gap-1">';
        html += '<div class="step-dot ' + dotClass + '">';
        if (idx < currentStep) {
          html += icon('check', 14);
        } else {
          html += (idx + 1);
        }
        html += '</div>';
        html += '<span class="text-xs ' + (idx === currentStep ? 'text-primary font-medium' : 'text-muted-foreground') + ' whitespace-nowrap">' + step.label + '</span>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';

      // Form content
      html += '<div class="flex-1 flex justify-center px-4 pb-24">';
      html += '<div class="w-full max-w-2xl">';

      if (currentStep === 0) {
        // Step 1: The Problem
        html += '<div class="animate-fade-in-up">';
        html += '<h2 class="text-xl font-display font-bold mb-1">What problem are you solving?</h2>';
        html += '<p class="text-sm text-muted-foreground mb-6">Describe the challenge or opportunity you\'ve identified.</p>';

        html += '<div class="form-group">';
        html += '<label class="label">Idea Title</label>';
        html += '<input class="input" id="idea-title" type="text" placeholder="e.g., AI-Powered Customer Support" value="' + escapeHtml(formData.title) + '" />';
        html += '</div>';

        html += '<div class="form-group">';
        html += '<label class="label">Problem Statement</label>';
        html += '<textarea class="input" id="idea-problem" rows="4" placeholder="Describe the problem in detail. What pain points exist? Who is affected?">' + escapeHtml(formData.problem) + '</textarea>';
        html += '</div>';

        html += '<div class="form-group">';
        html += '<label class="label">Target Users</label>';
        html += '<input class="input" id="idea-target-users" type="text" placeholder="e.g., Customer support team, End customers" value="' + escapeHtml(formData.targetUsers) + '" />';
        html += '</div>';
        html += '</div>';

      } else if (currentStep === 1) {
        // Step 2: The Solution
        html += '<div class="animate-fade-in-up">';
        html += '<h2 class="text-xl font-display font-bold mb-1">How would you solve it?</h2>';
        html += '<p class="text-sm text-muted-foreground mb-6">Outline your proposed solution approach.</p>';

        html += '<div class="form-group">';
        html += '<label class="label">Proposed Solution</label>';
        html += '<textarea class="input" id="idea-solution" rows="6" placeholder="Describe your solution. What approach would you take? What technologies or methods would be involved?">' + escapeHtml(formData.solution) + '</textarea>';
        html += '</div>';

        // Tip box
        html += '<div class="fusion-card p-4" style="background:hsl(var(--info-soft));border-color:hsl(var(--info-border))">';
        html += '<div class="flex items-start gap-3">';
        html += '<div class="text-primary mt-0.5">' + icon('info', 16) + '</div>';
        html += '<div>';
        html += '<p class="text-sm font-medium">Tip</p>';
        html += '<p class="text-xs text-muted-foreground mt-1">Be specific about your approach. Include technical details, estimated resources, and any dependencies. The AI scorer works best with detailed solutions.</p>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

      } else if (currentStep === 2) {
        // Step 3: The Impact
        html += '<div class="animate-fade-in-up">';
        html += '<h2 class="text-xl font-display font-bold mb-1">What impact will this have?</h2>';
        html += '<p class="text-sm text-muted-foreground mb-6">Define the expected outcomes and how you\'ll measure success.</p>';

        html += '<div class="form-group">';
        html += '<label class="label">Expected Outcome</label>';
        html += '<textarea class="input" id="idea-outcome" rows="4" placeholder="What results do you expect? How will this improve the current situation?">' + escapeHtml(formData.expectedOutcome) + '</textarea>';
        html += '</div>';

        html += '<div class="form-group">';
        html += '<label class="label">Success Metrics</label>';
        html += '<textarea class="input" id="idea-metrics" rows="4" placeholder="How will you measure success? List specific KPIs or targets.">' + escapeHtml(formData.successMetrics) + '</textarea>';
        html += '</div>';

        // Tip box
        html += '<div class="fusion-card p-4" style="background:hsl(var(--accent-soft));border-color:hsl(var(--warning-border))">';
        html += '<div class="flex items-start gap-3">';
        html += '<div class="text-warning mt-0.5">' + icon('sparkles', 16) + '</div>';
        html += '<div>';
        html += '<p class="text-sm font-medium">Next: AI Scoring</p>';
        html += '<p class="text-xs text-muted-foreground mt-1">After submitting, our AI will analyze your idea across impact, feasibility, and efficiency dimensions to generate a comprehensive score.</p>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      }

      html += '</div>';
      html += '</div>';

      // Bottom navigation bar
      html += '<div class="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3" style="border-top:1px solid hsl(var(--border));z-index:50">';
      html += '<div class="flex items-center justify-between max-w-2xl mx-auto">';

      // Left: Back/Cancel
      if (currentStep === 0) {
        html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp.navigate(\'/ideas\')">' + icon('x', 16) + ' Cancel</button>';
      } else {
        html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._ideaCreateBack()">' + icon('arrowLeft', 16) + ' Back</button>';
      }

      // Center: step counter
      html += '<span class="text-xs text-muted-foreground">Step ' + (currentStep + 1) + ' of ' + steps.length + '</span>';

      // Right: Continue/Submit
      if (currentStep < steps.length - 1) {
        html += '<button class="btn btn-primary btn-sm" onclick="FusionApp._ideaCreateNext()">Continue ' + icon('arrowRight', 16) + '</button>';
      } else {
        html += '<button class="btn btn-primary btn-sm" onclick="FusionApp._ideaCreateSubmit()">' + icon('sparkles', 16) + ' Score Idea</button>';
      }

      html += '</div>';
      html += '</div>';

      html += '</div>';

      return html;
    },

    init: function() {
      // Save form data on input changes
      function bindField(elId, key) {
        var el = document.getElementById(elId);
        if (el) {
          el.addEventListener('input', function() {
            formData[key] = el.value;
          });
        }
      }

      bindField('idea-title', 'title');
      bindField('idea-problem', 'problem');
      bindField('idea-target-users', 'targetUsers');
      bindField('idea-solution', 'solution');
      bindField('idea-outcome', 'expectedOutcome');
      bindField('idea-metrics', 'successMetrics');
    }
  };

  App._ideaCreateNext = function() {
    if (currentStep < steps.length - 1) {
      currentStep++;
      App.render();
    }
  };

  App._ideaCreateBack = function() {
    if (currentStep > 0) {
      currentStep--;
      App.render();
    }
  };

  App._ideaCreateSubmit = function() {
    var title = formData.title;
    var description = formData.problem + '\n\n' + formData.solution;

    fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, description: description })
    }).then(function(res) { return res.json(); }).then(function(data) {
      currentStep = 0;
      formData = { title: '', problem: '', targetUsers: '', solution: '', expectedOutcome: '', successMetrics: '' };
      App.showToast({ title: 'Idea submitted!', description: 'Redirecting to AI scoring...' });
      App.navigate('/ideas/' + data.idea.id + '/score');
    });
  };
})();
