// ============================================
// FUSION AI — Core Application
// Router, Shared UI, Navigation, Layout
// ============================================

import type { AppState } from './state';
import { state, setState, subscribe, resolvedTheme, applyTheme, setTheme } from './state';
import {
  icon, icons,
  iconSparkles, iconHome, iconLightbulb, iconFolderKanban, iconUsers, iconUser,
  iconTarget, iconDatabase, iconGitBranch, iconPalette, iconLogOut, iconMenu,
  iconSearch, iconBell, iconSun, iconMoon, iconMonitor, iconX,
  iconChevronDown, iconChevronRight, iconChevronLeft,
  iconPanelLeftClose, iconPanelLeft, iconPlus, iconArrowLeft, iconArrowRight,
  iconCheck, iconLoader, iconSettings, iconExternalLink, iconFilter,
  iconMoreHorizontal, iconMoreVertical, iconStar, iconHeart,
  iconTrendingUp, iconTrendingDown, iconAlertCircle, iconAlertTriangle,
  iconCheckCircle, iconInfo, iconMail, iconPhone, iconCalendar, iconClock,
  iconUpload, iconDownload, iconTrash, iconEdit, iconEye, iconCopy, iconSave,
  iconSend, iconShare, iconGlobe, iconRocket, iconZap, iconAward, iconBrain,
  iconWand, iconActivity, iconBarChart, iconFileText, iconShield, iconBuilding,
  iconCrown, iconBriefcase, iconClipboardCheck, iconDollarSign, iconSmartphone,
  iconCode, iconHash, iconGripVertical, iconGauge, iconLineChart,
  iconArrowUpRight, iconArrowDownRight, iconCamera, iconCreditCard, iconCircle,
  iconMessageSquare, iconUserPlus, iconUserCheck, iconUserX, iconXCircle,
  iconCheckCircle2, iconHelpCircle, iconMinus, iconFolderOpen,
  iconFileSpreadsheet, iconListTodo, iconToggleLeft, iconType, iconTable,
  iconSlider, iconDot, iconLayoutGrid, iconChevronUp, iconHistory,
} from './icons';

// ------------------------------------
// DOM Helpers
// ------------------------------------

function $(selector: string, parent: ParentNode = document): HTMLElement | null {
  return parent.querySelector(selector);
}

