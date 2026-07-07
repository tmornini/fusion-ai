import type { DbAdapter } from './db.ts';
import type {
    Id, RequestEntity, ResponseEntity, StateEntity,
} from './types.ts';
import { MS_PER_SECOND } from './types.ts';
import {
    pickString, validateWorkOrderFlowGraphJson,
} from './validators.ts';
import { canonicalUriPrefix } from './message-pair.ts';
import {
    documentPairsAt,
    deriveDocumentsAt,
    byIdAscending,
    type DocumentPair,
} from './derive-documents.ts';
import { latestClaimEvent } from './work-order-claims.ts';
import { HttpMessage } from '../shared/http-message/http-message.ts';
import { parseJson } from '../shared/http-message/json-codec.ts';
import {
    defaultBodyRegistry,
} from '../shared/http-message/media-registry.ts';

// The states-log derivation, Phase 11 Task 2 (the derive-
// identity-spine.ts precedent applied to the unified event log):
// the event-pair reader (deriveEventPairStates, gate 5a's simple
// half — a document family's OWN embedded lifecycle trio is a
// SEPARATE, later union source, never read here) plus the
// PAIR-PLANE org fence (resolveOwningOrganization /
// fenceStatesByOwner, gate 4). Task 4 adds a second reader,
// deriveWorkOrderLifecycle (gate 5d) — see its own section header
// below for the work-order-specific edges. NOTHING reads this
// module in production yet — no route flip; Task 1's row-plane
// fence (api/store-parent-scoped.ts) still serves live traffic.
// This module exists to prove the pair-plane machinery ahead of
// that later flip.
//
// THE GATE-15 PRECEDENT (Phase 10, tests/drift-identities.test.ts
// + api/routes.ts's module-private membershipsAcrossAllOrganiza
// tions/ownerOrganizationViaMembershipPairPlane): an org fence can
// be reproduced from the MEMBERSHIP PAIR PLANE instead of row
// probes. This module reproduces that same technique for the
// states log's own fence — resolveViaMembershipPairPlane below is
// re-derived here (not imported) because routes.ts's helpers are
// module-private.
//
// IMMUNE TO THE DELETED FILTER: requests/responses are append-
// only, so a family's document pair still names its organization
// (via the stored uri_prefix, or — for invitations — the stored
// body) forever, regardless of whether the ENTITY it addresses
// has since transitioned to a 'deleted' lifecycle state. Task 1's
// row-plane fence had to bypass EntityStore's deleted filter with
// a raw row read to get this same guarantee
// (rawOrganizationOwnedProbes); the pair plane needs no such
// bypass — it never consults the states log's deleted-filter at
// all.
//
// THE isVisible RULE REPRODUCED (api/store-parent-scoped.ts): a
// row is visible to `boundOrganization` iff its resolved owner IS
// `boundOrganization`, or the owner is null (a genuine orphan — no
// pair anywhere names the entity). fenceStatesByOwner below is the
// exact same three-way rule, applied over resolveOwningOrganization
// instead of a row-plane probe.

// ---- deriveEventPairStates — the event-pair reader (gate 5a) ---

// states/:id is an EVENT-APPEND address (message-pair.ts): each
// event id is client-minted fresh per write, and the states table
// is ledger-immutable (StateStore.put throws
// LedgerImmutabilityError on a differing re-put of the same id),
// so a given uriId is visited by AT MOST one distinct 2xx pair —
// documentPairsAt's full pair list IS the event list; no head
// reduction is needed or appropriate.
//
// SEGMENT-BOUNDARY CORRECTNESS (the derive-identity-spine.ts E13
// precedent): 'states' is organization-nested
// (message-pair.ts's ORGANIZATION_NESTED_FIRST_SEGMENTS), so a
// live write's stored uri_prefix is
// '/organizations/<org>/states/' — there is no single flat prefix
// to scan. The optional org-segment group below matches that
// shape without ever confusing it with an unrelated sibling
// address sharing the '/organizations/<org>/' root.
const STATES_ADDRESS_PATTERN =
    /^(?:\/organizations\/([^/]+))?\/states\/$/;

