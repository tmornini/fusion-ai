import type { DbAdapter } from './db.ts';
import {
    EntityNotFoundError,
    LedgerImmutabilityError,
    MissingTableError,
    keyed,
} from './db.ts';
import {
    ValidationError,
} from './types.ts';
import { orgScopedAdapter } from './db-org-scoped.ts';
import {
    ownerOrgOfEntity,
    orgOwnedProbes,
} from './store-parent-scoped.ts';
import {
    exchangeBearerForOrg,
    identityDefaultOrg,
} from './authentication.ts';
import {
    ApiError,
    UnauthorizedError,
    RequestError,
    HTTP_BAD_REQUEST,
    HTTP_NOT_FOUND,
    HTTP_INTERNAL_ERROR,
    HTTP_UNAUTHORIZED,
    HTTP_FORBIDDEN,
    HTTP_CONFLICT,
} from './http-errors.ts';
import {
    AUTHENTICATION_ROUTES,
    BOOTSTRAP_ROUTES,
    authenticateRequest,
    callerRolesInOrg,
    authorizeRequest,
    authorizeIdentityPii,
    callerOrgIds,
    parseObjectBody,
} from './request-auth.ts';
import {
    routes,
    matchRoute,
    param,
    type Route,
} from './routes.ts';
import {
    commitRouteFor,
    commitOpsAuthzFailure,
} from './commit-dispatch.ts';
import {
    invitationsRequest,
} from './invitations-domain.ts';
import {
    identityDefaultOrgRequest,
    organizationsEnumerationRequest,
} from './org-requests.ts';

export {
    ApiError,
    UnauthorizedError,
    RequestError,
} from './http-errors.ts';
export {
    unionTablesFor,
    commitOpsAuthzFailure,
    type CommitOp,
} from './commit-dispatch.ts';

// The batch route dispatches its ops against the same table
// that serves it — commit included — so the composed table
// closes over itself: built from the route modules, sealed by
// the final push. Composition happens HERE, once, so neither
// route module needs an edge back into the other.
const routeTable: Route[] = [...routes];
routeTable.push(commitRouteFor(routeTable));

const BASE_URL = 'http://localhost';

// Facade rewrite: exchange the caller's bearer for a token
// scoped to segments[1], then re-enter the gate against the
// flat resource path (segments[2:]). A non-member's exchange
// is a 403 — the tenant fence — and mints nothing.
async function facadeRequest(
    adapter: DbAdapter,
    request: Request,
    segments: readonly string[],
): Promise<Response> {
    const header = request.headers.get('authorization');
    if (header === null
        || !header.startsWith('Bearer ')) {
        return Response.json(
            { error: 'facade requires a bearer token' },
            { status: HTTP_UNAUTHORIZED },
        );
    }
    const bearer = header.slice('Bearer '.length);
    const exchanged = await exchangeBearerForOrg(
        adapter, bearer, segments[1]!,
    );
    if (!exchanged.ok) {
        return Response.json(
            { error: exchanged.error },
            { status: exchanged.status },
        );
    }
    const flatUrl = new URL(request.url);
    flatUrl.pathname = '/' + segments.slice(2).join('/');
    const headers = new Headers(request.headers);
    headers.set(
        'authorization',
        'Bearer ' + exchanged.response.access_token,
    );
    const hasBody = request.method === 'PUT'
        || request.method === 'POST';
    const flatRequest = new Request(flatUrl.toString(), {
        method: request.method,
        headers,
        ...(hasBody
            ? { body: await request.text() } : {}),
    });
    return handleRequest(adapter, flatRequest);
}

