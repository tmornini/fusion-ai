// Fusion AI — Idea Scoring Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var scoringComplete = false;
  var scoringTimer = null;
  var activeTab = 'impact';

  var scoreData = {
    overall: 82,
    recommendation: 'This idea shows strong potential with high impact scores and reasonable feasibility. Consider starting with a pilot program to validate key assumptions before full-scale implementation.',
    estimatedTime: '4-6 weeks',
    estimatedCost: '$25,000 - $40,000',
    tabs: {
      impact: {
        score: 88,
        dimensions: [
          { label: 'Business Value', value: 90, reason: 'Direct revenue impact through improved conversions' },
          { label: 'Strategic Alignment', value: 80, reason: 'Supports digital transformation goals' },
          { label: 'User Benefit', value: 90, reason: 'Saves significant time for marketing team' },
        ]
      },
      feasibility: {
        score: 75,
        dimensions: [
          { label: 'Technical Complexity', value: 70, reason: 'Requires ML expertise and data pipeline' },
          { label: 'Resource Availability', value: 80, reason: 'Team has relevant skills' },
          { label: 'Integration Effort', value: 80, reason: 'Works with existing CRM' },
        ]
      },
      efficiency: {
        score: 85,
        dimensions: [
          { label: 'Time to Value', value: 90, reason: 'MVP deliverable in 6-8 weeks' },
          { label: 'Cost Efficiency', value: 80, reason: 'Reasonable investment for expected returns' },
          { label: 'Scalability', value: 90, reason: 'Can expand to other use cases' },
        ]
      }
    }
  };

  var checklistItems = [
    { label: 'Analyzing problem statement...', delay: 400 },
    { label: 'Evaluating solution approach...', delay: 900 },
    { label: 'Assessing market impact...', delay: 1400 },
    { label: 'Calculating feasibility scores...', delay: 1900 },
    { label: 'Generating recommendations...', delay: 2200 },
  ];

  App.pages['/ideas/:ideaId/score'] = {
    layout: 'none',

    render: function(params) {
      var ideaId = params.ideaId;
      var idea = App.store.ideas.find(function(i) { return i.id === ideaId; });
      var ideaTitle = idea ? idea.title : 'Untitled Idea';
      var ideaDesc = idea ? idea.description : '';
      var mobile = App.isMobile();

      var html = '';
      html += '<div class="min-h-screen bg-background flex flex-col">';

      // Header
      html += '<header class="flex items-center gap-3 px-4 py-3 border-b" style="border-bottom:1px solid hsl(var(--border))">';
      html += '<button class="btn btn-ghost btn-icon" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 20) + '</button>';
      html += '<div class="flex items-center gap-2">';
      html += '<div class="sidebar-logo-icon" style="width:1.75rem;height:1.75rem">' + icon('sparkles', 14) + '</div>';
      html += '<span class="font-display font-bold text-foreground">Idea Scoring</span>';
      html += '</div>';
      html += '</header>';

      if (!scoringComplete) {
        // Scoring animation
        html += '<div class="flex-1 flex items-center justify-center px-4">';
        html += '<div class="text-center max-w-md w-full">';

        // Pulsing sparkles icon
        html += '<div class="flex justify-center mb-6">';
        html += '<div class="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-subtle" style="background:hsl(var(--primary) / 0.1)">';
        html += '<div class="text-primary">' + icon('sparkles', 36) + '</div>';
        html += '</div>';
        html += '</div>';

        html += '<h2 class="text-xl font-display font-bold mb-2">Analyzing Your Idea</h2>';
        html += '<p class="text-sm text-muted-foreground mb-8">Our AI is evaluating your idea across multiple dimensions...</p>';

        // Progress checklist
        html += '<div class="text-left space-y-3" id="scoring-checklist">';
        checklistItems.forEach(function(item, idx) {
          html += '<div class="flex items-center gap-3 scoring-check-item" data-index="' + idx + '" style="opacity:0.3">';
          html += '<div class="w-5 h-5 rounded-full flex items-center justify-center border" style="border-color:hsl(var(--border))" id="check-icon-' + idx + '">';
          html += '<div class="text-muted-foreground" style="width:12px;height:12px">' + icon('loader2', 12) + '</div>';
          html += '</div>';
          html += '<span class="text-sm text-muted-foreground">' + item.label + '</span>';
          html += '</div>';
        });
        html += '</div>';

        html += '</div>';
        html += '</div>';

      } else {
        // Scoring results
        html += '<div class="flex-1 overflow-y-auto px-4 py-6 pb-24">';
        html += '<div class="max-w-2xl mx-auto space-y-6">';

        // Idea summary card
        html += '<div class="fusion-card p-4">';
        html += '<div class="flex items-start gap-3">';
        html += '<div class="w-10 h-10 rounded-lg bg-info-soft flex items-center justify-center text-primary flex-shrink-0">' + icon('lightbulb', 20) + '</div>';
        html += '<div class="flex-1 min-w-0">';
        html += '<h3 class="text-sm font-semibold">' + escapeHtml(ideaTitle) + '</h3>';
        html += '<p class="text-xs text-muted-foreground mt-1 line-clamp-2">' + escapeHtml(ideaDesc) + '</p>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        // Overall score — large
        html += '<div class="fusion-card p-6 text-center">';
        html += '<p class="text-sm text-muted-foreground mb-2">Overall Score</p>';
        html += '<div class="flex items-baseline justify-center gap-1 mb-3">';
        html += '<span class="text-5xl font-display font-bold text-primary">' + scoreData.overall + '</span>';
        html += '<span class="text-xl text-muted-foreground">/100</span>';
        html += '</div>';
        html += App.renderProgress(scoreData.overall, 100);
        html += '</div>';

        // AI Recommendation
        html += '<div class="fusion-card p-4">';
        html += '<div class="flex items-start gap-3">';
        html += '<div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style="background:hsl(var(--primary) / 0.1)">';
        html += '<div class="text-primary">' + icon('brain', 16) + '</div>';
        html += '</div>';
        html += '<div>';
        html += '<p class="text-sm font-semibold mb-1">AI Recommendation</p>';
        html += '<p class="text-sm text-muted-foreground leading-relaxed">' + escapeHtml(scoreData.recommendation) + '</p>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        // Estimated time & cost
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div class="fusion-card p-4 text-center">';
        html += '<div class="text-muted-foreground mb-1">' + icon('clock', 18) + '</div>';
        html += '<p class="text-xs text-muted-foreground">Estimated Time</p>';
        html += '<p class="text-sm font-semibold mt-1">' + escapeHtml(scoreData.estimatedTime) + '</p>';
        html += '</div>';
        html += '<div class="fusion-card p-4 text-center">';
        html += '<div class="text-muted-foreground mb-1">' + icon('dollarSign', 18) + '</div>';
        html += '<p class="text-xs text-muted-foreground">Estimated Cost</p>';
        html += '<p class="text-sm font-semibold mt-1">' + escapeHtml(scoreData.estimatedCost) + '</p>';
        html += '</div>';
        html += '</div>';

        // Score breakdown tabs
        html += '<div class="fusion-card p-4">';
        html += '<h3 class="text-sm font-semibold mb-4">Score Breakdown</h3>';

        html += '<div class="tabs-list mb-4">';
        var tabDefs = [
          { key: 'impact', label: 'Impact ' + scoreData.tabs.impact.score },
          { key: 'feasibility', label: 'Feasibility ' + scoreData.tabs.feasibility.score },
          { key: 'efficiency', label: 'Efficiency ' + scoreData.tabs.efficiency.score },
        ];
        tabDefs.forEach(function(tab) {
          html += '<button class="tab-trigger' + (activeTab === tab.key ? ' active' : '') + '" onclick="FusionApp._scoringSetTab(\'' + tab.key + '\')">' + tab.label + '</button>';
        });
        html += '</div>';

        // Active tab content
        var tabData = scoreData.tabs[activeTab];
        html += '<div class="space-y-4">';
        tabData.dimensions.forEach(function(dim) {
          var color = dim.value >= 85 ? 'text-success' : dim.value >= 70 ? 'text-primary' : 'text-warning';
          html += '<div>';
          html += '<div class="flex items-center justify-between mb-1">';
          html += '<span class="text-sm font-medium">' + escapeHtml(dim.label) + '</span>';
          html += '<span class="text-sm font-semibold ' + color + '">' + dim.value + '/100</span>';
          html += '</div>';
          html += App.renderProgress(dim.value, 100);
          if (dim.reason) {
            html += '<p class="text-xs text-muted-foreground mt-1">' + escapeHtml(dim.reason) + '</p>';
          }
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';

        html += '</div>';
        html += '</div>';

        // Action buttons
        html += '<div class="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-3" style="border-top:1px solid hsl(var(--border));z-index:50">';
        html += '<div class="flex items-center justify-between max-w-2xl mx-auto gap-2">';
        html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp.navigate(\'/ideas\')">' + icon('arrowLeft', 16) + ' Back to Ideas</button>';
        html += '<div class="flex items-center gap-2">';
        html += '<button class="btn btn-outline btn-sm" onclick="FusionApp.showToast({title:\'Draft saved\',description:\'Your idea has been saved as a draft.\'});FusionApp.navigate(\'/ideas\')">' + icon('save', 16) + ' Save as Draft</button>';
        html += '<button class="btn btn-primary btn-sm" onclick="FusionApp.navigate(\'/ideas/' + ideaId + '/convert\')">' + icon('arrowRight', 16) + ' Convert to Project</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      }

      html += '</div>';
      return html;
    },

    init: function(params) {
      if (scoringComplete) return;

      // Animate checklist items
      checklistItems.forEach(function(item, idx) {
        setTimeout(function() {
          var el = document.querySelector('.scoring-check-item[data-index="' + idx + '"]');
          if (el) {
            el.style.opacity = '1';
            el.style.transition = 'opacity 0.3s ease';
          }
          // Mark previous as complete
          if (idx > 0) {
            var prevIcon = document.getElementById('check-icon-' + (idx - 1));
            if (prevIcon) {
              prevIcon.style.borderColor = 'hsl(var(--success))';
              prevIcon.style.backgroundColor = 'hsl(var(--success))';
              prevIcon.innerHTML = '<div style="color:hsl(var(--success-foreground));width:12px;height:12px">' + icon('check', 12) + '</div>';
            }
          }
        }, item.delay);
      });

      // Complete last item and switch to results
      scoringTimer = setTimeout(function() {
        var lastIdx = checklistItems.length - 1;
        var lastIcon = document.getElementById('check-icon-' + lastIdx);
        if (lastIcon) {
          lastIcon.style.borderColor = 'hsl(var(--success))';
          lastIcon.style.backgroundColor = 'hsl(var(--success))';
          lastIcon.innerHTML = '<div style="color:hsl(var(--success-foreground));width:12px;height:12px">' + icon('check', 12) + '</div>';
        }

        setTimeout(function() {
          scoringComplete = true;
          App.render();
        }, 300);
      }, 2500);

      return function() {
        if (scoringTimer) {
          clearTimeout(scoringTimer);
          scoringTimer = null;
        }
        // Reset for next visit
        scoringComplete = false;
        activeTab = 'impact';
      };
    }
  };

  App._scoringSetTab = function(tab) {
    activeTab = tab;
    App.render();
  };
})();
