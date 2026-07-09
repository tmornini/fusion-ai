import type { DbAdapter } from './db.ts';
import { EntityNotFoundError } from './db.ts';
import type {
    Id, RequestEntity, ResponseEntity, StateFieldValueEntity,
} from './types.ts';
import { pickString } from './validators.ts';
import { latestByKey } from '../shared/ledger-reduction.ts';
import {
    documentPairsAt, byIdAscending, type DocumentPair,
} from './derive-documents.ts';
import {
    operationPairsAt, WORK_ORDER_TRANSITION_PATTERN,
} from './derive-states.ts';

// Phase 14 Task 6: state_field_values (SFV) truth, derived from
// the pair plane instead of read off its own table. Author gate
// 5's own census, re-run at Step 0 and unchanged: the row plane
// has exactly ONE writer, postWorkOrderTransitionOp (api/
// routes.ts) — it folds every field-value row for a transition
// into that SAME transaction's state_field_values.put calls,
// alongside ONE transition OPERATION pair (work-orders/:id/
// transition) whose body carries the fold (fieldValues: [{id,
// fields}]) — no per-value pair of its own. The STANDALONE leaf
// address (states/:id/field-values/:fvid) is BOTH PAIR_WIRED and
// DOCUMENT_CLASS (message-pair.ts), so a direct leaf PUT/DELETE —
// live OR seeded (api/mock-data/seed-message-pairs.ts pair-wires
// every mock row the same way) — DOES pair-wire itself.
//
// ELECTED (a) TWO-SOURCE UNION (spec B2) over (b) close-the-gap:
// zero ledger growth. The union is EXACT, not approximate — the
// row plane's own writers are exhaustively these two addresses
// (nothing else ever calls state_field_values.put), so every row
// the table could ever hold has a pair on one of these two
// addresses.
//
// DELETION REPRODUCED, NOT RESURRECTED: the leaf address is
// DOCUMENT_CLASS, so its own DELETE pair IS the tombstone signal
// — head-reduced away below exactly as deriveDocumentsAt (derive-
// documents.ts) excludes a DELETE head. A row born from a
// transition and LATER revised or deleted through the standalone
// leaf address is head-reduced by the SAME (at, id) order across
// BOTH sources (latestByKey below), so the leaf write — which can
// only ever land strictly after its own originating transition —
// wins, exactly as the row plane's own re-PUT/DELETE already
// works. No second pair gap.
const FIELD_VALUES_LEAF_ADDRESS_PATTERN =
    /^(?:\/organizations\/([^/]+))?\/states\/[^/]+\/field-values\/$/;

function matchingPrefixes(
    requests: readonly RequestEntity[],
    pattern: RegExp,
): ReadonlySet<string> {
    const prefixes = new Set<string>();
    for (const request of requests) {
        if (pattern.test(request.uri_prefix)) {
            prefixes.add(request.uri_prefix);
        }
    }
    return prefixes;
}

interface TransitionFieldValue {
    readonly id: string;
    readonly fields: Record<string, unknown>;
}

// One transition pair's fieldValues fold, reshaped into the SAME
// DocumentPair shape documentPairsAt already returns for the leaf
// address — so the union below head-reduces both sources through
// ONE latestByKey call rather than two merge strategies.
// `id`/`at` are the TRANSITION pair's OWN envelope (every row it
// folds landed inside that ONE atomic write, so they share one
// order-key); `uriId` is the field-value row's OWN id — the SAME
// id a later leaf PUT/DELETE at states/:id/field-values/:fvid
// would revisit. `method: 'PUT'` — a transition only ever CREATES
// a row (validateWorkOrderTransitionBody carries no delete arm),
// never tombstones one.
function transitionFieldValueCandidates(
    requests: readonly RequestEntity[],
    responses: readonly ResponseEntity[],
): DocumentPair[] {
    const candidates: DocumentPair[] = [];
    for (const prefix of matchingPrefixes(
        requests, WORK_ORDER_TRANSITION_PATTERN,
    )) {
        for (const transition of operationPairsAt(
            requests, responses, prefix,
        )) {
            const fieldValues = transition.body['fieldValues'] as
                readonly TransitionFieldValue[];
            for (const fieldValue of fieldValues) {
                candidates.push({
                    id: transition.id,
                    at: transition.at,
                    uriId: fieldValue.id,
                    method: 'PUT',
                    body: fieldValue.fields,
                    requesterIdentityId:
                        transition.requesterIdentityId,
                });
            }
        }
    }
    return candidates;
}

// The leaf address's own document pairs, across every state
// event's field-values sub-collection — UNFENCED (a caller
// narrows to its own organization; see isVisibleStateEvent
// below), matching deriveEventPairStates' own unfenced read at
// gate 5a (derive-states.ts).
function leafFieldValueCandidates(
    requests: readonly RequestEntity[],
    responses: readonly ResponseEntity[],
): DocumentPair[] {
    const candidates: DocumentPair[] = [];
    for (const prefix of matchingPrefixes(
        requests, FIELD_VALUES_LEAF_ADDRESS_PATTERN,
    )) {
        candidates.push(
            ...documentPairsAt(requests, responses, prefix),
        );
    }
    return candidates;
}

