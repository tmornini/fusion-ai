import {
    $, $input, $textarea,
    bindEnterToClick,
} from '../app/dom';
import { setHtml } from '../app/safe-html';
import { showToast } from '../app/toast';
import { log } from '../app/logger';
import {
    buildSkeleton,
    withLoadingState,
} from '../app/loading-states';
import {
    navigateTo,
    trimStrings,
    initDialog,
} from '../app/core';
import {
    getIdea,
    getIdeaEntity,
    postActivity,
    putIdea,
    ideaChanged,
    type Idea,
} from '../app/adapters';
import {
    IdeaPresenter,
} from '../app/presenters';

const escapeController =
    { current: new AbortController() };

type IdeaTransition =
    | 'in-review'
    | 'approved'
    | 'sent-back';

interface TransitionConfig {
    failureToast: string;
    successToast: string;
    successVariant: 'success' | 'info';
    activityAction: string;
}

const TRANSITION_CONFIG:
    Record<IdeaTransition, TransitionConfig> = {
    'in-review': {
        failureToast: 'Failed to submit',
        successToast: 'Submitted for review',
        successVariant: 'success',
        activityAction:
            'submitted idea for review',
    },
    'approved': {
        failureToast: 'Failed to approve',
        successToast:
            'Idea approved successfully',
        successVariant: 'success',
        activityAction: 'approved idea',
    },
    'sent-back': {
        failureToast: 'Failed to send back',
        successToast:
            'Idea sent back for revision',
        successVariant: 'info',
        activityAction:
            'sent idea back for revision',
    },
};

async function transitionIdea(
    ideaId: string,
    toStatus: IdeaTransition,
    feedback?: string,
): Promise<void> {
    const cfg = TRANSITION_CONFIG[toStatus]!;
    let title = '';
    try {
        const entity =
            await getIdeaEntity(ideaId);
        title = entity.title;
        await putIdea(
            ideaId,
            { ...entity, status: toStatus },
        );
    } catch (err) {
        log.error(
            'putIdea failed', 'ideas', err,
        );
        showToast(cfg.failureToast, 'error');
        return;
    }
    await postActivity({
        type: 'status_changed',
        action: cfg.activityAction,
        target: title,
        status: toStatus,
        ...(feedback ? { feedback } : {}),
    });
    showToast(
        cfg.successToast,
        cfg.successVariant,
    );
    navigateTo('ideas');
}

function bindIdeaEvents(
    idea: Idea,
    isEditing: boolean,
): void {
    escapeController.current.abort();
    escapeController.current =
        new AbortController();
    if (isEditing) {
        document.addEventListener(
            'keydown',
            (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    $(
                        '#idea-cancel-btn',
                        document,
                    )?.click();
                }
            },
            {
                signal: escapeController
                    .current.signal,
            },
        );
        const saveSel = '#idea-save-btn';
        bindEnterToClick(
            '#idea-edit-title', saveSel,
        );
    }
    $('#idea-back-btn', document)
        ?.addEventListener(
            'click',
            () => navigateTo('ideas'),
        );

    $('#idea-edit-btn', document)
        ?.addEventListener(
            'click',
            () => mutateIdeaPage(
                idea, true,
            ),
        );

    $('#idea-cancel-btn', document)
        ?.addEventListener(
            'click',
            () => mutateIdeaPage(
                idea, false,
            ),
        );

    $('#idea-save-btn', document)
        ?.addEventListener(
            'click',
            async () => {
                const title =
                    $input(
                        '#idea-edit-title',
                        document,
                    )!.value;
                const problemStatement =
                    $textarea(
                        '#idea-edit-problem',
                        document,
                    )!.value;
                const targetUsers =
                    $input(
                        '#idea-edit-target',
                        document,
                    )!.value;
                const proposedSolution =
                    $textarea(
                        '#idea-edit-solution',
                        document,
                    )!.value;
                const expectedOutcome =
                    $textarea(
                        '#idea-edit-outcome',
                        document,
                    )!.value;
                const successMetrics =
                    $textarea(
                        '#idea-edit-metrics',
                        document,
                    )!.value;

                try {
                    const entity =
                        await getIdeaEntity(
                            idea.idForLink(),
                        );
                    await putIdea(
                        idea.idForLink(),
                        {
                            ...entity,
                            ...trimStrings({
                                title,
                                problem_statement:
                                    problemStatement,
                                target_users:
                                    targetUsers,
                                proposed_solution:
                                    proposedSolution,
                                expected_outcome:
                                    expectedOutcome,
                                success_metrics:
                                    successMetrics,
                            }),
                        },
                    );
                } catch (err) {
                    log.error(
                        'putIdea failed',
                        'ideas',
                        err,
                    );
                    showToast(
                        'Failed to save'
                        + ' idea',
                        'error',
                    );
                    return;
                }
                showToast(
                    'Idea saved',
                    'success',
                );
            },
        );

    ideaChanged.subscribe(async () => {
        const updated =
            await getIdea(
                idea.idForLink(),
            );
        mutateIdeaPage(
            updated, false,
        );
    });

    if (idea.isReviewable()) {
        bindApprovalEvents(
            idea.idForLink(),
        );
    }
    $('#idea-convert-btn', document)
        ?.addEventListener(
            'click',
            () => navigateTo(
                'idea-convert',
                {
                    ideaId: idea.idForLink(),
                    from: 'detail',
                },
            ),
        );
    $(
        '#idea-submit-review-btn',
        document,
    )?.addEventListener(
        'click',
        () => transitionIdea(
            idea.idForLink(),
            'in-review',
        ),
    );
}

function bindApprovalEvents(
    ideaId: string,
): void {
    $(
        '#approval-approve-btn',
        document,
    )?.addEventListener(
        'click',
        () => transitionIdea(ideaId, 'approved'),
    );

    initDialog(
        'approval-send-back',
        'approval-send-back-btn',
    );
    $(
        '#approval-send-back-confirm',
        document,
    )?.addEventListener(
        'click',
        () => {
            const ta = $textarea(
                '#approval-send-back-feedback',
                document,
            );
            const feedback =
                ta?.value.trim() || undefined;
            return transitionIdea(
                ideaId, 'sent-back', feedback,
            );
        },
    );

}

function mutateIdeaPage(
    idea: Idea,
    isEditing: boolean,
): void {
    const container = $(
        '#idea-detail-content', document,
    );
    if (!container) return;
    const presenter =
        new IdeaPresenter(idea);
    setHtml(
        container,
        presenter.buildDetailView(
            idea.idForLink(), isEditing,
        ),
    );
    bindIdeaEvents(idea, isEditing);
}

export async function init(
    params?: Record<string, string>,
): Promise<void> {
    const ideaId = params?.ideaId;
    if (!ideaId) { navigateTo('ideas'); return; }

    const container = $(
        '#idea-detail-content', document,
    );
    if (!container) return;

    const idea = await withLoadingState(
        container,
        buildSkeleton('detail', 4),
        () => getIdea(ideaId),
        () => init(params),
    );
    if (!idea) return;

    mutateIdeaPage(idea, false);
}
