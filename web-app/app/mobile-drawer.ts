import { $, FOCUSABLE_SELECTOR } from './dom';

export function initMobileDrawer(
): void {
    const sheet =
        $('#mobile-sheet', document);
    const backdrop = $(
        '#mobile-sheet-backdrop',
        document,
    );
    let drawerPreviousFocus:
        HTMLElement | null = null;

    function openDrawer(): void {
        drawerPreviousFocus =
            document.activeElement
                instanceof HTMLElement
                ? document.activeElement
                : null;
        sheet?.classList.remove('hidden');
        backdrop?.classList.remove(
            'hidden',
        );
        const firstFocusable =
            sheet
                ?.querySelector<
                    HTMLElement
                >(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();
    }

    function closeDrawer(): void {
        sheet?.classList.add('hidden');
        backdrop?.classList.add('hidden');
        drawerPreviousFocus?.focus();
        drawerPreviousFocus = null;
    }

    $(
        '#mobile-sidebar-open', document,
    )?.addEventListener(
        'click',
        openDrawer,
    );
    backdrop?.addEventListener(
        'click',
        closeDrawer,
    );

    document.addEventListener(
        'keydown',
        (e) => {
            if (e.key !== 'Escape')
                return;
            if (
                sheet
                && !sheet.classList
                    .contains('hidden')
            ) {
                closeDrawer();
            }
        },
    );

    sheet?.addEventListener(
        'keydown',
        (e) => {
            if (e.key !== 'Tab') return;
            const focusable =
                sheet
                    .querySelectorAll<
                        HTMLElement
                    >(FOCUSABLE_SELECTOR);
            if (focusable.length === 0)
                return;
            const first =
                focusable[0]!;
            const last = focusable[
                focusable.length - 1
            ]!;
            if (
                e.shiftKey
                && document
                    .activeElement
                    === first
            ) {
                e.preventDefault();
                last.focus();
            } else if (
                !e.shiftKey
                && document
                    .activeElement
                    === last
            ) {
                e.preventDefault();
                first.focus();
            }
        },
    );

    $(
        '#mobile-search-toggle',
        document,
    )?.addEventListener(
        'click',
        () => {
            $(
                '#mobile-search-bar',
                document,
            )?.classList.remove(
                'hidden',
            );
        },
    );
    $(
        '#mobile-search-close',
        document,
    )?.addEventListener(
        'click',
        () => {
            $(
                '#mobile-search-bar',
                document,
            )?.classList.add('hidden');
        },
    );
}