// Every LIVE event posted through the dedicated PUT /states/:id
// address, across every organization — an entity family's OWN
// embedded lifecycle trio (ideas/projects/flows/work-orders) is a
// DIFFERENT union source, read by a later task, never this one.
// ONE shared readonly tx over requests+responses (the derive-
// identity-spine.ts torn-read closure): both reads observe the
// SAME committed snapshot, so a write landing between two
// independent reads can never split a pair across them.
export async function deriveEventPairStates(
    db: DbAdapter,
): Promise<StateEntity[]> {
    return db.transaction(
        ['requests', 'responses'],
        async (view) => {
            const [requests, responses] = await Promise.all([
                view.requests.getAll(),
                view.responses.getAll(),
            ]);
            const prefixes = new Set<string>();
            for (const request of requests) {
                if (
                    STATES_ADDRESS_PATTERN.test(request.uri_prefix)
                ) {
                    prefixes.add(request.uri_prefix);
                }
            }
            const rows: StateEntity[] = [];
            for (const prefix of prefixes) {
                for (const pair of documentPairsAt(
                    requests, responses, prefix,
                )) {
                    rows.push({
                        id: pair.uriId,
                        entity_id:
                            pickString(pair.body, 'entity_id'),
                        state: pickString(pair.body, 'state'),
                        // The stored member_id: the pair's own
                        // requester — stamped from the verified
                        // actor at write time (routes.ts's PUT
                        // /states/:id handler), never a body
                        // field (validateStateBody admits no
                        // member_id key at all). No response-body
                        // decode needed here, unlike the identity
                        // spine's gate-16 role-grants deviation.
                        member_id: pair.requesterIdentityId,
                        at: pickString(pair.body, 'at'),
                    });
                }
            }
            return rows.sort(byIdAscending);
        },
    );
}

// ---- resolveOwningOrganization — the PAIR-PLANE fence (gate 4) -

// The org-owned, org-nested document families whose OWN id can
// appear as a states.entity_id — mirrors
// api/store-parent-scoped.ts's rawOrganizationOwnedProbes table
// exactly (ideas, projects, flows, records, objectives,
// work-orders); invitations is handled separately below (its
// address is flat, never organization-nested — message-pair.ts's
// canonicalUriPrefix / family-registry.ts has no entry for it).
const ORGANIZATION_NESTED_ENTITY_FAMILIES = [
    'ideas', 'projects', 'flows',
    'work-orders', 'records', 'objectives',
] as const;

const ORGANIZATION_NESTED_FAMILY_ADDRESS_PATTERN = new RegExp(
    '^/organizations/([^/]+)/('
    + ORGANIZATION_NESTED_ENTITY_FAMILIES.join('|')
    + ')/$',
);

const INVITATIONS_PREFIX =
    canonicalUriPrefix(undefined, '/invitations/');

async function organizationIds(
    db: DbAdapter,
): Promise<readonly Id[]> {
    const organizations = await db.organizations.getAll();
    return organizations.map((organization) => organization.id);
}

// The invitation's own organization_id — carried in the STORED
// REQUEST body (derive-invitations.ts's own precedent), never the
// uri_prefix (the invitations address is flat, unlike every
// org-nested family above). A full scan of the (small) invitations
// family, mirroring derive-invitations.ts exactly — reused rather
// than reimplemented.
async function resolveInvitationOwner(
    db: DbAdapter,
    entityId: Id,
): Promise<Id | null> {
    const [requests, responses] = await Promise.all([
        db.requests.getAllWhere('uri_prefix', INVITATIONS_PREFIX),
        db.responses.getAllWhere(
            'uri_prefix', INVITATIONS_PREFIX,
        ),
    ]);
    const document = deriveDocumentsAt(
        requests, responses, INVITATIONS_PREFIX,
    ).get(entityId);
    return document === undefined
        ? null
        : pickString(document.body, 'organization_id');
}

