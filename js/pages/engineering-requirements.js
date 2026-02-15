// Fusion AI — Engineering Requirements Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var saving = false;
  var engData = {
    techStack: 'React, Node.js, PostgreSQL, Redis, Docker',
    architectureNotes: 'Microservices architecture with API gateway. Event-driven communication between services using message queues.',
    constraints: 'Must support 10k concurrent users. Response time < 200ms for API calls. GDPR compliance required.',
    questions: [
      { id: 'q1', question: 'What authentication method should we use?', answer: 'OAuth 2.0 with JWT tokens. Support SSO via SAML for enterprise clients.', author: 'Alex Kim', date: '2025-02-10' },
      { id: 'q2', question: 'How should we handle data migrations?', answer: 'Use versioned migration scripts with rollback support. Run migrations in a maintenance window for breaking changes.', author: 'Tom Wilson', date: '2025-02-08' },
      { id: 'q3', question: 'What is the deployment strategy?', answer: 'Blue-green deployment with automated rollback. Use feature flags for gradual rollouts.', author: 'Sarah Chen', date: '2025-02-05' },
    ]
  };

  App.pages['/projects/:projectId/engineering'] = {
    layout: 'dashboard',

    render: function(params) {
      var project = App.store.projects.find(function(p) { return p.id === params.projectId; });
      if (!project) {
        return App.renderEmptyState('alertCircle', 'Project not found', 'The requested project could not be found.', '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/projects\')">Back to Projects</button>');
      }

      var mobile = App.isMobile();
      var html = '';

      // Breadcrumb
      html += '<div class="flex items-center gap-2 text-sm text-muted-foreground mb-6">';
      html += '<button class="hover:text-foreground" onclick="FusionApp.navigate(\'/projects\')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font:inherit">Projects</button>';
      html += '<span>' + icon('chevronRight', 14) + '</span>';
      html += '<button class="hover:text-foreground" onclick="FusionApp.navigate(\'/projects/' + escapeHtml(project.id) + '\')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font:inherit">' + escapeHtml(project.name) + '</button>';
      html += '<span>' + icon('chevronRight', 14) + '</span>';
      html += '<span class="text-foreground font-medium">Engineering</span>';
      html += '</div>';

      // Title
      html += '<div class="flex items-center justify-between mb-8">';
      html += '<div>';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">Engineering Requirements</h1>';
      html += '<p class="text-muted-foreground">' + escapeHtml(project.name) + ' &mdash; Technical specifications and decisions</p>';
      html += '</div>';
      html += '<button class="btn btn-primary" onclick="FusionApp._engSave(\'' + escapeHtml(params.projectId) + '\')" ' + (saving ? 'disabled' : '') + '>';
      if (saving) {
        html += '<span class="animate-spin">' + icon('loader2', 16) + '</span> Saving...';
      } else {
        html += icon('save', 16) + ' Save';
      }
      html += '</button>';
      html += '</div>';

      // Engineering context section
      html += '<div class="fusion-card p-6 mb-6">';
      html += '<h3 class="text-lg font-semibold mb-4">' + icon('layers', 18) + ' Engineering Context</h3>';

      html += '<div class="space-y-4">';

      // Tech Stack
      html += '<div>';
      html += '<label class="text-sm font-medium mb-1 block">Tech Stack</label>';
      html += '<input class="input w-full" id="eng-tech-stack" type="text" value="' + escapeHtml(engData.techStack) + '" placeholder="e.g. React, Node.js, PostgreSQL" />';
      html += '</div>';

      // Architecture Notes
      html += '<div>';
      html += '<label class="text-sm font-medium mb-1 block">Architecture Notes</label>';
      html += '<textarea class="input w-full" id="eng-arch-notes" rows="4" placeholder="Describe the architecture approach...">' + escapeHtml(engData.architectureNotes) + '</textarea>';
      html += '</div>';

      // Constraints
      html += '<div>';
      html += '<label class="text-sm font-medium mb-1 block">Constraints</label>';
      html += '<textarea class="input w-full" id="eng-constraints" rows="3" placeholder="Performance requirements, compliance needs, etc.">' + escapeHtml(engData.constraints) + '</textarea>';
      html += '</div>';

      html += '</div>'; // space-y-4
      html += '</div>'; // card

      // Q&A Section
      html += '<div class="fusion-card p-6">';
      html += '<h3 class="text-lg font-semibold mb-4">' + icon('messageSquare', 18) + ' Technical Q&amp;A</h3>';

      // Questions list
      html += '<div class="space-y-4 mb-6">';
      engData.questions.forEach(function(q) {
        html += '<div class="list-card" style="border:1px solid hsl(var(--border));border-radius:var(--radius);padding:1rem">';
        html += '<div class="flex items-start gap-3">';
        html += '<div class="w-8 h-8 rounded-full bg-info-soft flex items-center justify-center text-primary" style="flex-shrink:0;margin-top:0.125rem">' + icon('messageSquare', 16) + '</div>';
        html += '<div class="flex-1">';
        html += '<p class="font-medium mb-1">' + escapeHtml(q.question) + '</p>';
        html += '<p class="text-sm text-muted-foreground mb-2">' + escapeHtml(q.answer) + '</p>';
        html += '<div class="flex items-center gap-2 text-xs text-muted-foreground">';
        html += '<span>' + escapeHtml(q.author) + '</span>';
        html += '<span>&middot;</span>';
        html += '<span>' + App.formatDate(q.date) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>'; // flex
        html += '</div>'; // list-card
      });
      html += '</div>';

      // Add question form
      html += '<div style="border-top:1px solid hsl(var(--border));padding-top:1rem">';
      html += '<h4 class="text-sm font-semibold mb-3">Ask a Question</h4>';
      html += '<div class="space-y-3">';
      html += '<input class="input w-full" id="eng-new-question" type="text" placeholder="Type your technical question..." />';
      html += '<button class="btn btn-outline" onclick="FusionApp._engAddQuestion()">' + icon('plus', 16) + ' Add Question</button>';
      html += '</div>';
      html += '</div>';

      html += '</div>'; // card

      return html;
    },

    init: function() {
      return function() {
        saving = false;
      };
    }
  };

  App._engSave = function(projectId) {
    // Read current field values
    var techStackEl = document.getElementById('eng-tech-stack');
    var archNotesEl = document.getElementById('eng-arch-notes');
    var constraintsEl = document.getElementById('eng-constraints');

    if (techStackEl) engData.techStack = techStackEl.value;
    if (archNotesEl) engData.architectureNotes = archNotesEl.value;
    if (constraintsEl) engData.constraints = constraintsEl.value;

    saving = true;
    App.render();

    fetch('/api/projects/' + projectId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engineering: engData })
    })
    .then(function(res) { return res.json(); })
    .then(function() {
      saving = false;
      App.render();
      App.showToast({ title: 'Saved', description: 'Engineering requirements have been updated' });
    });
  };

  App._engAddQuestion = function() {
    var input = document.getElementById('eng-new-question');
    if (!input || !input.value.trim()) {
      App.showToast({ title: 'Error', description: 'Please enter a question', variant: 'destructive' });
      return;
    }

    engData.questions.push({
      id: 'q' + Date.now(),
      question: input.value.trim(),
      answer: 'Pending response from engineering team...',
      author: App.store.user.name,
      date: new Date().toISOString().split('T')[0]
    });

    App.render();
    App.showToast({ title: 'Question added', description: 'Your question has been submitted' });
  };
})();
