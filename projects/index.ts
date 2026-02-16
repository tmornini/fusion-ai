import {
  renderDashboardLayout, initDashboardLayout, $, navigate, escapeHtml,
  iconTrendingUp, iconClock, iconDollarSign, iconCheckCircle2,
  iconAlertCircle, iconXCircle, iconLayoutGrid, iconBarChart,
  iconEye, iconTarget, iconGripVertical,
} from '../site/script';

interface Project {
  id: string;
  title: string;
  status: 'approved' | 'under_review' | 'sent_back';
  priorityScore: number;
  estimatedTime: number;
  actualTime: number;
  estimatedCost: number;
  actualCost: number;
  estimatedImpact: number;
  actualImpact: number;
  progress: number;
  priority: number;
}

const mockProjects: Project[] = [
  { id: '1', title: 'AI-Powered Customer Segmentation', status: 'approved', priorityScore: 92, estimatedTime: 120, actualTime: 85, estimatedCost: 45000, actualCost: 38000, estimatedImpact: 85, actualImpact: 78, progress: 72, priority: 1 },
  { id: '2', title: 'Automated Report Generation', status: 'approved', priorityScore: 87, estimatedTime: 80, actualTime: 60, estimatedCost: 32000, actualCost: 28000, estimatedImpact: 78, actualImpact: 82, progress: 85, priority: 2 },
  { id: '3', title: 'Predictive Maintenance System', status: 'under_review', priorityScore: 84, estimatedTime: 200, actualTime: 45, estimatedCost: 75000, actualCost: 18000, estimatedImpact: 90, actualImpact: 0, progress: 22, priority: 3 },
  { id: '4', title: 'Real-time Analytics Dashboard', status: 'approved', priorityScore: 81, estimatedTime: 60, actualTime: 55, estimatedCost: 28000, actualCost: 26000, estimatedImpact: 72, actualImpact: 70, progress: 95, priority: 4 },
  { id: '5', title: 'Smart Inventory Optimization', status: 'sent_back', priorityScore: 78, estimatedTime: 100, actualTime: 30, estimatedCost: 38000, actualCost: 12000, estimatedImpact: 68, actualImpact: 0, progress: 15, priority: 5 },
  { id: '6', title: 'Employee Training Assistant', status: 'under_review', priorityScore: 74, estimatedTime: 90, actualTime: 20, estimatedCost: 35000, actualCost: 8000, estimatedImpact: 65, actualImpact: 0, progress: 18, priority: 6 },
];

const statusConfig: Record<string, { icon: (s?: number, c?: string) => string; cls: string; label: string }> = {
  approved: { icon: iconCheckCircle2, cls: 'badge-success', label: 'Approved' },
  under_review: { icon: iconAlertCircle, cls: 'badge-warning', label: 'Under Review' },
  sent_back: { icon: iconXCircle, cls: 'badge-error', label: 'Sent Back' },
};

function progressRing(pct: number): string {
  const r = 20, c = 24, circ = 2 * Math.PI * r;
  return `
    <div style="position:relative;width:3rem;height:3rem">
      <svg width="48" height="48" style="transform:rotate(-90deg)">
        <circle cx="${c}" cy="${c}" r="${r}" stroke="hsl(var(--muted))" stroke-width="4" fill="none"/>
        <circle cx="${c}" cy="${c}" r="${r}" stroke="hsl(var(--primary))" stroke-width="4" fill="none" stroke-dasharray="${pct * circ / 100} ${circ}"/>
      </svg>
      <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.625rem;font-weight:700">${pct}%</span>
    </div>`;
}

