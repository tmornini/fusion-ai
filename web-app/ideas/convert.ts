import { $ } from '../app/dom';
import {
    html, setHtml, SafeHtml,
} from '../app/safe-html';
import { showToast } from '../app/toast';
import {
    buildSkeleton, buildErrorState,
} from '../app/loading-states';
import {
    iconArrowRight, iconLoader,
    iconCheckCircle2,
} from '../app/icons';
import { navigateTo } from '../app/core';
import {
    User, jsonObjectField,
} from '../../api/types';
import {
    getIdeaForConversion,
    getManagedUsers,
    getIdea,
    putIdea,
    putProject,
    putMilestone,
    putProjectTeamMember,
    putIdeaProjectLink,
    type ConversionData,
} from '../app/adapters';
import {
    IdeaPresenter,
} from '../app/presenters/idea';

type PriorityRank =
    | 'critical'
    | 'high'
    | 'medium'
    | 'low';

const PRIORITY_RANKS: Record<
    PriorityRank,
    number
> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
};

async function performConversion(
    ideaId: string,
    projectId: string,
): Promise<void> {
    const pd = state.projectDetails;
    const leadUserId =
        pd['project-lead'];
    await putProject(
        projectId,
        {
            title: pd[
                'project-name'
            ],
            description: pd[
                'success-criteria'
            ],
            status:
                'submitted',
            progress: 0,
            start_date: pd[
                'start-date'
            ],
            target_end_date: pd[
                'target-end-date'
            ],
            estimated_duration:
                0,
            actual_duration:
                0,
            estimated_cost:
                0,
            actual_cost: 0,
            estimated_impact:
                0,
            actual_impact: 0,
            priority:
                PRIORITY_RANKS[
                    pd[
                        'priority'
                    ] as
                    PriorityRank
                ]!,
            priority_score:
                0,
            business_context:
                jsonObjectField(
                    {},
                ),
            timeline_label:
                '',
            budget_label:
                pd['budget'],
        },
    );
    await Promise.all([
        putProjectTeamMember(
            projectId,
            leadUserId,
            'lead',
            'internal',
        ),
        putIdeaProjectLink(
            ideaId,
            projectId,
        ),
    ]);
    const existingIdea =
        await getIdea(ideaId);
    await putIdea(ideaId, {
        ...existingIdea,
        status: 'promoted',
    });
    const mTitle =
        pd['first-milestone'];
    if (mTitle?.trim()) {
        const milestoneId =
            crypto.randomUUID();
        await putMilestone(
            projectId,
            milestoneId,
            {
                title: mTitle,
                status: 'pending',
                date: pd[
                    'target-end-date'
                ],
                sort_order: 1,
            },
        );
    }
}

type ConversionField =
    | 'project-name'
    | 'project-lead'
    | 'start-date'
    | 'target-end-date'
    | 'budget'
    | 'priority'
    | 'first-milestone'
    | 'success-criteria';

const requiredFields: ConversionField[] = [
    'project-name',
    'project-lead',
    'start-date',
    'target-end-date',
    'budget',
    'priority',
];

const optionalFields: ConversionField[] = [
    'first-milestone',
    'success-criteria',
];

const state = {
    projectDetails: {
        'project-name': '',
        'project-lead': '',
        'start-date': '',
        'target-end-date': '',
        'budget': '',
        'priority': '',
        'first-milestone': '',
        'success-criteria': '',
    } satisfies Record<
        ConversionField, string
    >,
};

function completedFieldCount(): number {
    return requiredFields.filter(
        (field) =>
            state.projectDetails[field].trim(),
    ).length;
}

function isReadyToConvert(): boolean {
    return completedFieldCount()
        === requiredFields.length;
}

function fieldCheckIcon(
    field: ConversionField,
): SafeHtml {
    return state.projectDetails[field].trim()
        ? html`<span
            style=${'color:'
                + 'hsl(var(--success))'}>
            ${iconCheckCircle2(16, '')}
            </span>`
        : html``;
}

function buildFormState(
): ConversionFormState {
    const completed =
        completedFieldCount();
    const checks = {} as Record<
        ConversionField, SafeHtml
    >;
    const allFields: ConversionField[] = [
        'project-name',
        'project-lead',
        'start-date',
        'target-end-date',
        'budget',
        'priority',
        'first-milestone',
        'success-criteria',
    ];
    for (const f of allFields) {
        checks[f] = fieldCheckIcon(f);
    }
    return {
        projectDetails:
            state.projectDetails,
        completedCount: completed,
        requiredCount:
            requiredFields.length,
        isReady: isReadyToConvert(),
        fieldChecks: checks,
    };
}

