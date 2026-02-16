import {
  renderDashboardLayout, initDashboardLayout, $, showToast, escapeHtml,
  iconUser, iconMail, iconPhone, iconBriefcase, iconStar,
  iconSave, iconCheckCircle2, iconCamera, iconChevronRight,
} from '../site/script';

const mockProfile = {
  firstName: 'Alex',
  lastName: 'Thompson',
  email: 'alex.thompson@company.com',
  phone: '+1 (555) 123-4567',
  role: 'Product Manager',
  department: 'Product',
  bio: 'Passionate about building products that solve real problems.',
};

const allStrengths = ['Strategic Planning', 'Data Analysis', 'Stakeholder Management', 'Agile Methods', 'Team Leadership', 'Risk Management', 'Budget Planning', 'Technical Writing', 'User Research', 'Prototyping'];
const selectedStrengths = new Set(['Strategic Planning', 'Data Analysis', 'Stakeholder Management']);

function strengthChip(name: string): string {
  const active = selectedStrengths.has(name);
  return `<button class="strength-chip btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm" data-strength="${escapeHtml(name)}">
    ${active ? iconCheckCircle2(12) + ' ' : ''}${escapeHtml(name)}
  </button>`;
}

export function render(): string {
  const p = mockProfile;
  const content = `
    <div style="max-width:48rem;margin:0 auto">
      <nav class="flex items-center gap-2 text-sm text-muted mb-6">
        <a href="#/account" class="text-primary" style="text-decoration:none">Account</a>
        ${iconChevronRight(14)} <span>Profile</span>
      </nav>

      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-display font-bold mb-2">My Profile</h1>
          <p class="text-muted">Update your personal information and preferences</p>
        </div>
        <button class="btn btn-primary gap-2" id="save-btn">${iconSave(16)} Save Changes</button>
      </div>

      <!-- Personal Info -->
      <div class="card card-hover p-6 mb-6">
        <h3 class="font-display font-semibold mb-4">Personal Information</h3>
        <div class="flex items-start gap-6 mb-6">
          <div class="relative">
            <div style="width:6rem;height:6rem;border-radius:1rem;background:linear-gradient(135deg,hsl(var(--primary)/0.2),hsl(var(--primary)/0.05));display:flex;align-items:center;justify-content:center">
              <span class="text-3xl font-bold text-primary">${p.firstName[0]}${p.lastName[0]}</span>
            </div>
            <button style="position:absolute;bottom:-0.5rem;right:-0.5rem;width:2rem;height:2rem;border-radius:9999px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;box-shadow:var(--shadow-lg)">${iconCamera(14)}</button>
          </div>
          <div class="grid grid-cols-2 gap-4" style="flex:1">
            <div>
              <label class="label mb-2 block">First Name</label>
              <input class="input" id="firstName" value="${escapeHtml(p.firstName)}" />
            </div>
            <div>
              <label class="label mb-2 block">Last Name</label>
              <input class="input" id="lastName" value="${escapeHtml(p.lastName)}" />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="label mb-2 flex items-center gap-2">${iconMail(16)} Email</label>
            <input class="input" id="email" type="email" value="${escapeHtml(p.email)}" />
          </div>
          <div>
            <label class="label mb-2 flex items-center gap-2">${iconPhone(16)} Phone</label>
            <input class="input" id="phone" value="${escapeHtml(p.phone)}" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="label mb-2 flex items-center gap-2">${iconBriefcase(16)} Role</label>
            <input class="input" id="role" value="${escapeHtml(p.role)}" />
          </div>
          <div>
            <label class="label mb-2 block">Department</label>
            <select class="input" id="department">
              ${['Product', 'Engineering', 'Design', 'Sales'].map(d =>
                `<option value="${d}" ${d === p.department ? 'selected' : ''}>${d}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="label mb-2 block">Bio</label>
          <textarea class="textarea" rows="3" id="bio">${escapeHtml(p.bio)}</textarea>
        </div>
      </div>

      <!-- Strengths -->
      <div class="card card-hover p-6 mb-6">
        <h3 class="font-display font-semibold mb-4 flex items-center gap-2">${iconStar(20, 'text-primary')} My Strengths</h3>
        <div class="flex flex-wrap gap-2" id="strengths-container">
          ${allStrengths.map(strengthChip).join('')}
        </div>
      </div>
    </div>`;

  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();

  // Save button
  $('#save-btn')?.addEventListener('click', () => {
    const btn = $('#save-btn')!;
    btn.innerHTML = 'Saving...';
    btn.setAttribute('disabled', '');
    setTimeout(() => {
      btn.innerHTML = iconCheckCircle2(16) + ' Saved!';
      btn.removeAttribute('disabled');
      showToast('Profile saved successfully', 'success');
      setTimeout(() => { btn.innerHTML = iconSave(16) + ' Save Changes'; }, 2000);
    }, 800);
  });

  // Strengths toggle
  document.querySelectorAll<HTMLElement>('.strength-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.getAttribute('data-strength') ?? '';
      if (selectedStrengths.has(name)) {
        selectedStrengths.delete(name);
        chip.className = 'strength-chip btn btn-secondary btn-sm';
        chip.innerHTML = escapeHtml(name);
      } else {
        selectedStrengths.add(name);
        chip.className = 'strength-chip btn btn-primary btn-sm';
        chip.innerHTML = iconCheckCircle2(12) + ' ' + escapeHtml(name);
      }
    });
  });
}
