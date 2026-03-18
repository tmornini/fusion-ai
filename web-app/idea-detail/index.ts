import { $, $input, $textarea } from '../app/dom';
import { html, setHtml, SafeHtml } from '../app/safe-html';
import { showToast } from '../app/toast';
import { buildSkeleton, buildErrorState } from '../app/loading-states';
import {
  iconArrowLeft, iconEdit, iconSave, iconX, iconClock, iconDollarSign,
  iconTrendingUp, iconStar, iconTarget, iconArrowRight, iconClipboardCheck,
} from '../app/icons';
import { navigateTo } from '../app/core';
import { getIdeaDetail, putIdea, type IdeaDetail } from '../app/adapters';
import { ideaStatusConfig, edgeStatusConfig, UNKNOWN_STATUS, UNKNOWN_EDGE_STATUS } from '../app/config';
import { SCORE_BADGE_HIGH, SCORE_BADGE_MEDIUM } from '../../api/types';

let isEditing = false;

function styleForScoreBadge(score: number): string {
  if (score >= SCORE_BADGE_HIGH) return 'color:hsl(var(--success));background:hsl(var(--success-soft))';
  if (score >= SCORE_BADGE_MEDIUM) return 'color:hsl(var(--warning));background:hsl(var(--warning-soft))';
  return 'color:hsl(var(--error));background:hsl(var(--error-soft))';
}

function buildProblemSolutionCard(idea: IdeaDetail): SafeHtml {
  return html`
    <div class="card p-6">
      <h2 class="text-lg font-display font-semibold mb-4">Problem & Solution</h2>
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <div>
          <p class="text-xs text-muted mb-1">Problem Statement</p>
          ${isEditing
            ? html`<textarea class="textarea" id="idea-edit-problem" rows="3" style="resize:none">${idea.problemStatement}</textarea>`
            : html`<p class="text-sm">${idea.problemStatement || '—'}</p>`}
        </div>
        <div>
          <p class="text-xs text-muted mb-1">Target Users</p>
          ${isEditing
            ? html`<textarea class="textarea" id="idea-edit-target-users" rows="2" style="resize:none">${idea.description}</textarea>`
            : html`<p class="text-sm">${idea.description || '—'}</p>`}
        </div>
        <div>
          <p class="text-xs text-muted mb-1">Proposed Solution</p>
          ${isEditing
            ? html`<textarea class="textarea" id="idea-edit-solution" rows="3" style="resize:none">${idea.proposedSolution}</textarea>`
            : html`<p class="text-sm">${idea.proposedSolution || '—'}</p>`}
        </div>
        <div>
          <p class="text-xs text-muted mb-1">Expected Outcome</p>
          ${isEditing
            ? html`<textarea class="textarea" id="idea-edit-outcome" rows="3" style="resize:none">${idea.expectedOutcome}</textarea>`
            : html`<p class="text-sm">${idea.expectedOutcome || '—'}</p>`}
        </div>
        <div>
          <p class="text-xs text-muted mb-1">Success Metrics</p>
          ${isEditing
            ? html`<textarea class="textarea" id="idea-edit-metrics" rows="3" style="resize:none">${idea.successMetrics}</textarea>`
            : html`<p class="text-sm">${idea.successMetrics || '—'}</p>`}
        </div>
      </div>
    </div>`;
}

function buildDetailsCard(idea: IdeaDetail): SafeHtml {
  return html`
    <div class="card p-6">
      <h2 class="text-lg font-display font-semibold mb-4">Details</h2>
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div>
          <p class="text-xs text-muted mb-1">Category</p>
          ${isEditing
            ? html`<input class="input" id="idea-edit-category" value="${idea.category}" />`
            : html`<p class="text-sm font-medium">${idea.category || '—'}</p>`}
        </div>
        <div>
          <p class="text-xs text-muted mb-1">Submitted by</p>
          <p class="text-sm font-medium">${idea.submittedBy}</p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">Submitted at</p>
          <p class="text-sm font-medium">${idea.submittedAt || '—'}</p>
        </div>
      </div>
    </div>`;
}

