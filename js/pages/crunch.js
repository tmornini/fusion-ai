// Fusion AI — Crunch (Data Translation Tool) Page
(function() {
  var App = window.FusionApp;
  var icon = App.icon;
  var escapeHtml = App.escapeHtml;

  var step = 'upload'; // 'upload' | 'label' | 'review'
  var uploadedFile = null;
  var columns = [];
  var expandedColumn = null;
  var isProcessing = false;
  var businessContext = '';

  function formatFileSize(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  }

  function getCompletionPercent() {
    if (!columns.length) return 0;
    var done = columns.filter(function(c) { return c.friendlyName && c.dataType; }).length;
    return Math.round((done / columns.length) * 100);
  }

  function getDataTypeIcon(dt) {
    switch (dt) {
      case 'number': return icon('hash', 14);
      case 'date': return icon('calendar', 14);
      case 'text': return icon('type', 14);
      default: return icon('helpCircle', 14);
    }
  }

  // --- Steps indicator ---
  function renderSteps() {
    var steps = [
      { key: 'upload', label: 'Upload', num: 1 },
      { key: 'label', label: 'Label & Explain', num: 2 },
      { key: 'review', label: 'Review', num: 3 }
    ];
    var currentIdx = steps.findIndex(function(s) { return s.key === step; });

    var html = '<div class="flex items-center justify-center gap-2 mb-8">';
    steps.forEach(function(s, i) {
      var isActive = s.key === step;
      var isDone = i < currentIdx;
      var circleClass = isDone ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground';

      if (i > 0) {
        html += '<div style="width:3rem;height:2px;background:hsl(var(' + (i <= currentIdx ? '--primary' : '--border') + '))"></div>';
      }
      html += '<div class="flex items-center gap-2">';
      html += '<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ' + circleClass + '">';
      html += isDone ? icon('check', 16) : s.num;
      html += '</div>';
      html += '<span class="text-sm' + (isActive ? ' font-semibold' : ' text-muted-foreground') + ' hidden sm:inline">' + s.label + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // --- Step 1: Upload ---
  function renderUploadStep() {
    var html = '';
    if (isProcessing) {
      html += '<div class="fusion-card p-12 text-center">';
      html += '<div class="flex flex-col items-center gap-4">';
      html += '<div class="animate-spin text-primary">' + icon('loader2', 48) + '</div>';
      html += '<p class="text-lg font-semibold">Processing your file...</p>';
      html += '<p class="text-sm text-muted-foreground">Detecting columns, data types, and sample values</p>';
      html += '</div>';
      html += '</div>';
      return html;
    }

    html += '<div class="fusion-card p-8">';
    html += '<div class="upload-area" id="crunch-upload-area" style="border:2px dashed hsl(var(--border));border-radius:var(--radius);padding:3rem;text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s">';
    html += '<div class="flex flex-col items-center gap-3">';
    html += '<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">' + icon('upload', 32) + '</div>';
    html += '<div>';
    html += '<p class="text-lg font-semibold">Drop your file here or click to browse</p>';
    html += '<p class="text-sm text-muted-foreground mt-1">Supports Excel (.xlsx, .xls), CSV, and Google Sheets exports</p>';
    html += '</div>';
    html += '<button class="btn btn-outline" onclick="FusionApp._crunchSelectFile()">Select File</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Help section
    html += '<div class="fusion-card p-5 mt-4" style="background:hsl(var(--warning) / 0.08);border-color:hsl(var(--warning) / 0.3)">';
    html += '<div class="flex items-start gap-3">';
    html += '<span class="text-warning-foreground mt-0.5">' + icon('helpCircle', 18) + '</span>';
    html += '<div>';
    html += '<h4 class="text-sm font-semibold mb-1">How Data Translation Works</h4>';
    html += '<ol class="text-sm text-muted-foreground space-y-1" style="padding-left:1.25rem;list-style:decimal">';
    html += '<li>Upload your data file (spreadsheet or CSV)</li>';
    html += '<li>We detect columns, abbreviations, and data types</li>';
    html += '<li>You provide friendly names and context for each column</li>';
    html += '<li>The translated data dictionary is ready for your team</li>';
    html += '</ol>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  // --- Step 2: Label ---
  function renderLabelStep() {
    var pct = getCompletionPercent();
    var html = '';

    // File info card
    html += '<div class="fusion-card p-4 mb-4">';
    html += '<div class="flex items-center gap-3 mb-3">';
    html += '<div class="w-10 h-10 rounded-lg bg-info-soft flex items-center justify-center text-primary">' + icon('fileSpreadsheet', 20) + '</div>';
    html += '<div class="flex-1">';
    html += '<p class="font-semibold text-sm">' + escapeHtml(uploadedFile.name) + '</p>';
    html += '<p class="text-xs text-muted-foreground">' + formatFileSize(uploadedFile.size) + ' &middot; ' + uploadedFile.rows.toLocaleString() + ' rows &middot; ' + columns.length + ' columns</p>';
    html += '</div>';
    html += '</div>';
    html += '<div class="flex items-center gap-3">';
    html += '<div class="flex-1">' + App.renderProgress(pct, 100) + '</div>';
    html += '<span class="text-sm font-medium">' + pct + '% labeled</span>';
    html += '</div>';
    html += '</div>';

    // Business context
    html += '<div class="fusion-card p-4 mb-4">';
    html += '<label class="text-sm font-semibold block mb-2">' + icon('messageSquare', 14) + ' Business Context</label>';
    html += '<textarea class="input w-full" id="crunch-business-context" rows="3" placeholder="Describe what this data represents and how it\'s used in your business..." onchange="FusionApp._crunchSetBusinessContext(this.value)">' + escapeHtml(businessContext) + '</textarea>';
    html += '</div>';

    // Column rows
    html += '<div class="space-y-2">';
    columns.forEach(function(col, idx) {
      var isExpanded = expandedColumn === col.id;
      var isComplete = col.friendlyName && col.dataType;
      html += '<div class="fusion-card overflow-hidden">';

      // Header row
      html += '<div class="flex items-center gap-3 p-4 cursor-pointer" onclick="FusionApp._crunchToggleExpand(\'' + col.id + '\')">';
      html += '<span class="' + (isComplete ? 'text-success' : 'text-muted-foreground') + '">' + (isComplete ? icon('checkCircle2', 18) : icon('circle', 18)) + '</span>';
      html += '<div class="flex-1 min-w-0">';
      html += '<div class="flex items-center gap-2">';
      html += '<code class="text-sm font-mono font-semibold">' + escapeHtml(col.originalName) + '</code>';
      if (col.isAcronym) html += '<span class="badge badge-warning" style="font-size:0.6rem">ACRONYM</span>';
      html += getDataTypeIcon(col.dataType);
      html += '</div>';
      if (col.sampleValues && col.sampleValues.length) {
        html += '<p class="text-xs text-muted-foreground mt-0.5">Sample: ' + col.sampleValues.slice(0, 3).map(function(v) { return '<code>' + escapeHtml(v) + '</code>'; }).join(', ') + '</p>';
      }
      html += '</div>';
      html += '<span class="text-muted-foreground">' + (isExpanded ? icon('chevronDown', 16) : icon('chevronRight', 16)) + '</span>';
      html += '</div>';

      // Expanded form
      if (isExpanded) {
        html += '<div class="px-4 pb-4 border-t" style="border-color:hsl(var(--border));background:hsl(var(--muted) / 0.3)">';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">';

        // Friendly name
        html += '<div>';
        html += '<label class="text-xs font-medium block mb-1">Friendly Name</label>';
        html += '<input class="input w-full" value="' + escapeHtml(col.friendlyName) + '" placeholder="e.g. Customer ID" onchange="FusionApp._crunchUpdateColumn(\'' + col.id + '\',\'friendlyName\',this.value)" />';
        html += '</div>';

        // Data type
        html += '<div>';
        html += '<label class="text-xs font-medium block mb-1">Data Type</label>';
        html += App.renderSelect([
          { value: 'text', label: 'Text' },
          { value: 'number', label: 'Number' },
          { value: 'date', label: 'Date' },
          { value: 'boolean', label: 'Yes/No' }
        ], col.dataType, 'crunch-dt-' + col.id, 'FusionApp._crunchUpdateColumn(\'' + col.id + '\',\'dataType\',this.value)');
        html += '</div>';

        // Acronym expansion (if acronym)
        if (col.isAcronym) {
          html += '<div class="sm:col-span-2">';
          html += '<label class="text-xs font-medium block mb-1">Acronym Expansion</label>';
          html += '<input class="input w-full" value="' + escapeHtml(col.acronymExpansion) + '" placeholder="e.g. Customer Identifier" onchange="FusionApp._crunchUpdateColumn(\'' + col.id + '\',\'acronymExpansion\',this.value)" />';
          html += '</div>';
        }

        // Description
        html += '<div class="sm:col-span-2">';
        html += '<label class="text-xs font-medium block mb-1">Description</label>';
        html += '<textarea class="input w-full" rows="2" placeholder="What does this column represent?" onchange="FusionApp._crunchUpdateColumn(\'' + col.id + '\',\'description\',this.value)">' + escapeHtml(col.description) + '</textarea>';
        html += '</div>';

        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    // Navigation
    html += '<div class="flex items-center justify-between mt-6">';
    html += '<button class="btn btn-ghost" onclick="FusionApp._crunchSetStep(\'upload\')">' + icon('arrowLeft', 16) + ' Upload Different File</button>';
    html += '<button class="btn btn-primary' + (pct < 100 ? ' opacity-50' : '') + '" onclick="FusionApp._crunchSetStep(\'review\')"' + (pct < 100 ? ' disabled' : '') + '>Continue to Review ' + icon('arrowRight', 16) + '</button>';
    html += '</div>';

    return html;
  }

  // --- Step 3: Review ---
  function renderReviewStep() {
    var html = '';
    html += '<div class="fusion-card p-8 text-center">';
    html += '<div class="flex flex-col items-center gap-4">';
    html += '<div class="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success">' + icon('check', 40) + '</div>';
    html += '<h2 class="text-xl font-bold">Data Translation Complete</h2>';
    html += '<p class="text-muted-foreground max-w-md">All ' + columns.length + ' columns have been labeled with friendly names, data types, and descriptions. Your data dictionary is ready.</p>';
    html += '<div class="flex gap-3 mt-4">';
    html += '<button class="btn btn-outline" onclick="FusionApp._crunchSetStep(\'label\')">' + icon('edit3', 16) + ' Edit Labels</button>';
    html += '<button class="btn btn-primary" onclick="FusionApp.navigate(\'/dashboard\')">' + icon('arrowRight', 16) + ' Continue to Dashboard</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  // --- Event handlers ---
  App._crunchSetStep = function(s) {
    step = s;
    App.render();
  };

  App._crunchToggleExpand = function(colId) {
    expandedColumn = expandedColumn === colId ? null : colId;
    App.render();
  };

  App._crunchUpdateColumn = function(colId, field, value) {
    var col = columns.find(function(c) { return c.id === colId; });
    if (col) col[field] = value;
    // Update just the progress without full re-render
    var pctEl = document.querySelector('.progress-bar');
    if (pctEl) pctEl.style.width = getCompletionPercent() + '%';
  };

  App._crunchSetBusinessContext = function(val) {
    businessContext = val;
  };

  App._crunchSelectFile = function() {
    App._crunchSimulateUpload();
  };

  App._crunchSimulateUpload = function() {
    isProcessing = true;
    App.render();
    fetch('/api/crunch/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        uploadedFile = data.file;
        columns = (data.file.columns || []).map(function(c) {
          return { id: c.id || c.name, originalName: c.originalName || c.name, friendlyName: c.friendlyName || '', dataType: c.dataType || c.type || '', description: c.description || '', sampleValues: c.sampleValues || [], isAcronym: c.isAcronym || false, acronymExpansion: c.acronymExpansion || '' };
        });
        isProcessing = false;
        step = 'label';
        App.render();
        App.showToast({ title: 'File processed', description: columns.length + ' columns detected' });
      });
  };

  // --- Page ---
  App.pages['/crunch'] = {
    layout: 'dashboard',

    render: function() {
      var html = '';

      // Title
      html += '<div class="mb-6">';
      html += '<div class="flex items-center gap-2 mb-1">';
      html += '<h1 class="text-2xl font-display font-bold tracking-tight">' + icon('database', 24) + ' Crunch</h1>';
      html += '<span class="badge badge-info">Data Translation Tool</span>';
      html += '</div>';
      html += '<p class="text-muted-foreground">Upload datasets, label columns with business-friendly names, and create a shared data dictionary</p>';
      html += '</div>';

      // Steps
      html += renderSteps();

      // Step content
      if (step === 'upload') html += renderUploadStep();
      else if (step === 'label') html += renderLabelStep();
      else html += renderReviewStep();

      return html;
    },

    init: function() {
      if (step === 'upload' && !isProcessing) {
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
            if (e.target.tagName !== 'BUTTON') FusionApp._crunchSimulateUpload();
          });
        }
      }

      return function() {
        step = 'upload';
        uploadedFile = null;
        columns = [];
        expandedColumn = null;
        isProcessing = false;
        businessContext = '';
      };
    }
  };
})();
