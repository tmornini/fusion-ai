import {
  $, icons, html, setHtml, SafeHtml,
  buildSkeleton, buildErrorState,
  iconSparkles, iconDollarSign, iconClock, iconZap,
  iconLightbulb, iconFolderKanban, iconBarChart, iconUsers,
} from '../../site/script';
import {
  getCurrentUser, getDashboardGauges, getDashboardQuickActions, getDashboardStats,
  getIdeas, getProjects, getTeamMembers,
  type GaugeCard, type Idea, type Project, type TeamMember,
} from '../../site/data';
import { donutChart, barChart, areaChart } from '../../site/charts';

const gaugeThemeConfig: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue:  { bg: 'background:hsl(var(--primary)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.1))', border: 'border-color:hsl(var(--primary)/0.15)' },
  green: { bg: 'background:hsl(var(--success)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--success)/0.2),hsl(var(--success)/0.1))', border: 'border-color:hsl(var(--success)/0.15)' },
  amber: { bg: 'background:hsl(var(--warning)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--warning)/0.2),hsl(var(--warning)/0.1))', border: 'border-color:hsl(var(--warning)/0.15)' },
};

const gaugeIconConfig: Record<string, (size?: number, cssClass?: string) => SafeHtml> = {
  dollarSign: iconDollarSign, clock: iconClock, zap: iconZap,
};

function buildGauge(card: GaugeCard): SafeHtml {
  const ts = gaugeThemeConfig[card.theme]!;
  const uid = card.title.replace(/\s+/g, '-').toLowerCase();
  const outerPct = Math.min((card.outer.value / card.outer.max) * 100, 100);
  const innerPct = Math.min((card.inner.value / card.inner.max) * 100, 100);
  const outerArc = Math.PI * 65;
  const innerArc = Math.PI * 45;
  const iconFn = gaugeIconConfig[card.icon] || iconDollarSign;

  return html`
    <div class="card" style="border:2px solid transparent;${ts.border};${ts.bg};border-radius:0.75rem;padding:1.5rem;transition:all 0.3s">
      <div class="flex items-center gap-3 mb-5">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;${ts.iconBg};display:flex;align-items:center;justify-content:center">
          ${iconFn(20, card.iconClass)}
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
            <div style="width:0.625rem;height:0.625rem;border-radius:9999px;background:hsl(var(--success))"></div>
            <span class="text-xs text-muted" style="font-weight:500">${card.inner.label}</span>
          </div>
          <p class="text-2xl font-bold">${card.inner.display}</p>
        </div>
      </div>
    </div>`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// ── Chart data transformations ────────────────

const ideaPipelineConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'hsl(var(--muted-foreground))' },
  scored: { label: 'Scored', color: 'hsl(var(--info))' },
  pending_review: { label: 'Under Review', color: 'hsl(var(--warning))' },
  approved: { label: 'Approved', color: 'hsl(var(--success))' },
  rejected: { label: 'Rejected', color: 'hsl(var(--error))' },
};

const projectHealthConfig: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'hsl(var(--success))' },
  under_review: { label: 'Under Review', color: 'hsl(var(--warning))' },
  sent_back: { label: 'Sent Back', color: 'hsl(var(--error))' },
};

function buildPipelineData(ideas: Idea[]) {
  const groups: Record<string, number> = {};
  ideas.forEach(i => { groups[i.status] = (groups[i.status] || 0) + 1; });
  return Object.entries(groups).map(([status, count]) => ({
    label: ideaPipelineConfig[status]?.label || status,
    value: count,
    color: ideaPipelineConfig[status]?.color,
  }));
}

function buildProjectHealthData(projects: Project[]) {
  const groups: Record<string, number> = {};
  projects.forEach(p => { groups[p.status] = (groups[p.status] || 0) + 1; });
  return Object.entries(groups).map(([status, count]) => ({
    label: projectHealthConfig[status]?.label || status,
    value: count,
    color: projectHealthConfig[status]?.color,
  }));
}

function buildScoreData(ideas: Idea[]) {
  return [...ideas]
    .sort((a, b) => a.score - b.score)
    .map(i => ({ label: i.title.slice(0, 12), value: i.score }));
}

function buildAvailabilityData(members: TeamMember[]) {
  return members.map(m => ({
    label: m.name.split(' ')[0] ?? '',
    value: m.availability,
  }));
}

function fitSvgToContainer(container: HTMLElement): void {
  const svg = container.querySelector('svg');
  if (svg) {
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.maxWidth = svg.getAttribute('width') + 'px';
  }
}

// ── Chart rendering ────────────────