function $$(selector: string, parent: ParentNode = document): HTMLElement[] {
  return Array.from(parent.querySelectorAll(selector));
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ------------------------------------
// Toast
// ------------------------------------

function showToast(message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${variant}`;
  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ------------------------------------
// Skeleton / Loading / Error / Empty State Helpers
// ------------------------------------

type SkeletonType = 'card-grid' | 'card-list' | 'detail' | 'table' | 'stats-row';

const SHIMMER_CLASS = 'skeleton-shimmer';

function skeletonCard(): string {
  return `<div class="skeleton-card">
    <div class="${SHIMMER_CLASS} skeleton-badge" style="margin-bottom:0.75rem"></div>
    <div class="${SHIMMER_CLASS} skeleton-heading"></div>
    <div class="${SHIMMER_CLASS} skeleton-text"></div>
    <div class="${SHIMMER_CLASS} skeleton-text" style="width:80%"></div>
  </div>`;
}

function skeletonListItem(): string {
  return `<div class="skeleton-card" style="display:flex;align-items:center;gap:1rem">
    <div class="${SHIMMER_CLASS} skeleton-avatar"></div>
    <div style="flex:1">
      <div class="${SHIMMER_CLASS} skeleton-text" style="width:60%;margin-bottom:0.375rem"></div>
      <div class="${SHIMMER_CLASS} skeleton-text-sm" style="width:40%"></div>
    </div>
    <div class="${SHIMMER_CLASS} skeleton-badge"></div>
  </div>`;
}

function skeletonStatsRow(): string {
  return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem">
    ${Array(4).fill(`<div class="skeleton-card" style="padding:1rem">
      <div class="${SHIMMER_CLASS} skeleton-text-sm" style="width:50%;margin-bottom:0.5rem"></div>
      <div class="${SHIMMER_CLASS} skeleton-heading" style="width:40%"></div>
    </div>`).join('')}
  </div>`;
}

function renderSkeleton(type: SkeletonType, options?: { count?: number }): string {
  const count = options?.count ?? 4;
  switch (type) {
    case 'card-grid':
      return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:1.5rem">
        ${Array(count).fill(skeletonCard()).join('')}
      </div>`;
    case 'card-list':
      return `<div style="display:flex;flex-direction:column;gap:0.75rem">
        ${Array(count).fill(skeletonListItem()).join('')}
      </div>`;
    case 'detail':
      return `<div>
        <div class="${SHIMMER_CLASS} skeleton-heading" style="width:40%;margin-bottom:1.5rem"></div>
        <div class="skeleton-card" style="margin-bottom:1.5rem">
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:90%"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:75%"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:60%;margin-bottom:1rem"></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
            ${Array(3).fill(`<div><div class="${SHIMMER_CLASS} skeleton-text-sm"></div><div class="${SHIMMER_CLASS} skeleton-heading" style="width:60%"></div></div>`).join('')}
          </div>
        </div>
      </div>`;
    case 'table':
      return `<div class="skeleton-card" style="padding:0;overflow:hidden">
        <div style="padding:1rem;border-bottom:1px solid hsl(var(--border))">
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:30%"></div>
        </div>
        ${Array(count).fill(`<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;border-bottom:1px solid hsl(var(--border))">
          <div class="${SHIMMER_CLASS} skeleton-avatar" style="width:2rem;height:2rem"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:25%;margin:0"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:20%;margin:0"></div>
          <div class="${SHIMMER_CLASS} skeleton-badge" style="margin-left:auto"></div>
        </div>`).join('')}
      </div>`;
    case 'stats-row':
      return skeletonStatsRow();
    default:
      return '';
  }
}

function renderError(message: string, retryLabel = 'Try Again'): string {
  return `<div class="state-container">
    <div class="state-icon state-icon-error">${iconAlertTriangle(24)}</div>
    <p class="state-title">Something went wrong</p>
    <p class="state-description">${escapeHtml(message)}</p>
    <button class="btn btn-outline" data-retry-btn>${retryLabel}</button>
  </div>`;
}

function renderEmpty(iconHtml: string, title: string, description: string, action?: { label: string; href: string }): string {
  return `<div class="state-container">
    <div class="state-icon state-icon-empty">${iconHtml}</div>
    <p class="state-title">${escapeHtml(title)}</p>
    <p class="state-description">${escapeHtml(description)}</p>
    ${action ? `<a href="${action.href}" class="btn btn-primary">${escapeHtml(action.label)}</a>` : ''}
  </div>`;
}

async function withLoadingState<T>(
  container: HTMLElement,
  skeletonHtml: string,
  fetchFn: () => Promise<T>,
  retryFn?: () => void,
): Promise<T | null> {
  container.innerHTML = skeletonHtml;
  try {
    return await fetchFn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'An unexpected error occurred. Please try again.';
    container.innerHTML = renderError(msg);
    const retryBtn = container.querySelector('[data-retry-btn]');
    if (retryBtn && retryFn) {
      retryBtn.addEventListener('click', retryFn);
    }
    return null;
  }
}

// ------------------------------------
// Shared Utilities
// ------------------------------------

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('');
}

function scoreColor(score: number): string {
  if (score >= 80) return 'color:hsl(var(--success))';
  if (score >= 60) return 'color:hsl(var(--warning))';
  return 'color:hsl(var(--error))';
}

let _dialogPreviousFocus: HTMLElement | null = null;

function openDialog(dialogId: string): void {
  _dialogPreviousFocus = document.activeElement as HTMLElement | null;
  $(`#${dialogId}-backdrop`)?.classList.remove('hidden');
  const dialog = $(`#${dialogId}-dialog`);
  dialog?.classList.remove('hidden');
  dialog?.setAttribute('aria-hidden', 'false');
  const focusable = dialog?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  focusable?.focus();
}

function closeDialog(dialogId: string): void {
  $(`#${dialogId}-backdrop`)?.classList.add('hidden');
  const dialog = $(`#${dialogId}-dialog`);
  dialog?.classList.add('hidden');
  dialog?.setAttribute('aria-hidden', 'true');
  _dialogPreviousFocus?.focus();
  _dialogPreviousFocus = null;
}

function initTabs(tabSelector: string, panelSelector: string, activeClass = 'active'): void {
  document.querySelectorAll<HTMLElement>(tabSelector).forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll(tabSelector).forEach(t => t.classList.remove(activeClass));
      tab.classList.add(activeClass);
      document.querySelectorAll(panelSelector).forEach(p => (p as HTMLElement).style.display = 'none');
      const attr = tab.dataset.tab ?? tab.dataset.detailTab ?? '';
      const panel = document.getElementById(`tab-${attr}`) ?? document.getElementById(`detail-${attr}`);
      if (panel) panel.style.display = '';
    });
  });
}