// The two-source union (Author gate 5, election (a)): transition-
// fold candidates ∪ leaf document pairs, head-reduced by the
// field-value row's OWN id via latestByKey's default (at, id)
// order — the SAME reduction every other derive in this migration
// applies. A DELETE head excludes the row (this module's own
// header). UNFENCED: callers narrow to their own organization
// (deriveStateFieldValueReferrers / stateFieldValuesForStateEvent
// below), never before this union runs.
export function stateFieldValuesFrom(
    requests: readonly RequestEntity[],
    responses: readonly ResponseEntity[],
): StateFieldValueEntity[] {
    const candidates = [
        ...transitionFieldValueCandidates(requests, responses),
        ...leafFieldValueCandidates(requests, responses),
    ];
    const heads = latestByKey(candidates, (pair) => pair.uriId);
    const rows: StateFieldValueEntity[] = [];
    for (const [uriId, head] of heads) {
        if (head.method === 'DELETE') continue;
        rows.push({
            id: uriId,
            state_event_id:
                pickString(head.body, 'state_event_id'),
            attribute_id: pickString(head.body, 'attribute_id'),
            value: pickString(head.body, 'value'),
        });
    }
    return rows.sort(byIdAscending);
}

// The row-plane fence, delegated rather than re-derived: a
// field-value row is visible iff its PARENT STATE EVENT is.
// `view.states` is ALREADY org-scoped (db-organization-scoped.ts's
// ParentScopedStateStore) for any caller-supplied view this
// module's own exports receive, so this is the SAME two-hop
// resolution the RETIRING state_field_values parentScope resolver
// performed (base.states.getById(row.state_event_id) then
// ownerOrganizationOfEntity) — reused via the store that already
// carries it, never rebuilt over the pair plane a second time.
async function isVisibleStateEvent(
    view: DbAdapter,
    stateEventId: Id,
): Promise<boolean> {
    try {
        await view.states.getById(stateEventId);
        return true;
    } catch (e) {
        if (e instanceof EntityNotFoundError) return false;
        throw e;
    }
}

// The RESTRICT-facing reader (api/record-attribute-refs.ts's
// collectAttributeReferrers): every LIVE field-value row whose
// attribute_id is among `attributeIds`, visible to `view`'s bound
// organization, keyed by attribute_id — ONE derive pass serves
// every id the caller's own loop asks about, rather than
// rescanning the plane per id (the pair plane has no attribute_id
// index the way the retired table's getAllWhere did). `view` is
// the ALREADY-OPEN write-gate transaction (ATTRIBUTE_RESTRICT_
// TABLES: requests, responses, and states are all in its ring) —
// no nested transaction opens here, matching workOrderClaim
// SourcesFor's own in-tx contract (derive-states.ts).
export async function deriveStateFieldValueReferrers(
    view: DbAdapter,
    attributeIds: readonly Id[],
): Promise<Map<Id, readonly StateFieldValueEntity[]>> {
    const [requests, responses] = await Promise.all([
        view.requests.getAll(),
        view.responses.getAll(),
    ]);
    const wanted = new Set(attributeIds);
    const candidates = stateFieldValuesFrom(requests, responses)
        .filter((row) => wanted.has(row.attribute_id));
    const byAttribute = new Map<Id, StateFieldValueEntity[]>();
    for (const row of candidates) {
        if (!(await isVisibleStateEvent(
            view, row.state_event_id,
        ))) continue;
        const list = byAttribute.get(row.attribute_id) ?? [];
        list.push(row);
        byAttribute.set(row.attribute_id, list);
    }
    return byAttribute;
}

// The GET-facing reader (states/:id/field-values, flipped by
// DEFAULT — Task 6, Author gate 5). The visibility check runs
// FIRST, against `db` directly (already org-scoped): an absent OR
// foreign event returns [] without ever deriving anything — byte-
// identical to the retired table read's own empty-array outcome
// for both cases (db.stateFieldValues.getAllWhere trivially found
// no rows for an absent event, and the SFV parentScope resolver
// fenced a foreign event's rows to invisible — this route never
// 404s). Once visible, ONE shared readonly tx over requests+
// responses (the deriveEventPairStates torn-read closure, derive-
// states.ts) derives the WHOLE plane: the GET path may scan wider
// than the RESTRICT write gate (Author gate 5's own hard
// constraint), and the transition fold has no address of its own
// keyed by state_event_id, so a narrower read is not available
// regardless — see this module's header.
export async function stateFieldValuesForStateEvent(
    db: DbAdapter,
    stateEventId: Id,
): Promise<StateFieldValueEntity[]> {
    if (!(await isVisibleStateEvent(db, stateEventId))) return [];
    return db.transaction(
        ['requests', 'responses'],
        async (view) => {
            const [requests, responses] = await Promise.all([
                view.requests.getAll(),
                view.responses.getAll(),
            ]);
            return stateFieldValuesFrom(requests, responses)
                .filter(
                    (row) => row.state_event_id === stateEventId,
                );
        },
    );
}
