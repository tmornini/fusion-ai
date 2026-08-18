import type { DbAdapter } from './db.ts';
import type { Id } from './types.ts';
import {
    appendMessagePair,
    type MessagePair,
} from './message-pair.ts';
import {
    currentDefaultOrganizationFor,
} from './authorization.ts';
import {
    ApiError,
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_NOT_FOUND,
} from './http-errors.ts';
import {
    authenticateRequest,
    unauthorizedBearerResponse,
    callerOrganizationIds,
} from './request-auth.ts';
import {
    type IncomingContext,
    type AuthenticatedContext,
} from './request-context.ts';
import { param } from './document-family.ts';
import { deriveOrganizations } from './derive-organizations.ts';
import {
    deriveDefaultOrganization,
} from './derive-default-organization.ts';
import { membershipExistsFor } from './derive-memberships.ts';

// GET /organizations — the caller's reachable orgs, derived
// fresh from the membership ledger (never the token claim, so
// it cannot be stale). The authoritative source the embedded
// `orgs` claim is a snapshot of. The row list itself is now the
// PAIR-PLANE derivation (Phase 12 Task 5) — tests/drift-
// organizations.test.ts leg 1 pins this function's own output
// byte-identical to the row-plane read it replaces; the
// membership filter below is UNTOUCHED — this flip is the row
// SOURCE only, never the fence.
async function enumerateMyOrganizations(
    ctx: AuthenticatedContext,
): Promise<Response> {
    const mine =
        await callerOrganizationIds(ctx.base, ctx.principal);
    const organizations = await deriveOrganizations(ctx.base);
    return Response.json(
        organizations.filter(o => mine.has(o.id)),
    );
}

// PUT/GET /identities/:id/default-organization — a simple
// document. Authorized by tree ownership (caller === :id).
// PUT { organization_id } must name a live seat, else 400
// and nothing is stored. GET returns that document or 404
// if never SET. No public DELETE. Revoke does not rewrite
// this document. Self-only stays here: admin-everywhere
// on `/` is not a substitute.
export async function getIdentityDefaultOrganization(
    db: DbAdapter,
    p: string[],
    actor: Id,
): Promise<{ organization_id: string }> {
    const identityId = param(p, 0);
    if (actor !== identityId) {
        throw new ApiError(
            'forbidden: an identity may act only'
                + ' within its own tree',
            HTTP_FORBIDDEN,
        );
    }
    const rows = await deriveDefaultOrganization(
        db, identityId,
    );
    const set = currentDefaultOrganizationFor(
        rows, identityId,
    );
    if (set === null) {
        throw new ApiError('not found', HTTP_NOT_FOUND);
    }
    return { organization_id: set };
}

export async function putIdentityDefaultOrganization(
    db: DbAdapter,
    p: string[],
    payload: Record<string, unknown>,
    actor: Id,
    pair: MessagePair | undefined,
): Promise<void> {
    const identityId = param(p, 0);
    if (actor !== identityId) {
        throw new ApiError(
            'forbidden: an identity may act only'
                + ' within its own tree',
            HTTP_FORBIDDEN,
        );
    }
    const organization = payload.organization_id;
    if (typeof organization !== 'string') {
        throw new ApiError(
            'organization_id is required',
            HTTP_BAD_REQUEST,
        );
    }
    if (
        !await membershipExistsFor(
            db, organization, identityId,
        )
    ) {
        throw new ApiError(
            'organization_id is not a live seat',
            HTTP_BAD_REQUEST,
        );
    }
    await db.transaction(
        ['requests', 'responses'],
        async (view) => {
            if (pair !== undefined) {
                await appendMessagePair(view, pair);
            }
        },
    );
}

// GET /organizations enumerates the caller's OWN membership
// orgs — identity-scoped like /invitations, so it gates on
// authentication, not a role. enumerateMyOrganizations self-fences to
// the caller's memberships, so a roleless member sees only
// their own orgs and can boot the shell.
export async function organizationsEnumerationRequest(
    ctx: IncomingContext,
    request: Request,
): Promise<Response> {
    const authed =
        await authenticateRequest(ctx, request);
    if (typeof authed === 'string') {
        return unauthorizedBearerResponse(authed);
    }
    return enumerateMyOrganizations(authed);
}