// ------------------------------------
// Navigation
// ------------------------------------

function getPageName(): string {
  return document.documentElement.getAttribute('data-page') || '';
}

function getParams(): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((value, key) => { params[key] = value; });
  return params;
}

const PAGE_PATHS: Record<string, string> = {
  dashboard: 'core/dashboard', ideas: 'core/ideas', projects: 'core/projects',
  'project-detail': 'core/project-detail', 'engineering-requirements': 'core/engineering-requirements',
  'idea-create': 'core/idea-create', 'idea-scoring': 'core/idea-scoring',
  'idea-convert': 'core/idea-convert', 'idea-review-queue': 'core/idea-review-queue',
  'approval-detail': 'core/approval-detail',
  edge: 'tools/edge', 'edge-list': 'tools/edge-list', crunch: 'tools/crunch', flow: 'tools/flow',
  team: 'admin/team', account: 'admin/account', profile: 'admin/profile',
  'company-settings': 'admin/company-settings', 'manage-users': 'admin/manage-users',
  'activity-feed': 'admin/activity-feed', 'notification-settings': 'admin/notification-settings',
  snapshots: 'admin/snapshots',
  'design-system': 'reference/design-system',
  landing: 'entry/landing', auth: 'entry/auth', onboarding: 'entry/onboarding',
  'not-found': 'system/not-found',
};

function navigateTo(page: string, params?: Record<string, string>): void {
  const path = PAGE_PATHS[page] || page;
  let url = '../../' + path + '/index.html';
  if (params && Object.keys(params).length > 0) {
    url += '?' + new URLSearchParams(params).toString();
  }
  window.location.href = url;
}

// ------------------------------------
// Theme Toggle Icon Update
// ------------------------------------

function updateThemeToggleIcon(): void {
  const themeIconHtml = state.theme === 'dark'
    ? iconMoon(20)
    : state.theme === 'light'
    ? iconSun(20)
    : iconMonitor(20);
  ['theme-toggle', 'mobile-theme-toggle'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.innerHTML = themeIconHtml;
  });
}

// ------------------------------------
// Notification Population
// ------------------------------------

