import {
  $, navigateTo, styleForScore, html, setHtml, SafeHtml,
  buildErrorState,
  iconArrowLeft, iconArrowRight, iconTrendingUp, iconClock,
  iconDollarSign, iconZap, iconTarget, iconBarChart, iconInfo,
  iconCheckCircle2, iconLoader, iconSparkles,
} from '../../site/script';
import { getIdeaForScoring, getIdeaScore, type ScoreBreakdown, type IdeaScore } from '../../site/data';

function styleForProgress(score: number): string {
  if (score >= 80) return 'background:hsl(var(--success))';
  if (score >= 60) return 'background:hsl(var(--warning))';
  return 'background:hsl(var(--error))';
}

const tabs = [
  { id: 'impact', label: 'Impact', icon: iconTrendingUp },
  { id: 'feasibility', label: 'Feasibility', icon: iconTarget },
  { id: 'efficiency', label: 'Efficiency', icon: iconZap },
] as const;

function buildBreakdown(data: { score: number; breakdown: ScoreBreakdown[] }): SafeHtml {
  return html`${data.breakdown.map(item => html`
    <div class="p-4 rounded-xl" style="background:hsl(var(--muted)/0.3)">
      <div class="flex items-center justify-between mb-2">
        <span class="font-medium">${item.label}</span>
        <span class="font-bold" style="${styleForScore(item.score * 10)}">${item.score}/${item.maxScore}</span>
      </div>
      <div style="width:100%;background:hsl(var(--muted));border-radius:9999px;height:0.5rem;margin-bottom:0.5rem">
        <div style="height:0.5rem;border-radius:9999px;${styleForProgress(item.score * 10)};width:${(item.score / item.maxScore) * 100}%;transition:width 0.3s"></div>
      </div>
      <p class="text-sm text-muted">${item.reason}</p>
    </div>`)}`;
}

function buildScoreResults(ideaId: string, idea: { title: string; problemStatement: string }, score: IdeaScore): SafeHtml {
  return html`
    <div style="display:flex;flex-direction:column;gap:1.5rem">
      <div class="card p-6">
        <h2 class="text-xl font-display font-bold mb-2">${idea.title}</h2>
        <p class="text-muted text-sm">${idea.problemStatement}</p>
      </div>

      <div class="score-grid" style="grid-template-columns:1fr 2fr;gap:1.5rem">
        <div class="card p-6 text-center flex flex-col justify-center">
          <p class="text-sm font-medium text-muted mb-3">Overall Priority Score</p>
          <div class="font-display font-bold mb-2" style="font-size:3.75rem;${styleForScore(score.overall)}">${score.overall}</div>
          <p class="text-sm text-muted">out of 100</p>
          <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid hsl(var(--border))">
            <div class="flex items-center justify-center gap-2" style="color:hsl(var(--success))">
              ${iconCheckCircle2(20)} <span class="font-medium">Recommended</span>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-start gap-3 mb-4">
            ${iconInfo(20, 'text-primary')}
            <div>
              <h3 class="font-semibold mb-1">AI Recommendation</h3>
              <p class="text-muted text-sm">${score.recommendation}</p>
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
            return html`<button class="score-tab${tab.id === 'impact' ? ' active' : ''}" data-score-tab="${tab.id}">
              ${tab.icon(16)} ${tab.label}
              <span class="score-tab-badge">${tabScore.score}</span>
            </button>`;
          })}
        </div>
        <div id="tab-content" style="display:flex;flex-direction:column;gap:1rem">
          ${buildBreakdown(score.impact)}
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 pt-4">
        <button class="btn btn-ghost gap-2" id="back-to-ideas">${iconArrowLeft(16)} Back to Ideas</button>
        <div class="flex gap-3">
          <button class="btn btn-outline" id="save-draft">Save as Draft</button>
          <button class="btn btn-hero gap-2" id="convert-btn">Convert to Project ${iconArrowRight(16)}</button>
        </div>
      </div>
    </div>`;
}

function bindTabs(score: IdeaScore) {
  document.querySelectorAll<HTMLElement>('.score-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-score-tab') as 'impact' | 'feasibility' | 'efficiency';
      const data = score[tabId];
      document.querySelectorAll<HTMLElement>('.score-tab').forEach(otherTab => {
        otherTab.classList.toggle('active', otherTab.getAttribute('data-score-tab') === tabId);
      });
      const content = $('#tab-content');
      if (content) setHtml(content, buildBreakdown(data));
    });
  });
}

export async function init(params?: Record<string, string>): Promise<void> {
  const ideaId = params?.['ideaId'] || '1';

  const root = $('#page-root');
  if (!root) return;

  // Show loading state first
  setHtml(root, html`
    <div style="min-height:100vh;background:hsl(var(--background))">
      <header style="border-bottom:1px solid hsl(var(--border));background:hsl(var(--card)/0.5);backdrop-filter:blur(8px);position:sticky;top:0;z-index:50">
        <div style="max-width:60rem;margin:0 auto;padding:0 1.5rem">
          <div class="flex items-center justify-between" style="height:4rem">
            <div class="flex items-center gap-4">
              <button class="btn btn-ghost btn-icon" id="loading-back">${iconArrowLeft(20)}</button>
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
              <div style="width:1.25rem;height:1.25rem;border-radius:9999px;background:hsl(var(--success));display:flex;align-items:center;justify-content:center">${iconCheckCircle2(12, 'color:hsl(var(--success-foreground))')}</div>
              <span>Problem analysis complete</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <div style="width:1.25rem;height:1.25rem;border-radius:9999px;background:hsl(var(--success));display:flex;align-items:center;justify-content:center">${iconCheckCircle2(12, 'color:hsl(var(--success-foreground))')}</div>
              <span>Solution assessment complete</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span style="display:inline-flex;animation:spin 1s linear infinite">${iconLoader(20, 'text-primary')}</span>
              <span class="text-muted">Calculating priority score...</span>
            </div>
          </div>
        </div>
      </div>
    </div>`);

  $('#loading-back')?.addEventListener('click', () => navigateTo('ideas'));

  // Simulate AI processing delay, then show results
  try {
    const [idea, score] = await Promise.all([
      getIdeaForScoring(ideaId),
      getIdeaScore(ideaId),
    ]);

    setTimeout(() => {
      const body = $('#scoring-body');
      if (body) {
        setHtml(body, buildScoreResults(ideaId, idea, score));
        bindTabs(score);

        $('#back-to-ideas')?.addEventListener('click', () => navigateTo('ideas'));
        $('#save-draft')?.addEventListener('click', () => navigateTo('ideas'));
        $('#convert-btn')?.addEventListener('click', () => navigateTo('idea-convert', { ideaId }));
      }
    }, 2500);
  } catch (err) {
    const body = $('#scoring-body');
    if (body) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load idea for scoring.';
      setHtml(body, buildErrorState(errorMessage, 'Back to Ideas'));
      body.querySelector('[data-retry-btn]')?.addEventListener('click', () => navigateTo('ideas'));
    }
  }
}
