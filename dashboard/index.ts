import {
  renderDashboardLayout, initDashboardLayout, navigate,
  iconSparkles, iconLightbulb, iconFolderKanban, iconUsers,
  iconTrendingUp, iconDollarSign, iconClock, iconZap,
} from '../site/script';

interface GaugeCard {
  title: string;
  iconFn: (s?: number, c?: string) => string;
  iconClass: string;
  theme: 'blue' | 'green' | 'amber';
  outer: { value: number; max: number; label: string; display: string };
  inner: { value: number; max: number; label: string; display: string };
}

const gaugeCards: GaugeCard[] = [
  {
    title: 'Cost Overview', iconFn: iconDollarSign, iconClass: 'text-primary', theme: 'blue',
    outer: { value: 42300, max: 50000, label: 'Budget Spent', display: '$42.3K' },
    inner: { value: 25000, max: 50000, label: 'ROI Generated', display: '$25K' },
  },
  {
    title: 'Time Tracking', iconFn: iconClock, iconClass: 'text-success', theme: 'green',
    outer: { value: 25, max: 30, label: 'Total Duration', display: '25d' },
    inner: { value: 12, max: 30, label: 'Days Elapsed', display: '12d' },
  },
  {
    title: 'Project Impact', iconFn: iconZap, iconClass: 'text-warning', theme: 'amber',
    outer: { value: 92, max: 100, label: 'Target Score', display: '92%' },
    inner: { value: 85, max: 100, label: 'Current Score', display: '85%' },
  },
];

const themeStyles: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue: { bg: 'background:hsl(var(--primary)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.1))', border: 'border-color:hsl(var(--primary)/0.15)' },
  green: { bg: 'background:hsl(var(--success)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--success)/0.2),hsl(var(--success)/0.1))', border: 'border-color:hsl(var(--success)/0.15)' },
  amber: { bg: 'background:hsl(var(--warning)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--warning)/0.2),hsl(var(--warning)/0.1))', border: 'border-color:hsl(var(--warning)/0.15)' },
};

function renderGauge(card: GaugeCard): string {
  const ts = themeStyles[card.theme];
  const uid = card.title.replace(/\s+/g, '-').toLowerCase();
  const outerPct = Math.min((card.outer.value / card.outer.max) * 100, 100);
  const innerPct = Math.min((card.inner.value / card.inner.max) * 100, 100);
  const outerArc = Math.PI * 65;
  const innerArc = Math.PI * 45;

  return `
    <div class="card" style="border:2px solid transparent;${ts.border};${ts.bg};border-radius:0.75rem;padding:1.5rem;transition:all 0.3s">
      <div class="flex items-center gap-3 mb-5">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;${ts.iconBg};display:flex;align-items:center;justify-content:center">
          ${card.iconFn(20, card.iconClass)}
        </div>
        <h3 class="text-sm font-semibold">${card.title}</h3>
      </div>
      <div style="display:flex;justify-content:center;margin-bottom:1.25rem">
        <svg width="180" height="95" viewBox="0 0 180 95" style="overflow:visible">
          <defs>
            <linearGradient id="outer-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="1"/>
            </linearGradient>
            <linearGradient id="inner-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="hsl(var(--success))" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="hsl(var(--success))" stop-opacity="1"/>
            </linearGradient>
          </defs>
          <path d="M 25 85 A 65 65 0 0 1 155 85" fill="none" stroke="hsl(var(--muted))" stroke-width="14" stroke-linecap="round" opacity="0.3"/>
          <path d="M 25 85 A 65 65 0 0 1 155 85" fill="none" stroke="url(#outer-${uid})" stroke-width="14" stroke-linecap="round" stroke-dasharray="${outerArc}" stroke-dashoffset="${outerArc - (outerPct / 100) * outerArc}"/>
          <path d="M 45 85 A 45 45 0 0 1 135 85" fill="none" stroke="hsl(var(--muted))" stroke-width="14" stroke-linecap="round" opacity="0.3"/>
          <path d="M 45 85 A 45 45 0 0 1 135 85" fill="none" stroke="url(#inner-${uid})" stroke-width="14" stroke-linecap="round" stroke-dasharray="${innerArc}" stroke-dashoffset="${innerArc - (innerPct / 100) * innerArc}"/>
        </svg>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div style="text-align:center;padding:0.75rem;border-radius:0.5rem;background:hsl(var(--card)/0.8);border:1px solid hsl(var(--border)/0.5)">
          <div class="flex items-center justify-center gap-2" style="margin-bottom:0.25rem">
            <div style="width:0.625rem;height:0.625rem;border-radius:9999px;background:hsl(var(--primary))"></div>
            <span class="text-xs text-muted" style="font-weight:500">${card.outer.label}</span>
          </div>
          <p class="text-2xl font-bold">${card.outer.display}</p>
        </div>
        <div style="text-align:center;padding:0.75rem;border-radius:0.5rem;background:hsl(var(--card)/0.8);border:1px solid hsl(var(--border)/0.5)">
          <div class="flex items-center justify-center gap-2" style="margin-bottom:0.25rem">
            <div style="width:0.625rem;height:0.625rem;border-radius:9999px;background:hsl(142 71% 45%)"></div>
            <span class="text-xs text-muted" style="font-weight:500">${card.inner.label}</span>
          </div>
          <p class="text-2xl font-bold">${card.inner.display}</p>
        </div>
      </div>
    </div>`;
}