// flow_nodes/flow_edges carry NO address of their own
// (message-pair.ts: absent from both PAIR_WIRED_ROUTE_PATTERNS and
// DOCUMENT_CLASS_ROUTE_PATTERNS) — they ride folded inside the
// flow's own document body, as graphDelta.nodes/.edges upserts
// (api/routes.ts's writeFlowGraphDelta). A node/edge that is later
// removed from the client's CURRENT graph snapshot still keeps its
// row forever (writeFlowGraphDelta only ever PUTs flow_nodes/
// flow_edges; a 'deleted' entity is a states-log event ALONGSIDE
// the row, never a splice of it) — so scanning graphDelta across a
// flow's FULL pair history, not merely its head document, finds
// every node/edge that ever existed, including ones later deleted.
function graphDeltaHasMember(
    body: Record<string, unknown>,
    entityId: Id,
): boolean {
    const delta = body['graphDelta'];
    if (typeof delta !== 'object' || delta === null) return false;
    const { nodes, edges } = delta as Record<string, unknown>;
    return idsInclude(nodes, entityId) || idsInclude(edges, entityId);
}

function idsInclude(value: unknown, entityId: Id): boolean {
    if (!Array.isArray(value)) return false;
    return value.some((item) =>
        typeof item === 'object' && item !== null
        && (item as Record<string, unknown>)['id'] === entityId);
}

async function resolveFlowGraphOwner(
    db: DbAdapter,
    entityId: Id,
    boundOrganization: Id,
): Promise<Id | null> {
    // Check the asking org's own flows first (the common case),
    // then every other known organization — order never changes
    // correctness (a flow has exactly one true owner), only which
    // organization's prefix is read first.
    const organizations = await organizationIds(db);
    const ordered = [
        boundOrganization,
        ...organizations.filter((o) => o !== boundOrganization),
    ];
    for (const organization of ordered) {
        const prefix = canonicalUriPrefix(organization, '/flows/');
        const [requests, responses] = await Promise.all([
            db.requests.getAllWhere('uri_prefix', prefix),
            db.responses.getAllWhere('uri_prefix', prefix),
        ]);
        for (const pair of documentPairsAt(
            requests, responses, prefix,
        )) {
            if (graphDeltaHasMember(pair.body, entityId)) {
                return organization;
            }
        }
    }
    return null;
}

// The org-less member/identity fallback (an ai-member/human-member
// id, i.e. an identity id): memberships is organization-nested
// (family-registry.ts), so there is no single address to scan —
// THE GATE-15 PRECEDENT unions the same per-org derivation across
// every known organization instead.
//
// ASKER-RELATIVE BY NECESSITY: an identity can hold memberships in
// MULTIPLE organizations at once. api/store-parent-scoped.ts's own
// viaMembership resolver is (necessarily) closed over the ASKING
// org for exactly this reason — a co-member of the asking org must
// read as visible even when the SAME identity also belongs
// elsewhere. boundOrganization is checked first (co-membership is
// the common, cheap case); only when that misses does this widen
// to every other organization, purely to distinguish "belongs
// elsewhere" (hidden) from "belongs nowhere" (a genuine orphan,
// visible) — which OTHER org it resolves to in that case is never
// observed by fenceStatesByOwner's isVisible check, so no further
// tie-break is needed.
async function organizationHasMemberPair(
    db: DbAdapter,
    organization: Id,
    identityId: Id,
): Promise<boolean> {
    const prefix = canonicalUriPrefix(
        organization, '/memberships/',
    );
    const [requests, responses] = await Promise.all([
        db.requests.getAllWhere('uri_prefix', prefix),
        db.responses.getAllWhere('uri_prefix', prefix),
    ]);
    // HEAD-REDUCED (deriveDocumentsAt), not raw pairs, unlike
    // every other leg in this module: a membership REMOVAL is a
    // genuine hard row-DELETE — no states-log soft-delete event
    // exists for memberships — so a DELETE head must exclude the
    // row here to reproduce old-plane parity. Do not swap this
    // for documentPairsAt for "consistency" with the other legs.
    const documents = deriveDocumentsAt(
        requests, responses, prefix,
    );
    for (const document of documents.values()) {
        if (
            pickString(document.body, 'identity_id') === identityId
        ) {
            return true;
        }
    }
    return false;
}

