import { $, $$, getRequiredAttribute } from '../app/dom.ts';
import { setHtml } from '../app/safe-html.ts';
import {
    buildSkeleton, buildErrorState,
} from '../app/loading-states.ts';
import { log } from '../app/logger.ts';
import {
    navigateTo,
} from '../app/core.ts';
import {
    getOrganization,
    getCompany,
    createFetchContext,
} from '../app/adapters/index.ts';
import {
    OrganizationPresenter,
} from '../app/presenters/index.ts';

export async function init(): Promise<void> {
    const container =
        $('#organization-content', document);
    if (!container) return;

    setHtml(
        container,
        buildSkeleton('detail', 4),
    );

    const ctx = createFetchContext();
    let presenter: OrganizationPresenter;
    try {
        const [org, company] = await Promise.all([
            getOrganization(ctx),
            getCompany(ctx),
        ]);
        presenter =
            new OrganizationPresenter(
                org,
                company.nameText(),
            );
    } catch (err) {
        log.error(
            'getOrganization failed',
            'organization',
            err,
        );
        setHtml(
            container,
            buildErrorState(
                'Failed to load'
                + ' organization data.',
                'Try Again',
            ),
        );
        container
            .querySelector(
                '[data-retry-btn]',
            )
            ?.addEventListener(
                'click', () => init(),
            );
        return;
    }
    setHtml(
        container,
        presenter.buildPage(),
    );

    $$('[data-nav-to]', document).forEach(
        navButton => {
            navButton.addEventListener(
                'click',
                () => navigateTo(
                    getRequiredAttribute(
                        navButton,
                        'data-nav-to',
                    ),
                ),
            );
        },
    );
}
