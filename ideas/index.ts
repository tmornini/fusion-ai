import {
  renderDashboardLayout, initDashboardLayout, $, escapeHtml, navigate,
  iconPlus, iconWand, iconGripVertical, iconTrendingUp, iconClock,
  iconDollarSign, iconStar, iconLayoutGrid, iconBarChart, iconEye,
  iconClipboardCheck, iconChevronRight, iconArrowRight, iconLightbulb, iconTarget,
} from '../site/script';

interface Idea {
  id: string;
  title: string;
  score: number;
  estimatedImpact: number;
  estimatedTime: number;
  estimatedCost: number;
  priority: number;
  status: 'draft' | 'scored' | 'pending_review' | 'approved' | 'rejected';
  submittedBy: string;
  edgeStatus: 'incomplete' | 'draft' | 'complete';
}

const mockIdeas: Idea[] = [
  { id: '1', title: 'AI-Powered Customer Segmentation', score: 92, estimatedImpact: 85, estimatedTime: 120, estimatedCost: 45000, priority: 1, status: 'pending_review', submittedBy: 'Sarah Chen', edgeStatus: 'complete' },
  { id: '2', title: 'Automated Report Generation', score: 87, estimatedImpact: 78, estimatedTime: 80, estimatedCost: 32000, priority: 2, status: 'approved', submittedBy: 'Mike Thompson', edgeStatus: 'complete' },
  { id: '3', title: 'Predictive Maintenance System', score: 84, estimatedImpact: 90, estimatedTime: 200, estimatedCost: 75000, priority: 3, status: 'scored', submittedBy: 'Emily Rodriguez', edgeStatus: 'draft' },
  { id: '4', title: 'Real-time Analytics Dashboard', score: 81, estimatedImpact: 72, estimatedTime: 60, estimatedCost: 28000, priority: 4, status: 'pending_review', submittedBy: 'David Kim', edgeStatus: 'complete' },
  { id: '5', title: 'Smart Inventory Optimization', score: 78, estimatedImpact: 68, estimatedTime: 100, estimatedCost: 38000, priority: 5, status: 'draft', submittedBy: 'Lisa Wang', edgeStatus: 'incomplete' },
  { id: '6', title: 'Employee Training Assistant', score: 74, estimatedImpact: 65, estimatedTime: 90, estimatedCost: 35000, priority: 6, status: 'rejected', submittedBy: 'Jessica Park', edgeStatus: 'incomplete' },
];

const statusConfig: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'badge-default' },
  scored: { label: 'Scored', cls: 'badge-primary' },
  pending_review: { label: 'Pending Review', cls: 'badge-warning' },
  approved: { label: 'Approved', cls: 'badge-success' },
  rejected: { label: 'Sent Back', cls: 'badge-error' },
};

const edgeStatusConfig: Record<string, { label: string; cls: string }> = {
  incomplete: { label: 'Edge Missing', cls: 'badge-error' },
  draft: { label: 'Edge Draft', cls: 'badge-warning' },
  complete: { label: 'Edge Complete', cls: 'badge-success' },
};

function getScoreColor(score: number): string {
  if (score >= 85) return 'color:hsl(var(--success));background:hsl(var(--success-soft))';
  if (score >= 70) return 'color:hsl(var(--warning));background:hsl(var(--warning-soft))';
  return 'color:hsl(var(--error));background:hsl(var(--error-soft))';
}