const quickActions = [
  { label: 'New Idea', iconFn: iconLightbulb, href: '#/ideas/new' },
  { label: 'Create Project', iconFn: iconFolderKanban, href: '#/projects' },
  { label: 'Invite Team', iconFn: iconUsers, href: '#/teams' },
  { label: 'View Reports', iconFn: iconTrendingUp, href: '#/dashboard' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function render(): string {
  const content = `
    <div>
      <!-- Welcome Hero -->
      <div class="card" style="position:relative;overflow:hidden;padding:2rem;margin-bottom:2rem;border:2px solid hsl(var(--primary)/0.1)">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,hsl(var(--primary)/0.04),transparent,hsl(48 97% 55%/0.06))"></div>
        <div style="position:relative;z-index:1">
          <div class="flex items-start gap-4">
            <div class="hidden-mobile" style="width:3.5rem;height:3.5rem;border-radius:1rem;background:linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.8));display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px hsl(var(--primary)/0.3)">
              ${iconSparkles(28, 'text-primary-fg')}
            </div>
            <div style="flex:1">
              <p class="text-sm font-medium text-primary" style="margin-bottom:0.25rem">Good ${greeting()}</p>
              <h1 class="text-2xl font-display font-bold" style="margin-bottom:0.5rem">Welcome back, Demo User</h1>
              <p class="text-sm text-muted">Here's an overview of your work in progress at <span class="font-medium" style="color:hsl(var(--foreground))">Demo Company</span></p>
            </div>
            <div class="hidden-mobile flex items-center gap-6">
              ${[
                { label: 'Ideas', value: 12, trend: '+3' },
                { label: 'Projects', value: 5, trend: '+1' },
                { label: 'Done', value: 8, trend: '' },
                { label: 'Review', value: 3, trend: '' },
              ].map((s, i) => `
                <div style="text-align:center">
                  <div class="flex items-baseline justify-center gap-1">
                    <span class="text-2xl font-bold">${s.value}</span>
                    ${s.trend ? `<span class="text-xs font-semibold text-success">${s.trend}</span>` : ''}
                  </div>
                  <p class="text-xs text-muted" style="font-weight:500;margin-top:0.125rem">${s.label}</p>
                </div>
                ${i < 3 ? '<div style="height:2rem;width:1px;background:hsl(var(--border))"></div>' : ''}
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Gauge Grid -->
      <div class="gauge-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:2rem">
        ${gaugeCards.map(renderGauge).join('')}
      </div>

      <!-- Quick Actions -->
      <div class="card" style="padding:2rem;border:2px dashed hsl(var(--border)/0.6)">
        <h2 class="text-lg font-display font-semibold" style="margin-bottom:1.5rem">Quick Actions</h2>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem" class="actions-grid">
          ${quickActions.map(a => `
            <button class="card card-hover" style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding:1.5rem;cursor:pointer;border:2px solid hsl(var(--border)/0.5)" data-nav="${a.href}">
              <div style="width:3.5rem;height:3.5rem;border-radius:0.75rem;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center">
                ${a.iconFn(24, 'text-muted')}
              </div>
              <span class="text-sm font-semibold">${a.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;
  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.getAttribute('data-nav')!));
  });
}
