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
    iconLayoutGrid,
    iconBarChart,
    iconFolderKanban,
} from '../app/icons';
import { navigateTo } from '../app/core';
import { getProjects } from '../app/adapters';
import {
    ProjectPresenter,
} from '../app/presenters';

export async function init(): Promise<void> {
    const listContainer =
        $('#projects-list', document);
    if (!listContainer) return;

    const result = await withLoadingState(
        listContainer,
        buildSkeleton('card-list', 4),
        getProjects,
        init,
        {
            icon: iconFolderKanban(24, ''),
            title: 'No Projects Yet',
            description:
                'Convert approved ideas'
                + ' into projects to start'
                + ' tracking progress.',
            action: {
                label: 'View Ideas',
                href:
                    '../ideas/index.html',
            },
        },
    );
    if (!result) return;
    const projects = result.map(
        p => new ProjectPresenter(p),
    );

    let currentView:
        | 'priority'
        | 'performance' = 'priority';

    populateIcons([
        [
            '#priority-view-icon',
            iconLayoutGrid(16, ''),
        ],
        [
            '#performance-view-icon',
            iconBarChart(16, ''),
        ],
    ]);

    const statusGroups = Object.groupBy(
        projects,
        p => p.statusGroup(),
    );
    const badgesEl = $(
        '#status-badges', document,
    );
    if (badgesEl) {
        const badgeFragments =
            Object.values(statusGroups)
                .filter(
                    items =>
                        items
                        && items.length > 0,
                )
                .map(items => {
                    const first = items![0]!;
                    return html`${
                        first.buildStatusBadge()
                    }`;
                });
        setHtml(
            badgesEl,
            html`${badgeFragments}`,
        );
    }

    function mutateList(): void {
        const container =
            $('#projects-list', document);
        const sorted = [...projects].sort(
            (a, b) =>
                currentView === 'priority'
                    ? a.prioritySortKey()
                        - b.prioritySortKey()
                    : b.scoreSortKey()
                        - a.scoreSortKey(),
        );
        if (container) {
            setHtml(
                container,
                html`${sorted.map(
                    p => p.buildCard(
                        currentView,
                    ),
                )}`,
            );
        }
        const info = $('#projects-info', document);
        if (info) {
            info.textContent =
                projects.length
                + ' '
                + (projects.length === 1
                    ? 'project'
                    : 'projects')
                + ' \u2022 '
                + (currentView === 'priority'
                    ? 'by priority'
                    : 'by score');
        }
    }

    listContainer.addEventListener(
        'click',
        (e) => {
            if (
                !(e.target instanceof Element)
            ) return;
            const viewBtn =
                e.target
                    .closest<HTMLElement>(
                        '[data-view-project]',
                    );
            if (viewBtn) {
                e.stopPropagation();
                navigateTo(
                    'project-detail',
                    {
                        projectId: attr(
                            viewBtn,
                            'data-view-project',
                        ),
                    },
                );
                return;
            }
            const card =
                e.target
                    .closest<HTMLElement>(
                        '[data-project-card]',
                    );
            if (card)
                navigateTo(
                    'project-detail',
                    {
                        projectId: attr(
                            card,
                            'data-project-card',
                        ),
                    },
                );
        },
    );

    initToggleGroup(
        '.view-toggle-btn',
        'data-view',
        (view) => {
            currentView = view as
                | 'priority'
                | 'performance';
            mutateList();
        },
    );

    mutateList();
}
