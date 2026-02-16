import {
  renderDashboardLayout, initDashboardLayout, $, navigate, escapeHtml, showToast,
  iconArrowLeft, iconLightbulb, iconTarget, iconUsers, iconMessageSquare,
  iconAlertTriangle, iconCheckCircle2, iconSend, iconFileText,
  iconClock, iconDollarSign, iconUser, iconChevronRight,
} from '../site/script';

interface Clarification {
  id: string;
  question: string;
  askedBy: string;
  askedAt: string;
  status: 'pending' | 'answered';
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
}

const mockProject = {
  id: '1',
  title: 'AI-Powered Customer Segmentation',
  description: 'Implement machine learning model to automatically segment customers based on behavior, purchase history, and engagement patterns.',
  businessContext: {
    problem: "Current manual segmentation takes 2 weeks and is often outdated by the time it's complete. Marketing campaigns suffer from poor targeting.",
    expectedOutcome: 'Real-time customer segments that update automatically, enabling personalized marketing with 40% better conversion rates.',
    successMetrics: [
      'Reduce segmentation time from 2 weeks to real-time',
      'Improve campaign conversion rates by 40%',
      'Increase customer lifetime value by 25%',
    ],
    constraints: [
      'Must integrate with existing CRM (Salesforce)',
      'GDPR compliance required for EU customers',
      'Budget capped at $50,000 for Phase 1',
    ],
  },
  team: [
    { id: '1', name: 'Sarah Chen', role: 'Project Lead', type: 'business' },
    { id: '2', name: 'Mike Thompson', role: 'ML Engineer', type: 'engineering' },
    { id: '3', name: 'Jessica Park', role: 'Data Scientist', type: 'engineering' },
    { id: '4', name: 'David Martinez', role: 'Backend Developer', type: 'engineering' },
  ],
  linkedIdea: { id: '1', title: 'AI-Powered Customer Segmentation', score: 92 },
  timeline: '3-4 months',
  budget: '$45,000',
};

const clarifications: Clarification[] = [
  {
    id: '1',
    question: 'What data sources are currently available for customer behavior tracking? We need to understand the data pipeline before designing the ML model.',
    askedBy: 'Mike Thompson', askedAt: '2024-02-20', status: 'answered',
    answer: 'We have event tracking via Segment, transaction data in our data warehouse (Snowflake), and email engagement metrics from Mailchimp. All can be accessed via APIs.',
    answeredBy: 'Sarah Chen', answeredAt: '2024-02-21',
  },
  {
    id: '2',
    question: 'Are there any existing segment definitions we should match, or are we free to discover optimal segments through clustering?',
    askedBy: 'Jessica Park', askedAt: '2024-02-22', status: 'answered',
    answer: "Marketing has 5 legacy segments they use today (High Value, Growth, At-Risk, New, Dormant). We'd like to preserve compatibility but welcome additional discovered segments.",
    answeredBy: 'Sarah Chen', answeredAt: '2024-02-22',
  },
  {
    id: '3',
    question: "What's the expected latency requirement for segment updates? Real-time vs batch processing has significant architecture implications.",
    askedBy: 'David Martinez', askedAt: '2024-02-25', status: 'pending',
  },
];

function renderClarification(c: Clarification): string {
  const isPending = c.status === 'pending';
  return `
    <div class="card" style="border:1px solid ${isPending ? 'hsl(var(--warning)/0.3)' : 'hsl(var(--border))'};${isPending ? 'background:hsl(var(--warning)/0.05)' : ''};padding:1rem">
      <div class="flex items-start gap-3 mb-3">
        <div style="padding:0.5rem;border-radius:9999px;${isPending ? 'background:hsl(var(--warning)/0.1)' : 'background:hsl(var(--muted))'}">${iconMessageSquare(16, isPending ? 'text-warning' : 'text-muted')}</div>
        <div style="flex:1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium">${escapeHtml(c.askedBy)}</span>
            <span class="text-xs text-muted">${c.askedAt}</span>
            <span class="badge ${isPending ? 'badge-warning' : 'badge-success'} text-xs">${isPending ? 'Awaiting response' : 'Answered'}</span>
          </div>
          <p>${escapeHtml(c.question)}</p>
        </div>
      </div>
      ${c.answer ? `
        <div style="margin-left:2.5rem;margin-top:1rem;padding:0.75rem;border-radius:0.5rem;background:hsl(var(--muted)/0.5);border-left:2px solid hsl(var(--primary))">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium">${escapeHtml(c.answeredBy!)}</span>
            <span class="text-xs text-muted">${c.answeredAt}</span>
          </div>
          <p>${escapeHtml(c.answer)}</p>
        </div>
      ` : ''}
    </div>`;
}