export async function handleRequest(
    adapter: DbAdapter,
    request: Request,
): Promise<Response> {
    const { pathname } = new URL(request.url);
    const pathSegments = pathname
        .split('/')
        .filter(Boolean);
    // Facade: /organizations/:org/:entity[/:id] — exchange the
    // caller's bearer for an org-scoped token and re-enter the
    // gate against the flat resource path, so the existing
    // handler is fenced automatically. Org rides the one
    // verified token, never the path.
    if (pathSegments[0] === 'organizations'
        && pathSegments.length >= 3) {
        return facadeRequest(adapter, request, pathSegments);
    }
    if (pathSegments[0] === 'identities'
        && pathSegments.length === 3
        && pathSegments[2] === 'default-org') {
        return identityDefaultOrgRequest(
            adapter, request, pathSegments,
        );
    }
    // The invitation surface is identity/org-spanning, so it
    // runs on the BASE adapter with explicit guards rather than
    // the org-scoped route table — see invitationsRequest.
    if (pathSegments[0] === 'invitations') {
        return invitationsRequest(
            adapter, request, pathSegments,
        );
    }
    // Enumerating one's own orgs is identity-scoped, not
    // org-owned: it runs above the admin gate so a roleless
    // member can boot. Only the bare GET — PUT (create) and
    // /organizations/:id keep the org-scoped route handling.
    if (pathSegments[0] === 'organizations'
        && pathSegments.length === 1
        && request.method === 'GET') {
        return organizationsEnumerationRequest(adapter, request);
    }
    const match = matchRoute(routeTable, pathSegments);

    if (!match) {
        return Response.json(
            {
                error:
                    'Not found: ' + pathname,
            },
            { status: HTTP_NOT_FOUND },
        );
    }

    const { route: matched, params } = match;
    const method = request.method;

    const routePattern = matched.segments.join('/');
    // Every authenticated request runs org-scoped. The org is
    // resolved ONCE here — the verified token claim, else the
    // identity's default (its set choice, else primary
    // membership) — and shared by authz and the scoped adapter.
    // A flat token whose identity resolves to no org is DENIED:
    // there is no global default to fall back on. Org-owned
    // stores fence to the org; the global identity/auth spine
    // passes through.
    let effective: DbAdapter = adapter;
    // The roles of an unauthenticated caller on a bearer-
    // exempt route are honestly none; every fenced route
    // overwrites this with the per-org derivation below.
    let roles: readonly string[] = [];
    const bearerExempt =
        AUTHENTICATION_ROUTES.has(routePattern)
        || (BOOTSTRAP_ROUTES.has(routePattern)
            && !(await adapter.hasSchema()));
    if (!bearerExempt) {
        const authResult =
            await authenticateRequest(adapter, request);
        if (typeof authResult === 'string') {
            return Response.json(
                { error: authResult },
                { status: HTTP_UNAUTHORIZED },
            );
        }
        const org = authResult.organization
            ?? await identityDefaultOrg(
                adapter, authResult.id,
            );
        if (org === null) {
            return Response.json(
                {
                    error: 'forbidden: identity has no'
                        + ' organization',
                },
                { status: HTTP_FORBIDDEN },
            );
        }
        // The membership ledger is the live truth; the
        // token's org claim is a mint-time snapshot of it.
        // Re-derive membership on EVERY fenced request so a
        // revoked membership stops access now — not when the
        // token expires (the 15-minute de-membership window).
        const memberOrgs =
            await callerOrgIds(adapter, authResult);
        if (!memberOrgs.has(org)) {
            return Response.json(
                {
                    error: 'forbidden: no longer a member'
                        + ' of this organization',
                },
                { status: HTTP_FORBIDDEN },
            );
        }
        roles = await callerRolesInOrg(
            adapter, authResult, org,
        );
        const authzFailure =
            routePattern === 'identities/:id/pii'
                ? authorizeIdentityPii(
                    authResult, roles,
                    method, param(params, 0))
                : authorizeRequest(
                    roles, method, pathname);
        if (authzFailure !== null) {
            return Response.json(
                { error: authzFailure },
                { status: HTTP_FORBIDDEN },
            );
        }
        // organizations/:id is global passthrough; fence READS
        // to the caller's memberships so a non-member id 404s
        // like any foreign row. PUT is not gated here — a new
        // org is created before its first membership exists.
        if (method === 'GET'
            && routePattern === 'organizations/:id'
            && !memberOrgs.has(param(params, 0))) {
            return Response.json(
                { error: 'Not found: ' + pathname },
                { status: HTTP_NOT_FOUND },
            );
        }
        // entity-states/:id[/history] read StateStore methods
        // the store fence cannot cover; gate on PARENT
        // ownership — a DIFFERENT org's entity 404s, an orphan
        // or own entity passes. The history-leak bug gated on
        // entity_id alone.
        if (method === 'GET'
            && (routePattern === 'entity-states/:id'
                || routePattern
                    === 'entity-states/:id/history')) {
            // Reach the keyed membership read kept off the
            // EntityStore contract, so the owner resolves
            // through the identity_id index, not a scan.
            const memberships = keyed(adapter.memberships);
            const owner = await ownerOrgOfEntity(
                orgOwnedProbes(adapter),
                memberships, org, param(params, 0),
            );
            if (owner !== null && owner !== org) {
                return Response.json(
                    { error: 'Not found: ' + pathname },
                    { status: HTTP_NOT_FOUND },
                );
            }
        }
        effective = orgScopedAdapter(adapter, org);
    }

    // Parse the request body when the method
    // has one. A malformed or non-object JSON
    // body is a client error (400), not a
    // server fault — it must not flow into the
    // domain-boundary try below.
    let body: Record<string, unknown> | undefined;
    if (method === 'PUT' || method === 'POST') {
        const parse = await parseObjectBody(request);
        if (!parse.ok) {
            return Response.json(
                {
                    error:
                        'Invalid JSON body for '
                        + method + ' '
                        + pathname,
                },
                { status: HTTP_BAD_REQUEST },
            );
        }
        body = parse.body;
    }

    // The commit batch dispatches to the same route table —
    // authorize each op as the request it stands for, with
    // the roles already derived at the gate above.
    if (routePattern === 'commit' && body !== undefined) {
        const denied = commitOpsAuthzFailure(body, roles);
        if (denied !== null) {
            return Response.json(
                { error: denied },
                { status: HTTP_FORBIDDEN },
            );
        }
    }

    try {
        switch (method) {
            case 'GET': {
                if (!matched.get) {
                    return Response.json(
                        {
                            error:
                                'Method GET not'
                                + ' allowed on '
                                + pathname,
                        },
                        { status: 405 },
                    );
                }
                return Response.json(
                    await matched.get(
                        effective,
                        params,
                    ),
                );
            }
            case 'PUT': {
                if (!matched.put) {
                    return Response.json(
                        {
                            error:
                                'Method PUT not'
                                + ' allowed on '
                                + pathname,
                        },
                        { status: 405 },
                    );
                }
                const result =
                    await matched.put(
                        effective,
                        params,
                        body!,
                    );
                if (result === undefined) {
                    return new Response(null, {
                        status: 204,
                    });
                }
                return Response.json(result);
            }
            case 'DELETE': {
                if (!matched.delete) {
                    return Response.json(
                        {
                            error:
                                'Method DELETE'
                                + ' not allowed'
                                + ' on '
                                + pathname,
                        },
                        { status: 405 },
                    );
                }
                await matched.delete(
                    effective,
                    params,
                );
                return new Response(null, {
                    status: 204,
                });
            }
            case 'POST': {
                if (!matched.post) {
                    return Response.json(
                        {
                            error:
                                'Method POST'
                                + ' not allowed'
                                + ' on '
                                + pathname,
                        },
                        { status: 405 },
                    );
                }
                const result =
                    await matched.post(
                        effective,
                        params,
                        body!,
                    );
                if (result === undefined) {
                    return new Response(null, {
                        status: 204,
                    });
                }
                return Response.json(result);
            }
            default:
                return Response.json(
                    {
                        error:
                            'Method '
                            + method
                            + ' not allowed',
                    },
                    { status: 405 },
                );
        }
    } catch (error) {
        if (
            error instanceof MissingTableError
        ) {
            throw error;
        }
        if (error instanceof ApiError) {
            return Response.json(
                { error: error.message },
                { status: error.status },
            );
        }
        if (
            error instanceof EntityNotFoundError
        ) {
            return Response.json(
                { error: error.message },
                { status: HTTP_NOT_FOUND },
            );
        }
        if (
            error instanceof LedgerImmutabilityError
        ) {
            return Response.json(
                { error: error.message },
                { status: HTTP_CONFLICT },
            );
        }
        if (
            error instanceof ValidationError
        ) {
            return Response.json(
                { error: error.message },
                { status: HTTP_BAD_REQUEST },
            );
        }
        // The fault is server-side detail; the wire gets a
        // fixed body, the console gets the evidence.
        console.error(error);
        return Response.json(
            { error: 'internal error' },
            { status: HTTP_INTERNAL_ERROR },
        );
    }
}

