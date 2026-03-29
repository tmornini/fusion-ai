import {
    $, $input, $textarea,
} from '../app/dom';
import { setHtml } from '../app/safe-html';
import { showToast } from '../app/toast';
import {
    buildSkeleton, withLoadingState,
} from '../app/loading-states';
import {
    navigateTo, initDialog, closeDialog,
} from '../app/core';
import {
    getIdeaForApproval,
    getEdgeForApproval,
    getIdea,
    putIdea,
    Idea,
    type EdgeData,
} from '../app/adapters';
import {
    IdeaPresenter,
} from '../app/presenters/idea';

async function saveIdea(
    id: string,
    title: string,
    description: string,
): Promise<void> {
    const existing = await getIdea(id);
    await putIdea(id, {
        ...existing,
        title,
        description,
    });
}

export async function init(
    params?: Record<string, string>,
): Promise<void> {
    const id = params?.['id'];
    if (!id) {
        navigateTo('idea-review-queue');
        return;
    }

    const state = {
        isEditingIdea: false,
    };

    function bindApprovalEvents(
        idea: Idea,
        edge: EdgeData | null,
        id: string,
    ): void {
        $(
            '#approval-approve-btn',
            document,
        )?.addEventListener(
            'click',
            async () => {
                const existingIdea =
                    await getIdea(id);
                await putIdea(id, {
                    ...existingIdea,
                    status: 'approved',
                });
                showToast(
                    'Idea approved'
                    + ' successfully',
                    'success',
                );
                navigateTo(
                    'idea-review-queue',
                );
            },
        );

        $(
            '#approval-back-btn',
            document,
        )?.addEventListener(
            'click',
            () => navigateTo(
                'idea-review-queue',
            ),
        );

        $(
            '#approval-edit-btn',
            document,
        )?.addEventListener(
            'click',
            () => {
                state.isEditingIdea
                    = true;
                mutateApprovalPage(
                    idea,
                    edge,
                    id,
                );
            },
        );

        $(
            '#approval-cancel-edit-btn',
            document,
        )?.addEventListener(
            'click',
            () => {
                state.isEditingIdea
                    = false;
                mutateApprovalPage(
                    idea,
                    edge,
                    id,
                );
            },
        );

        $(
            '#approval-save-edit-btn',
            document,
        )?.addEventListener(
            'click',
            async () => {
                const title =
                    $input(
                        '#approval-edit'
                        + '-title',
                        document,
                    )!.value;
                const description =
                    $textarea(
                        '#approval-edit'
                        + '-description',
                        document,
                    )!.value;
                try {
                    await saveIdea(
                        id,
                        title,
                        description,
                    );
                } catch {
                    showToast(
                        'Failed to'
                        + ' save idea',
                        'error',
                    );
                    return;
                }
                showToast(
                    'Idea saved',
                    'success',
                );
                const [
                    updatedIdea,
                    updatedEdge,
                ] = await Promise
                    .all([
                    getIdeaForApproval(
                        id,
                    ),
                    getEdgeForApproval(
                        id,
                    ),
                ]);
                state.isEditingIdea
                    = false;
                mutateApprovalPage(
                    updatedIdea,
                    updatedEdge,
                    id,
                );
            },
        );

        initDialog(
            'approval-reject',
            'approval-reject-btn',
        );
        $(
            '#approval-reject-confirm',
            document,
        )?.addEventListener(
            'click',
            async () => {
                const existingIdea =
                    await getIdea(id);
                await putIdea(id, {
                    ...existingIdea,
                    status: 'archived',
                });
                showToast(
                    'Idea sent back'
                    + ' for revision',
                    'info',
                );
                closeDialog(
                    'approval-reject',
                );
                navigateTo(
                    'idea-review-queue',
                );
            },
        );

        initDialog(
            'approval-clarify',
            'approval-clarify-btn',
        );
        $(
            '#approval-clarify-confirm',
            document,
        )?.addEventListener(
            'click',
            () => {
                showToast(
                    'Clarification'
                    + ' requested',
                    'info',
                );
                closeDialog(
                    'approval-clarify',
                );
            },
        );

        document.addEventListener(
            'keydown',
            (e) => {
                if (e.key === 'Escape') {
                    closeDialog(
                        'approval-reject',
                    );
                    closeDialog(
                        'approval-clarify',
                    );
                }
            },
        );
    }

    function mutateApprovalPage(
        idea: Idea,
        edge: EdgeData | null,
        id: string,
    ): void {
        const root = $(
            '#approval-content',
            document,
        );
        if (!root) return;
        setHtml(
            root,
            new IdeaPresenter(idea)
                .buildApprovalPage(
                    edge,
                    state.isEditingIdea,
                ),
        );
        bindApprovalEvents(
            idea,
            edge,
            id,
        );
    }

    const root = $(
        '#approval-content',
        document,
    );
    if (!root) return;

    const result =
        await withLoadingState(
            root,
            buildSkeleton('detail', 4),
            () => Promise.all([
                getIdeaForApproval(id),
                getEdgeForApproval(id),
            ]),
            () => init(),
        );
    if (!result) return;
    const [idea, edge] = result;

    mutateApprovalPage(idea, edge, id);
}
