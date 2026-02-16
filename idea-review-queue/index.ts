import {
  $, navigate, escapeHtml,
  iconArrowLeft, iconClock, iconTrendingUp, iconAlertCircle,
  iconCheckCircle2, iconMessageSquare, iconSearch,
  iconChevronRight, iconTarget, iconShield,
} from '../site/script';

interface ReviewIdea {
  id: string;
  title: string;
  submittedBy: string;
  priority: 'high' | 'medium' | 'low';
  readiness: 'ready' | 'needs-info' | 'incomplete';
  edgeStatus: 'complete' | 'draft' | 'missing';
  score: number;
  impact: string;
  effort: string;
  waitingDays: number;
  category: string;
}

const mockIdeas: ReviewIdea[] = [
  { id: '1', title: 'AI-Powered Customer Support Chatbot', submittedBy: 'Sarah Chen', priority: 'high', readiness: 'ready', edgeStatus: 'complete', score: 87, impact: 'High', effort: 'Medium', waitingDays: 3, category: 'Customer Experience' },
  { id: '2', title: 'Mobile App Push Notification Revamp', submittedBy: 'Marcus Johnson', priority: 'high', readiness: 'needs-info', edgeStatus: 'draft', score: 72, impact: 'Medium', effort: 'Low', waitingDays: 4, category: 'Product' },
  { id: '3', title: 'Sustainability Dashboard for Operations', submittedBy: 'Emily Rodriguez', priority: 'medium', readiness: 'ready', edgeStatus: 'complete', score: 81, impact: 'High', effort: 'High', waitingDays: 6, category: 'Operations' },
  { id: '4', title: 'Employee Wellness Program Integration', submittedBy: 'David Kim', priority: 'low', readiness: 'incomplete', edgeStatus: 'missing', score: 45, impact: 'Medium', effort: 'Medium', waitingDays: 8, category: 'HR' },
  { id: '5', title: 'Real-time Inventory Tracking System', submittedBy: 'Lisa Wang', priority: 'high', readiness: 'ready', edgeStatus: 'complete', score: 91, impact: 'High', effort: 'Medium', waitingDays: 5, category: 'Operations' },
];

const priorityConfig: Record<string, { label: string; cls: string }> = {
  high: { label: 'High Priority', cls: 'badge-error' },
  medium: { label: 'Medium', cls: 'badge-warning' },
  low: { label: 'Low', cls: 'badge-default' },
};

const readinessConfig: Record<string, { label: string; icon: (s?: number) => string; cls: string }> = {
  ready: { label: 'Ready for Review', icon: iconCheckCircle2, cls: 'text-success' },
  'needs-info': { label: 'Needs Info', icon: iconMessageSquare, cls: 'text-warning' },
  incomplete: { label: 'Incomplete', icon: iconAlertCircle, cls: 'text-error' },
};

const edgeStatusConfig: Record<string, { label: string; cls: string }> = {
  complete: { label: 'Edge Complete', cls: 'badge-success' },
  draft: { label: 'Edge Draft', cls: 'badge-warning' },
  missing: { label: 'Edge Missing', cls: 'badge-error' },
};

function scoreColor(score: number): string {
  if (score >= 80) return 'color:hsl(142 71% 45%)';
  if (score >= 60) return 'color:hsl(var(--warning))';
  return 'color:hsl(var(--error))';
}

function renderReviewCard(idea: ReviewIdea): string {
  const rc = readinessConfig[idea.readiness];
  return `
    <div class="card card-hover p-4" style="cursor:pointer" data-review-card="${idea.id}">
      <div class="flex items-start justify-between gap-4">
        <div style="flex:1;min-width:0">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="badge ${priorityConfig[idea.priority].cls} text-xs">${priorityConfig[idea.priority].label}</span>
            <span class="flex items-center gap-1 text-sm ${rc.cls}">${rc.icon(16)} ${rc.label}</span>
            <span class="badge ${edgeStatusConfig[idea.edgeStatus].cls} text-xs">${iconTarget(12)} ${edgeStatusConfig[idea.edgeStatus].label}</span>
          </div>
          <h3 class="font-semibold mb-1">${escapeHtml(idea.title)}</h3>
          <div class="flex items-center gap-4 text-sm text-muted">
            <span>by ${escapeHtml(idea.submittedBy)}</span>
            <span>•</span>
            <span>${idea.category}</span>
            <span>•</span>
            <span style="color:hsl(var(--warning))">${idea.waitingDays} days waiting</span>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right hidden-mobile">
            <div class="flex items-center gap-4 text-sm">
              <div><p class="text-muted">Score</p><p class="font-semibold" style="${scoreColor(idea.score)}">${idea.score}</p></div>
              <div><p class="text-muted">Impact</p><p class="font-medium">${idea.impact}</p></div>
              <div><p class="text-muted">Effort</p><p class="font-medium">${idea.effort}</p></div>
            </div>
          </div>
          ${iconChevronRight(20, 'text-muted')}
        </div>
      </div>
    </div>`;
}