function renderProjectCard(p: Project, view: string): string {
  const sc = statusConfig[p.status];
  return `
    <div class="card card-hover" style="padding:1.25rem" data-project-card="${p.id}">
      <div class="flex items-start gap-4">
        <div class="hidden-mobile text-muted" style="margin-top:0.25rem;cursor:grab">${iconGripVertical(20)}</div>
        <div style="flex:1;min-width:0">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div style="flex:1;min-width:0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="font-display font-semibold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.title)}</h3>
                <span class="badge ${sc.cls} text-xs">${sc.icon(14)} ${sc.label}</span>
              </div>
              ${view === 'priority' ? `<span class="text-xs text-muted">Priority #${p.priority}</span>` : ''}
            </div>
            ${progressRing(p.progress)}
          </div>
          <div class="flex items-end justify-between gap-4">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;flex:1" class="project-metrics-grid">
              <div class="flex items-center gap-2">
                <div style="width:2rem;height:2rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center">${iconTarget(16, 'text-primary')}</div>
                <div><p class="text-xs text-muted">Score</p><p class="text-sm font-medium">${p.priorityScore}</p></div>
              </div>
              <div class="flex items-center gap-2">
                <div style="width:2rem;height:2rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center">${iconTrendingUp(16, 'text-primary')}</div>
                <div><p class="text-xs text-muted">Impact</p><p class="text-sm font-medium">${p.actualImpact || p.estimatedImpact}</p></div>
              </div>
              <div class="flex items-center gap-2">
                <div style="width:2rem;height:2rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center">${iconClock(16, 'text-primary')}</div>
                <div><p class="text-xs text-muted">Time</p><p class="text-sm font-medium">${p.actualTime}h <span class="text-xs text-muted">/ ${p.estimatedTime}h</span></p></div>
              </div>
              <div class="flex items-center gap-2">
                <div style="width:2rem;height:2rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center">${iconDollarSign(16, 'text-primary')}</div>
                <div><p class="text-xs text-muted">Cost</p><p class="text-sm font-medium">$${(p.actualCost / 1000).toFixed(0)}k</p></div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm gap-2" data-view-project="${p.id}">${iconEye(16)} <span class="hidden-mobile">View Details</span></button>
          </div>
        </div>
      </div>
    </div>`;
}

let currentView: 'priority' | 'performance' = 'priority';

function sortedProjects(): Project[] {
  return [...mockProjects].sort((a, b) =>
    currentView === 'priority' ? a.priority - b.priority : b.priorityScore - a.priorityScore
  );
}

function rerenderList(): void {
  const container = $('#projects-list');
  if (container) container.innerHTML = sortedProjects().map(p => renderProjectCard(p, currentView)).join('');
  const info = $('#projects-info');
  if (info) info.textContent = `${mockProjects.length} projects · ${currentView === 'priority' ? 'by priority' : 'by score'}`;
  bindCards();
}

function bindCards(): void {
  document.querySelectorAll<HTMLElement>('[data-project-card]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => navigate(`#/projects/${el.getAttribute('data-project-card')}`));
  });
  document.querySelectorAll<HTMLElement>('[data-view-project]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(`#/projects/${el.getAttribute('data-view-project')}`);
    });
  });
}

export function render(): string {
  const counts = {
    approved: mockProjects.filter(p => p.status === 'approved').length,
    under_review: mockProjects.filter(p => p.status === 'under_review').length,
    sent_back: mockProjects.filter(p => p.status === 'sent_back').length,
  };

  const content = `
    <div>
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-display font-bold mb-1">Projects</h1>
          <p class="text-sm text-muted">Track and manage active projects</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge badge-success text-xs">${iconCheckCircle2(14)} ${counts.approved}</span>
          <span class="badge badge-warning text-xs">${iconAlertCircle(14)} ${counts.under_review}</span>
          <span class="badge badge-error text-xs">${iconXCircle(14)} ${counts.sent_back}</span>
        </div>
      </div>

      <div class="flex items-center gap-4 mb-6">
        <div style="display:inline-flex;border-radius:0.5rem;border:1px solid hsl(var(--border));padding:0.25rem;background:hsl(var(--muted)/0.5)">
          <button class="view-toggle-btn active" data-view="priority" style="display:flex;align-items:center;gap:0.5rem;padding:0.375rem 1rem;border-radius:0.375rem;font-size:0.875rem;font-weight:500;border:none;cursor:pointer">
            ${iconLayoutGrid(16)} Priority
          </button>
          <button class="view-toggle-btn" data-view="performance" style="display:flex;align-items:center;gap:0.5rem;padding:0.375rem 1rem;border-radius:0.375rem;font-size:0.875rem;font-weight:500;border:none;cursor:pointer">
            ${iconBarChart(16)} Performance
          </button>
        </div>
        <span class="text-sm text-muted" id="projects-info">${mockProjects.length} projects · by priority</span>
      </div>

      <div id="projects-list" style="display:flex;flex-direction:column;gap:0.75rem">
        ${sortedProjects().map(p => renderProjectCard(p, currentView)).join('')}
      </div>
    </div>`;
  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();
  document.querySelectorAll<HTMLElement>('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.getAttribute('data-view') as 'priority' | 'performance';
      document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rerenderList();
    });
  });
  bindCards();
}
