import { log } from './logger.ts';
import { showToast } from './toast.ts';

// The human-readable message of a thrown value: an Error's
// `message`, else the optional `fallback`, else String(value).
// The lone home of the `instanceof Error` extraction the web-app
// layer repeats. A sibling copy lives in api/ so neither imports
// across the boundary — the api tier stays standalone.
export function extractErrorMessage(
    err: unknown,
    fallback?: string,
): string {
    if (err instanceof Error) return err.message;
    return fallback ?? String(err);
}

// The surfacing floor under every fault no caller handles:
// uncaught errors and unhandled rejections log AND toast, so a
// failed fire-and-forget handler degrades visibly instead of
// vanishing to the console while the UI proceeds.
export function initErrorSurfacing(): void {
    window.addEventListener('error', (event) => {
        const fault = event.error ?? event.message;
        log.error('uncaught error', 'core', fault);
        showToast(extractErrorMessage(fault), 'error');
    });
    window.addEventListener(
        'unhandledrejection',
        (event) => {
            log.error(
                'unhandled rejection', 'core', event.reason,
            );
            showToast(
                extractErrorMessage(event.reason), 'error',
            );
        },
    );
}