function renderIdeaCard(idea: Idea, view: string): string {
  const canReview = idea.status === 'pending_review' && idea.edgeStatus === 'complete';
  const canConvert = idea.status === 'approved';
  const needsEdge = idea.edgeStatus !== 'complete' && idea.status !== 'draft';

  return `
    <div class="card card-hover p-5" style="cursor:pointer" data-idea-card="${idea.id}">
      <div class="flex items-start gap-4">
        <div class="hidden-mobile" style="color:hsl(var(--muted-foreground)/0.5);margin-top:0.25rem;cursor:grab">
          ${iconGripVertical(20)}
        </div>
        <div style="flex:1;min-width:0">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div style="flex:1;min-width:0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="font-display font-semibold truncate">${escapeHtml(idea.title)}</h3>
                <span class="badge ${statusConfig[idea.status].cls} text-xs">${statusConfig[idea.status].label}</span>
                <span class="badge ${edgeStatusConfig[idea.edgeStatus].cls} text-xs">${iconTarget(12)} ${edgeStatusConfig[idea.edgeStatus].label}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-muted">
                ${view === 'priority' ? `<span>Priority #${idea.priority}</span><span>·</span>` : ''}
                <span>by ${escapeHtml(idea.submittedBy)}</span>
              </div>
            </div>
            <div style="padding:0.25rem 0.75rem;border-radius:var(--radius-lg);font-weight:600;font-size:0.875rem;${getScoreColor(idea.score)}">
              ${iconStar(14)} ${idea.score}
            </div>
          </div>

          <div class="flex items-end justify-between gap-4">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;flex:1">
              <div class="flex items-center gap-2">
                <div style="width:2rem;height:2rem;border-radius:var(--radius-lg);background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center">
                  ${iconTrendingUp(16, 'text-primary')}
                </div>
                <div>
                  <p class="text-xs text-muted">Impact</p>
                  <p class="text-sm font-medium">${idea.estimatedImpact}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div style="width:2rem;height:2rem;border-radius:var(--radius-lg);background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center">
                  ${iconClock(16, 'text-primary')}
                </div>
                <div>
                  <p class="text-xs text-muted">Time</p>
                  <p class="text-sm font-medium">${idea.estimatedTime}h</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div style="width:2rem;height:2rem;border-radius:var(--radius-lg);background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center">
                  ${iconDollarSign(16, 'text-primary')}
                </div>
                <div>
                  <p class="text-xs text-muted">Cost</p>
                  <p class="text-sm font-medium">$${(idea.estimatedCost / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 idea-actions">
              <button class="btn btn-outline btn-sm gap-2" data-idea-view="${idea.id}">
                ${iconEye(16)} <span class="hidden-mobile">View</span>
              </button>
              ${needsEdge ? `
                <button class="btn btn-outline btn-sm gap-2" style="border-color:hsl(var(--primary)/0.3);color:hsl(var(--primary))" data-idea-edge="${idea.id}">
                  ${iconTarget(16)} <span class="hidden-mobile">Define Edge</span>
                </button>` : ''}
              ${canReview ? `
                <button class="btn btn-outline btn-sm gap-2" style="border-color:hsl(var(--warning)/0.3);color:hsl(var(--warning))" data-idea-review="${idea.id}">
                  ${iconClipboardCheck(16)} <span class="hidden-mobile">Review</span>
                </button>` : ''}
              ${canConvert ? `
                <button class="btn btn-primary btn-sm gap-2" data-idea-convert="${idea.id}">
                  ${iconArrowRight(16)} <span class="hidden-mobile">Convert</span>
                </button>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export function render(): string {
  const pendingReviewCount = mockIdeas.filter(i => i.status === 'pending_review').length;
  const sortedByPriority = [...mockIdeas].sort((a, b) => a.priority - b.priority);

  const content = `
    <div>
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-3xl font-display font-bold mb-1">Ideas</h1>
          <p class="text-muted">Explore and prioritize innovation opportunities</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          ${pendingReviewCount > 0 ? `
            <button class="btn btn-outline gap-2" style="border-color:hsl(var(--warning)/0.3);color:hsl(var(--warning))" data-nav="#/review">
              ${iconClipboardCheck(16)} <span class="hidden-mobile">Review Queue</span> (${pendingReviewCount})
            </button>` : ''}
          <button class="btn btn-hero gap-2" data-nav="#/ideas/new">
            ${iconPlus(16)} <span class="hidden-mobile">Create or Generate Idea</span><span class="visible-mobile">New Idea</span>
            ${iconWand(16)}
          </button>
        </div>
      </div>

      <!-- Flow Indicator -->
      <div class="flex items-center gap-2 mb-4 p-3 rounded-lg" style="background:hsl(var(--muted)/0.3);border:1px solid hsl(var(--border));overflow-x:auto">
        ${iconLightbulb(16, 'text-primary')}
        <span class="text-sm text-muted" style="white-space:nowrap">
          <span class="font-medium" style="color:hsl(var(--foreground))">Idea Flow:</span>
          Create → Score → <span class="text-primary font-medium">Edge</span> → Review → Convert
        </span>
        ${iconChevronRight(16, 'text-muted')}
      </div>

      <!-- View Toggle -->
      <div class="flex items-center gap-4 mb-4">
        <div style="display:inline-flex;border-radius:var(--radius-lg);border:1px solid hsl(var(--border));padding:0.25rem;background:hsl(var(--muted)/0.5)">
          <button class="view-toggle-btn active" data-view="priority" style="display:flex;align-items:center;gap:0.5rem;padding:0.375rem 1rem;border-radius:var(--radius);font-size:0.875rem;font-weight:500;border:none;cursor:pointer;transition:all var(--duration-fast);background:hsl(var(--background));color:hsl(var(--foreground));box-shadow:var(--shadow-sm)">
            ${iconLayoutGrid(16)} Priority
          </button>
          <button class="view-toggle-btn" data-view="performance" style="display:flex;align-items:center;gap:0.5rem;padding:0.375rem 1rem;border-radius:var(--radius);font-size:0.875rem;font-weight:500;border:none;cursor:pointer;transition:all var(--duration-fast);background:transparent;color:hsl(var(--muted-foreground))">
            ${iconBarChart(16)} Performance
          </button>
        </div>
        <span class="text-sm text-muted" id="ideas-count">${sortedByPriority.length} ideas · by priority</span>
      </div>

      <!-- Ideas Grid -->
      <div id="ideas-list" style="display:flex;flex-direction:column;gap:0.75rem">
        ${sortedByPriority.map(idea => renderIdeaCard(idea, 'priority')).join('')}
      </div>
    </div>`;

  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();

  let currentView = 'priority';

  function rerenderList() {
    const sorted = currentView === 'priority'
      ? [...mockIdeas].sort((a, b) => a.priority - b.priority)
      : [...mockIdeas].sort((a, b) => b.score - a.score);

    const list = $('#ideas-list');
    if (list) list.innerHTML = sorted.map(idea => renderIdeaCard(idea, currentView)).join('');

    const count = $('#ideas-count');
    if (count) count.textContent = `${sorted.length} ideas · ${currentView === 'priority' ? 'by priority' : 'by score'}`;

    bindCardActions();
  }

  document.querySelectorAll<HTMLElement>('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view') || 'priority';
      currentView = view;
      document.querySelectorAll<HTMLElement>('.view-toggle-btn').forEach(b => {
        const isActive = b.getAttribute('data-view') === view;
        b.style.background = isActive ? 'hsl(var(--background))' : 'transparent';
        b.style.color = isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))';
        b.style.boxShadow = isActive ? 'var(--shadow-sm)' : 'none';
      });
      rerenderList();
    });
  });

  function bindCardActions() {
    document.querySelectorAll<HTMLElement>('[data-idea-card]').forEach(card => {
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        navigate(`#/ideas/${card.getAttribute('data-idea-card')}/score`);
      });
    });
    document.querySelectorAll<HTMLElement>('[data-idea-view]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); navigate(`#/ideas/${btn.getAttribute('data-idea-view')}/score`); });
    });
    document.querySelectorAll<HTMLElement>('[data-idea-edge]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); navigate(`#/ideas/${btn.getAttribute('data-idea-edge')}/edge`); });
    });
    document.querySelectorAll<HTMLElement>('[data-idea-review]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); navigate(`#/review/${btn.getAttribute('data-idea-review')}`); });
    });
    document.querySelectorAll<HTMLElement>('[data-idea-convert]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); navigate(`#/ideas/${btn.getAttribute('data-idea-convert')}/convert`); });
    });
  }

  bindCardActions();
}
