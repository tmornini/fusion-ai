import { $, $$, $textarea } from '../app/dom';
import { setHtml } from '../app/safe-html';
import { navigateTo } from '../app/core';
import { buildErrorState } from '../app/loading-states';
import {
    getCrunchColumns, type CrunchColumn,
} from '../app/adapters';
import {
    CrunchPresenter,
} from '../app/presenters';

type CrunchStep = 'upload' | 'label' | 'review';

interface CrunchState {
    step: CrunchStep;
    columns: CrunchColumn[];
    expandedColumnId: string | null;
    businessContext: string;
    mockColumns: CrunchColumn[];
}

export async function init(): Promise<void> {
    const container =
        $('#crunch-content', document);
    if (!container) return;

    const state: CrunchState = {
        step: 'upload',
        columns: [],
        expandedColumnId: null,
        businessContext: '',
        mockColumns: [],
    };

    function syncFormFields(): void {
        document.querySelectorAll<
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement
        >(
            '[data-column-id]'
            + '[data-field-name]',
        ).forEach(el => {
            const columnId =
                el.getAttribute(
                    'data-column-id',
                );
            const field =
                el.getAttribute(
                    'data-field-name',
                );
            const column =
                state.columns.find(
                    candidate =>
                        candidate.id
                            === columnId,
                );
            if (column && field) {
                const columnKey =
                    field as
                        keyof CrunchColumn;
                if (
                    columnKey
                        === 'friendlyName'
                    || columnKey
                        === 'description'
                    || columnKey
                        === 'dataType'
                    || columnKey
                        === 'acronymExpansion'
                ) {
                    column[columnKey] =
                        el.value;
                } else if (
                    columnKey === 'isAcronym'
                ) {
                    column[columnKey] =
                        el.value === 'true';
                }
            }
        });
        const contextField =
            $textarea(
                '#crunch-context', document,
            );
        if (contextField) {
            state.businessContext =
                contextField.value;
        }
    }

    function mutateCrunchPage(): void {
        const root =
            $(
                '#crunch-content',
                document,
            );
        if (!root) return;
        const presenter =
            new CrunchPresenter(state);
        setHtml(
            root,
            presenter.buildPage(),
        );
        bindCrunchEvents();
    }

    function bindCrunchEvents(): void {
        if (state.step === 'upload') {
            const dropzone =
                $(
                    '#crunch-dropzone',
                    document,
                );
            dropzone?.addEventListener(
                'click',
                () => {
                    state.columns =
                        state.mockColumns
                            .map(
                                c => ({
                                    ...c,
                                }),
                            );
                    state.step = 'label';
                    mutateCrunchPage();
                },
            );
        }

        if (state.step === 'label') {
            $$(
                '[data-column-toggle]',
                document,
            ).forEach(el => {
                el.addEventListener(
                    'click',
                    () => {
                        syncFormFields();
                        const id =
                            el.getAttribute(
                                'data-column'
                                + '-toggle',
                            );
                        state
                            .expandedColumnId =
                            state
                                .expandedColumnId
                                === id
                                ? null
                                : id;
                        mutateCrunchPage();
                    },
                );
            });

            $$(
                '[data-column-id]'
                + '[data-field-name]',
                document,
            ).forEach(el => {
                el.addEventListener(
                    'input',
                    () => {
                        syncFormFields();
                        const reviewBtn =
                            $(
                                '#crunch-to'
                                + '-review',
                                document,
                            );
                        const presenter =
                            new CrunchPresenter(
                                state,
                            );
                        if (
                            reviewBtn
                            instanceof
                            HTMLButtonElement
                        ) {
                            reviewBtn
                                .disabled =
                                presenter
                                .completionPercent()
                                < 100;
                        }
                    },
                );
            });

            $(
                '#crunch-back-upload',
                document,
            )?.addEventListener(
                'click',
                () => {
                    state.step =
                        'upload';
                    state.columns = [];
                    mutateCrunchPage();
                },
            );
            $(
                '#crunch-to-review',
                document,
            )?.addEventListener(
                'click',
                () => {
                    syncFormFields();
                    state.step =
                        'review';
                    mutateCrunchPage();
                },
            );
        }

        if (state.step === 'review') {
            $(
                '#crunch-edit-labels',
                document,
            )?.addEventListener(
                'click',
                () => {
                    state.step =
                        'label';
                    mutateCrunchPage();
                },
            );
            $(
                '#crunch-to-dashboard',
                document,
            )?.addEventListener(
                'click',
                () => navigateTo(
                    'dashboard',
                ),
            );
        }
    }

    try {
        state.mockColumns =
            await getCrunchColumns();
        mutateCrunchPage();
    } catch {
        setHtml(
            container,
            buildErrorState(
                'Failed to load'
                + ' Crunch data.',
                'Try Again',
            ),
        );
        container
            .querySelector(
                '[data-retry-btn]',
            )
            ?.addEventListener(
                'click',
                () => init(),
            );
    }
}
