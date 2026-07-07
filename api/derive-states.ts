import type { DbAdapter } from './db.ts';
import type { Id, StateEntity } from './types.ts';
import { pickString } from './validators.ts';
import { canonicalUriPrefix } from './message-pair.ts';
import {
    documentPairsAt,
    deriveDocumentsAt,
    byIdAscending,
} from './derive-documents.ts';

// The states-log derivation, Phase 11 Task 2 (the derive-
// identity-spine.ts precedent applied to the unified event log):
// the event-pair reader (deriveEventPairStates, gate 5a's simple
// half — a document family's OWN embedded lifecycle trio is a
// SEPARATE, later union source, never read here) plus the
// PAIR-PLANE org fence (resolveOwningOrganization /
// fenceStatesByOwner, gate 4). NOTHING reads this module in
// production yet — no route flip; Task 1's row-plane fence
// (api/store-parent-scoped.ts) still serves live traffic. This
// module exists to prove the pair-plane machinery ahead of that
// later flip.
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