function buildEstimatesCard(idea: IdeaDetail): SafeHtml {
  return html`
    <div class="card p-6">
      <h2 class="text-lg font-display font-semibold mb-4">Estimates</h2>
      <div class="score-grid">
        ${[
          { label: 'Impact', inputId: 'impact', icon: iconTrendingUp, value: idea.estimatedImpact, unit: ' pts', prefix: '' },
          { label: 'Duration', inputId: 'duration', icon: iconClock, value: idea.estimatedDuration, unit: 'd', prefix: '' },
          { label: 'Cost', inputId: 'cost', icon: iconDollarSign, value: idea.estimatedCost, unit: '', prefix: '$' },
        ].map(metric => html`
          <div style="padding:1rem;border-radius:0.75rem;background:hsl(var(--muted)/0.3);border:1px solid hsl(var(--border))">
            <div class="flex items-center gap-2 mb-3">${metric.icon(20, 'text-primary')} <span class="font-medium">${metric.label}</span></div>
            ${isEditing
              ? html`<input type="number" id="idea-edit-${metric.inputId}" value="${String(metric.value)}" class="input" style="width:100%" min="0" step="any" />`
              : html`<p class="text-lg font-bold">${metric.value ? `${metric.prefix}${metric.value}${metric.unit}` : '—'}</p>`}
          </div>
        `)}
      </div>
    </div>`;
}

function buildIdeaDetail(idea: IdeaDetail, ideaId: string): SafeHtml {
  const isConvertible = idea.status === 'approved';
  const needsEdgeDefinition = idea.edgeStatus !== 'complete' && idea.status === 'active';
  const isReviewable = idea.status === 'in-review' && idea.edgeStatus === 'complete';

  return html`
    <div style="max-width:48rem;margin:0 auto">
      <div class="flex items-center gap-2 text-sm text-muted mb-4">
        <a href="../ideas/index.html" class="hover-link">Ideas</a>
        <span>/</span>
        <span>${idea.title}</span>
      </div>

      <div class="flex items-start justify-between gap-4 mb-6">
        <div class="flex items-center gap-4">
          <button class="btn btn-ghost btn-icon" id="idea-back-btn">${iconArrowLeft(20)}</button>
          <div>
            <div class="flex flex-wrap items-center gap-3 mb-2">
              ${isEditing
                ? html`<input class="input" id="idea-edit-title" value="${idea.title}" style="font-size:1.125rem;font-weight:700" />`
                : html`<h1 class="text-xl font-display font-bold">${idea.title}</h1>`}
              <span class="badge ${(ideaStatusConfig[idea.status] ?? UNKNOWN_STATUS).className} text-xs">${(ideaStatusConfig[idea.status] ?? UNKNOWN_STATUS).label}</span>
              <span class="badge ${(edgeStatusConfig[idea.edgeStatus] ?? UNKNOWN_EDGE_STATUS).className} text-xs">${iconTarget(12)} ${(edgeStatusConfig[idea.edgeStatus] ?? UNKNOWN_EDGE_STATUS).label}</span>
              <div style="padding:0.25rem 0.75rem;border-radius:var(--radius-lg);font-weight:600;font-size:0.875rem;${styleForScoreBadge(idea.score)}">
                ${iconStar(14)} ${idea.score}
              </div>
            </div>
            <p class="text-sm text-muted">Submitted by ${idea.submittedBy}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${needsEdgeDefinition ? html`
            <button class="btn btn-outline btn-sm gap-2" style="border-color:hsl(var(--primary)/0.3);color:hsl(var(--primary))" id="idea-edge-btn">
              ${iconTarget(16)} Define Edge
            </button>` : html``}
          ${isReviewable ? html`
            <button class="btn btn-outline btn-sm gap-2" style="border-color:hsl(var(--warning)/0.3);color:hsl(var(--warning))" id="idea-review-btn">
              ${iconClipboardCheck(16)} Review
            </button>` : html``}
          ${isConvertible ? html`
            <button class="btn btn-primary btn-sm gap-2" id="idea-convert-btn">
              ${iconArrowRight(16)} Convert
            </button>` : html``}
          ${isEditing
            ? html`<div class="flex gap-2">
                <button class="btn btn-outline gap-2" id="idea-cancel-btn">${iconX(16)} Cancel</button>
                <button class="btn btn-primary gap-2" id="idea-save-btn">${iconSave(16)} Save</button>
              </div>`
            : html`<button class="btn btn-outline gap-2" id="idea-edit-btn">${iconEdit(16)} Edit</button>`}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:1.5rem">
        ${buildProblemSolutionCard(idea)}
        ${buildDetailsCard(idea)}
        ${buildEstimatesCard(idea)}
      </div>
    </div>`;
}

