import {
    setSidebarCollapsed
        as persistSidebarCollapsed,
} from './state';
import { $required } from './dom';
import {
    initActiveNavItem,
} from './nav-highlight';
import {
    mutateThemeToggleIcon,
    initThemeAndDropdowns,
} from './theme-toggle';
import {
    mutateSidebarUser,
} from './sidebar-user';
import {
    initMobileDrawer,
} from './mobile-drawer';
import {
    mutateHeaderInfo,
} from './header-info';

function initSidebar(): void {
    function setSidebarCollapsed(
        collapsed: boolean,
    ): void {
        document.documentElement
            .classList.toggle(
                'sidebar-collapsed',
                collapsed,
            );
        persistSidebarCollapsed(collapsed);
    }

    $required(
        '#sidebar-collapse', document,
    ).addEventListener(
        'click',
        () => setSidebarCollapsed(true),
    );
    $required(
        '#sidebar-expand', document,
    ).addEventListener(
        'click',
        () => setSidebarCollapsed(false),
    );
}

async function initSidebarLayout(
): Promise<void> {
    initActiveNavItem();
    initSidebar();
    initThemeAndDropdowns();
    initMobileDrawer();
    mutateThemeToggleIcon();
    await Promise.all([
        mutateSidebarUser(),
        mutateHeaderInfo(),
    ]);
}

export { initSidebarLayout };
