import type { DbAdapter } from './db.ts';
import {
    mintAccessToken,
    verifyAccessToken,
} from './access-token.ts';
import {
    generateCryptoSafeBase62,
} from './crypto-safe-base62.ts';
import {
    nowUtc,
    type Id,
    type IdentityTokenEntity,
} from './types.ts';
import { codeState } from './authorization-codes.ts';
import { planRotation } from './identity-tokens.ts';

// The OAuth 2.1 token + authorize logic, kept out of the route
// table. Each function returns a RESULT (success | failure) — an
// expected grant failure is a handled outcome, not a crash — and
// the route handler maps a failure to its HTTP status. GRANT-
// FIRST: every primitive authenticates the presented grant
// BEFORE any side effect, so a failed grant appends zero rows and
// mints nothing.

export interface TokenResponse {
    readonly access_token: string;
    readonly refresh_token: string;
    readonly token_type: 'Bearer';
    readonly expires_in: number;
}

export type TokenResult =
    | { readonly ok: true; readonly response: TokenResponse }
    | {
        readonly ok: false;
        readonly status: number;
        readonly error: string;
    };

function failure(status: number, error: string): TokenResult {
    return { ok: false, status, error };
}

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

// A token's display name = the identity's PII name when present,
// else the id (a presentation transform at the call site — a
// service identity has no PII). Never a stored default.
async function nameFor(
    adapter: DbAdapter,
    identityId: Id,
): Promise<string> {
    const all = await adapter.identityPii.getAll();
    const pii = all.find(p => p.id === identityId);
    return pii?.name ?? identityId;
}

// Mint an access + refresh JWT pair. The access token gets a
// fresh short-lived jti; the refresh token carries `refreshJti`
// (its lifecycle is tracked separately in identity_tokens).
async function mintPair(
    identityId: Id,
    name: string,
    refreshJti: string,
): Promise<TokenResponse> {
    const iat = Math.floor(Date.now() / 1000);
    const accessToken = await mintAccessToken({
        sub: identityId, roles: [], name, iat,
        ttlSeconds: ACCESS_TTL_SECONDS,
        jti: generateCryptoSafeBase62(),
    });
    const refreshToken = await mintAccessToken({
        sub: identityId, roles: [], name, iat,
        ttlSeconds: REFRESH_TTL_SECONDS, jti: refreshJti,
    });
    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TTL_SECONDS,
    };
}

// Issue a pair on a NEW chain — the refresh jti is recorded as a
// fresh chain root. Used by grants that start a session.
async function issueTokenPair(
    adapter: DbAdapter,
    identityId: Id,
    name: string,
): Promise<TokenResponse> {
    const refreshJti = generateCryptoSafeBase62();
    await adapter.identityTokens.put(
        generateCryptoSafeBase62(), {
            jti: refreshJti,
            identity_id: identityId,
            action: 'issued',
            chain_id: generateCryptoSafeBase62(),
            parent_jti: '',
            at: nowUtc(),
        });
    return mintPair(identityId, name, refreshJti);
}

async function appendEvents(
    adapter: DbAdapter,
    events: readonly Omit<IdentityTokenEntity, 'id'>[],
): Promise<void> {
    for (const event of events) {
        await adapter.identityTokens.put(
            generateCryptoSafeBase62(), event,
        );
    }
}

// refresh grant: rotate a live refresh jti (retire it, issue a
// successor in the same chain) and mint a new pair. A non-live
// jti is reuse — the whole chain is revoked, then 401. An
// invalid/unknown token mints nothing and appends nothing.
async function grantRefresh(
    adapter: DbAdapter,
    body: Record<string, unknown>,
): Promise<TokenResult> {
    const token = typeof body.refresh_token === 'string'
        ? body.refresh_token
        : '';
    const now = Math.floor(Date.now() / 1000);
    const verified = await verifyAccessToken(token, now);
    if (!verified.valid) {
        return failure(
            401, 'invalid refresh token: ' + verified.reason,
        );
    }
    const rows = await adapter.identityTokens.getAll();
    const plan = planRotation(
        rows, verified.claims.jti,
        generateCryptoSafeBase62(), nowUtc(),
    );
    if (plan.kind === 'rotate') {
        await appendEvents(adapter, plan.appends);
        const name = await nameFor(adapter, verified.claims.sub);
        return {
            ok: true,
            response: await mintPair(
                verified.claims.sub, name, plan.newJti,
            ),
        };
    }
    if (plan.kind === 'replay') {
        await appendEvents(adapter, plan.appends);
    }
    return failure(401, 'refresh token reuse or unknown');
}

// authorization_code grant: consume an ISSUED code, then issue a
// token pair. A consumed (replay) or unknown code is a clean 401
// that mints nothing and appends nothing (grant-first).
async function grantAuthorizationCode(
    adapter: DbAdapter,
    body: Record<string, unknown>,
): Promise<TokenResult> {
    const code = typeof body.code === 'string'
        ? body.code
        : '';
    const rows = await adapter.authorizationCodes.getAll();
    const state = codeState(rows, code);
    if (state === null || state.status !== 'issued') {
        return failure(
            401, 'invalid or used authorization code',
        );
    }
    await adapter.authorizationCodes.put(
        generateCryptoSafeBase62(), {
            code,
            identity_id: state.identityId,
            client_id: state.clientId,
            status: 'consumed',
            at: nowUtc(),
        });
    const name = await nameFor(adapter, state.identityId);
    return {
        ok: true,
        response: await issueTokenPair(
            adapter, state.identityId, name,
        ),
    };
}

// Dispatch on grant_type. Single-grant primitives are added one
// per commit; an unsupported grant is a clean 400 with no side
// effects.
export async function postToken(
    adapter: DbAdapter,
    body: Record<string, unknown>,
): Promise<TokenResult> {
    const grantType = typeof body.grant_type === 'string'
        ? body.grant_type
        : '';
    switch (grantType) {
        case 'authorization_code':
            return grantAuthorizationCode(adapter, body);
        case 'refresh':
            return grantRefresh(adapter, body);
        default:
            return failure(
                400, 'unsupported grant_type: ' + grantType,
            );
    }
}
