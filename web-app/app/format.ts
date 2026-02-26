import { SCORE_THRESHOLD_HIGH, SCORE_THRESHOLD_MEDIUM } from '../../api/types';

function initials(name: string): string {
  return name.split(' ').map(word => word[0]).join('');
}

function styleForScore(score: number): string {
  if (score >= SCORE_THRESHOLD_HIGH) return 'color:hsl(var(--success))';
  if (score >= SCORE_THRESHOLD_MEDIUM) return 'color:hsl(var(--warning))';
  return 'color:hsl(var(--error))';
}

export { initials, styleForScore };