function renderCharts(ideas: Idea[], projects: Project[], members: TeamMember[]): void {
  // Icons
  const pipelineIcon = $('#chart-pipeline-icon');
  if (pipelineIcon) setHtml(pipelineIcon, iconLightbulb(16, 'text-primary'));
  const healthIcon = $('#chart-health-icon');
  if (healthIcon) setHtml(healthIcon, iconFolderKanban(16, 'text-success'));
  const scoresIcon = $('#chart-scores-icon');
  if (scoresIcon) setHtml(scoresIcon, iconBarChart(16, 'text-warning'));
  const availIcon = $('#chart-avail-icon');
  if (availIcon) setHtml(availIcon, iconUsers(16, 'text-primary'));

  // 1. Idea Pipeline (Donut)
  const pipelineEl = $('#chart-pipeline');
  if (pipelineEl) {
    const pipelineData = buildPipelineData(ideas);
    const total = pipelineData.reduce((a, d) => a + d.value, 0);
    setHtml(pipelineEl, html`${donutChart(pipelineData, {
      width: 140,
      colors: pipelineData.map(d => d.color || ''),
    })}<div class="donut-legend">${pipelineData.map(d =>
      html`<span class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${d.color}"></span>
        ${d.label} <strong>${d.value}</strong> <span class="text-muted">(${Math.round(d.value / total * 100)}%)</span>
      </span>`
    )}</div>`);
    fitSvgToContainer(pipelineEl);
  }

  // 2. Project Health (Bar)
  const healthEl = $('#chart-health');
  if (healthEl) {
    setHtml(healthEl, barChart(buildProjectHealthData(projects), {
      width: 300,
      height: 180,
      colors: Object.values(projectHealthConfig).map(c => c.color),
    }));
    fitSvgToContainer(healthEl);
  }

  // 3. Idea Scores (Area)
  const scoresEl = $('#chart-scores');
  if (scoresEl) {
    setHtml(scoresEl, areaChart(buildScoreData(ideas), {
      width: 300,
      height: 180,
      id: 'dashboard-scores',
      colors: ['hsl(var(--warning))'],
    }));
    fitSvgToContainer(scoresEl);
  }

  // 4. Team Availability (Bar)
  const availEl = $('#chart-availability');
  if (availEl) {
    setHtml(availEl, barChart(buildAvailabilityData(members), {
      width: 300,
      height: 180,
      colors: ['hsl(var(--primary))'],
    }));
    fitSvgToContainer(availEl);
  }
}

export async function init(): Promise<void> {
  // Show skeletons
  const gaugeContainer = $('#gauge-container');
  if (gaugeContainer) setHtml(gaugeContainer, buildSkeleton('card-grid', { count: 3 }));
  const actionsEl = $('#quick-actions');
  if (actionsEl) setHtml(actionsEl, buildSkeleton('card-grid', { count: 4 }));

  let user, gauges, quickActions, stats;
  try {
    [user, gauges, quickActions, stats] = await Promise.all([
      getCurrentUser(),
      getDashboardGauges(),
      getDashboardQuickActions(),
      getDashboardStats(),
    ]);
  } catch {
    if (gaugeContainer) {
      setHtml(gaugeContainer, buildErrorState('Failed to load dashboard data.'));
      const retryBtn = gaugeContainer.querySelector('[data-retry-btn]');
      if (retryBtn) retryBtn.addEventListener('click', () => init());
    }
    return;
  }

  // Hero
  const heroIcon = $('#hero-icon');
  if (heroIcon) setHtml(heroIcon, iconSparkles(28, 'text-primary-fg'));

  const greetingEl = $('#hero-greeting');
  if (greetingEl) greetingEl.textContent = `Good ${greeting()}`;

  const userName = $('#hero-user-name');
  if (userName) userName.textContent = user.name;

  const company = $('#hero-company');
  if (company) company.textContent = user.company;

  // Stats
  const statsEl = $('#hero-stats');
  if (statsEl) {
    setHtml(statsEl, html`${stats.map((s, i) => html`
      <div style="text-align:center">
        <div class="flex items-baseline justify-center gap-1">
          <span class="text-2xl font-bold">${s.value}</span>
          ${s.trend ? html`<span class="text-xs font-semibold text-success">${s.trend}</span>` : html``}
        </div>
        <p class="text-xs text-muted" style="font-weight:500;margin-top:0.125rem">${s.label}</p>
      </div>
      ${i < stats.length - 1 ? html`<div style="height:2rem;width:1px;background:hsl(var(--border))"></div>` : html``}
    `)}`);
  }

  // Gauges
  if (gaugeContainer) setHtml(gaugeContainer, html`${gauges.map(buildGauge)}`);

  // Quick Actions
  if (actionsEl) {
    setHtml(actionsEl, html`${quickActions.map(a => {
      const iconFn = icons[a.icon] || icons['lightbulb'];
      return html`
        <button class="card card-hover" style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding:1.5rem;cursor:pointer;border:2px solid hsl(var(--border)/0.5)" data-action-href="${a.href}">
          <div style="width:3.5rem;height:3.5rem;border-radius:0.75rem;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center">
            ${iconFn ? iconFn(24, 'text-muted') : html``}
          </div>
          <span class="text-sm font-semibold">${a.label}</span>
        </button>`;
    })}`);

    actionsEl.querySelectorAll<HTMLElement>('[data-action-href]').forEach(el => {
      el.addEventListener('click', () => { window.location.href = el.getAttribute('data-action-href')!; });
    });
  }

  // Charts — fetch chart data in parallel (non-blocking for main dashboard)
  try {
    const [ideas, projects, members] = await Promise.all([
      getIdeas(),
      getProjects(),
      getTeamMembers(),
    ]);
    renderCharts(ideas, projects, members);
  } catch {
    // Charts are supplementary — silently degrade
  }
}
