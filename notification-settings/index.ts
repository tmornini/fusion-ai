import {
  renderDashboardLayout, initDashboardLayout, $, showToast,
  iconBell, iconMail, iconSmartphone, iconLightbulb, iconFolderKanban,
  iconUsers, iconUser, iconChevronRight, iconSave,
} from '../site/script';

interface Pref { id: string; label: string; description: string; email: boolean; push: boolean; }
interface Category { id: string; label: string; icon: (s?: number) => string; prefs: Pref[]; }

const categories: Category[] = [
  {
    id: 'ideas', label: 'Ideas', icon: iconLightbulb,
    prefs: [
      { id: 'idea_submitted', label: 'New idea submitted', description: 'When someone submits a new idea', email: true, push: true },
      { id: 'idea_scored', label: 'Idea scored', description: 'When an idea receives an AI score', email: true, push: false },
      { id: 'idea_converted', label: 'Idea converted to project', description: 'When an idea becomes a project', email: true, push: true },
      { id: 'idea_comment', label: 'Comment on your idea', description: 'When someone comments on your idea', email: true, push: true },
    ],
  },
  {
    id: 'projects', label: 'Projects', icon: iconFolderKanban,
    prefs: [
      { id: 'project_created', label: 'New project created', description: 'When a new project is started', email: true, push: false },
      { id: 'task_assigned', label: 'Task assigned to you', description: 'When you are assigned a new task', email: true, push: true },
      { id: 'task_completed', label: 'Task completed', description: 'When a task in your project is completed', email: false, push: false },
      { id: 'project_status', label: 'Project status changed', description: 'When a project status is updated', email: true, push: false },
    ],
  },
  {
    id: 'teams', label: 'Teams', icon: iconUsers,
    prefs: [
      { id: 'team_invite', label: 'Team invitation', description: 'When you are invited to join a team', email: true, push: true },
      { id: 'member_joined', label: 'New team member', description: 'When someone joins your team', email: true, push: false },
      { id: 'member_left', label: 'Team member left', description: 'When someone leaves your team', email: true, push: false },
      { id: 'team_mention', label: 'Team mention', description: 'When your team is mentioned', email: false, push: true },
    ],
  },
  {
    id: 'account', label: 'Account', icon: iconUser,
    prefs: [
      { id: 'security_alert', label: 'Security alerts', description: 'Important security notifications', email: true, push: true },
      { id: 'billing_reminder', label: 'Billing reminders', description: 'Upcoming payment reminders', email: true, push: false },
      { id: 'usage_limit', label: 'Usage limit warnings', description: 'When approaching plan limits', email: true, push: true },
      { id: 'weekly_digest', label: 'Weekly activity digest', description: 'Summary of weekly activity', email: true, push: false },
    ],
  },
];

function switchHtml(id: string, checked: boolean): string {
  return `<button class="switch" role="switch" aria-checked="${checked}" data-pref="${id}"><span class="switch-thumb"></span></button>`;
}

function renderCategory(cat: Category): string {
  const rows = cat.prefs.map(p => `
    <div class="flex items-center justify-between p-4" style="border-bottom:1px solid hsl(var(--border))">
      <div style="flex:1;min-width:0;margin-right:2rem">
        <p class="font-medium">${p.label}</p>
        <p class="text-sm text-muted">${p.description}</p>
      </div>
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-2">${iconMail(16)} ${switchHtml(p.id + '-email', p.email)}</div>
        <div class="flex items-center gap-2">${iconSmartphone(16)} ${switchHtml(p.id + '-push', p.push)}</div>
      </div>
    </div>`).join('');

  return `
    <div class="card" style="overflow:hidden;margin-bottom:1.5rem">
      <div class="flex items-center justify-between p-4" style="background:hsl(var(--muted)/0.2);border-bottom:1px solid hsl(var(--border))">
        <div class="flex items-center gap-3">
          <div style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);background:hsl(var(--primary)/0.1);color:hsl(var(--primary));display:flex;align-items:center;justify-content:center">${cat.icon(20)}</div>
          <h3 class="font-display font-semibold">${cat.label}</h3>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-xs" data-enable-all="${cat.id}">Enable all</button>
          <button class="btn btn-ghost btn-xs text-muted" data-disable-all="${cat.id}">Disable all</button>
        </div>
      </div>
      <div data-cat-prefs="${cat.id}">${rows}</div>
    </div>`;
}

export function render(): string {
  const content = `
    <div style="max-width:48rem;margin:0 auto">
      <nav class="flex items-center gap-2 text-sm text-muted mb-6">
        <a href="#/account" class="text-primary">Account</a>
        ${iconChevronRight(14)} <span>Notification Settings</span>
      </nav>

      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
          <div class="gradient-hero rounded-lg flex items-center justify-center" style="width:2.5rem;height:2.5rem;color:hsl(var(--primary-foreground))">
            ${iconBell(20)}
          </div>
          <h1 class="text-3xl font-display font-bold">Notification Settings</h1>
        </div>
        <p class="text-muted">Choose which events trigger notifications and how you'd like to receive them</p>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-6 mb-6 p-4 rounded-lg" style="background:hsl(var(--muted)/0.3)">
        <div class="flex items-center gap-2 text-muted">${iconMail(16)} <span class="text-sm">Email</span></div>
        <div class="flex items-center gap-2 text-muted">${iconSmartphone(16)} <span class="text-sm">Push</span></div>
      </div>

      ${categories.map(renderCategory).join('')}

      <div class="flex justify-end mt-6">
        <button class="btn btn-primary gap-2" id="save-notif">${iconSave(16)} Save Changes</button>
      </div>
    </div>`;

  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();

  // Switch toggles
  document.querySelectorAll<HTMLElement>('.switch[role="switch"]').forEach(sw => {
    sw.addEventListener('click', () => {
      const checked = sw.getAttribute('aria-checked') === 'true';
      sw.setAttribute('aria-checked', String(!checked));
    });
  });

  // Enable/disable all
  document.querySelectorAll<HTMLElement>('[data-enable-all]').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-enable-all');
      const container = document.querySelector(`[data-cat-prefs="${catId}"]`);
      container?.querySelectorAll<HTMLElement>('.switch').forEach(sw => sw.setAttribute('aria-checked', 'true'));
    });
  });

  document.querySelectorAll<HTMLElement>('[data-disable-all]').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-disable-all');
      const container = document.querySelector(`[data-cat-prefs="${catId}"]`);
      container?.querySelectorAll<HTMLElement>('.switch').forEach(sw => sw.setAttribute('aria-checked', 'false'));
    });
  });

  // Save
  $('#save-notif')?.addEventListener('click', () => {
    showToast('Notification preferences saved', 'success');
  });
}
