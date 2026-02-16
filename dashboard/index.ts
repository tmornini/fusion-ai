import {
  $, icons,
  iconSparkles, iconDollarSign, iconClock, iconZap,
} from '../site/script';
import {
  getCurrentUser, getDashboardGauges, getDashboardQuickActions, getDashboardStats,
  type GaugeCardData,
} from '../site/data';

const themeStyles: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue:  { bg: 'background:hsl(var(--primary)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.1))', border: 'border-color:hsl(var(--primary)/0.15)' },
  green: { bg: 'background:hsl(var(--success)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--success)/0.2),hsl(var(--success)/0.1))', border: 'border-color:hsl(var(--success)/0.15)' },
  amber: { bg: 'background:hsl(var(--warning)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--warning)/0.2),hsl(var(--warning)/0.1))', border: 'border-color:hsl(var(--warning)/0.15)' },
};

// Map data.ts icon string names to icon functions
const iconLookup: Record<string, (s?: number, c?: string) => string> = {
  dollarSign: iconDollarSign, clock: iconClock, zap: iconZap,
};

function renderGauge(card: GaugeCardData): string {
  const ts = themeStyles[card.theme];
  const uid = card.title.replace(/\s+/g, '-').toLowerCase();
  const outerPct = Math.min((card.outer.value / card.outer.max) * 100, 100);
  const innerPct = Math.min((card.inner.value / card.inner.max) * 100, 100);
  const outerArc = Math.PI * 65;
  const innerArc = Math.PI * 45;
  const iconFn = iconLookup[card.icon] || iconDollarSign;

  return `
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
            <div style="width:0.625rem;height:0.625rem;border-radius:9999px;background:hsl(142 71% 45%)"></div>
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

export async function init(): Promise<void> {
  const [user, gauges, quickActions, stats] = await Promise.all([
    getCurrentUser(),
    getDashboardGauges(),
    getDashboardQuickActions(),
    getDashboardStats(),
  ]);

  // Hero
  const heroIcon = $('#hero-icon');
  if (heroIcon) heroIcon.innerHTML = iconSparkles(28, 'text-primary-fg');

  const greetingEl = $('#hero-greeting');
  if (greetingEl) greetingEl.textContent = `Good ${greeting()}`;

  const userName = $('#hero-user-name');
  if (userName) userName.textContent = user.name;

  const company = $('#hero-company');
  if (company) company.textContent = user.company;

  // Stats
  const statsEl = $('#hero-stats');
  if (statsEl) {
    statsEl.innerHTML = stats.map((s, i) => `
      <div style="text-align:center">
        <div class="flex items-baseline justify-center gap-1">
          <span class="text-2xl font-bold">${s.value}</span>
          ${s.trend ? `<span class="text-xs font-semibold text-success">${s.trend}</span>` : ''}
        </div>
        <p class="text-xs text-muted" style="font-weight:500;margin-top:0.125rem">${s.label}</p>
      </div>
      ${i < stats.length - 1 ? '<div style="height:2rem;width:1px;background:hsl(var(--border))"></div>' : ''}
    `).join('');
  }

  // Gauges
  const gaugeContainer = $('#gauge-container');
  if (gaugeContainer) gaugeContainer.innerHTML = gauges.map(renderGauge).join('');

  // Quick Actions
  const actionsEl = $('#quick-actions');
  if (actionsEl) {
    actionsEl.innerHTML = quickActions.map(a => {
      const iconFn = icons[a.icon] || icons['lightbulb'];
      return `
        <button class="card card-hover" style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding:1.5rem;cursor:pointer;border:2px solid hsl(var(--border)/0.5)" data-action-href="${a.href}">
          <div style="width:3.5rem;height:3.5rem;border-radius:0.75rem;background:hsl(var(--muted));display:flex;align-items:center;justify-content:center">
            ${iconFn ? iconFn(24, 'text-muted') : ''}
          </div>
          <span class="text-sm font-semibold">${a.label}</span>
        </button>`;
    }).join('');

    actionsEl.querySelectorAll<HTMLElement>('[data-action-href]').forEach(el => {
      el.addEventListener('click', () => { window.location.href = el.getAttribute('data-action-href')!; });
    });
  }
}