async function unwrapResponse<T>(
    response: Response,
): Promise<T> {
    if (response.ok) {
        return (response.status === 204
            ? undefined
            : await response.json()) as T;
    }
    const { error } =
        (await response.json()) as {
            error: string;
        };
    if (response.status === HTTP_UNAUTHORIZED) {
        throw new UnauthorizedError(error);
    }
    throw new RequestError(
        `${error} (${response.url})`,
        response.status,
    );
}

export async function GET<T>(
    adapter: DbAdapter,
    resource: string,
    token: string,
): Promise<T> {
    await adapter.simulateLatency();
    return unwrapResponse<T>(
        await handleRequest(
            adapter,
            new Request(
                `${BASE_URL}/${resource}`,
                {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                    },
                },
            ),
        ),
    );
}

export async function PUT<T>(
    adapter: DbAdapter,
    resource: string,
    payload: Record<string, unknown>,
    token: string,
): Promise<T> {
    await adapter.simulateLatency();
    return unwrapResponse<T>(
        await handleRequest(
            adapter,
            new Request(
                `${BASE_URL}/${resource}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Authorization': 'Bearer ' + token,
                    },
                    body: JSON.stringify(payload),
                },
            ),
        ),
    );
}

export async function DELETE(
    adapter: DbAdapter,
    resource: string,
    token: string,
): Promise<void> {
    await adapter.simulateLatency();
    await unwrapResponse(
        await handleRequest(
            adapter,
            new Request(
                `${BASE_URL}/${resource}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                    },
                },
            ),
        ),
    );
}

export async function POST<T>(
    adapter: DbAdapter,
    resource: string,
    payload: Record<string, unknown>,
    token: string,
): Promise<T> {
    await adapter.simulateLatency();
    return unwrapResponse<T>(
        await handleRequest(
            adapter,
            new Request(
                `${BASE_URL}/${resource}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Authorization': 'Bearer ' + token,
                    },
                    body: JSON.stringify(payload),
                },
            ),
        ),
    );
}
