import type {
    IdentityTokenAction,
    IdentityTokenEntity,
} from './types.ts';

// Pure reductions over the append-only identity_tokens ledger.
// The store is a dumb log; current validity is derived here.

// The latest lifecycle action for a jti, or null if it has no
// events. RFC-3339 zulu `at` sorts lexically = chronologically;
// a same-instant tie keeps the LATER-APPENDED event (>=) — the
// secure direction, so a revoke beats a co-timestamped issue.
export function latestActionForJti(
    rows: readonly IdentityTokenEntity[],
    jti: string,
): IdentityTokenAction | null {
    let latest:
        { action: IdentityTokenAction; at: string } | null
        = null;
    for (const row of rows) {
        if (row.jti !== jti) continue;
        if (latest === null || row.at >= latest.at) {
            latest = { action: row.action, at: row.at };
        }
    }
    return latest === null ? null : latest.action;
}

// The chain_id a jti belongs to (null if unknown). Every event
// for a jti carries the same chain_id, so the first match wins.
export function chainIdForJti(
    rows: readonly IdentityTokenEntity[],
    jti: string,
): string | null {
    for (const row of rows) {
        if (row.jti === jti) return row.chain_id;
    }
    return null;
}

// Every distinct jti that has ever appeared in a chain — the
// set a chain-wide revocation must mark revoked.
export function jtisInChain(
    rows: readonly IdentityTokenEntity[],
    chainId: string,
): string[] {
    const seen = new Set<string>();
    for (const row of rows) {
        if (row.chain_id === chainId) seen.add(row.jti);
    }
    return [...seen];
}

// The gate's check: a presented token is denied iff its jti's
// latest action is 'revoked'. Unknown jtis (session / dev tokens
// never recorded here) and live ('issued') tokens pass; coarse
// log-out-everywhere is the SEPARATE identity_token_revocations
// ledger.
export function isTokenRevoked(
    rows: readonly IdentityTokenEntity[],
    jti: string,
): boolean {
    return latestActionForJti(rows, jti) === 'revoked';
}
