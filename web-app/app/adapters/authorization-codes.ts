import {
    generateCryptoSafeBase62,
} from '../../../api/crypto-safe-base62.ts';
import {
    nowUtc,
    type Id,
    type AuthorizationCodeStatus,
    type AuthorizationCodeEntity,
} from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';

async function appendCodeEvent(
    ctx: RequestContext,
    code: string,
    identityId: Id,
    clientId: Id,
    status: AuthorizationCodeStatus,
): Promise<void> {
    const id = generateCryptoSafeBase62();
    await ctx.PUT(`authorization-codes/${id}`, {
        code,
        identity_id: identityId,
        client_id: clientId,
        status,
        at: nowUtc(),
    });
}

// Issue a fresh opaque authorization code bound to (identity,
// client). Returns the code so the caller can hand it to the
// browser for the token exchange.
export async function postCodeIssue(
    ctx: RequestContext,
    identityId: Id,
    clientId: Id,
): Promise<string> {
    const code = generateCryptoSafeBase62();
    await appendCodeEvent(
        ctx, code, identityId, clientId, 'issued',
    );
    return code;
}

export async function postCodeConsumption(
    ctx: RequestContext,
    code: string,
    identityId: Id,
    clientId: Id,
): Promise<void> {
    await appendCodeEvent(
        ctx, code, identityId, clientId, 'consumed',
    );
}

export interface CodeState {
    readonly status: AuthorizationCodeStatus;
    readonly identityId: Id;
    readonly clientId: Id;
}

// The current state of an authorization code (null if unknown):
// the latest status for the code, plus the (identity, client)
// it was issued to. RFC-3339 zulu `at` orders the events; a
// same-instant tie keeps the later-appended row (>=).
export async function getCodeState(
    ctx: RequestContext,
    code: string,
): Promise<CodeState | null> {
    const all = await ctx.GET<AuthorizationCodeEntity[]>(
        'authorization-codes',
    );
    const forCode = all.filter(r => r.code === code);
    const first = forCode[0];
    if (first === undefined) return null;
    let latest = first;
    for (const r of forCode) {
        if (r.at >= latest.at) latest = r;
    }
    return {
        status: latest.status,
        identityId: first.identity_id,
        clientId: first.client_id,
    };
}
