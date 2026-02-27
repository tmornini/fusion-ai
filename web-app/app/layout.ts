import type { AppState } from './state';
import { STORAGE_KEY_SIDEBAR, state, setState, setTheme } from './state';
import { $, $$, } from './dom';
import { html, setHtml } from './safe-html';
import { iconSun, iconMoon, iconMonitor } from './icons';
import { getPageName } from './navigation';
import { log } from './logger';

function mutateThemeToggleIcon(): void {
  const themeIcon = state.theme === 'dark'
    ? iconMoon(20)
    : state.theme === 'light'
    ? iconSun(20)
    : iconMonitor(20);
  const themeLabel = state.theme === 'dark'
    ? 'Switch to light theme'
    : state.theme === 'light'
    ? 'Switch to dark theme'
    : 'Toggle theme';
  ['theme-toggle', 'mobile-theme-toggle'].forEach(id => {
    const button = document.getElementById(id);
    if (button) {
      setHtml(button, themeIcon);
      button.setAttribute('aria-label', themeLabel);
    }
  });
}

async function mutateNotifications(): Promise<void> {
  const { getNotifications } = await import('./adapters');
  const notifications = await getNotifications();
  const unreadCount = notifications.filter(notification => notification.isUnread).length;

  function mutateNotificationPanel(containerId: string, countId: string, badgeId: string) {
    const list = document.getElementById(containerId);
    const countEl = document.getElementById(countId);
    const badge = document.getElementById(badgeId);

    if (list) {
      setHtml(list, html`${notifications.map(notification => html`
        <button class="dropdown-item" style="flex-direction:column;align-items:flex-start;padding:0.75rem 0.5rem">
          <div class="flex items-start gap-2 w-full">
            ${notification.isUnread ? html`<span style="width:0.5rem;height:0.5rem;background:hsl(var(--primary));border-radius:9999px;margin-top:0.375rem;flex-shrink:0"></span>` : html``}
            <div style="flex:1;${!notification.isUnread ? 'margin-left:1rem' : ''}">
              <p class="text-sm ${notification.isUnread ? 'font-medium' : 'text-muted'}">${notification.title}</p>
              <p class="text-xs text-muted line-clamp-2">${notification.message}</p>
              <p class="text-xs text-muted mt-1">${notification.time}</p>
            </div>
          </div>
        </button>`)}`);
    }
    if (countEl && unreadCount > 0) {
      countEl.textContent = String(unreadCount);
      countEl.classList.remove('hidden');
    }
    if (badge && unreadCount > 0) {
      badge.textContent = `${unreadCount} new`;
      badge.classList.remove('hidden');
    }
  }

  for (const prefix of ['notification', 'mobile-notification']) {
    mutateNotificationPanel(`${prefix}-list`, `${prefix}-count`, `${prefix}-badge`);
  }
}

const NAV_GROUP_CHILDREN: Record<string, string[]> = {
  account: ['profile', 'company-settings', 'manage-users', 'activity-feed', 'notification-settings', 'snapshots'],
  ideas: ['idea-create', 'idea-convert', 'idea-review-queue', 'approval-detail'],
  projects: ['project-detail', 'engineering-requirements'],
  'edge-list': ['edge'],
};

function initActiveNavItem(): void {
  const pageName = getPageName();
  $$('[data-page-link]').forEach(navLink => {
    const linkPage = navLink.getAttribute('data-page-link') || '';
    const isActive = linkPage === pageName
      || (NAV_GROUP_CHILDREN[linkPage]?.includes(pageName) ?? false);
    if (isActive) navLink.setAttribute('aria-current', 'page');
    else navLink.removeAttribute('aria-current');
  });
}

function initSidebar(): void {
  const sidebar = document.getElementById('desktop-sidebar');
  const mainContent = $('.main-content');

  if (localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true') {
    sidebar?.classList.add('sidebar-collapsed');
    mainContent?.classList.add('sidebar-collapsed');
    setState({ isSidebarCollapsed: true });
  }

  document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
    sidebar?.classList.add('sidebar-collapsed');
    mainContent?.classList.add('sidebar-collapsed');
    setState({ isSidebarCollapsed: true });
    try { localStorage.setItem(STORAGE_KEY_SIDEBAR, 'true'); } catch { log.debug('Failed to save sidebar state', 'layout'); }
  });
  document.getElementById('sidebar-expand')?.addEventListener('click', () => {
    sidebar?.classList.remove('sidebar-collapsed');
    mainContent?.classList.remove('sidebar-collapsed');
    setState({ isSidebarCollapsed: false });
    try { localStorage.setItem(STORAGE_KEY_SIDEBAR, 'false'); } catch { log.debug('Failed to save sidebar state', 'layout'); }
  });

  $$('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.getAttribute('data-section');
      const items = $(`[data-section-items="${label}"]`);
      if (items) {
        const isCollapsed = items.style.display === 'none';
        items.style.display = isCollapsed ? '' : 'none';
        btn.setAttribute('aria-expanded', String(isCollapsed));
        const chevron = btn.querySelector('svg');
        if (chevron) chevron.style.transform = isCollapsed ? '' : 'rotate(-90deg)';
      }
    });
  });
}

function initDropdown(toggleId: string, contentId: string): void {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  if (!toggle || !content) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    $$('.dropdown-content').forEach(dropdown => {
      if (dropdown.id !== contentId) dropdown.classList.add('hidden');
    });
    content.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (e.target instanceof Node && !content.contains(e.target) && !toggle.contains(e.target)) {
      content.classList.add('hidden');
    }
  });
}

function initThemeAndDropdowns(): void {
  for (const prefix of ['', 'mobile-']) {
    initDropdown(`${prefix}theme-toggle`, `${prefix}theme-dropdown`);
    initDropdown(`${prefix}notification-toggle`, `${prefix}notification-dropdown`);
  }

  $$('[data-theme-set]').forEach(themeButton => {
    themeButton.addEventListener('click', () => {
      const theme = themeButton.getAttribute('data-theme-set');
      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        setTheme(theme);
        mutateThemeToggleIcon();
        $$('.dropdown-content').forEach(dropdown => dropdown.classList.add('hidden'));
      }
    });
  });
}

function initMobileDrawer(): void {
  const sheet = document.getElementById('mobile-sheet');
  const backdrop = document.getElementById('mobile-sheet-backdrop');
  let drawerPreviousFocus: HTMLElement | null = null;

  function openDrawer(): void {
    drawerPreviousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheet?.classList.remove('hidden');
    backdrop?.classList.remove('hidden');
    // Focus first focusable element in the drawer
    const firstFocusable = sheet?.querySelector<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
  }

  function closeDrawer(): void {
    sheet?.classList.add('hidden');
    backdrop?.classList.add('hidden');
    drawerPreviousFocus?.focus();
    drawerPreviousFocus = null;
  }

  document.getElementById('mobile-sidebar-open')?.addEventListener('click', openDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  // Escape key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (sheet && !sheet.classList.contains('hidden')) {
      closeDrawer();
    }
  });

  // Focus trap within drawer
  sheet?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = sheet.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.getElementById('mobile-search-toggle')?.addEventListener('click', () => {
    document.getElementById('mobile-search-bar')?.classList.remove('hidden');
  });
  document.getElementById('mobile-search-close')?.addEventListener('click', () => {
    document.getElementById('mobile-search-bar')?.classList.add('hidden');
  });
}

function initDashboardLayout(): void {
  initActiveNavItem();
  initSidebar();
  initThemeAndDropdowns();
  initMobileDrawer();
  mutateThemeToggleIcon();
  mutateNotifications();
}

export { initDashboardLayout };