async function resolveViaMembershipPairPlane(
    db: DbAdapter,
    entityId: Id,
    boundOrganization: Id,
): Promise<Id | null> {
    if (
        await organizationHasMemberPair(
            db, boundOrganization, entityId,
        )
    ) {
        return boundOrganization;
    }
    for (const organization of await organizationIds(db)) {
        if (organization === boundOrganization) continue;
        if (
            await organizationHasMemberPair(
                db, organization, entityId,
            )
        ) {
            return organization;
        }
    }
    return null;
}

async function computeOwningOrganization(
    db: DbAdapter,
    entityId: Id,
    boundOrganization: Id,
): Promise<Id | null> {
    // (a) org-nested document families: a targeted uri_id index
    // read (mirrors message-pair.ts's own headPairIdAt) rather
    // than a full-ledger scan — an entity id is globally unique
    // (generateCryptoSafeBase62), so at most one distinct
    // org-nested prefix can ever match.
    const responseHits =
        await db.responses.getAllWhere('uri_id', entityId);
    for (const response of responseHits) {
        const match = ORGANIZATION_NESTED_FAMILY_ADDRESS_PATTERN
            .exec(response.uri_prefix);
        if (match !== null) return match[1]!;
    }

    // (c) invitations: flat address, org lives in the body.
    const invitationOwner =
        await resolveInvitationOwner(db, entityId);
    if (invitationOwner !== null) return invitationOwner;

    // (d) flow-node/edge events: folded into the flow's own
    // document-pair prefix.
    const graphOwner = await resolveFlowGraphOwner(
        db, entityId, boundOrganization,
    );
    if (graphOwner !== null) return graphOwner;

    // (b) the membership pair plane: org-less member/identity ids.
    return await resolveViaMembershipPairPlane(
        db, entityId, boundOrganization,
    );
}

// The PAIR-PLANE fence resolver (gate 4). Resolves entityId's
// owning organization across all four sources above, or null for
// a genuine orphan (no pair anywhere names the entity).
//
// MEMOIZATION SCOPE: memoized per distinct entityId WITHIN one
// derivation pass — `memo` is a Map created per call chain (a
// fresh one per fenceStatesByOwner call below), NEVER a
// module-global cache (module-global memoization is the Cache
// abomination: cross-request staleness across writes). A caller
// invoking this standalone (as several tests below do) gets a
// fresh, one-shot memo by default — still correct, merely
// unmemoized across calls.
//
// boundOrganization is a required argument, not merely
// fenceStatesByOwner's own concern: the membership-pair-plane leg
// is intrinsically asker-relative (see
// resolveViaMembershipPairPlane's own header), exactly like
// api/store-parent-scoped.ts's ownerOrganizationOfEntity already
// threads boundOrganization through to its own viaMembership call.
export async function resolveOwningOrganization(
    db: DbAdapter,
    entityId: Id,
    boundOrganization: Id,
    memo: Map<Id, Id | null> = new Map(),
): Promise<Id | null> {
    const cached = memo.get(entityId);
    if (cached !== undefined) return cached;
    const owner = await computeOwningOrganization(
        db, entityId, boundOrganization,
    );
    memo.set(entityId, owner);
    return owner;
}

// Keep rows whose resolved owner is boundOrganization or null —
// the isVisible rule (api/store-parent-scoped.ts) reproduced over
// the pair plane. ONE memo per call, shared across every row, so
// resolving the SAME entity_id twice within one fence pass costs
// one read-through, not two.
export async function fenceStatesByOwner(
    db: DbAdapter,
    rows: readonly StateEntity[],
    boundOrganization: Id,
): Promise<StateEntity[]> {
    const memo = new Map<Id, Id | null>();
    const owners = await Promise.all(
        rows.map((row) =>
            resolveOwningOrganization(
                db, row.entity_id, boundOrganization, memo,
            )),
    );
    return rows.filter((_, index) =>
        owners[index] === null
        || owners[index] === boundOrganization);
}

// ---- deriveWorkOrderLifecycle — the op-pair reader (gate 5d) ---

