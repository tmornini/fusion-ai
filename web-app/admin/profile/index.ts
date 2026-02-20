import {
  $, showToast,
  iconMail, iconPhone, iconBriefcase, iconStar,
  iconSave, iconCheckCircle2, iconCamera, iconChevronRight,
  html, setHtml, SafeHtml,
} from '../../site/script';
import { getProfile, allStrengths } from '../../site/data';

const selectedStrengths = new Set(['Strategic Planning', 'Data Analysis', 'Stakeholder Management']);

function buildStrengthChip(name: string): SafeHtml {
  const active = selectedStrengths.has(name);
  return html`<button class="strength-chip btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm" data-strength="${name}">
    ${active ? html`${iconCheckCircle2(12)} ` : html``}${name}
  </button>`;
}

export async function init(): Promise<void> {
  const p = await getProfile();

  // Breadcrumb chevron
  const chevronEl = $('#breadcrumb-chevron');
  if (chevronEl) setHtml(chevronEl, iconChevronRight(14));

  // Icons
  const iconSaveEl = $('#icon-save');
  if (iconSaveEl) setHtml(iconSaveEl, iconSave(16));
  const avatarBtn = $('#avatar-btn');
  if (avatarBtn) setHtml(avatarBtn, iconCamera(14));
  const emailLabel = $('#email-label');
  if (emailLabel) setHtml(emailLabel, html`${iconMail(16)} Email`);
  const phoneLabel = $('#phone-label');
  if (phoneLabel) setHtml(phoneLabel, html`${iconPhone(16)} Phone`);
  const roleLabel = $('#role-label');
  if (roleLabel) setHtml(roleLabel, html`${iconBriefcase(16)} Role`);
  const strengthsHeader = $('#strengths-header');
  if (strengthsHeader) setHtml(strengthsHeader, html`${iconStar(20, 'text-primary')} My Strengths`);

  // Fill form values
  const avatarInitials = $('#avatar-initials');
  if (avatarInitials) avatarInitials.textContent = `${p.firstName[0]}${p.lastName[0]}`;
  ($('#firstName') as HTMLInputElement).value = p.firstName;
  ($('#lastName') as HTMLInputElement).value = p.lastName;
  ($('#email') as HTMLInputElement).value = p.email;
  ($('#phone') as HTMLInputElement).value = p.phone;
  ($('#role') as HTMLInputElement).value = p.role;
  ($('#department') as HTMLSelectElement).value = p.department;
  ($('#bio') as HTMLTextAreaElement).value = p.bio;

  // Strengths
  const strengthsContainer = $('#strengths-container');
  if (strengthsContainer) {
    setHtml(strengthsContainer, html`${allStrengths.map(buildStrengthChip)}`);
    strengthsContainer.querySelectorAll<HTMLElement>('.strength-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const name = chip.getAttribute('data-strength') ?? '';
        if (selectedStrengths.has(name)) {
          selectedStrengths.delete(name);
          chip.className = 'strength-chip btn btn-secondary btn-sm';
          chip.textContent = name;
        } else {
          selectedStrengths.add(name);
          chip.className = 'strength-chip btn btn-primary btn-sm';
          setHtml(chip, html`${iconCheckCircle2(12)} ${name}`);
        }
      });
    });
  }

  // Save button
  $('#save-btn')?.addEventListener('click', () => {
    const btn = $('#save-btn')!;
    btn.textContent = 'Saving...';
    btn.setAttribute('disabled', '');
    setTimeout(() => {
      setHtml(btn, html`${iconCheckCircle2(16)} Saved!`);
      btn.removeAttribute('disabled');
      showToast('Profile saved successfully', 'success');
      setTimeout(() => { setHtml(btn, html`${iconSave(16)} Save Changes`); }, 2000);
    }, 800);
  });
}
