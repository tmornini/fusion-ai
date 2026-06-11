import type { DbAdapter } from './db.ts';
import {
    generateCryptoSafeBase62,
} from './crypto-safe-base62.ts';

// The server half of the request vessel (Office of the
// Context): one context enters at the gate and rides the
// pipeline, and each field is set exactly once, at the step
// that resolves it. This module owns the entry stage; the
// authentication and fence steps enrich it downstream. The
// vessel is loggable BY COVENANT — it never carries the
// bearer token; authentication reads the header from the raw
// Request and the secret stays there. Route handlers keep
// their (adapter, params, body) contract: the route table is
// the chosen boundary where the vessel hands the fenced
// adapter to the handler.

// The request id travels the whole hop chain: the facade
// rewrite re-enters handleRequest with this header so the
// inner hop keeps the outer request's id — one user request,
// one trace.
export const REQUEST_ID_HEADER = 'x-request-id';

export interface IncomingContext {
    readonly requestId: string;
    readonly method: string;
    readonly pathname: string;
    readonly base: DbAdapter;
}

export function incomingContext(
    base: DbAdapter,
    request: Request,
): IncomingContext {
    return {
        requestId:
            request.headers.get(REQUEST_ID_HEADER)
                ?? generateCryptoSafeBase62(),
        method: request.method,
        pathname: new URL(request.url).pathname,
        base,
    };
}
