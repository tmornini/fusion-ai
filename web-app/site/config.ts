// ============================================
// FUSION AI — Shared Configuration
// Status display configs used across pages.
// ============================================

import type { EdgeStatus } from '../../api/types';

export const edgeStatusConfig: Record<EdgeStatus | 'incomplete', { label: string; cls: string }> = {
  missing:    { label: 'Edge Missing',  cls: 'badge-error' },
  incomplete: { label: 'Edge Missing',  cls: 'badge-error' },
  draft:      { label: 'Edge Draft',    cls: 'badge-warning' },
  complete:   { label: 'Edge Complete', cls: 'badge-success' },
};
