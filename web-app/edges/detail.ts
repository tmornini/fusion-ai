import {
    $, $$, $textarea, $select, $input, attr,
} from '../app/dom';
import { setHtml } from '../app/safe-html';
import { showToast } from '../app/toast';
import {
    buildSkeleton, withLoadingState,
} from '../app/loading-states';
import { navigateTo } from '../app/core';
import {
    getIdeaForEdge, getEdgeDataByIdeaId,
    putEdge, putEdgeOutcome, putEdgeMetric,
    type EdgeData,
} from '../app/adapters';
import {
    isConfidenceLevel, Idea,
} from '../../api/types';
import {
    EdgeDetailPresenter,
} from '../app/presenters';

interface EdgePageState {
    edgeData: EdgeData;
    currentIdea: Idea;
}

function buildDescriptionUpdates():
    Map<string, string> {
    const updates = new Map<string, string>();
    document.querySelectorAll<HTMLInputElement>(
        '[data-outcome-description]',
    ).forEach(descriptionInput => {
        const outcomeId = attr(
            descriptionInput,
            'data-outcome-description',
        );
        updates.set(
            outcomeId,
            descriptionInput.value,
        );
    });
    return updates;
}

function buildMetricUpdates():
    Map<string, Record<string, string>> {
    const updates =
        new Map<
            string,
            Record<string, string>
        >();
    document.querySelectorAll<HTMLInputElement>(
        '[data-metric-field]',
    ).forEach(metricInput => {
        const metricId = attr(
            metricInput, 'data-metric-id',
        );
        const field = attr(
            metricInput, 'data-metric-field',
        );
        const existing =
            updates.get(metricId) ?? {};
        updates.set(metricId, {
            ...existing,
            [field]: metricInput.value,
        });
    });
    return updates;
}

function syncFormFields(
    state: EdgePageState,
) {
    const confidenceValue =
        $select(
            '#edge-confidence-select',
            document,
        )!.value;
    const descUpdates =
        buildDescriptionUpdates();
    const metricUpdates =
        buildMetricUpdates();
    state.edgeData = {
        ...state.edgeData,
        impact: {
            shortTerm:
                $textarea(
                    '#edge-impact-short-term',
                    document,
                )!.value,
            midTerm:
                $textarea(
                    '#edge-impact-mid-term',
                    document,
                )!.value,
            longTerm:
                $textarea(
                    '#edge-impact-long-term',
                    document,
                )!.value,
        },
        confidence:
            isConfidenceLevel(confidenceValue)
                ? confidenceValue
                : state.edgeData.confidence,
        owner:
            $input(
                '#edge-owner-input', document,
            )!.value,
        outcomes:
            state.edgeData.outcomes.map(
                outcome => ({
                    ...outcome,
                    description:
                        descUpdates.get(
                            outcome.id,
                        )
                        ?? outcome.description,
                    metrics:
                        outcome.metrics.map(
                            metric => {
                                const mu =
                                    metricUpdates
                                        .get(
                                            metric
                                                .id,
                                        );
                                if (!mu) {
                                    return metric;
                                }
                                return {
                                    ...metric,
                                    ...mu,
                                };
                            },
                        ),
                }),
            ),
    };
}

function mutateEdgePage(
    ideaId: string,
    state: EdgePageState,
) {
    const container = $(
        '#edge-content', document,
    );
    if (container) {
        const presenter =
            new EdgeDetailPresenter(
                state.edgeData,
                state.currentIdea,
            );
        setHtml(
            container,
            presenter.buildDetailView(
                ideaId,
            ),
        );
        bindEdgeEvents(ideaId, state);
    }
}

