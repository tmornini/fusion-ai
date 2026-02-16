import {
  renderDashboardLayout, initDashboardLayout, $, escapeHtml, navigate,
  iconTarget, iconSearch, iconCheckCircle2, iconAlertCircle, iconClock,
  iconChevronRight, iconTrendingUp, iconShield, iconBarChart, iconUser,
} from '../site/script';

interface EdgeItem {
  id: string;
  ideaId: string;
  ideaTitle: string;
  status: 'complete' | 'draft' | 'missing';
  outcomesCount: number;
  metricsCount: number;
  confidence: 'high' | 'medium' | 'low' | null;
  owner: string;
  updatedAt: string;
}

const mockEdges: EdgeItem[] = [
  { id: '1', ideaId: '1', ideaTitle: 'AI-Powered Customer Segmentation', status: 'complete', outcomesCount: 2, metricsCount: 4, confidence: 'high', owner: 'Sarah Chen', updatedAt: '2024-02-28' },
  { id: '2', ideaId: '2', ideaTitle: 'Automated Report Generation', status: 'complete', outcomesCount: 3, metricsCount: 5, confidence: 'medium', owner: 'Mike Thompson', updatedAt: '2024-02-25' },
  { id: '3', ideaId: '3', ideaTitle: 'Predictive Maintenance System', status: 'draft', outcomesCount: 1, metricsCount: 2, confidence: 'low', owner: 'Emily Rodriguez', updatedAt: '2024-02-20' },
  { id: '4', ideaId: '4', ideaTitle: 'Real-time Analytics Dashboard', status: 'complete', outcomesCount: 2, metricsCount: 3, confidence: 'high', owner: 'David Kim', updatedAt: '2024-02-18' },
  { id: '5', ideaId: '5', ideaTitle: 'Smart Inventory Optimization', status: 'missing', outcomesCount: 0, metricsCount: 0, confidence: null, owner: '', updatedAt: '' },
];

const statusConfig: Record<string, { label: string; cls: string; icon: (s?: number) => string }> = {
  complete: { label: 'Complete', cls: 'badge-success', icon: iconCheckCircle2 },
  draft: { label: 'Draft', cls: 'badge-warning', icon: iconClock },
  missing: { label: 'Missing', cls: 'badge-error', icon: iconAlertCircle },
};

const confidenceConfig: Record<string, { label: string; cls: string }> = {
  high: { label: 'High', cls: 'text-success' },
  medium: { label: 'Medium', cls: 'text-warning' },
  low: { label: 'Low', cls: 'text-error' },
};

function renderEdgeCard(edge: EdgeItem): string {
  const sc = statusConfig[edge.status];
  return `
    <div class="card card-hover p-4" style="cursor:pointer" data-edge-card="${edge.ideaId}">
      <div class="flex items-start justify-between gap-4">
        <div style="flex:1;min-width:0">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="badge ${sc.cls} text-xs">${sc.icon(12)} ${sc.label}</span>
            ${edge.confidence ? `
              <span class="flex items-center gap-1 text-xs ${confidenceConfig[edge.confidence].cls}">
                ${iconShield(14)} ${confidenceConfig[edge.confidence].label} Confidence
              </span>` : ''}
          </div>
          <h3 class="font-semibold mb-1">${escapeHtml(edge.ideaTitle)}</h3>
          <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
            ${edge.owner ? `<span class="flex items-center gap-1">${iconUser(14)} ${escapeHtml(edge.owner)}</span>` : ''}
            ${edge.status !== 'missing' ? `
              <span class="flex items-center gap-1">${iconTrendingUp(14)} ${edge.outcomesCount} outcomes</span>
              <span class="flex items-center gap-1">${iconBarChart(14)} ${edge.metricsCount} metrics</span>` : ''}
            ${edge.updatedAt ? `<span class="text-xs">Updated ${edge.updatedAt}</span>` : ''}
          </div>
        </div>
        <div class="flex items-center">${iconChevronRight(20, 'text-muted')}</div>
      </div>
    </div>`;
}

