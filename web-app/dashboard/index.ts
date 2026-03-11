import { $ } from '../app/dom';
import { html, setHtml, SafeHtml } from '../app/safe-html';
import { buildSkeleton, buildErrorState } from '../app/loading-states';
import { iconDollarSign, iconClock, iconZap } from '../app/icons';
import { getDashboardGauges, type GaugeCard } from '../app/adapters';

const gaugeThemeConfig: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue:  { bg: 'background:hsl(var(--primary)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.1))', border: 'border-color:hsl(var(--primary)/0.15)' },
  green: { bg: 'background:hsl(var(--success)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--success)/0.2),hsl(var(--success)/0.1))', border: 'border-color:hsl(var(--success)/0.15)' },
  amber: { bg: 'background:hsl(var(--warning)/0.04)', iconBg: 'background:linear-gradient(135deg,hsl(var(--warning)/0.2),hsl(var(--warning)/0.1))', border: 'border-color:hsl(var(--warning)/0.15)' },
};

const gaugeIconConfig: Record<string, (size?: number, cssClass?: string) => SafeHtml> = {
  dollarSign: iconDollarSign, clock: iconClock, zap: iconZap,
};

const GAUGE_THEME_FALLBACK = { bg: 'background:hsl(var(--muted)/0.04)', iconBg: 'background:hsl(var(--muted)/0.1)', border: 'border-color:hsl(var(--muted)/0.15)' };
const BASELINE_BAR_PCT = 66;

function buildGauge(card: GaugeCard): SafeHtml {
  const themeStyle = gaugeThemeConfig[card.theme] ?? GAUGE_THEME_FALLBACK;
  const iconFn = gaugeIconConfig[card.icon] || iconDollarSign;

  const ratio = card.baseline.value > 0 ? card.current.value / card.baseline.value : 0;
  const currentBarPct = Math.min(ratio * BASELINE_BAR_PCT, 100);

  // Bar styles
  let currentBarStyle: string;
  let flashStyle = '';

  if (card.hasOverrunWarning) {
    // Green up to baseline marker, gradient to red beyond
    const greenStopPct = currentBarPct > 0 ? Math.min((BASELINE_BAR_PCT / currentBarPct) * 100, 100) : 100;
    currentBarStyle = `background:linear-gradient(to right,hsl(var(--success)) 0%,hsl(var(--success)) ${greenStopPct}%,red ${Math.min(greenStopPct + 10, 100)}%,red 100%)`;

    // Flash when bar exceeds 100% width (current > baseline * 100/66)
    if (currentBarPct >= 100) {
      // Interpolate flash duration: 1s at ratio=100/66, 0.333s at ratio=200/66*100
      const overrunRatio = ratio / (100 / BASELINE_BAR_PCT);
      const flashDuration = Math.max(0.333, 1 - (overrunRatio - 1) * 0.667);
      flashStyle = `animation:gauge-flash ${flashDuration.toFixed(3)}s infinite`;
    }
  } else {
    // Impact: solid green, no gradient or flash
    currentBarStyle = 'background:hsl(var(--success))';
  }

  const barTrackStyle = 'height:0.75rem;border-radius:0.375rem;background:hsl(var(--muted)/0.3);overflow:hidden';

  return html`
    <div class="card" style="border:2px solid transparent;${themeStyle.border};${themeStyle.bg};border-radius:0.75rem;padding:1.5rem;transition:all 0.3s">
      <div class="flex items-center gap-3 mb-5">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;${themeStyle.iconBg};display:flex;align-items:center;justify-content:center">
          ${iconFn(20, card.iconCssClass)}
        </div>
        <h3 class="text-sm font-semibold">${card.title}</h3>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.25rem">
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-muted" style="font-weight:500">Baseline</span>
          </div>
          <div style="${barTrackStyle}">
            <div style="width:${BASELINE_BAR_PCT}%;height:100%;border-radius:0.375rem;background:hsl(var(--primary))"></div>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-muted" style="font-weight:500">Current</span>
          </div>
          <div style="${barTrackStyle}">
            <div style="width:${currentBarPct}%;height:100%;border-radius:0.375rem;${currentBarStyle};${flashStyle}"></div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div style="text-align:center;padding:0.75rem;border-radius:0.5rem;background:hsl(var(--card)/0.8);border:1px solid hsl(var(--border)/0.5)">
          <div class="flex items-center justify-center gap-2" style="margin-bottom:0.25rem">
            <div style="width:0.625rem;height:0.625rem;border-radius:9999px;background:hsl(var(--primary))"></div>
            <span class="text-xs text-muted" style="font-weight:500">Baseline</span>
          </div>
          <p class="text-2xl font-bold">${card.baseline.display}</p>
        </div>
        <div style="text-align:center;padding:0.75rem;border-radius:0.5rem;background:hsl(var(--card)/0.8);border:1px solid hsl(var(--border)/0.5)">
          <div class="flex items-center justify-center gap-2" style="margin-bottom:0.25rem">
            <div style="width:0.625rem;height:0.625rem;border-radius:9999px;background:hsl(var(--success))"></div>
            <span class="text-xs text-muted" style="font-weight:500">Current</span>
          </div>
          <p class="text-2xl font-bold">${card.current.display}</p>
        </div>
      </div>
    </div>`;
}

export async function init(): Promise<void> {
  const gaugeContainer = $('#gauge-container');
  if (gaugeContainer) setHtml(gaugeContainer, buildSkeleton('card-grid', { count: 3 }));

  let gauges: GaugeCard[];
  try {
    gauges = await getDashboardGauges();
  } catch {
    if (gaugeContainer) {
      setHtml(gaugeContainer, buildErrorState('Failed to load dashboard data.'));
      const retryBtn = gaugeContainer.querySelector('[data-retry-btn]');
      if (retryBtn) retryBtn.addEventListener('click', () => init());
    }
    return;
  }

  if (gaugeContainer) setHtml(gaugeContainer, html`${gauges.map(buildGauge)}`);
}