// Source (d) of the states-log union — the LAST source, and the
// only one that reads work-order CREATE/CLAIM/TRANSITION
// operation pairs rather than the states/:id address
// deriveEventPairStates (source a) already covers. Every SEEDED
// work order (buildWorkOrders/buildLeadToCloseWorkload) was
// formed via a bare document PUT — zero operation pairs — so its
// births and claims ride source (a) alone; this function emits
// NOTHING for it. Its output materializes ONLY for a work order
// created, claimed, or transitioned through the LIVE route
// (postWorkOrderCreationOp/postWorkOrderClaimOp/
// postWorkOrderTransitionOp), so a HYBRID work order (a seeded
// document plus a live claim) draws its births from source (a)
// and its claim from here — the two addresses are DISJOINT, so no
// row is ever double-counted across the two readers.
//
// THE CREATE-PAIR RELAXATION (EDGE 1): a work order's create pair
// is a DOMAIN fact, not a defensive fallback — 100% of seeded work
// orders lack one (they were never created through this route), so
// its absence NEVER throws; it simply means this reader
// contributes no births for that id (its births already exist via
// source (a)'s own read of the seed's states/:id trace). Only a
// LIVE creation — and a caller's RETRY of one, each landing its
// OWN create pair at the same work-order id — contributes birth
// events, one three-slot array PER create pair found.
//
// THE REFERENCE-CLOCK RESIDUAL (EDGE 2 — a SERVER-TIER TODO): the
// live claim route (postWorkOrderClaimOp) decides expiry against
// REAL Date.now() at the moment the NEXT claim happens to be
// processed — an instant NEVER stored in any pair body. This
// replay instead compares the claim pair's own body `claimAt`
// against the prior claim's `at`, with the route's exact `>=`
// boundary (isExpiredAsOf below) — a PURE, Date.now-free
// comparator, deliberately never isClaimEventExpired (api/
// work-order-claims.ts), which IS Date.now-coupled. Byte-exact
// replay holds ONLY under this demo's zero-latency, single-process
// architecture, where the claim body's claimAt and the route's
// real decision instant are, for all practical purposes, the same
// moment; the eventual server tier must record the ACTUAL expiry
// decision as its own event rather than lean on this replay trick.

// The work-orders COLLECTION address: POST 'work-orders' (create)
// and PUT/DELETE 'work-orders/:id' (document) share this ONE
// prefix per organization (family-registry.ts: work-orders is
// organizationNested), partitioned apart by METHOD alone
// (tests/drift-work-orders.test.ts case 8) — the create's uriId is
// the body's OWN minted id, the SAME id a later PUT's uriId names.
const WORK_ORDERS_COLLECTION_PATTERN =
    /^\/organizations\/[^/]+\/work-orders\/$/;

// The claim/transition sub-resource addresses: UNLIKE the
// collection prefix above, the work-order id rides the PREFIX
// itself here (routes.ts: 'work-orders/:id/claim' /
// 'work-orders/:id/transition'), so each distinct match names ONE
// work order directly — captured, the organization segment is not
// (a work-order id is globally unique, so it is never needed to
// disambiguate).
const WORK_ORDER_CLAIM_PATTERN =
    /^\/organizations\/[^/]+\/work-orders\/([^/]+)\/claim\/$/;
const WORK_ORDER_TRANSITION_PATTERN =
    /^\/organizations\/[^/]+\/work-orders\/([^/]+)\/transition\/$/;

// One decoded 2xx POST pair — an OPERATION address (create/claim/
// transition are POST-only), the documentPairsAt (derive-
// documents.ts) twin restricted to the OTHER method: that reader
// deliberately EXCLUDES POST (the DOCUMENT head is PUT/DELETE
// only); this one deliberately admits POST ALONE, since a work
// order's operations are never PUT/DELETE. Production
// genericization of tests/drift-work-orders.test.ts case 9's
// AnyPair/allPairsAt, narrowed to exactly what a work-order
// replay ever consumes — never a configurable multi-method reader
// nobody asked for.
interface OperationPair {
    readonly id: Id;
    readonly at: string;
    readonly uriId: Id;
    readonly body: Record<string, unknown>;
    readonly requesterIdentityId: Id;
}

