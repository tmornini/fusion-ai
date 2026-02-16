import {
  renderDashboardLayout, initDashboardLayout, $, escapeHtml, showToast,
  iconUsers, iconSearch, iconStar, iconTrendingUp, iconAward, iconBriefcase,
  iconChevronRight, iconPlus, iconBarChart, iconCheckCircle2, iconAlertCircle,
  iconZap, iconBrain, iconTarget, iconHeart, iconX,
} from '../site/script';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  availability: number;
  performanceScore: number;
  projectsCompleted: number;
  currentProjects: number;
  strengths: string[];
  teamDimensions: Record<string, number>;
  status: string;
}

const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Sarah Chen', role: 'Project Lead', department: 'Operations', email: 'sarah.chen@company.com', availability: 85, performanceScore: 94, projectsCompleted: 12, currentProjects: 3, strengths: ['Strategic Planning', 'Team Leadership', 'Risk Management'], teamDimensions: { driver: 78, analytical: 85, expressive: 62, amiable: 70 }, status: 'available' },
  { id: '2', name: 'Mike Thompson', role: 'ML Engineer', department: 'Engineering', email: 'mike.thompson@company.com', availability: 60, performanceScore: 91, projectsCompleted: 8, currentProjects: 2, strengths: ['Machine Learning', 'Python', 'Data Architecture'], teamDimensions: { driver: 55, analytical: 95, expressive: 40, amiable: 58 }, status: 'busy' },
  { id: '3', name: 'Jessica Park', role: 'Data Scientist', department: 'Analytics', email: 'jessica.park@company.com', availability: 70, performanceScore: 88, projectsCompleted: 6, currentProjects: 2, strengths: ['Statistical Analysis', 'Visualization', 'Predictive Modeling'], teamDimensions: { driver: 45, analytical: 92, expressive: 68, amiable: 75 }, status: 'available' },
  { id: '4', name: 'David Martinez', role: 'Backend Developer', department: 'Engineering', email: 'david.martinez@company.com', availability: 40, performanceScore: 86, projectsCompleted: 10, currentProjects: 4, strengths: ['API Development', 'Database Design', 'System Integration'], teamDimensions: { driver: 70, analytical: 82, expressive: 35, amiable: 55 }, status: 'limited' },
  { id: '5', name: 'Emily Rodriguez', role: 'UX Designer', department: 'Design', email: 'emily.rodriguez@company.com', availability: 90, performanceScore: 92, projectsCompleted: 15, currentProjects: 1, strengths: ['User Research', 'Prototyping', 'Design Systems'], teamDimensions: { driver: 50, analytical: 72, expressive: 88, amiable: 85 }, status: 'available' },
  { id: '6', name: 'Alex Kim', role: 'Product Manager', department: 'Product', email: 'alex.kim@company.com', availability: 55, performanceScore: 89, projectsCompleted: 7, currentProjects: 3, strengths: ['Roadmap Planning', 'Stakeholder Management', 'Agile Methods'], teamDimensions: { driver: 85, analytical: 70, expressive: 78, amiable: 65 }, status: 'busy' },
];

function initials(name: string): string { return name.split(' ').map(n => n[0]).join(''); }

function availabilityClass(a: number): string {
  if (a >= 70) return 'color:hsl(142 71% 45%);background:hsl(142 71% 45%/0.1);border:1px solid hsl(142 71% 45%/0.2)';
  if (a >= 40) return 'color:hsl(var(--warning));background:hsl(var(--warning)/0.1);border:1px solid hsl(var(--warning)/0.2)';
  return 'color:hsl(var(--error));background:hsl(var(--error)/0.1);border:1px solid hsl(var(--error)/0.2)';
}

function statusDot(status: string): string {
  const colors: Record<string, string> = { available: 'hsl(142 71% 45%)', busy: 'hsl(var(--warning))', limited: 'hsl(var(--error))' };
  return `<div style="position:absolute;bottom:-2px;right:-2px;width:1rem;height:1rem;border-radius:9999px;border:2px solid hsl(var(--background));background:${colors[status] || 'hsl(var(--muted))'}"></div>`;
}

const dimensionIcons: Record<string, (s?: number, c?: string) => string> = {
  driver: iconTarget, analytical: iconBrain, expressive: iconZap, amiable: iconHeart,
};

let selectedMemberId: string | null = null;