function bindIdeaEvents(idea: IdeaDetail, ideaId: string): void {
  $('#idea-back-btn')?.addEventListener('click', () => navigateTo('ideas'));

  $('#idea-edit-btn')?.addEventListener('click', () => {
    isEditing = true;
    mutateIdeaPage(idea, ideaId);
  });

  $('#idea-cancel-btn')?.addEventListener('click', () => {
    isEditing = false;
    mutateIdeaPage(idea, ideaId);
  });

  $('#idea-save-btn')?.addEventListener('click', async () => {
    const title = $input('#idea-edit-title')?.value ?? idea.title;
    const description = $textarea('#idea-edit-target-users')?.value ?? idea.description;
    const category = $input('#idea-edit-category')?.value ?? idea.category;
    const problemStatement = $textarea('#idea-edit-problem')?.value ?? idea.problemStatement;
    const proposedSolution = $textarea('#idea-edit-solution')?.value ?? idea.proposedSolution;
    const expectedOutcome = $textarea('#idea-edit-outcome')?.value ?? idea.expectedOutcome;
    const successMetrics = $textarea('#idea-edit-metrics')?.value ?? idea.successMetrics;
    const impact = Number($input('#idea-edit-impact')?.value ?? idea.estimatedImpact);
    const duration = Number($input('#idea-edit-duration')?.value ?? idea.estimatedDuration);
    const cost = Number($input('#idea-edit-cost')?.value ?? idea.estimatedCost);

    try {
      await putIdea(ideaId, {
        title,
        description,
        category,
        problem_statement: problemStatement,
        proposed_solution: proposedSolution,
        expected_outcome: expectedOutcome,
        success_metrics: successMetrics,
        estimated_impact: impact,
        estimated_duration: duration * 86400,
        estimated_cost: cost,
      });
      showToast('Idea saved', 'success');
      const updated = await getIdeaDetail(ideaId);
      isEditing = false;
      mutateIdeaPage(updated, ideaId);
    } catch {
      showToast('Failed to save idea', 'error');
    }
  });

  // Contextual action buttons
  $('#idea-edge-btn')?.addEventListener('click', () => navigateTo('edge', { ideaId }));
  $('#idea-review-btn')?.addEventListener('click', () => navigateTo('approval-detail', { id: ideaId }));
  $('#idea-convert-btn')?.addEventListener('click', () => navigateTo('idea-convert', { ideaId }));
}

function mutateIdeaPage(idea: IdeaDetail, ideaId: string): void {
  const container = $('#idea-detail-content');
  if (!container) return;
  setHtml(container, buildIdeaDetail(idea, ideaId));
  bindIdeaEvents(idea, ideaId);
}

export async function init(params?: Record<string, string>): Promise<void> {
  const ideaId = params?.ideaId || '1';
  isEditing = false;

  const container = $('#idea-detail-content');
  if (!container) return;
  setHtml(container, buildSkeleton('detail'));

  let idea: IdeaDetail;
  try {
    idea = await getIdeaDetail(ideaId);
  } catch {
    setHtml(container, buildErrorState('Failed to load idea details. The idea may not exist.'));
    container.querySelector('[data-retry-btn]')?.addEventListener('click', () => init(params));
    return;
  }

  mutateIdeaPage(idea, ideaId);
}