export function render(): string {
  const stats = {
    total: mockEdges.length,
    complete: mockEdges.filter(e => e.status === 'complete').length,
    draft: mockEdges.filter(e => e.status === 'draft').length,
    missing: mockEdges.filter(e => e.status === 'missing').length,
  };

  const content = `
    <div>
      <div class="mb-6">
        <div class="badge badge-primary text-sm mb-3">${iconTarget(14)} Business Case Definition</div>
        <h1 class="text-2xl font-display font-bold mb-1">Edge</h1>
        <p class="text-muted">Define outcomes, metrics, and expected impact for ideas</p>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem" class="stats-grid mb-8">
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--primary)/0.1)">${iconTarget(20, 'text-primary')}</div>
            <div><p class="text-2xl font-bold">${stats.total}</p><p class="text-sm text-muted">Total Ideas</p></div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--success-soft))">${iconCheckCircle2(20, 'text-success')}</div>
            <div><p class="text-2xl font-bold">${stats.complete}</p><p class="text-sm text-muted">Complete</p></div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--warning-soft))">${iconClock(20, 'text-warning')}</div>
            <div><p class="text-2xl font-bold">${stats.draft}</p><p class="text-sm text-muted">In Draft</p></div>
          </div>
        </div>
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--error-soft))">${iconAlertCircle(20, 'text-error')}</div>
            <div><p class="text-2xl font-bold">${stats.missing}</p><p class="text-sm text-muted">Missing</p></div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-4 mb-6">
        <div class="search-wrapper" style="flex:1">
          <span class="search-icon">${iconSearch(16)}</span>
          <input class="input search-input" placeholder="Search ideas or owners..." id="edge-search" />
        </div>
        <select class="input" style="width:10rem" id="edge-status-filter">
          <option value="all">All Status</option>
          <option value="complete">Complete</option>
          <option value="draft">Draft</option>
          <option value="missing">Missing</option>
        </select>
      </div>

      <!-- Edge List -->
      <div id="edge-list" style="display:flex;flex-direction:column;gap:0.75rem">
        ${mockEdges.map(renderEdgeCard).join('')}
      </div>

      <div id="edge-empty" class="text-center" style="display:none;padding:3rem 0">
        ${iconTarget(48, 'text-muted')}
        <h3 class="text-lg font-semibold mt-4 mb-2">No Edge definitions found</h3>
        <p class="text-muted">Try adjusting your search or filter criteria</p>
      </div>
    </div>`;

  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();

  function filterAndRender() {
    const search = (($('#edge-search') as HTMLInputElement)?.value || '').toLowerCase();
    const status = ($('#edge-status-filter') as HTMLSelectElement)?.value || 'all';

    const filtered = mockEdges.filter(e => {
      const matchSearch = e.ideaTitle.toLowerCase().includes(search) || e.owner.toLowerCase().includes(search);
      const matchStatus = status === 'all' || e.status === status;
      return matchSearch && matchStatus;
    });

    const list = $('#edge-list');
    const empty = $('#edge-empty');
    if (list) list.innerHTML = filtered.map(renderEdgeCard).join('');
    if (list) list.style.display = filtered.length ? '' : 'none';
    if (empty) empty.style.display = filtered.length ? 'none' : '';

    // Rebind card clicks
    document.querySelectorAll<HTMLElement>('[data-edge-card]').forEach(card => {
      card.addEventListener('click', () => navigate(`#/ideas/${card.getAttribute('data-edge-card')}/edge`));
    });
  }

  $('#edge-search')?.addEventListener('input', filterAndRender);
  $('#edge-status-filter')?.addEventListener('change', filterAndRender);

  // Initial card click bindings
  document.querySelectorAll<HTMLElement>('[data-edge-card]').forEach(card => {
    card.addEventListener('click', () => navigate(`#/ideas/${card.getAttribute('data-edge-card')}/edge`));
  });
}