async function populateNotifications(): Promise<void> {
  const { getNotifications } = await import('./data');
  const notifications = await getNotifications();
  const unreadCount = notifications.filter(n => n.unread).length;

  function renderItems(containerId: string, countId: string, badgeId: string) {
    const list = document.getElementById(containerId);
    const countEl = document.getElementById(countId);
    const badge = document.getElementById(badgeId);

    if (list) {
      list.innerHTML = notifications.map(n => `
        <button class="dropdown-item" style="flex-direction:column;align-items:flex-start;padding:0.75rem 0.5rem">
          <div class="flex items-start gap-2 w-full">
            ${n.unread ? '<span style="width:0.5rem;height:0.5rem;background:hsl(var(--primary));border-radius:9999px;margin-top:0.375rem;flex-shrink:0"></span>' : ''}
            <div style="flex:1;${!n.unread ? 'margin-left:1rem' : ''}">
              <p class="text-sm ${n.unread ? 'font-medium' : 'text-muted'}">${escapeHtml(n.title)}</p>
              <p class="text-xs text-muted line-clamp-2">${escapeHtml(n.message)}</p>
              <p class="text-xs text-muted mt-1">${n.time}</p>
            </div>
          </div>
        </button>`).join('');
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

  for (const prefix of ['notif', 'mobile-notif']) {
    renderItems(`${prefix}-list`, `${prefix}-count`, `${prefix}-badge`);
  }
}

// ------------------------------------
// Page Module Dispatch
// ------------------------------------

const pageModules: Record<string, () => Promise<{ init: (params?: Record<string, string>) => void | Promise<void> }>> = {
  dashboard: () => import('../core/dashboard/index'),
  ideas: () => import('../core/ideas/index'),
  projects: () => import('../core/projects/index'),
  'project-detail': () => import('../core/project-detail/index'),
  'engineering-requirements': () => import('../core/engineering-requirements/index'),
  'idea-create': () => import('../core/idea-create/index'),
  'idea-scoring': () => import('../core/idea-scoring/index'),
  'idea-convert': () => import('../core/idea-convert/index'),
  'idea-review-queue': () => import('../core/idea-review-queue/index'),
  'approval-detail': () => import('../core/approval-detail/index'),
  edge: () => import('../tools/edge/index'),
  'edge-list': () => import('../tools/edge-list/index'),
  crunch: () => import('../tools/crunch/index'),
  flow: () => import('../tools/flow/index'),
  team: () => import('../admin/team/index'),
  account: () => import('../admin/account/index'),
  profile: () => import('../admin/profile/index'),
  'company-settings': () => import('../admin/company-settings/index'),
  'manage-users': () => import('../admin/manage-users/index'),
  'activity-feed': () => import('../admin/activity-feed/index'),
  'notification-settings': () => import('../admin/notification-settings/index'),
  snapshots: () => import('../admin/snapshots/index'),
  'design-system': () => import('../reference/design-system/index'),
  landing: () => import('../entry/landing/index'),
  auth: () => import('../entry/auth/index'),
  onboarding: () => import('../entry/onboarding/index'),
  'not-found': () => import('../system/not-found/index'),
};

// ------------------------------------
// Initialize
// ------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  initPrefetch();

  // Initialize database before any page modules
  try {
    const { createLocalStorageAdapter } = await import('../../api/db-localstorage');
    const { initApi } = await import('../../api/api');

    const adapter = await createLocalStorageAdapter();
    await adapter.initialize();
    initApi(adapter);

    // If no schema exists, redirect to snapshots so user can choose what to load
    const schemaExists = await adapter.hasSchema();
    if (!schemaExists) {
      const page = getPageName();
      const skipRedirect = ['snapshots', 'auth', 'onboarding', 'not-found', 'design-system'];
      if (!skipRedirect.includes(page)) {
        if (page === 'landing') {
          // Root-level index.html is not 2 dirs deep like other pages,
          // so navigateTo's ../../ prefix won't work here
          window.location.href = 'admin/snapshots/index.html';
        } else {
          navigateTo('snapshots');
        }
        return;
      }
    }
  } catch (err) {
    console.error('Database initialization failed:', err);
    const msg = err instanceof Error ? err.message : String(err);
    document.body.innerHTML = `<div style="padding:2rem;font-family:sans-serif;max-width:40rem">
      <h1 style="color:hsl(0 72% 51%)">Failed to initialize database</h1>
      <pre style="background:hsl(0 100% 97%);padding:1rem;border-radius:0.5rem;overflow:auto;white-space:pre-wrap">${msg}</pre>
      <p>Try clearing site data and reloading.</p>
    </div>`;
    return;
  }

  const pageName = getPageName();

  // For pages with dashboard layout, init layout behavior
  if (document.querySelector('.dashboard-layout')) {
    initDashboardLayout();
  }

  // Init command palette (works on all pages)
  import('./command-palette').then(m => m.initCommandPalette());

  // Load and init the page module
  const loader = pageModules[pageName];
  if (loader) {
    const mod = await loader();
    await mod.init(getParams());
  }
});