// requestMethodOf/requestBodyOf's own twin (api/derive-
// documents.ts), needed here ONLY because operationPairsAt reads
// POST — mirrors derive-identity-spine.ts's own responseBodyOf,
// which duplicates the same decode plumbing for its OWN reason
// (the response side, there; the POST method, here) rather than
// exporting derive-documents.ts's private helpers across a module
// boundary they were never meant to cross.
function decodeRequestOperation(message: string): {
    readonly method: string;
    readonly body: Record<string, unknown>;
} {
    const model = parseJson(message, defaultBodyRegistry());
    if (model.startLine.kind !== 'request') {
        throw new Error(
            'stored request message carries no request line',
        );
    }
    const body = HttpMessage.fromModel(model).body();
    return {
        method: model.startLine.method,
        body: body.exists()
            ? JSON.parse(body.toText()) as
                Record<string, unknown>
            : {},
    };
}

// (at, id) ascending — the total order every replay step below
// orders its actions by, and the order the final derivation
// returns rows in (deriveWorkOrderLifecycle's own header).
function atIdCompare(
    a: { readonly at: string; readonly id: string },
    b: { readonly at: string; readonly id: string },
): number {
    return a.at < b.at ? -1
        : a.at > b.at ? 1
            : a.id < b.id ? -1
                : a.id > b.id ? 1
                    : 0;
}

// Every successful (2xx) POST pair at `uriPrefix`, (at, id)
// ascending.
function operationPairsAt(
    requests: readonly RequestEntity[],
    responses: readonly ResponseEntity[],
    uriPrefix: string,
): OperationPair[] {
    const requestById = new Map(
        requests.map((request) => [request.id, request]),
    );
    const pairs: OperationPair[] = [];
    for (const response of responses) {
        if (
            response.uri_prefix !== uriPrefix
            || response.status < 200 || response.status > 299
        ) continue;
        const request = requestById.get(response.id);
        if (request === undefined) continue;
        const decoded = decodeRequestOperation(request.message);
        if (decoded.method !== 'POST') continue;
        pairs.push({
            id: response.id,
            at: response.at,
            uriId: response.uri_id,
            body: decoded.body,
            requesterIdentityId: request.requester_identity_id,
        });
    }
    return pairs.sort(atIdCompare);
}

// A pure Date-parse subtraction — never Date.now() (EDGE 2).
function msBetween(laterIso: string, earlierIso: string): number {
    return Date.parse(laterIso) - Date.parse(earlierIso);
}

// The route's EXACT `>=` boundary (postWorkOrderClaimOp's own
// `isClaimEventExpired` call), reproduced as a pure comparator
// over two body timestamps instead of one body timestamp and
// Date.now().
function isExpiredAsOf(
    claimAt: string,
    priorAt: string,
    lockTimeoutSeconds: number,
): boolean {
    return msBetween(claimAt, priorAt)
        >= lockTimeoutSeconds * MS_PER_SECOND;
}

// LOCKTIMEOUT SOURCING: the work order's DOCUMENT HEAD as of
// `momentAt` — the (at, id) winner among PUT/DELETE pairs whose
// response `at` strictly precedes it. `entityPairs` is ascending
// by (at, id) already (documentPairsAt's own contract), so the
// last entry passing the filter IS that winner.
function documentHeadBefore(
    entityPairs: readonly DocumentPair[],
    momentAt: string,
): DocumentPair | undefined {
    const before = entityPairs.filter((p) => p.at < momentAt);
    return before[before.length - 1];
}

// lock_timeout is a MOVING TARGET — an entity PUT can change it
// mid-history — so every claim sources it FRESH from the document
// head as of that claim's OWN response.at, never a single graph
// read cached across the whole replay.
function lockTimeoutAsOf(
    entityPairs: readonly DocumentPair[],
    momentAt: string,
): number {
    const head = documentHeadBefore(entityPairs, momentAt);
    if (head === undefined) {
        // A genuine invariant violation, not a defensive
        // fallback: postWorkOrderClaimOp requires the work order
        // to already exist (view.workOrders.getById), and every
        // path that can create one also writes a document pair
        // beside it — so a claim/transition pair can never
        // legitimately precede every document pair at this id.
        throw new Error(
            'no document head before ' + momentAt,
        );
    }
    return validateWorkOrderFlowGraphJson(
        pickString(head.body, 'flow_graph'),
        'work-order lifecycle document head flow_graph',
    ).lockTimeout;
}

