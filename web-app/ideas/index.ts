import {
    $,
    attr,
    populateIcons,
    initToggleGroup,
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
    iconPlus,
    iconWand,
    iconLayoutGrid,
    iconBarChart,
    iconClipboardCheck,
    iconChevronRight,
    iconLightbulb,
} from '../app/icons';
import {
    navigateTo,
} from '../app/core';
import { getIdeas } from '../app/adapters';
import {
    IdeaPresenter,
} from '../app/presenters';

export async function init(): Promise<void> {
    const listContainer = $('#ideas-list', document);
    if (!listContainer) return;

    const result = await withLoadingState(
        listContainer,
        buildSkeleton('card-list', 4),
        getIdeas,
        init,
        {
            icon: iconLightbulb(24, ''),
            title: 'No Ideas Yet',
            description:
                'Start innovating by'
                + ' creating'
                + ' your first idea.',
            action: {
                label: html`${iconPlus(16, '')}
                    Create Your First Idea
                    ${iconWand(16, '')}`,
                href:
                    'create.html',
            },
            onEmpty: () => {
                $(
                    '#create-idea-btn', document,
                )?.remove();
            },
        },
    );
    if (!result) return;
    const ideas = result.map(
        idea => new IdeaPresenter(idea),
    );

    let currentView = 'priority';

    populateIcons([
        ['#create-btn-icon', iconPlus(16, '')],
        [
            '#create-btn-accent',
            iconWand(16, ''),
        ],
        [
            '#priority-view-icon',
            iconLayoutGrid(16, ''),
        ],
        [
            '#performance-view-icon',
            iconBarChart(16, ''),
        ],
    ]);

    const flowEl = $('#flow-indicator', document);
    if (flowEl) {
        setHtml(flowEl, html`
        ${iconLightbulb(16, 'text-primary')}
        <span class="text-sm text-muted"
            style="white-space:nowrap">
            <span class="font-medium"
                style="color:hsl(
                    var(--foreground))">
                Idea Flow:
            </span>
            Create &rarr;
            <span
                class="${
                    'text-primary font-medium'
                }">
                Edge
            </span>
            &rarr; Review &rarr; Convert
        </span>
        ${iconChevronRight(
            16, 'text-muted',
        )}`);
    }

    const pendingReviewCount = ideas
        .filter(
            idea => idea.isInReview(),
        ).length;
    const reviewBtnEl = $(
        '#review-queue-btn', document,
    );
    if (reviewBtnEl
        && pendingReviewCount > 0) {
        setHtml(reviewBtnEl, html`
        <button
            class="btn btn-outline gap-2"
            style="border-color:hsl(
                var(--warning)/0.3);
                color:hsl(var(--warning))"
            id="review-queue-nav">
            ${iconClipboardCheck(16, '')}
            <span class="hidden-mobile">
                Review Queue
            </span> (${pendingReviewCount})
        </button>`);
        $('#review-queue-nav', document)
            ?.addEventListener(
                'click',
                () => navigateTo(
                    'idea-review-queue',
                ),
            );
    }

    $('#create-idea-btn', document)
        ?.addEventListener(
            'click',
            () => navigateTo(
                'idea-create',
            ),
        );

    function mutateList() {
        const sorted =
            currentView === 'priority'
                ? [...ideas].sort(
                    (a, b) =>
                        a.prioritySortKey()
                        - b.prioritySortKey(),
                )
                : [...ideas].sort(
                    (a, b) =>
                        b.scoreSortKey()
                        - a.scoreSortKey(),
                );

        const list = $(
            '#ideas-list', document,
        );
        if (list)
            setHtml(list, html`${sorted.map(
                idea => idea.buildCard(
                    currentView,
                ),
            )}`);

        const count = $('#ideas-count', document);
        if (count)
            count.textContent =
                `${sorted.length} `
                + `${sorted.length === 1
                    ? 'idea' : 'ideas'}`
                + ` \u2022 ${currentView
                    === 'priority'
                    ? 'by priority'
                    : 'by score'}`;
    }

    initToggleGroup(
        '.view-toggle-btn',
        'data-view',
        (view) => {
            currentView = view;
            mutateList();
        },
    );

    $('#ideas-list', document)?.addEventListener(
        'click',
        (e) => {
            if (
                !(e.target
                    instanceof Element)
            ) return;
            const actionButton =
                e.target
                    .closest<HTMLElement>(
                    '[data-idea-view],'
                    + ' [data-idea-edge],'
                    + ' [data-idea-review],'
                    + ' [data-idea-convert]',
                );
            if (actionButton) {
                if (
                    actionButton
                        .hasAttribute(
                        'data-idea-view',
                    )
                )
                    navigateTo(
                        'idea-detail',
                        {
                            ideaId: attr(
                                actionButton,
                                'data-idea-view',
                            ),
                        },
                    );
                else if (
                    actionButton
                        .hasAttribute(
                        'data-idea-edge',
                    )
                )
                    navigateTo('edge-detail', {
                        ideaId: attr(
                            actionButton,
                            'data-idea-edge',
                        ),
                    });
                else if (
                    actionButton
                        .hasAttribute(
                        'data-idea-review',
                    )
                )
                    navigateTo(
                        'approval-detail',
                        {
                            id: attr(
                                actionButton,
                                'data-idea-review',
                            ),
                        },
                    );
                else if (
                    actionButton
                        .hasAttribute(
                        'data-idea-convert',
                    )
                )
                    navigateTo(
                        'idea-convert',
                        {
                            ideaId: attr(
                                actionButton,
                                'data-idea-convert',
                            ),
                        },
                    );
                return;
            }
            const card =
                e.target
                    .closest<HTMLElement>(
                        '[data-idea-card]',
                    );
            if (card)
                navigateTo(
                    'idea-detail',
                    {
                        ideaId: attr(
                            card,
                            'data-idea-card',
                        ),
                    },
                );
        },
    );

    mutateList();
}
