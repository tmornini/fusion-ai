// ============================================
// FUSION AI — Skeleton / Loading / Error / Empty
// Loading placeholders and state display helpers.
// ============================================

import { iconAlertTriangle } from './icons';
import { SafeHtml, html, setHtml, trusted } from './safe-html';

export type SkeletonType = 'card-grid' | 'card-list' | 'detail' | 'table' | 'stats-row';

const SHIMMER_CLASS = 'skeleton-shimmer';

function buildSkeletonCard(): SafeHtml {
  return html`<div class="skeleton-card">
    <div class="${SHIMMER_CLASS} skeleton-badge" style="margin-bottom:0.75rem"></div>
    <div class="${SHIMMER_CLASS} skeleton-heading"></div>
    <div class="${SHIMMER_CLASS} skeleton-text"></div>
    <div class="${SHIMMER_CLASS} skeleton-text" style="width:80%"></div>
  </div>`;
}

function buildSkeletonListItem(): SafeHtml {
  return html`<div class="skeleton-card" style="display:flex;align-items:center;gap:1rem">
    <div class="${SHIMMER_CLASS} skeleton-avatar"></div>
    <div style="flex:1">
      <div class="${SHIMMER_CLASS} skeleton-text" style="width:60%;margin-bottom:0.375rem"></div>
      <div class="${SHIMMER_CLASS} skeleton-text-sm" style="width:40%"></div>
    </div>
    <div class="${SHIMMER_CLASS} skeleton-badge"></div>
  </div>`;
}

function buildSkeletonStatsRow(): SafeHtml {
  return html`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem">
    ${Array(4).fill(trusted(`<div class="skeleton-card" style="padding:1rem">
      <div class="${SHIMMER_CLASS} skeleton-text-sm" style="width:50%;margin-bottom:0.5rem"></div>
      <div class="${SHIMMER_CLASS} skeleton-heading" style="width:40%"></div>
    </div>`))}
  </div>`;
}

export function buildSkeleton(type: SkeletonType, options?: { count?: number }): SafeHtml {
  const count = options?.count ?? 4;
  switch (type) {
    case 'card-grid':
      return html`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:1.5rem">
        ${Array(count).fill(buildSkeletonCard())}
      </div>`;
    case 'card-list':
      return html`<div style="display:flex;flex-direction:column;gap:0.75rem">
        ${Array(count).fill(buildSkeletonListItem())}
      </div>`;
    case 'detail':
      return html`<div>
        <div class="${SHIMMER_CLASS} skeleton-heading" style="width:40%;margin-bottom:1.5rem"></div>
        <div class="skeleton-card" style="margin-bottom:1.5rem">
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:90%"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:75%"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:60%;margin-bottom:1rem"></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
            ${Array(3).fill(trusted(`<div><div class="${SHIMMER_CLASS} skeleton-text-sm"></div><div class="${SHIMMER_CLASS} skeleton-heading" style="width:60%"></div></div>`))}
          </div>
        </div>
      </div>`;
    case 'table':
      return html`<div class="skeleton-card" style="padding:0;overflow:hidden">
        <div style="padding:1rem;border-bottom:1px solid hsl(var(--border))">
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:30%"></div>
        </div>
        ${Array(count).fill(trusted(`<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;border-bottom:1px solid hsl(var(--border))">
          <div class="${SHIMMER_CLASS} skeleton-avatar" style="width:2rem;height:2rem"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:25%;margin:0"></div>
          <div class="${SHIMMER_CLASS} skeleton-text" style="width:20%;margin:0"></div>
          <div class="${SHIMMER_CLASS} skeleton-badge" style="margin-left:auto"></div>
        </div>`))}
      </div>`;
    case 'stats-row':
      return buildSkeletonStatsRow();
    default:
      return html``;
  }
}

export function buildErrorState(message: string, retryLabel = 'Try Again'): SafeHtml {
  return html`<div class="state-container">
    <div class="state-icon state-icon-error">${iconAlertTriangle(24)}</div>
    <p class="state-title">Something went wrong</p>
    <p class="state-description">${message}</p>
    <button class="btn btn-outline" data-retry-btn>${retryLabel}</button>
  </div>`;
}

export function buildEmptyState(iconHtml: SafeHtml, title: string, description: string, action?: { label: string; href: string }): SafeHtml {
  return html`<div class="state-container">
    <div class="state-icon state-icon-empty">${iconHtml}</div>
    <p class="state-title">${title}</p>
    <p class="state-description">${description}</p>
    ${action ? html`<a href="${action.href}" class="btn btn-primary">${action.label}</a>` : html``}
  </div>`;
}

export async function withLoadingState<T>(
  container: HTMLElement,
  skeletonHtml: SafeHtml,
  fetchFn: () => Promise<T>,
  retryFn?: () => void,
): Promise<T | null> {
  setHtml(container, skeletonHtml);
  try {
    return await fetchFn();
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred. Please try again.';
    setHtml(container, buildErrorState(errorMessage));
    const retryBtn = container.querySelector('[data-retry-btn]');
    if (retryBtn && retryFn) {
      retryBtn.addEventListener('click', retryFn);
    }
    return null;
  }
}