function renderMemberDetail(member: TeamMember): string {
  return `
    <div style="padding:1.5rem">
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="width:5rem;height:5rem;border-radius:1rem;background:linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.05));display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
          <span class="text-2xl font-bold text-primary">${initials(member.name)}</span>
        </div>
        <h3 class="text-lg font-display font-semibold">${escapeHtml(member.name)}</h3>
        <p class="text-sm text-muted">${member.role}</p>
        <p class="text-xs text-muted">${member.email}</p>
      </div>

      <div class="tabs" role="tablist" style="margin-bottom:1rem">
        <button class="tab active" role="tab" data-detail-tab="dimensions">Dimensions</button>
        <button class="tab" role="tab" data-detail-tab="performance">Performance</button>
      </div>

      <div id="detail-dimensions" class="detail-tab-panel">
        <p class="text-xs text-muted" style="text-align:center;margin-bottom:1rem">Team Dimensions Assessment Results</p>
        ${Object.entries(member.teamDimensions).map(([key, value]) => `
          <div style="margin-bottom:1rem">
            <div class="flex items-center justify-between" style="margin-bottom:0.5rem">
              <div class="flex items-center gap-2">${(dimensionIcons[key] || iconStar)(16, 'text-primary')} <span class="text-sm font-medium" style="text-transform:capitalize">${key}</span></div>
              <span class="text-sm font-bold text-primary">${value}%</span>
            </div>
            <div class="progress" style="height:0.5rem"><div class="progress-fill" style="width:${value}%"></div></div>
          </div>
        `).join('')}
      </div>

      <div id="detail-performance" class="detail-tab-panel" style="display:none">
        <div style="padding:1rem;border-radius:0.75rem;background:linear-gradient(135deg,hsl(var(--primary)/0.1),hsl(var(--primary)/0.05));text-align:center;margin-bottom:1rem">
          ${iconBarChart(32, 'text-primary')}
          <div class="text-3xl font-bold text-primary" style="margin:0.5rem 0">${member.performanceScore}%</div>
          <p class="text-xs text-muted">Overall Performance Score</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div style="padding:0.75rem;border-radius:0.5rem;background:hsl(var(--muted)/0.3);text-align:center">
            ${iconCheckCircle2(20, 'text-success')}
            <div class="text-lg font-bold" style="margin:0.25rem 0">${member.projectsCompleted}</div>
            <p class="text-xs text-muted">Completed</p>
          </div>
          <div style="padding:0.75rem;border-radius:0.5rem;background:hsl(var(--muted)/0.3);text-align:center">
            ${iconAlertCircle(20, 'text-warning')}
            <div class="text-lg font-bold" style="margin:0.25rem 0">${member.currentProjects}</div>
            <p class="text-xs text-muted">Active</p>
          </div>
        </div>
      </div>
    </div>`;
}

function renderMemberCard(m: TeamMember): string {
  return `
    <div class="card card-hover" style="padding:1.25rem;cursor:pointer;${selectedMemberId === m.id ? 'box-shadow:0 0 0 2px hsl(var(--primary))' : ''}" data-member-card="${m.id}">
      <div class="flex items-start gap-4">
        <div style="position:relative;flex-shrink:0">
          <div style="width:3.5rem;height:3.5rem;border-radius:0.75rem;background:linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.05));display:flex;align-items:center;justify-content:center">
            <span class="text-lg font-bold text-primary">${initials(m.name)}</span>
          </div>
          ${statusDot(m.status)}
        </div>
        <div style="flex:1;min-width:0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <h3 class="font-semibold text-sm">${escapeHtml(m.name)}</h3>
            <span style="display:inline-flex;align-items:center;padding:0.125rem 0.5rem;border-radius:0.25rem;font-size:0.625rem;font-weight:500;${availabilityClass(m.availability)}">${m.availability}%</span>
          </div>
          <p class="text-xs text-muted mb-2">${m.role} • ${m.department}</p>
          <div class="flex flex-wrap gap-1.5 mb-2">
            ${m.strengths.slice(0, 3).map(s => `
              <span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.125rem 0.5rem;border-radius:0.375rem;background:hsl(var(--muted)/0.5);font-size:0.625rem;color:hsl(var(--muted-foreground))">${iconStar(10)} ${s}</span>
            `).join('')}
          </div>
          <div class="flex items-center gap-4 text-xs text-muted">
            <span class="flex items-center gap-1">${iconTrendingUp(14, 'text-success')} ${m.performanceScore}%</span>
            <span class="flex items-center gap-1">${iconBriefcase(14)} ${m.currentProjects} active</span>
            <span class="flex items-center gap-1 hidden-mobile">${iconAward(14, 'text-primary')} ${m.projectsCompleted} completed</span>
          </div>
        </div>
        ${iconChevronRight(20, 'text-muted')}
      </div>
    </div>`;
}