// ------------------------------------
// Dashboard Layout Behavior
// ------------------------------------

function setupActiveNavItem(): void {
  const pageName = getPageName();
  document.querySelectorAll<HTMLElement>('[data-page-link]').forEach(el => {
    const linkPage = el.getAttribute('data-page-link') || '';
    let active = linkPage === pageName;
    if (!active) {
      if (linkPage === 'account' && ['profile', 'company-settings', 'manage-users', 'activity-feed', 'notification-settings', 'snapshots'].includes(pageName)) active = true;
      else if (linkPage === 'ideas' && ['idea-create', 'idea-scoring', 'idea-convert', 'idea-review-queue', 'approval-detail'].includes(pageName)) active = true;
      else if (linkPage === 'projects' && ['project-detail', 'engineering-requirements'].includes(pageName)) active = true;
      else if (linkPage === 'edge-list' && pageName === 'edge') active = true;
    }
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

function setupSidebar(): void {
  const sidebar = document.getElementById('desktop-sidebar');
  const mainContent = document.querySelector('.main-content') as HTMLElement;

  if (localStorage.getItem('fusion-sidebar-collapsed') === 'true') {
    sidebar?.classList.add('sidebar-collapsed');
    mainContent?.classList.add('sidebar-collapsed');
    state.sidebarCollapsed = true;
  }

  document.getElementById('sidebar-collapse')?.addEventListener('click', () => {
    sidebar?.classList.add('sidebar-collapsed');
    mainContent?.classList.add('sidebar-collapsed');
    state.sidebarCollapsed = true;
    localStorage.setItem('fusion-sidebar-collapsed', 'true');
  });
  document.getElementById('sidebar-expand')?.addEventListener('click', () => {
    sidebar?.classList.remove('sidebar-collapsed');
    mainContent?.classList.remove('sidebar-collapsed');
    state.sidebarCollapsed = false;
    localStorage.setItem('fusion-sidebar-collapsed', 'false');
  });

  document.querySelectorAll<HTMLElement>('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.getAttribute('data-section');
      const items = document.querySelector(`[data-section-items="${label}"]`) as HTMLElement;
      if (items) {
        const hidden = items.style.display === 'none';
        items.style.display = hidden ? '' : 'none';
        btn.setAttribute('aria-expanded', String(hidden));
        const chevron = btn.querySelector('svg');
        if (chevron) chevron.style.transform = hidden ? '' : 'rotate(-90deg)';
      }
    });
  });
}

function setupThemeAndDropdowns(): void {
  for (const prefix of ['', 'mobile-']) {
    setupDropdown(`${prefix}theme-toggle`, `${prefix}theme-dropdown`);
    setupDropdown(`${prefix}notif-toggle`, `${prefix}notif-dropdown`);
  }

  document.querySelectorAll<HTMLElement>('[data-theme-set]').forEach(el => {
    el.addEventListener('click', () => {
      const theme = el.getAttribute('data-theme-set') as AppState['theme'];
      if (theme) {
        setTheme(theme);
        updateThemeToggleIcon();
        document.querySelectorAll('.dropdown-content').forEach(d => d.classList.add('hidden'));
      }
    });
  });
}

function setupMobileDrawer(): void {
  document.getElementById('mobile-sidebar-open')?.addEventListener('click', () => {
    document.getElementById('mobile-sheet')?.classList.remove('hidden');
    document.getElementById('mobile-sheet-backdrop')?.classList.remove('hidden');
  });
  document.getElementById('mobile-sheet-backdrop')?.addEventListener('click', () => {
    document.getElementById('mobile-sheet')?.classList.add('hidden');
    document.getElementById('mobile-sheet-backdrop')?.classList.add('hidden');
  });

  document.getElementById('mobile-search-toggle')?.addEventListener('click', () => {
    document.getElementById('mobile-search-bar')?.classList.remove('hidden');
  });
  document.getElementById('mobile-search-close')?.addEventListener('click', () => {
    document.getElementById('mobile-search-bar')?.classList.add('hidden');
  });
}

