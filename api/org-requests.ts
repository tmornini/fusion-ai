import type { DbAdapter } from './db.ts';
import { nowUtc } from './types.ts';
import {
    generateCryptoSafeBase62,
} from './crypto-safe-base62.ts';
import {
    type Principal,
} from './access-token.ts';
import {
    currentDefaultOrgFor,
} from './authorization.ts';
import {
    subjectOrgs,
    identityDefaultOrg,
} from './authentication.ts';
import {
    errorJson,
    HTTP_BAD_REQUEST,
    HTTP_UNAUTHORIZED,
    HTTP_FORBIDDEN,
} from './http-errors.ts';
import {
    authenticateRequest,
    parseObjectBody,
    callerOrgIds,
} from './request-auth.ts';
import {
    type IncomingContext,
} from './request-context.ts';

// GET /organizations — the caller's reachable orgs, derived
// fresh from the membership ledger (never the token claim, so
// it cannot be stale). The authoritative source the embedded
// `orgs` claim is a snapshot of.
async function enumerateMyOrgs(
    adapter: DbAdapter,
    principal: Principal,
): Promise<Response> {
    const mine = await callerOrgIds(adapter, principal);
    const orgs = await adapter.organizations.getAll();
    return Response.json(
        orgs.filter(o => mine.has(o.id)),
    );
}

// PUT/GET /identities/:id/default-org — the read/write face of
// the identity_default_orgs ledger. Authorized by tree ownership
// (caller === :id), not the admin role policy: an identity owns
// its own subtree. PUT appends a NEW event only when the org
// changes (an idempotent repeat writes nothing), and only if the
// org is one of the identity's memberships (no dangling default).
export async function identityDefaultOrgRequest(
    ctx: IncomingContext,
    request: Request,
    segments: readonly string[],
): Promise<Response> {
    const adapter = ctx.base;
    const authResult =
        await authenticateRequest(adapter, request);
    if (typeof authResult === 'string') {
        return Response.json(
            { error: authResult },
            { status: HTTP_UNAUTHORIZED },
        );
    }
    const identityId = segments[1]!;
    if (authResult.id !== identityId) {
        return Response.json(
            {
                error: 'forbidden: an identity may act only'
                    + ' within its own tree',
            },
            { status: HTTP_FORBIDDEN },
        );
    }
    if (request.method === 'GET') {
        return Response.json({
            organization_id:
                await identityDefaultOrg(adapter, identityId),
        });
    }
    if (request.method === 'PUT') {
        const parse = await parseObjectBody(request);
        if (!parse.ok) {
            return Response.json(
                { error: 'Invalid JSON body' },
                { status: HTTP_BAD_REQUEST },
            );
        }
        const body = parse.body;
        const org = body.organization_id;
        if (typeof org !== 'string') {
            return Response.json(
                { error: 'organization_id is required' },
                { status: HTTP_BAD_REQUEST },
            );
        }
        const memberOrgs =
            await subjectOrgs(adapter, identityId);
        if (!memberOrgs.includes(org)) {
            return Response.json(
                {
                    error: 'forbidden: org is not one of the'
                        + " identity's memberships",
                },
                { status: HTTP_FORBIDDEN },
            );
        }
        const rows =
            await adapter.identityDefaultOrgs.getAll();
        if (currentDefaultOrgFor(rows, identityId) === org) {
            return new Response(null, { status: 204 });
        }
        await adapter.identityDefaultOrgs.put(
            generateCryptoSafeBase62(), {
                identity_id: identityId,
                organization_id: org,
                at: nowUtc(),
            });
        return new Response(null, { status: 204 });
    }
    return Response.json(
        {
            error: 'Method ' + request.method
                + ' not allowed',
        },
        { status: 405 },
    );
}

// GET /organizations enumerates the caller's OWN membership
// orgs — identity-scoped like /invitations, so it gates on
// authentication, not a role. enumerateMyOrgs self-fences to
// the caller's memberships, so a roleless member sees only
// their own orgs and can boot the shell.
export async function organizationsEnumerationRequest(
    ctx: IncomingContext,
    request: Request,
): Promise<Response> {
    const authResult =
        await authenticateRequest(ctx.base, request);
    if (typeof authResult === 'string') {
        return errorJson(authResult, HTTP_UNAUTHORIZED);
    }
    return enumerateMyOrgs(ctx.base, authResult);
}