// Each claim pair re-runs the route's own 0/1/2-event decision
// with the pair BODY's claimAt as the reference clock (EDGE 2).
// PRIOR state reduces from the REPLAYED events so far (never
// old-plane rows) via latestClaimEvent's own CLAIM_STATES filter +
// (at, id) max.
function applyClaimPair(
    replayed: StateEntity[],
    entityPairs: readonly DocumentPair[],
    claim: OperationPair,
    workOrderId: Id,
): void {
    const claimEventId = pickString(claim.body, 'claimEventId');
    const claimAt = pickString(claim.body, 'claimAt');
    const expireEventId = pickString(
        claim.body, 'expireEventId',
    );
    const expireAt = pickString(claim.body, 'expireAt');
    const lockTimeout = lockTimeoutAsOf(entityPairs, claim.at);
    const prior = latestClaimEvent(replayed, workOrderId);
    const priorLive = prior !== null
        && prior.state === 'claimed'
        && !isExpiredAsOf(claimAt, prior.at, lockTimeout);

    if (priorLive) {
        // Idempotent re-claim by the same actor — zero events,
        // matching postWorkOrderClaimOp's own early return (a
        // foreign live claim 409s before any pair ever forms, so
        // it never reaches a replay at all).
        return;
    }
    if (prior !== null && prior.state === 'claimed') {
        replayed.push({
            id: expireEventId,
            entity_id: workOrderId,
            state: 'claim_expired',
            // Recovered from the PRIOR claim's OWN replayed
            // author, never the current pair's.
            member_id: prior.member_id,
            at: expireAt,
        });
    }
    replayed.push({
        id: claimEventId,
        entity_id: workOrderId,
        state: 'claimed',
        member_id: claim.requesterIdentityId,
        at: claimAt,
    });
}

// A transition pair's own target-state event, plus its OPTIONAL
// release event — field values ride a SEPARATE table
// (state_field_values), outside this states-log derivation's own
// contract (StateEntity rows only).
function applyTransitionPair(
    replayed: StateEntity[],
    transition: OperationPair,
    workOrderId: Id,
): void {
    replayed.push({
        id: pickString(transition.body, 'transitionEventId'),
        entity_id: workOrderId,
        state: pickString(transition.body, 'targetState'),
        member_id: transition.requesterIdentityId,
        at: pickString(transition.body, 'transitionAt'),
    });

    const release = transition.body['release'];
    if (release !== null) {
        const releaseFields = release as {
            readonly id: string;
            readonly state: string;
            readonly at: string;
        };
        replayed.push({
            id: releaseFields.id,
            entity_id: workOrderId,
            // VERBATIM from the pair body — the gate does not
            // constrain release.state to 'claim_released'.
            state: releaseFields.state,
            member_id: transition.requesterIdentityId,
            at: releaseFields.at,
        });
    }
}

type WorkOrderAction =
    | { readonly kind: 'claim'; readonly pair: OperationPair }
    | { readonly kind: 'transition'; readonly pair: OperationPair };

// One work order's full replay: its births (EDGE 1 — zero or
// more three-slot arrays, one per create pair found), then its
// claim/transition actions applied in (at, id) order so each
// claim's prior-claim lookup only ever sees chronologically
// earlier events.
function replayWorkOrderOperations(
    createPairs: readonly OperationPair[],
    entityPairs: readonly DocumentPair[],
    claimPairs: readonly OperationPair[],
    transitionPairs: readonly OperationPair[],
    workOrderId: Id,
): StateEntity[] {
    const events: StateEntity[] = [];
    for (const createPair of createPairs) {
        const ids = createPair.body['stateEventIds'] as
            readonly string[];
        const ats = createPair.body['stateEventAts'] as
            readonly string[];
        const states = createPair.body['states'] as
            readonly string[];
        for (let i = 0; i < ids.length; i++) {
            events.push({
                id: ids[i]!,
                entity_id: workOrderId,
                state: states[i]!,
                member_id: createPair.requesterIdentityId,
                at: ats[i]!,
            });
        }
    }

    const actions: WorkOrderAction[] = [
        ...claimPairs.map((pair) => (
            { kind: 'claim' as const, pair }
        )),
        ...transitionPairs.map((pair) => (
            { kind: 'transition' as const, pair }
        )),
    ].sort((a, b) => atIdCompare(a.pair, b.pair));

    for (const action of actions) {
        if (action.kind === 'claim') {
            applyClaimPair(
                events, entityPairs, action.pair, workOrderId,
            );
        } else {
            applyTransitionPair(events, action.pair, workOrderId);
        }
    }

    return events;
}

