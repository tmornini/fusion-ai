// Fusion AI — Crunch (Data Analysis) Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var uploadedFile = null;
  var analyzing = false;
  var analyzed = false;

  App.pages['/crunch'] = {
    layout: 'dashboard',

    render: function() {
      var mobile = App.isMobile();
      var html = '';

      // Title
      html += '<div class="mb-8">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight mb-1">' + icon('database', 24) + ' Crunch &mdash; Data Analysis</h1>';
      html += '<p class="text-muted-foreground">Upload datasets and analyze column statistics</p>';
      html += '</div>';

      // Upload area
      if (!uploadedFile) {
        html += '<div class="fusion-card p-8">';
        html += '<div class="upload-area" id="crunch-upload-area" style="border:2px dashed hsl(var(--border));border-radius:var(--radius);padding:3rem;text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s">';
        html += '<div class="flex flex-col items-center gap-3">';
        html += '<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">' + icon('upload', 32) + '</div>';
        html += '<div>';
        html += '<p class="text-lg font-semibold">Drop your file here or click to browse</p>';
        html += '<p class="text-sm text-muted-foreground mt-1">Supports CSV, Excel, and JSON files up to 50MB</p>';
        html += '</div>';
        html += '<button class="btn btn-outline" onclick="FusionApp._crunchSelectFile()">Select File</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
      } else {
        // File info card
        html += '<div class="fusion-card p-6 mb-6">';
        html += '<div class="flex items-center justify-between mb-4">';
        html += '<div class="flex items-center gap-3">';
        html += '<div class="w-10 h-10 rounded-lg bg-info-soft flex items-center justify-center text-primary">' + icon('fileText', 20) + '</div>';
        html += '<div>';
        html += '<p class="font-semibold">' + escapeHtml(uploadedFile.name) + '</p>';
        html += '<p class="text-sm text-muted-foreground">' + escapeHtml(uploadedFile.size) + ' &middot; ' + uploadedFile.rows.toLocaleString() + ' rows &middot; ' + uploadedFile.columns.length + ' columns</p>';
        html += '</div>';
        html += '</div>';
        html += '<button class="btn btn-ghost btn-sm" onclick="FusionApp._crunchRemoveFile()">' + icon('x', 16) + ' Remove</button>';
        html += '</div>';

        // Analyze button
        if (!analyzed) {
          html += '<button class="btn btn-primary" id="crunch-analyze-btn" onclick="FusionApp._crunchAnalyze()"' + (analyzing ? ' disabled' : '') + '>';
          if (analyzing) {
            html += '<span class="animate-spin">' + icon('loader2', 16) + '</span> Analyzing...';
          } else {
            html += icon('barChart3', 16) + ' Analyze';
          }
          html += '</button>';
        }
        html += '</div>';

        // Column analysis table
        if (analyzed) {
          html += '<div class="fusion-card p-6">';
          html += '<h3 class="text-lg font-semibold mb-4">Column Analysis</h3>';
          html += '<div style="overflow-x:auto">';
          html += '<table class="data-table" style="width:100%">';
          html += '<thead><tr>';
          html += '<th>Column</th>';
          html += '<th>Type</th>';
          html += '<th>Nulls</th>';
          html += '<th>Unique</th>';
          html += '<th>Min</th>';
          html += '<th>Max</th>';
          html += '<th>Mean</th>';
          html += '</tr></thead>';
          html += '<tbody>';
          uploadedFile.columns.forEach(function(col) {
            html += '<tr>';
            html += '<td><span class="font-medium">' + escapeHtml(col.name) + '</span></td>';
            html += '<td>' + App.renderBadge(col.type, col.type === 'number' ? 'info' : col.type === 'date' ? 'warning' : 'secondary') + '</td>';
            html += '<td>' + col.nulls + '</td>';
            html += '<td>' + col.unique.toLocaleString() + '</td>';
            html += '<td>' + (col.type === 'number' ? col.min : '&mdash;') + '</td>';
            html += '<td>' + (col.type === 'number' ? col.max.toLocaleString() : '&mdash;') + '</td>';
            html += '<td>' + (col.type === 'number' ? col.mean.toLocaleString() : '&mdash;') + '</td>';
            html += '</tr>';
          });
          html += '</tbody>';
          html += '</table>';
          html += '</div>';
          html += '</div>';
        }
      }

      return html;
    },

    init: function() {
      var uploadArea = document.getElementById('crunch-upload-area');
      if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
          e.preventDefault();
          uploadArea.style.borderColor = 'hsl(var(--primary))';
          uploadArea.style.background = 'hsl(var(--primary) / 0.05)';
        });
        uploadArea.addEventListener('dragleave', function(e) {
          e.preventDefault();
          uploadArea.style.borderColor = '';
          uploadArea.style.background = '';
        });
        uploadArea.addEventListener('drop', function(e) {
          e.preventDefault();
          uploadArea.style.borderColor = '';
          uploadArea.style.background = '';
          FusionApp._crunchSimulateUpload();
        });
        uploadArea.addEventListener('click', function(e) {
          if (e.target.tagName !== 'BUTTON') {
            FusionApp._crunchSimulateUpload();
          }
        });
      }

      return function() {
        // Cleanup: reset state when leaving page
        uploadedFile = null;
        analyzing = false;
        analyzed = false;
      };
    }
  };

  App._crunchSelectFile = function() {
    App._crunchSimulateUpload();
  };

  App._crunchSimulateUpload = function() {
    fetch('/api/crunch/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        uploadedFile = data.file;
        analyzing = false;
        analyzed = false;
        App.render();
        App.showToast({ title: 'File uploaded', description: 'Ready for analysis' });
      });
  };

  App._crunchRemoveFile = function() {
    uploadedFile = null;
    analyzing = false;
    analyzed = false;
    App.render();
  };

  App._crunchAnalyze = function() {
    analyzing = true;
    App.render();
    setTimeout(function() {
      analyzing = false;
      analyzed = true;
      App.render();
      App.showToast({ title: 'Analysis complete', description: uploadedFile.columns.length + ' columns analyzed' });
    }, 1500);
  };
})();