function initDashboardLayout(): void {
  setupActiveNavItem();
  setupSidebar();
  setupThemeAndDropdowns();
  setupMobileDrawer();
  updateThemeToggleIcon();
  populateNotifications();
}

function setupDropdown(toggleId: string, contentId: string): void {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  if (!toggle || !content) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.dropdown-content').forEach(d => {
      if (d.id !== contentId) d.classList.add('hidden');
    });
    content.classList.toggle('hidden');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!content.contains(e.target as Node) && !toggle.contains(e.target as Node)) {
      content.classList.add('hidden');
    }
  });
}

// ------------------------------------
// Navigation Prefetch
// ------------------------------------

function initPrefetch(): void {
  if (location.protocol === 'file:') return;
  const prefetched = new Set<string>();
  document.addEventListener('pointerenter', (e) => {
    if (!(e.target instanceof Element)) return;
    const anchor = e.target.closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (href && href.endsWith('/index.html') && !href.startsWith('http') && !prefetched.has(href)) {
      prefetched.add(href);
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }
  }, { capture: true });
}

// ------------------------------------
// Exports for page modules
// ------------------------------------

export {
  // State (re-exported from ./state)
  state, setState, subscribe, resolvedTheme,
  // Theme (re-exported from ./state)
  applyTheme, setTheme,
  // DOM
  $, $$, escapeHtml,
  // Navigation
  getPageName, getParams, navigateTo,
  // Layout
  initDashboardLayout,
  // Toast
  showToast,
  // Loading / Error / Empty
  renderSkeleton, renderError, renderEmpty, withLoadingState,
  // Shared Utilities
  initials, scoreColor, openDialog, closeDialog, initTabs,
  // Icons (re-exported from ./icons)
  icon, icons,
  iconSparkles, iconHome, iconLightbulb, iconFolderKanban, iconUsers, iconUser,
  iconTarget, iconDatabase, iconGitBranch, iconPalette, iconLogOut, iconMenu,
  iconSearch, iconBell, iconSun, iconMoon, iconMonitor, iconX,
  iconChevronDown, iconChevronRight, iconChevronLeft,
  iconPanelLeftClose, iconPanelLeft, iconPlus, iconArrowLeft, iconArrowRight,
  iconCheck, iconLoader, iconSettings, iconExternalLink, iconFilter,
  iconMoreHorizontal, iconMoreVertical, iconStar, iconHeart,
  iconTrendingUp, iconTrendingDown, iconAlertCircle, iconAlertTriangle,
  iconCheckCircle, iconInfo, iconMail, iconPhone, iconCalendar, iconClock,
  iconUpload, iconDownload, iconTrash, iconEdit, iconEye, iconCopy, iconSave,
  iconSend, iconShare, iconGlobe, iconRocket, iconZap, iconAward, iconBrain,
  iconWand, iconActivity, iconBarChart, iconFileText, iconShield, iconBuilding,
  iconCrown, iconBriefcase, iconClipboardCheck, iconDollarSign, iconSmartphone,
  iconCode, iconHash, iconGripVertical, iconGauge, iconLineChart,
  iconArrowUpRight, iconArrowDownRight, iconCamera, iconCreditCard, iconCircle,
  iconMessageSquare, iconUserPlus, iconUserCheck, iconUserX, iconXCircle,
  iconCheckCircle2, iconHelpCircle, iconMinus, iconFolderOpen,
  iconFileSpreadsheet, iconListTodo, iconToggleLeft, iconType, iconTable,
  iconSlider, iconDot, iconLayoutGrid, iconChevronUp, iconHistory,
};
