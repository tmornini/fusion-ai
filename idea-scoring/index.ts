import {
  $, navigate, escapeHtml,
  iconArrowLeft, iconArrowRight, iconTrendingUp, iconClock,
  iconDollarSign, iconZap, iconTarget, iconBarChart, iconInfo,
  iconCheckCircle2, iconLoader, iconSparkles,
} from '../site/script';

interface ScoreBreakdown {
  label: string;
  score: number;
  maxScore: number;
  reason: string;
}

interface IdeaScore {
  overall: number;
  impact: { score: number; breakdown: ScoreBreakdown[] };
  feasibility: { score: number; breakdown: ScoreBreakdown[] };
  efficiency: { score: number; breakdown: ScoreBreakdown[] };
  estimatedTime: string;
  estimatedCost: string;
  recommendation: string;
}

const mockIdea = {
  title: 'AI-Powered Customer Segmentation',
  problemStatement: 'Marketing team spends 20+ hours weekly manually segmenting customers, leading to delayed campaigns and missed opportunities.',
};

const mockScore: IdeaScore = {
  overall: 82,
  impact: {
    score: 88,
    breakdown: [
      { label: 'Business Value', score: 9, maxScore: 10, reason: 'Direct revenue impact through improved conversions' },
      { label: 'Strategic Alignment', score: 8, maxScore: 10, reason: 'Supports digital transformation goals' },
      { label: 'User Benefit', score: 9, maxScore: 10, reason: 'Saves significant time for marketing team' },
    ]
  },
  feasibility: {
    score: 75,
    breakdown: [
      { label: 'Technical Complexity', score: 7, maxScore: 10, reason: 'Requires ML expertise and data pipeline' },
      { label: 'Resource Availability', score: 8, maxScore: 10, reason: 'Team has relevant skills' },
      { label: 'Integration Effort', score: 8, maxScore: 10, reason: 'Works with existing CRM' },
    ]
  },
  efficiency: {
    score: 85,
    breakdown: [
      { label: 'Time to Value', score: 9, maxScore: 10, reason: 'MVP deliverable in 6-8 weeks' },
      { label: 'Cost Efficiency', score: 8, maxScore: 10, reason: 'Reasonable investment for expected returns' },
      { label: 'Scalability', score: 9, maxScore: 10, reason: 'Can expand to other use cases' },
    ]
  },
  estimatedTime: '6-8 weeks',
  estimatedCost: '$45,000 - $65,000',
  recommendation: 'Strong candidate for immediate prioritization. High impact with manageable complexity. Recommend starting with a focused pilot on top customer segment.'
};

function scoreColor(score: number): string {
  if (score >= 80) return 'hsl(142 71% 45%)';
  if (score >= 60) return 'hsl(var(--warning))';
  return 'hsl(var(--error))';
}

function progressBg(score: number): string {
  if (score >= 80) return 'background:hsl(142 71% 45%)';
  if (score >= 60) return 'background:hsl(var(--warning))';
  return 'background:hsl(var(--error))';
}

const tabs = [
  { id: 'impact', label: 'Impact', icon: iconTrendingUp },
  { id: 'feasibility', label: 'Feasibility', icon: iconTarget },
  { id: 'efficiency', label: 'Efficiency', icon: iconZap },
] as const;

function renderBreakdown(data: { score: number; breakdown: ScoreBreakdown[] }): string {
  return data.breakdown.map(item => `
    <div class="p-4 rounded-xl" style="background:hsl(var(--muted)/0.3)">
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium">${item.label}</span>
        <span class="font-bold" style="color:${scoreColor(item.score * 10)}">${item.score}/${item.maxScore}</span>
      </div>
      <div style="width:100%;background:hsl(var(--muted));border-radius:9999px;height:0.5rem;margin-bottom:0.5rem">
        <div style="height:0.5rem;border-radius:9999px;${progressBg(item.score * 10)};width:${(item.score / item.maxScore) * 100}%;transition:width 0.3s"></div>
      </div>
      <p class="text-sm text-muted">${item.reason}</p>
    </div>`).join('');
}