function rerenderList(): void {
  const search = (($('#team-search') as HTMLInputElement)?.value || '').toLowerCase();
  const filtered = mockTeamMembers.filter(m =>
    m.name.toLowerCase().includes(search) || m.role.toLowerCase().includes(search) || m.department.toLowerCase().includes(search)
  );
  const list = $('#team-list');
  if (list) list.innerHTML = filtered.map(renderMemberCard).join('');

  const panel = $('#team-detail-panel');
  const member = selectedMemberId ? mockTeamMembers.find(m => m.id === selectedMemberId) : null;
  if (panel) {
    panel.innerHTML = member ? renderMemberDetail(member) : `
      <div style="padding:1.5rem;text-align:center">
        ${iconUsers(48, 'text-muted')}
        <p class="text-muted" style="margin-top:1rem">Select a team member to view details</p>
      </div>`;
  }
  bindCards();
  bindDetailTabs();
}

function bindCards(): void {
  document.querySelectorAll<HTMLElement>('[data-member-card]').forEach(card => {
    card.addEventListener('click', () => {
      selectedMemberId = card.getAttribute('data-member-card');
      rerenderList();
    });
  });
}

function bindDetailTabs(): void {
  document.querySelectorAll<HTMLElement>('[data-detail-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-detail-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.detail-tab-panel').forEach(p => (p as HTMLElement).style.display = 'none');
      const panel = $(`#detail-${tab.getAttribute('data-detail-tab')}`);
      if (panel) panel.style.display = '';
    });
  });
}

export function render(): string {
  const content = `
    <div>
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-display font-bold">Team</h1>
          <p class="text-sm text-muted mt-1">${mockTeamMembers.length} members • Manage roles, strengths, and availability</p>
        </div>
        <button class="btn btn-primary gap-2" id="team-add-btn">${iconPlus(16)} <span class="hidden-mobile">Add Member</span><span class="visible-mobile">Add</span></button>
      </div>

      <div class="flex items-center gap-4 mb-6">
        <div class="search-wrapper" style="flex:1;max-width:28rem">
          <span class="search-icon">${iconSearch(16)}</span>
          <input class="input search-input" placeholder="Search by name, role..." id="team-search" />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem" class="detail-grid">
        <div id="team-list" style="display:flex;flex-direction:column;gap:0.75rem">
          ${mockTeamMembers.map(renderMemberCard).join('')}
        </div>
        <div id="team-detail-panel" class="card" style="position:sticky;top:6rem;align-self:start">
          <div style="padding:1.5rem;text-align:center">
            ${iconUsers(48, 'text-muted')}
            <p class="text-muted" style="margin-top:1rem">Select a team member to view details</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Member Dialog -->
    <div class="dialog-backdrop" id="add-member-dialog" style="display:none">
      <div class="dialog" style="max-width:28rem">
        <div style="padding:1.5rem;border-bottom:1px solid hsl(var(--border))">
          <h3 class="text-lg font-semibold">Add Team Member</h3>
          <p class="text-sm text-muted">Invite a new member to join your team.</p>
        </div>
        <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem">
          <div><label class="label mb-1">Full Name</label><input class="input" id="am-name" placeholder="Enter full name"/></div>
          <div><label class="label mb-1">Email Address</label><input class="input" id="am-email" type="email" placeholder="email@company.com"/></div>
          <div><label class="label mb-1">Role</label><input class="input" id="am-role" placeholder="e.g. Software Engineer"/></div>
          <div><label class="label mb-1">Department</label>
            <select class="input" id="am-dept">
              <option value="">Select department</option>
              <option>Engineering</option><option>Design</option><option>Product</option>
              <option>Operations</option><option>Analytics</option><option>Marketing</option>
            </select>
          </div>
        </div>
        <div style="padding:1rem 1.5rem;border-top:1px solid hsl(var(--border));display:flex;justify-content:flex-end;gap:0.75rem">
          <button class="btn btn-outline" id="am-cancel">Cancel</button>
          <button class="btn btn-primary" id="am-send">Send Invitation</button>
        </div>
      </div>
    </div>`;
  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();
  $('#team-search')?.addEventListener('input', rerenderList);
  bindCards();

  const dialog = $('#add-member-dialog')!;
  $('#team-add-btn')?.addEventListener('click', () => { dialog.style.display = ''; });
  $('#am-cancel')?.addEventListener('click', () => { dialog.style.display = 'none'; });
  dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.style.display = 'none'; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog.style.display !== 'none') dialog.style.display = 'none'; });
  $('#am-send')?.addEventListener('click', () => {
    const email = ($('#am-email') as HTMLInputElement)?.value;
    showToast(email ? `Invitation sent to ${email}` : 'Member invited', 'success');
    dialog.style.display = 'none';
  });
}
