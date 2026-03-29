import {
    $,
    $input,
    $select,
    attr,
    populateIcons,
} from '../app/dom';
import {
    html,
    setHtml,
} from '../app/safe-html';
import {
    buildSkeleton,
    withLoadingState,
} from '../app/loading-states';
import {
    iconTarget,
    iconSearch,
    iconCheckCircle2,
    iconClock,
    iconAlertCircle,
} from '../app/icons';
import { navigateTo } from '../app/core';
import { getEdgeList } from '../app/adapters';
import {
    EdgePresenter,
} from '../app/presenters';

export async function init(): Promise<void> {
    const listEl = $('#edge-list', document);
    if (!listEl) return;

    const result = await withLoadingState(
        listEl,
        buildSkeleton('card-list', 4),
        getEdgeList,
        init,
        {
            icon: iconTarget(24, ''),
            title: 'No Edge Definitions',
            description:
                'Create Edge definitions'
                + ' for your ideas to track'
                + ' outcomes and metrics.',
            action: {
                label: 'View Ideas',
                href: '../ideas/index.html',
            },
        },
    );
    if (!result) return;
    const edges = result.map(
        e => new EdgePresenter(e),
    );

    populateIcons([
        [
            '#page-badge',
            html`${
                iconTarget(14, '')
            } Business Case Definition`,
        ],
        [
            '#search-field-icon',
            iconSearch(16, ''),
        ],
    ]);
    $('#page-badge', document)?.classList
        .remove('hidden');
    const stats = {
        total: edges.length,
        complete: edges.filter(
            e => e.isComplete(),
        ).length,
        draft: edges.filter(
            e => e.isDraft(),
        ).length,
        missing: edges.filter(
            e => e.isMissing(),
        ).length,
    };
    const statsEl = $('#edge-stats', document);
    if (statsEl) {
        setHtml(statsEl, html`
            <div class="card p-4">
                <div class="${
                    'flex items-center '
                    + 'gap-3'
                }">
                    <div class="${
                        'p-2 rounded-lg'
                    }"
                        style="${
                            'background:'
                            + 'hsl(var('
                            + '--primary)'
                            + '/0.1)'
                        }">${
                        iconTarget(
                            20,
                            'text-primary',
                        )
                    }</div>
                    <div>
                        <p class="${
                            'text-2xl '
                            + 'font-bold'
                        }">${
                            stats.total
                        }</p>
                        <p class="${
                            'text-sm '
                            + 'text-muted'
                        }">Total Ideas</p>
                    </div>
                </div>
            </div>
            <div class="card p-4">
                <div class="${
                    'flex items-center '
                    + 'gap-3'
                }">
                    <div class="${
                        'p-2 rounded-lg'
                    }"
                        style="${
                            'background:'
                            + 'hsl(var('
                            + '--success-soft))'
                        }">${
                        iconCheckCircle2(
                            20,
                            'text-success',
                        )
                    }</div>
                    <div>
                        <p class="${
                            'text-2xl '
                            + 'font-bold'
                        }">${
                            stats.complete
                        }</p>
                        <p class="${
                            'text-sm '
                            + 'text-muted'
                        }">Complete</p>
                    </div>
                </div>
            </div>
            <div class="card p-4">
                <div class="${
                    'flex items-center '
                    + 'gap-3'
                }">
                    <div class="${
                        'p-2 rounded-lg'
                    }"
                        style="${
                            'background:'
                            + 'hsl(var('
                            + '--warning-soft))'
                        }">${
                        iconClock(
                            20,
                            'text-warning',
                        )
                    }</div>
                    <div>
                        <p class="${
                            'text-2xl '
                            + 'font-bold'
                        }">${
                            stats.draft
                        }</p>
                        <p class="${
                            'text-sm '
                            + 'text-muted'
                        }">In Draft</p>
                    </div>
                </div>
            </div>
            <div class="card p-4">
                <div class="${
                    'flex items-center '
                    + 'gap-3'
                }">
                    <div class="${
                        'p-2 rounded-lg'
                    }"
                        style="${
                            'background:'
                            + 'hsl(var('
                            + '--error-soft))'
                        }">${
                        iconAlertCircle(
                            20,
                            'text-error',
                        )
                    }</div>
                    <div>
                        <p class="${
                            'text-2xl '
                            + 'font-bold'
                        }">${
                            stats.missing
                        }</p>
                        <p class="${
                            'text-sm '
                            + 'text-muted'
                        }">Missing</p>
                    </div>
                </div>
            </div>`);
    }

    const emptyEl = $('#edge-empty', document);
    if (emptyEl)
        setHtml(emptyEl, html`${
            iconTarget(48, 'text-muted')
        }<h3
class="${
    'text-lg font-semibold mt-4 mb-2'
}">No Edge definitions found</h3>
<p class="text-muted"
>Try adjusting your search or filter
criteria</p>`);

    function mutateFilteredList() {
        const search =
            $input('#edge-search', document)!
                .value.toLowerCase();
        const status =
            $select(
                '#edge-status-filter',
                document,
            )!.value;
        const filtered = edges.filter(
            e => e.matchesFilter(
                search, status,
            ),
        );
        const list = $(
            '#edge-list', document,
        );
        const empty = $(
            '#edge-empty', document,
        );
        if (list)
            setHtml(
                list,
                html`${filtered.map(
                    e => e.buildCard(),
                )}`,
            );
        if (list)
            list.style.display =
                filtered.length ? '' : 'none';
        if (empty)
            empty.style.display =
                filtered.length
                    ? 'none' : '';
    }

    listEl?.addEventListener(
        'click',
        (e) => {
            if (
                !(e.target instanceof Element)
            ) return;
            const card =
                e.target
                    .closest<HTMLElement>(
                        '[data-edge-card]',
                    );
            if (card)
                navigateTo('edge-detail', {
                    ideaId: attr(
                        card,
                        'data-edge-card',
                    ),
                });
        },
    );

    $('#edge-search', document)
        ?.addEventListener(
            'input',
            mutateFilteredList,
        );
    $('#edge-status-filter', document)
        ?.addEventListener(
            'change',
            mutateFilteredList,
        );
    mutateFilteredList();
}