type ConversionFormState =
    import(
        '../app/presenters/idea'
    ).ConversionFormState;

export async function init(
    params?: Record<string, string>,
): Promise<void> {
    const ideaId = params?.['ideaId'];
    if (!ideaId) { navigateTo('ideas'); return; }

    const root = $(
        '#convert-content', document,
    );
    if (!root) return;
    setHtml(root, buildSkeleton('detail', 4));

    let conversionData: ConversionData;
    let users: User[];
    try {
        [conversionData, users] =
            await Promise.all([
                getIdeaForConversion(ideaId),
                getManagedUsers(),
            ]);
    } catch {
        setHtml(
            root,
            buildErrorState(
                'Failed to load idea'
                + ' for conversion.',
                'Try Again',
            ),
        );
        root.querySelector(
            '[data-retry-btn]',
        )?.addEventListener(
            'click',
            () => init(),
        );
        return;
    }

    state.projectDetails = {
        'project-name':
            conversionData.idea.title,
        'project-lead': '',
        'start-date': '',
        'target-end-date': '',
        'budget': '',
        'priority': '',
        'first-milestone': '',
        'success-criteria': '',
    };

    const presenter =
        new IdeaPresenter(
            conversionData.idea,
        );
    setHtml(
        root,
        presenter.buildConversionPage(
            conversionData
                .estimatedDuration
                ?? '',
            conversionData
                .estimatedCost
                ?? '',
            users,
            buildFormState(),
        ),
    );

    const syncFormFields = () => {
        requiredFields
            .concat(optionalFields)
            .forEach(field => {
                const el = $(
                    `#convert-${field}`, document,
                );
                if (
                    el instanceof
                        HTMLInputElement
                    || el instanceof
                        HTMLSelectElement
                    || el instanceof
                        HTMLTextAreaElement
                ) {
                    state.projectDetails[field] =
                        el.value;
                }
            });
    };

    document
        .querySelectorAll<HTMLElement>(
            '.card input,'
            + ' .card select,'
            + ' .card textarea',
        )
        .forEach(el => {
            el.addEventListener(
                'input',
                () => {
                    syncFormFields();
                    const btn = $(
                        '#convert'
                        + '-submit-btn', document,
                    );
                    if (
                        btn instanceof
                            HTMLButtonElement
                    ) {
                        btn.disabled =
                            !isReadyToConvert();
                    }
                },
            );
            el.addEventListener(
                'change',
                () => {
                    syncFormFields();
                    const btn = $(
                        '#convert'
                        + '-submit-btn', document,
                    );
                    if (
                        btn instanceof
                            HTMLButtonElement
                    ) {
                        btn.disabled =
                            !isReadyToConvert();
                    }
                },
            );
        });

    $('#convert-submit-btn', document)
        ?.addEventListener(
            'click',
            async () => {
                syncFormFields();
                if (!isReadyToConvert()) {
                    return;
                }
                const btn = $(
                    '#convert-submit-btn', document,
                );
                if (!btn) return;
                setHtml(
                    btn,
                    html`${iconLoader(16, '')}
                        Creating Project...`,
                );
                if (
                    btn instanceof
                        HTMLButtonElement
                ) {
                    btn.disabled = true;
                }

                const projectId =
                    crypto.randomUUID();
                try {
                    await performConversion(
                        ideaId,
                        projectId,
                    );
                } catch {
                    showToast(
                        'Failed to create'
                        + ' project.'
                        + ' Please'
                        + ' try again.',
                        'error',
                    );
                    setHtml(
                        btn,
                        html`${'Create'
                            + ' Project'}
                            ${iconArrowRight(
                                16, '',
                            )}`,
                    );
                    if (
                        btn instanceof
                            HTMLButtonElement
                    ) {
                        btn.disabled =
                            false;
                    }
                    return;
                }
                showToast(
                    'Project created'
                    + ' successfully!',
                    'success',
                );
                navigateTo(
                    'project-detail',
                    { projectId },
                );
            },
        );

    $('#convert-back-to-ideas', document)
        ?.addEventListener(
            'click',
            () => navigateTo('ideas'),
        );
    $('#convert-back-to-ideas-2', document)
        ?.addEventListener(
            'click',
            () => navigateTo('ideas'),
        );
}