// The op-pair reader (gate 5d). ONE shared readonly tx over
// requests+responses (the deriveEventPairStates torn-read
// closure) — every grouping and replay step below is pure over
// the two fetched arrays, no further db reads. (at, id) ascending
// overall: these rows are SYNTHESIZED (no address of their own to
// read 1:1, unlike deriveEventPairStates' states/:id rows), so
// there is no raw-store scan order to reproduce — chronological
// (at, id) is the meaningful order, and filtering this total order
// by entity_id preserves it per work order, matching
// db.states.getAllFor's own (at, id) contract exactly.
export async function deriveWorkOrderLifecycle(
    db: DbAdapter,
): Promise<StateEntity[]> {
    return db.transaction(
        ['requests', 'responses'],
        async (view) => {
            const [requests, responses] = await Promise.all([
                view.requests.getAll(),
                view.responses.getAll(),
            ]);

            const collectionPrefixes = new Set<string>();
            for (const request of requests) {
                if (WORK_ORDERS_COLLECTION_PATTERN.test(
                    request.uri_prefix,
                )) {
                    collectionPrefixes.add(request.uri_prefix);
                }
            }
            const createPairs: OperationPair[] = [];
            const entityPairs: DocumentPair[] = [];
            for (const prefix of collectionPrefixes) {
                createPairs.push(...operationPairsAt(
                    requests, responses, prefix,
                ));
                entityPairs.push(...documentPairsAt(
                    requests, responses, prefix,
                ));
            }
            const createPairsByWorkOrder = Map.groupBy(
                createPairs, (pair) => pair.uriId,
            );
            const entityPairsByWorkOrder = Map.groupBy(
                entityPairs, (pair) => pair.uriId,
            );

            const claimPrefixByWorkOrder = new Map<Id, string>();
            const transitionPrefixByWorkOrder =
                new Map<Id, string>();
            for (const request of requests) {
                const claimMatch = WORK_ORDER_CLAIM_PATTERN.exec(
                    request.uri_prefix,
                );
                if (claimMatch !== null) {
                    claimPrefixByWorkOrder.set(
                        claimMatch[1]!, request.uri_prefix,
                    );
                }
                const transitionMatch =
                    WORK_ORDER_TRANSITION_PATTERN.exec(
                        request.uri_prefix,
                    );
                if (transitionMatch !== null) {
                    transitionPrefixByWorkOrder.set(
                        transitionMatch[1]!, request.uri_prefix,
                    );
                }
            }

            const workOrderIds = new Set<Id>([
                ...createPairsByWorkOrder.keys(),
                ...claimPrefixByWorkOrder.keys(),
                ...transitionPrefixByWorkOrder.keys(),
            ]);

            const events: StateEntity[] = [];
            for (const workOrderId of workOrderIds) {
                const claimPrefix =
                    claimPrefixByWorkOrder.get(workOrderId);
                const transitionPrefix =
                    transitionPrefixByWorkOrder.get(workOrderId);
                const claimPairs = claimPrefix === undefined
                    ? []
                    : operationPairsAt(
                        requests, responses, claimPrefix,
                    );
                const transitionPairs =
                    transitionPrefix === undefined
                        ? []
                        : operationPairsAt(
                            requests, responses, transitionPrefix,
                        );
                events.push(...replayWorkOrderOperations(
                    createPairsByWorkOrder.get(workOrderId) ?? [],
                    entityPairsByWorkOrder.get(workOrderId) ?? [],
                    claimPairs,
                    transitionPairs,
                    workOrderId,
                ));
            }
            return events.sort(atIdCompare);
        },
    );
}