export function render(params?: Record<string, string>): string {
  const projectId = params?.projectId || '1';
  const pendingCount = clarifications.filter(c => c.status === 'pending').length;
  const answeredCount = clarifications.filter(c => c.status === 'answered').length;

  const content = `
    <div style="max-width:56rem;margin:0 auto">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-muted mb-4">
        <a href="#/projects" class="hover-link">Projects</a><span>/</span>
        <a href="#/projects/${projectId}" class="hover-link">${escapeHtml(mockProject.title)}</a><span>/</span>
        <span>Engineering Requirements</span>
      </div>

      <!-- Header -->
      <div class="flex items-start justify-between mb-8">
        <div>
          <h1 class="text-2xl font-display font-bold mb-2">Engineering Requirements</h1>
          <p class="text-muted">Business context and clarifications for ${escapeHtml(mockProject.title)}</p>
        </div>
        <button class="btn btn-outline gap-2" data-nav="#/projects/${projectId}">${iconArrowLeft(16)} Back to Project</button>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem" class="stats-grid">
        <div class="card p-4"><div class="flex items-center gap-3">
          <div style="padding:0.5rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1)">${iconClock(20, 'text-primary')}</div>
          <div><p class="text-lg font-bold">${mockProject.timeline}</p><p class="text-xs text-muted">Timeline</p></div>
        </div></div>
        <div class="card p-4"><div class="flex items-center gap-3">
          <div style="padding:0.5rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1)">${iconDollarSign(20, 'text-primary')}</div>
          <div><p class="text-lg font-bold">${mockProject.budget}</p><p class="text-xs text-muted">Budget</p></div>
        </div></div>
        <div class="card p-4"><div class="flex items-center gap-3">
          <div style="padding:0.5rem;border-radius:0.5rem;background:hsl(var(--warning)/0.1)">${iconMessageSquare(20, 'text-warning')}</div>
          <div><p class="text-lg font-bold">${pendingCount}</p><p class="text-xs text-muted">Pending Questions</p></div>
        </div></div>
        <div class="card p-4"><div class="flex items-center gap-3">
          <div style="padding:0.5rem;border-radius:0.5rem;background:hsl(var(--success-soft))">${iconCheckCircle2(20, 'text-success')}</div>
          <div><p class="text-lg font-bold">${answeredCount}</p><p class="text-xs text-muted">Answered</p></div>
        </div></div>
      </div>

      <!-- Business Context -->
      <div class="card p-6 mb-6">
        <h3 class="flex items-center gap-2 text-lg font-semibold mb-4">${iconLightbulb(20, 'text-primary')} Business Context</h3>
        <div style="display:flex;flex-direction:column;gap:1.5rem">
          <div><h4 class="text-sm font-semibold mb-2">Problem Statement</h4><p class="text-muted">${escapeHtml(mockProject.businessContext.problem)}</p></div>
          <div><h4 class="text-sm font-semibold mb-2">Expected Outcome</h4><p class="text-muted">${escapeHtml(mockProject.businessContext.expectedOutcome)}</p></div>
        </div>
      </div>

      <!-- Success Metrics -->
      <div class="card p-6 mb-6">
        <h3 class="flex items-center gap-2 text-lg font-semibold mb-4">${iconTarget(20, 'text-success')} Success Metrics</h3>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          ${mockProject.businessContext.successMetrics.map(m => `
            <div class="flex items-start gap-2">${iconCheckCircle2(16, 'text-success')} <span>${escapeHtml(m)}</span></div>
          `).join('')}
        </div>
      </div>

      <!-- Constraints -->
      <div class="card p-6 mb-6">
        <h3 class="flex items-center gap-2 text-lg font-semibold mb-4">${iconAlertTriangle(20, 'text-warning')} Constraints & Requirements</h3>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          ${mockProject.businessContext.constraints.map(c => `
            <div class="flex items-start gap-2"><span class="text-warning">·</span> <span>${escapeHtml(c)}</span></div>
          `).join('')}
        </div>
      </div>

      <!-- Team Contacts -->
      <div class="card p-6 mb-6">
        <h3 class="flex items-center gap-2 text-lg font-semibold mb-4">${iconUsers(20, 'text-primary')} Team Contacts</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem" class="convert-grid">
          ${mockProject.team.map(m => `
            <div class="flex items-center gap-3" style="padding:0.75rem;border-radius:0.5rem;background:hsl(var(--muted)/0.3)">
              <div style="width:2.5rem;height:2.5rem;border-radius:9999px;display:flex;align-items:center;justify-content:center;background:${m.type === 'business' ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--success-soft))'}">${iconUser(20, m.type === 'business' ? 'text-primary' : 'text-success')}</div>
              <div style="flex:1;min-width:0"><p class="font-medium">${escapeHtml(m.name)}</p><p class="text-xs text-muted">${m.role}</p></div>
              <span class="badge ${m.type === 'business' ? 'badge-primary' : 'badge-success'} text-xs">${m.type}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Source Idea -->
      <div class="card p-6 mb-8">
        <h3 class="flex items-center gap-2 text-lg font-semibold mb-4">${iconFileText(20, 'text-primary')} Source Idea</h3>
        <a href="#/ideas/${mockProject.linkedIdea.id}/score" class="flex items-center justify-between" style="padding:1rem;border-radius:0.5rem;background:hsl(var(--muted)/0.3);text-decoration:none;color:inherit">
          <div class="flex items-center gap-3">
            <div style="padding:0.5rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1)">${iconLightbulb(20, 'text-primary')}</div>
            <div><p class="font-medium">${escapeHtml(mockProject.linkedIdea.title)}</p><p class="text-xs text-muted">View original idea and scoring</p></div>
          </div>
          <div class="flex items-center gap-3">
            <span class="badge badge-success text-xs">Score: ${mockProject.linkedIdea.score}</span>
            ${iconChevronRight(20, 'text-muted')}
          </div>
        </a>
      </div>

      <!-- Clarifications -->
      <div style="margin-bottom:2rem">
        <h2 class="text-xl font-display font-semibold mb-4 flex items-center gap-2">${iconMessageSquare(20, 'text-primary')} Clarifications</h2>
        <div class="card" style="padding:1rem;margin-bottom:1rem">
          <textarea class="textarea" id="er-question" placeholder="Ask a clarifying question to the business team..." style="min-height:5rem;resize:none;margin-bottom:0.75rem"></textarea>
          <div style="display:flex;justify-content:flex-end">
            <button class="btn btn-primary gap-2" id="er-send" disabled>${iconSend(16)} Send Question</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem" id="er-thread">
          ${clarifications.map(renderClarification).join('')}
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex items-center justify-between" style="padding:1rem;border-radius:0.75rem;background:hsl(var(--muted)/0.3);border:1px solid hsl(var(--border))">
        <span class="text-sm text-muted">${pendingCount > 0 ? `${pendingCount} question(s) awaiting business response` : 'All questions have been answered'}</span>
        <div class="flex gap-3">
          <button class="btn btn-outline" data-nav="#/projects/${projectId}">Back to Project</button>
          <button class="btn btn-primary gap-2" id="er-complete">${iconCheckCircle2(16)} Mark Requirements Complete</button>
        </div>
      </div>
    </div>`;
  return renderDashboardLayout(content);
}

export function init(params?: Record<string, string>): void {
  initDashboardLayout();
  const projectId = params?.projectId || '1';

  const q = $('#er-question') as HTMLTextAreaElement;
  const send = $('#er-send') as HTMLButtonElement;
  q?.addEventListener('input', () => { if (send) send.disabled = !q.value.trim(); });
  send?.addEventListener('click', () => {
    showToast('Question sent to business team', 'success');
    if (q) q.value = '';
    if (send) send.disabled = true;
  });

  $('#er-complete')?.addEventListener('click', () => {
    showToast('Requirements marked as complete', 'success');
    navigate(`#/projects/${projectId}`);
  });

  document.querySelectorAll<HTMLElement>('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.getAttribute('data-nav')!));
  });
}
