// ============================================
// FUSION AI — Skeleton / Loading / Error / Empty
// Loading placeholders and state display helpers.
// ============================================

import { iconAlertTriangle } from './icons';
import { escapeHtml } from './dom';

export type SkeletonType = 'card-grid' | 'card-list' | 'detail' | 'table' | 'stats-row';

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

export function renderSkeleton(type: SkeletonType, options?: { count?: number }): string {
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

// Note: renderError and renderEmpty use escapeHtml() to sanitize all
// user-provided content before insertion. The innerHTML usage here is
// safe because only escaped strings and trusted icon SVGs are composed.

export function renderError(message: string, retryLabel = 'Try Again'): string {
  return `<div class="state-container">
    <div class="state-icon state-icon-error">${iconAlertTriangle(24)}</div>
    <p class="state-title">Something went wrong</p>
    <p class="state-description">${escapeHtml(message)}</p>
    <button class="btn btn-outline" data-retry-btn>${retryLabel}</button>
  </div>`;
}

export function renderEmpty(iconHtml: string, title: string, description: string, action?: { label: string; href: string }): string {
  return `<div class="state-container">
    <div class="state-icon state-icon-empty">${iconHtml}</div>
    <p class="state-title">${escapeHtml(title)}</p>
    <p class="state-description">${escapeHtml(description)}</p>
    ${action ? `<a href="${action.href}" class="btn btn-primary">${escapeHtml(action.label)}</a>` : ''}
  </div>`;
}

export async function withLoadingState<T>(
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
