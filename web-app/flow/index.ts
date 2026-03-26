import { $, attr } from '../app/dom';
import {
    html,
    setHtml,
    type SafeHtml,
} from '../app/safe-html';
import {
    buildSkeleton,
    withLoadingState,
} from '../app/loading-states';
import {
    iconGitBranch,
    iconChevronRight,
    iconCircle,
    iconShare,
    iconFolderKanban,
} from '../app/icons';
import { navigateTo } from '../app/core';
import {
    getWorkflows,
    type WorkflowSummary,
} from '../app/adapters';

function buildWorkflowCard(
    workflow: WorkflowSummary,
): SafeHtml {
    return html`
    <div class="card card-hover p-4"
        style="cursor:pointer"
        data-workflow-card="${workflow.id}">
        <div class="${
            'flex items-start '
            + 'justify-between gap-4'
        }">
            <div style="${
                'flex:1;min-width:0'
            }">
                <div class="${
                    'flex flex-wrap '
                    + 'items-center'
                    + ' gap-2 mb-2'
                }">
                    ${workflow.projectName
                        ? html`<span
                            class="${
                                'badge'
                                + ' badge-outline'
                                + ' text-xs'
                            }">${
                            iconFolderKanban(
                                12, '',
                            )
                        } ${
                            workflow
                                .projectName
                        }</span>`
                        : html``}
                </div>
                <h3 class="${
                    'font-semibold mb-1'
                }">${workflow.name}</h3>
                <p class="${
                    'text-sm'
                    + ' text-muted mb-2'
                    + ' truncate'
                }">${
                    workflow.description
                }</p>
                <div class="${
                    'flex flex-wrap '
                    + 'items-center'
                    + ' gap-3 '
                    + 'text-sm'
                    + ' text-muted'
                }">
                    <span class="${
                        'flex'
                        + ' items-center'
                        + ' gap-1'
                    }">${
                        iconCircle(14, '')
                    } ${
                        workflow.nodeCount
                    } ${
                        workflow.nodeCount
                            === 1
                            ? 'state'
                            : 'states'
                    }</span>
                    <span class="${
                        'flex'
                        + ' items-center'
                        + ' gap-1'
                    }">${
                        iconShare(14, '')
                    } ${
                        workflow.edgeCount
                    } ${
                        workflow.edgeCount
                            === 1
                            ? 'transition'
                            : 'transitions'
                    }</span>
                </div>
            </div>
            <div class="${
                'flex items-center'
            }">${
                iconChevronRight(
                    20,
                    'text-muted',
                )
            }</div>
        </div>
    </div>`;
}

export async function init(
): Promise<void> {
    const listEl = $(
        '#workflow-list', document,
    );
    if (!listEl) return;

    const result = await withLoadingState(
        listEl,
        buildSkeleton('card-list', 4),
        getWorkflows,
        init,
        {
            icon: iconGitBranch(24, ''),
            title: 'No Workflows Yet',
            description:
                'Workflows are created'
                + ' from the project'
                + ' detail page.',
            action: {
                label: 'View Projects',
                href:
                    '../projects/'
                    + 'index.html',
            },
        },
    );
    if (!result) return;
    const workflows = result;

    setHtml(
        listEl,
        html`${workflows.map(
            buildWorkflowCard,
        )}`,
    );

    listEl.addEventListener(
        'click',
        (e) => {
            if (
                !(e.target
                    instanceof Element)
            ) return;
            const card =
                e.target
                    .closest<HTMLElement>(
                    '[data-workflow-card]',
                );
            if (card)
                navigateTo(
                    'flow-detail',
                    {
                        workflowId: attr(
                            card,
                            'data-workflow'
                            + '-card',
                        ),
                    },
                );
        },
    );
}