export function render(): string {
  const stats = {
    total: mockIdeas.length,
    ready: mockIdeas.filter(i => i.readiness === 'ready').length,
    highPriority: mockIdeas.filter(i => i.priority === 'high').length,
    avgWait: Math.round(mockIdeas.reduce((a, i) => a + i.waitingDays, 0) / mockIdeas.length),
  };

  return `
    <div style="min-height:100vh;background:hsl(var(--background))">
      <header style="position:sticky;top:0;z-index:10;background:hsl(var(--background)/0.95);backdrop-filter:blur(8px);border-bottom:1px solid hsl(var(--border))">
        <div style="max-width:72rem;margin:0 auto;padding:0 1.5rem">
          <div class="flex items-center justify-between" style="height:4rem">
            <div class="flex items-center gap-4">
              <button class="btn btn-ghost btn-icon" data-nav="#/ideas">${iconArrowLeft(20)}</button>
              <div>
                <h1 class="text-xl font-bold">Review Queue</h1>
                <p class="text-sm text-muted">Ideas awaiting your decision</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style="max-width:72rem;margin:0 auto;padding:2rem 1.5rem">
        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem" class="stats-grid mb-8">
          <div class="card p-4"><div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--primary)/0.1)">${iconClock(20, 'text-primary')}</div>
            <div><p class="text-2xl font-bold">${stats.total}</p><p class="text-sm text-muted">Pending Review</p></div>
          </div></div>
          <div class="card p-4"><div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--success-soft))">${iconCheckCircle2(20, 'text-success')}</div>
            <div><p class="text-2xl font-bold">${stats.ready}</p><p class="text-sm text-muted">Ready to Decide</p></div>
          </div></div>
          <div class="card p-4"><div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--error-soft))">${iconAlertCircle(20, 'text-error')}</div>
            <div><p class="text-2xl font-bold">${stats.highPriority}</p><p class="text-sm text-muted">High Priority</p></div>
          </div></div>
          <div class="card p-4"><div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:hsl(var(--warning-soft))">${iconTrendingUp(20, 'text-warning')}</div>
            <div><p class="text-2xl font-bold">${stats.avgWait}d</p><p class="text-sm text-muted">Avg. Wait Time</p></div>
          </div></div>
        </div>

        <!-- Filters -->
        <div class="flex gap-4 mb-6">
          <div class="search-wrapper" style="flex:1">
            <span class="search-icon">${iconSearch(16)}</span>
            <input class="input search-input" placeholder="Search ideas or submitters..." id="rq-search" />
          </div>
          <select class="input" style="width:10rem" id="rq-priority">
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select class="input" style="width:10rem" id="rq-readiness">
            <option value="all">All Status</option>
            <option value="ready">Ready</option>
            <option value="needs-info">Needs Info</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>

        <!-- List -->
        <div id="rq-list" style="display:flex;flex-direction:column;gap:0.75rem">
          ${mockIdeas.map(renderReviewCard).join('')}
        </div>
        <div id="rq-empty" class="text-center" style="display:none;padding:3rem 0">
          ${iconClock(48, 'text-muted')}
          <h3 class="text-lg font-semibold mt-4 mb-2">No ideas match your filters</h3>
          <p class="text-muted">Try adjusting your search or filter criteria</p>
        </div>
      </main>
    </div>`;
}

export function init(): void {
  function filterAndRender() {
    const search = (($('#rq-search') as HTMLInputElement)?.value || '').toLowerCase();
    const priority = ($('#rq-priority') as HTMLSelectElement)?.value || 'all';
    const readiness = ($('#rq-readiness') as HTMLSelectElement)?.value || 'all';

    const filtered = mockIdeas.filter(i => {
      const ms = i.title.toLowerCase().includes(search) || i.submittedBy.toLowerCase().includes(search);
      const mp = priority === 'all' || i.priority === priority;
      const mr = readiness === 'all' || i.readiness === readiness;
      return ms && mp && mr;
    });

    const list = $('#rq-list');
    const empty = $('#rq-empty');
    if (list) list.innerHTML = filtered.map(renderReviewCard).join('');
    if (list) list.style.display = filtered.length ? '' : 'none';
    if (empty) empty.style.display = filtered.length ? 'none' : '';
    bindCards();
  }

  function bindCards() {
    document.querySelectorAll<HTMLElement>('[data-review-card]').forEach(card => {
      card.addEventListener('click', () => navigate(`#/review/${card.getAttribute('data-review-card')}`));
    });
  }

  $('#rq-search')?.addEventListener('input', filterAndRender);
  $('#rq-priority')?.addEventListener('change', filterAndRender);
  $('#rq-readiness')?.addEventListener('change', filterAndRender);
  bindCards();
}
