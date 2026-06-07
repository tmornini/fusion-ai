import { $ } from './dom.ts';
import { navigateTo } from './navigation.ts';

// The top-bar pending-invitations indicator. Shown ONLY when the
// caller has one or more pending invitations — an honest
// affordance, never an empty bell. The count rides a badge over
// the bell; clicking opens the invitations page. The read is
// identity-scoped (the invitation facade fences by the caller),
// so it works even for a member with no admin role.
export async function mutateInvitationsBell(
): Promise<void> {
    const bell = $('#invitations-bell', document);
    const badge = $('#invitations-badge', document);
    if (!bell) return;
    const { sessionContext, getInvitations } =
        await import('./adapters');
    const pending = (await getInvitations(sessionContext()))
        .filter(inv => inv.state === 'pending');
    if (pending.length === 0) {
        bell.classList.add('hidden');
        return;
    }
    if (badge) badge.textContent = String(pending.length);
    bell.classList.remove('hidden');
    bell.addEventListener(
        'click', () => navigateTo('invitations'));
}