function renderScoreResults(ideaId: string): string {
  const score = mockScore;
  return `
    <div style="display:flex;flex-direction:column;gap:1.5rem">
      <div class="card p-6">
        <h2 class="text-xl font-display font-bold mb-2">${escapeHtml(mockIdea.title)}</h2>
        <p class="text-muted text-sm">${escapeHtml(mockIdea.problemStatement)}</p>
      </div>

      <div class="score-grid" style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem">
        <div class="card p-6 text-center flex flex-col justify-center">
          <p class="text-sm font-medium text-muted mb-3">Overall Priority Score</p>
          <div class="font-display font-bold mb-2" style="font-size:3.75rem;color:${scoreColor(score.overall)}">${score.overall}</div>
          <p class="text-sm text-muted">out of 100</p>
          <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid hsl(var(--border))">
            <div class="flex items-center justify-center gap-2" style="color:hsl(142 71% 45%)">
              ${iconCheckCircle2(20)} <span class="font-medium">Recommended</span>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-start gap-3 mb-4">
            ${iconInfo(20, 'text-primary')}
            <div>
              <h3 class="font-semibold mb-1">AI Recommendation</h3>
              <p class="text-muted text-sm">${escapeHtml(score.recommendation)}</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.5rem">
            <div class="p-4 rounded-xl" style="background:hsl(var(--muted)/0.5)">
              <div class="flex items-center gap-2 text-muted mb-2">${iconClock(16)} <span class="text-sm font-medium">Estimated Time</span></div>
              <p class="text-lg font-semibold">${score.estimatedTime}</p>
            </div>
            <div class="p-4 rounded-xl" style="background:hsl(var(--muted)/0.5)">
              <div class="flex items-center gap-2 text-muted mb-2">${iconDollarSign(16)} <span class="text-sm font-medium">Estimated Cost</span></div>
              <p class="text-lg font-semibold">${score.estimatedCost}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="text-lg font-display font-semibold mb-4">Score Breakdown</h3>
        <p class="text-sm text-muted mb-6">See how your idea scores across different dimensions and why.</p>
        <div class="flex gap-2 mb-6 pb-3" style="border-bottom:1px solid hsl(var(--border));overflow-x:auto">
          ${tabs.map(tab => {
            const tabScore = score[tab.id as keyof typeof score] as { score: number };
            return `<button class="score-tab flex items-center gap-2 font-medium text-sm" style="padding:0.625rem 1rem;border-radius:var(--radius-lg);white-space:nowrap;border:none;cursor:pointer;flex-shrink:0;transition:all var(--duration-fast);${tab.id === 'impact' ? 'background:hsl(var(--primary));color:hsl(var(--primary-foreground))' : 'background:hsl(var(--muted));color:hsl(var(--muted-foreground))'}" data-score-tab="${tab.id}">
              ${tab.icon(16)} ${tab.label}
              <span style="margin-left:0.25rem;padding:0.125rem 0.5rem;border-radius:var(--radius);font-size:0.75rem;font-weight:700;${tab.id === 'impact' ? 'background:rgba(255,255,255,0.2)' : 'background:hsl(var(--background))'}">${tabScore.score}</span>
            </button>`;
          }).join('')}
        </div>
        <div id="tab-content" style="display:flex;flex-direction:column;gap:1rem">
          ${renderBreakdown(score.impact)}
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 pt-4">
        <button class="btn btn-ghost gap-2" data-nav="#/ideas">${iconArrowLeft(16)} Back to Ideas</button>
        <div class="flex gap-3">
          <button class="btn btn-outline" data-nav="#/ideas">Save as Draft</button>
          <button class="btn btn-hero gap-2" data-nav="#/ideas/${ideaId}/convert">Convert to Project ${iconArrowRight(16)}</button>
        </div>
      </div>
    </div>`;
}

export function render(params?: Record<string, string>): string {
  const ideaId = params?.ideaId || '1';
  return `
    <div style="min-height:100vh;background:hsl(var(--background))">
      <header style="border-bottom:1px solid hsl(var(--border));background:hsl(var(--card)/0.5);backdrop-filter:blur(8px);position:sticky;top:0;z-index:50">
        <div style="max-width:60rem;margin:0 auto;padding:0 1.5rem">
          <div class="flex items-center justify-between" style="height:4rem">
            <div class="flex items-center gap-4">
              <button class="btn btn-ghost btn-icon" data-nav="#/ideas">${iconArrowLeft(20)}</button>
              <div class="flex items-center gap-3">
                <div class="gradient-hero rounded-lg flex items-center justify-center" style="width:2.25rem;height:2.25rem;color:hsl(var(--primary-foreground))">${iconBarChart(20)}</div>
                <span class="text-xl font-display font-bold">Idea Scoring</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div style="max-width:60rem;margin:0 auto;padding:2rem 1.5rem" id="scoring-body">
        <div class="card p-12 text-center">
          <div class="gradient-hero flex items-center justify-center mx-auto mb-6" style="width:5rem;height:5rem;border-radius:1rem;animation:pulse 2s infinite">
            ${iconSparkles(40, 'color:hsl(var(--primary-foreground))')}
          </div>
          <h2 class="text-2xl font-display font-bold mb-3">Analyzing Your Idea</h2>
          <p class="text-muted mb-8" style="max-width:28rem;margin-left:auto;margin-right:auto">Our AI is evaluating impact, feasibility, and efficiency based on your inputs and historical data.</p>
          <div style="max-width:16rem;margin:0 auto;display:flex;flex-direction:column;gap:1rem">
            <div class="flex items-center gap-3 text-sm">
              <div style="width:1.25rem;height:1.25rem;border-radius:9999px;background:hsl(142 71% 45%);display:flex;align-items:center;justify-content:center">${iconCheckCircle2(12, 'color:white')}</div>
              <span>Problem analysis complete</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <div style="width:1.25rem;height:1.25rem;border-radius:9999px;background:hsl(142 71% 45%);display:flex;align-items:center;justify-content:center">${iconCheckCircle2(12, 'color:white')}</div>
              <span>Solution assessment complete</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span style="display:inline-flex;animation:spin 1s linear infinite">${iconLoader(20, 'text-primary')}</span>
              <span class="text-muted">Calculating priority score...</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export function init(params?: Record<string, string>): void {
  const ideaId = params?.ideaId || '1';
  setTimeout(() => {
    const body = $('#scoring-body');
    if (body) {
      body.innerHTML = renderScoreResults(ideaId);
      bindTabs();
    }
  }, 2500);
}

function bindTabs() {
  document.querySelectorAll<HTMLElement>('.score-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-score-tab') as 'impact' | 'feasibility' | 'efficiency';
      const data = mockScore[tabId];
      document.querySelectorAll<HTMLElement>('.score-tab').forEach(t => {
        const isActive = t.getAttribute('data-score-tab') === tabId;
        t.style.background = isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))';
        t.style.color = isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))';
      });
      const content = $('#tab-content');
      if (content) content.innerHTML = renderBreakdown(data);
    });
  });
}
