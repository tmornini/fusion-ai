// The page's AbortController paired with its signal. A page
// module passes the signal to every addEventListener so a single
// pageAbort.abort() on teardown removes them all at once. The
// pair the page modules otherwise hand-roll identically.
export function createPageAbort(): {
    pageAbort: AbortController;
    signal: AbortSignal;
} {
    const pageAbort = new AbortController();
    return { pageAbort, signal: pageAbort.signal };
}
