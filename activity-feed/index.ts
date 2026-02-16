import {
  renderDashboardLayout, initDashboardLayout, escapeHtml,
  iconActivity, iconLightbulb, iconStar, iconFolderKanban,
  iconCheckCircle2, iconMessageSquare, iconUserPlus, iconEdit,
  iconArrowRight, iconSearch, iconFilter, iconChevronRight,
} from '../site/script';

interface ActivityItem {
  id: string;
  type: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  score?: number;
  status?: string;
  comment?: string;
}

const activities: ActivityItem[] = [
  { id: '1', type: 'idea_scored', actor: 'Sarah Chen', action: 'scored', target: 'AI-Powered Customer Support Bot', timestamp: '10 minutes ago', score: 87 },
  { id: '2', type: 'task_completed', actor: 'Marcus Johnson', action: 'completed task', target: 'Design system audit', timestamp: '25 minutes ago' },
  { id: '3', type: 'idea_created', actor: 'Emily Rodriguez', action: 'submitted new idea', target: 'Mobile App Redesign', timestamp: '1 hour ago' },
  { id: '4', type: 'comment_added', actor: 'David Park', action: 'commented on', target: 'Q1 Analytics Dashboard', timestamp: '2 hours ago', comment: 'Great progress on the charts!' },
  { id: '5', type: 'user_joined', actor: 'Alex Thompson', action: 'joined the team', target: 'Product Innovation', timestamp: '3 hours ago' },
  { id: '6', type: 'status_changed', actor: 'Lisa Wang', action: 'changed status of', target: 'Customer Feedback Portal', timestamp: '4 hours ago', status: 'In Progress' },
  { id: '7', type: 'idea_converted', actor: 'James Miller', action: 'converted idea to project', target: 'Automated Testing Framework', timestamp: '5 hours ago' },
  { id: '8', type: 'project_created', actor: 'Sarah Chen', action: 'created new project', target: 'Performance Optimization Initiative', timestamp: '6 hours ago' },
  { id: '9', type: 'task_completed', actor: 'Emily Rodriguez', action: 'completed task', target: 'API documentation update', timestamp: 'Yesterday' },
  { id: '10', type: 'idea_scored', actor: 'Marcus Johnson', action: 'scored', target: 'Data Pipeline Modernization', timestamp: 'Yesterday', score: 92 },
];

function activityIconHtml(type: string): string {
  const iconMap: Record<string, { icon: (s?: number) => string; bg: string }> = {
    idea_created: { icon: iconLightbulb, bg: 'background:hsl(var(--warning-soft));color:hsl(var(--warning-text))' },
    idea_scored: { icon: iconStar, bg: 'background:hsl(var(--info-soft));color:hsl(var(--info-text))' },
    project_created: { icon: iconFolderKanban, bg: 'background:hsl(var(--primary) / 0.1);color:hsl(var(--primary))' },
    task_completed: { icon: iconCheckCircle2, bg: 'background:hsl(var(--success-soft));color:hsl(var(--success-text))' },
    comment_added: { icon: iconMessageSquare, bg: 'background:hsl(var(--info-soft));color:hsl(var(--info-text))' },
    user_joined: { icon: iconUserPlus, bg: 'background:hsl(var(--info-soft));color:hsl(var(--info-text))' },
    status_changed: { icon: iconEdit, bg: 'background:hsl(var(--warning-soft));color:hsl(var(--warning-text))' },
    idea_converted: { icon: iconArrowRight, bg: 'background:hsl(var(--success-soft));color:hsl(var(--success-text))' },
  };
  const entry = iconMap[type] || { icon: iconActivity, bg: 'background:hsl(var(--muted));color:hsl(var(--muted-foreground))' };
  return `<div style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;flex-shrink:0;${entry.bg}">${entry.icon(20)}</div>`;
}

function renderActivity(a: ActivityItem): string {
  let meta = '';
  if (a.score) meta = `<div class="badge badge-default text-xs mt-1">${iconStar(12)} Score: ${a.score}</div>`;
  if (a.status) meta = `<div class="badge badge-default text-xs mt-1">${a.status}</div>`;
  if (a.comment) meta = `<p class="text-sm text-muted mt-1" style="font-style:italic">"${escapeHtml(a.comment)}"</p>`;

  return `
    <div class="flex items-start gap-4 p-4 rounded-lg" style="transition:background var(--duration-fast)" onmouseover="this.style.background='hsl(var(--muted)/0.3)'" onmouseout="this.style.background='transparent'">
      ${activityIconHtml(a.type)}
      <div style="flex:1;min-width:0">
        <p class="text-sm">
          <span class="font-medium">${escapeHtml(a.actor)}</span>
          <span class="text-muted"> ${a.action} </span>
          <span class="font-medium">${escapeHtml(a.target)}</span>
        </p>
        ${meta}
        <p class="text-xs text-muted mt-1">${a.timestamp}</p>
      </div>
    </div>`;
}

export function render(): string {
  const content = `
    <div style="max-width:48rem;margin:0 auto">
      <nav class="flex items-center gap-2 text-sm text-muted mb-6">
        <a href="#/account" class="text-primary">Account</a>
        ${iconChevronRight(14)} <span>Activity Feed</span>
      </nav>

      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
          <div class="gradient-hero rounded-lg flex items-center justify-center" style="width:2.5rem;height:2.5rem;color:hsl(var(--primary-foreground))">
            ${iconActivity(20)}
          </div>
          <h1 class="text-3xl font-display font-bold">Activity Feed</h1>
        </div>
        <p class="text-muted">Stay updated on recent actions across your ideas and projects</p>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mb-6">
        <div class="search-wrapper" style="flex:1">
          <span class="search-icon">${iconSearch(16)}</span>
          <input class="input search-input" placeholder="Search activity..." id="activity-search" />
        </div>
        <select class="input" style="width:10rem" id="activity-filter">
          <option value="all">All Activity</option>
          <option value="idea">Ideas</option>
          <option value="project">Projects</option>
          <option value="task">Tasks</option>
          <option value="team">Teams</option>
        </select>
      </div>

      <div id="activity-list">
        ${activities.map(renderActivity).join('')}
      </div>

      <div class="text-center mt-8">
        <button class="btn btn-outline">Load More Activity</button>
      </div>
    </div>`;

  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();
}