function bindEdgeEvents(
    ideaId: string,
    state: EdgePageState,
) {
    $('#edge-back-btn', document)
        ?.addEventListener(
            'click',
            () => navigateTo('ideas'),
        );

    $('#edge-add-outcome', document)
        ?.addEventListener(
            'click',
            () => {
                syncFormFields(state);
                state.edgeData = {
                    ...state.edgeData,
                    outcomes: [
                        ...state.edgeData
                            .outcomes,
                        {
                            id: crypto
                                .randomUUID(),
                            description: '',
                            metrics: [],
                        },
                    ],
                };
                mutateEdgePage(
                    ideaId, state,
                );
            },
        );

    $$('[data-add-template]', document)
        .forEach(
            templateButton => {
                templateButton
                    .addEventListener(
                        'click',
                        () => {
                            syncFormFields(
                                state,
                            );
                            state.edgeData = {
                                ...state
                                    .edgeData,
                                outcomes: [
                                    ...state
                                        .edgeData
                                        .outcomes,
                                    {
                                        id: crypto
                                            .randomUUID(),
                                        description:
                                            attr(
                                                templateButton,
                                                'data-add'
                                                + '-template',
                                            ),
                                        metrics:
                                            [],
                                    },
                                ],
                            };
                            mutateEdgePage(
                                ideaId,
                                state,
                            );
                        },
                    );
            },
        );

    $$('[data-remove-outcome]', document)
        .forEach(
            removeButton => {
                removeButton
                    .addEventListener(
                        'click',
                        () => {
                            syncFormFields(
                                state,
                            );
                            const removeId =
                                removeButton
                                    .getAttribute(
                                        'data-'
                                        + 'remove'
                                        + '-outcome',
                                    );
                            state.edgeData = {
                                ...state
                                    .edgeData,
                                outcomes:
                                    state
                                        .edgeData
                                        .outcomes
                                        .filter(
                                            outcome =>
                                                outcome
                                                    .id
                                                !== removeId,
                                        ),
                            };
                            mutateEdgePage(
                                ideaId,
                                state,
                            );
                        },
                    );
            },
        );

    $$('[data-add-metric]', document)
        .forEach(
            addButton => {
                addButton
                    .addEventListener(
                        'click',
                        () => {
                            syncFormFields(
                                state,
                            );
                            const outcomeId =
                                attr(
                                    addButton,
                                    'data-add'
                                    + '-metric',
                                );
                            state.edgeData = {
                                ...state
                                    .edgeData,
                                outcomes:
                                    state
                                        .edgeData
                                        .outcomes
                                        .map(
                                    o => o.id
                                        !== outcomeId
                                        ? o
                                        : {
                                            ...o,
                                            metrics: [
                                                ...o.metrics,
                                                {
                                                    id: crypto.randomUUID(),
                                                    name: '',
                                                    target: '',
                                                    unit: '',
                                                    current: '',
                                                },
                                            ],
                                        },
                                ),
                            };
                            mutateEdgePage(
                                ideaId,
                                state,
                            );
                        },
                    );
            },
        );

    $$(
        '[data-action="remove-metric"]',
        document,
    ).forEach(
        removeButton => {
            removeButton
                .addEventListener(
                    'click',
                    () => {
                        syncFormFields(
                            state,
                        );
                        const outcomeId =
                            removeButton
                                .getAttribute(
                                    'data-'
                                    + 'outcome'
                                    + '-id',
                                );
                        const metricId =
                            removeButton
                                .getAttribute(
                                    'data-'
                                    + 'metric'
                                    + '-id',
                                );
                        state.edgeData = {
                            ...state
                                .edgeData,
                            outcomes:
                                state
                                    .edgeData
                                    .outcomes
                                    .map(
                                o => o.id
                                    !== outcomeId
                                    ? o
                                    : {
                                        ...o,
                                        metrics:
                                            o.metrics.filter(
                                                m => m.id !== metricId,
                                            ),
                                    },
                            ),
                        };
                        mutateEdgePage(
                            ideaId,
                            state,
                        );
                    },
                );
        },
    );

    const saveBtn =
        document
            .querySelector<HTMLButtonElement>(
                '#edge-save-btn',
            );
    saveBtn?.addEventListener(
        'click',
        async () => {
            syncFormFields(state);
            const presenter =
                new EdgeDetailPresenter(
                    state.edgeData,
                    state.currentIdea,
                );
            if (
                !presenter
                    .computeCompletion()
                    .isComplete
            ) {
                showToast(
                    'Please complete all'
                    + ' required fields',
                    'error',
                );
                return;
            }
            saveBtn.disabled = true;
            saveBtn.textContent =
                'Saving...';
            try {
                const edge = await putEdge(
                    ideaId,
                    {
                        confidence:
                            state.edgeData
                                .confidence,
                        impact_short_term:
                            state.edgeData
                                .impact
                                .shortTerm,
                        impact_mid_term:
                            state.edgeData
                                .impact
                                .midTerm,
                        impact_long_term:
                            state.edgeData
                                .impact
                                .longTerm,
                        status:
                            'complete',
                    },
                );
                await Promise.all(
                    state.edgeData
                        .outcomes
                        .map(
                            async outcome => {
                                await putEdgeOutcome(
                                    edge.id,
                                    outcome.id,
                                    {
                                        description:
                                            outcome
                                            .description,
                                    },
                                );
                                await Promise
                                    .all(
                                    outcome
                                        .metrics
                                        .map(
                                        metric =>
                                        putEdgeMetric(
                                            edge.id,
                                            outcome
                                                .id,
                                            metric
                                                .id,
                                            {
                                                name:
                                                    metric
                                                    .name,
                                                target:
                                                    metric
                                                    .target,
                                                unit:
                                                    metric
                                                    .unit,
                                                current:
                                                    metric
                                                    .current,
                                            },
                                        ),
                                    ),
                                );
                            },
                        ),
                );
                showToast(
                    'Edge data saved'
                    + ' successfully',
                    'success',
                );
                navigateTo(
                    'approval-detail',
                    { id: ideaId },
                );
            } catch {
                showToast(
                    'Failed to save'
                    + ' Edge data',
                    'error',
                );
                saveBtn.disabled = false;
                saveBtn.textContent =
                    'Save & Continue';
            }
        },
    );
}

export async function init(
    params?: Record<string, string>,
): Promise<void> {
    const ideaId = params?.ideaId;
    if (!ideaId) {
        navigateTo('ideas');
        return;
    }
    const container = $(
        '#edge-content', document,
    );
    if (!container) return;

    const idea = await withLoadingState(
        container,
        buildSkeleton('detail', 4),
        () => getIdeaForEdge(ideaId),
        () => init(params),
    );
    if (!idea) return;

    const saved =
        await getEdgeDataByIdeaId(ideaId);
    const edgeData: EdgeData =
        saved && saved.outcomes.length > 0
            ? {
                outcomes: saved.outcomes,
                impact: saved.impact,
                confidence:
                    saved.confidence,
                owner: saved.owner,
            }
            : {
                outcomes: [],
                impact: {
                    shortTerm: '',
                    midTerm: '',
                    longTerm: '',
                },
                confidence: 'medium',
                owner: '',
            };
    const state: EdgePageState = {
        edgeData,
        currentIdea: idea,
    };
    mutateEdgePage(ideaId, state);
}
