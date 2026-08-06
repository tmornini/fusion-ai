import type { DbAdapter } from './db.ts';
import { missedReadError } from './derive-states.ts';
import type { Id, StateEntity } from './types.ts';
import { pickString, pickNumber } from './validators.ts';
import { canonicalUriPrefix } from './message-pair.ts';
import {
    deriveDocumentsAt,
    documentPairsAt,
    documentLifecycleEvents,
    stateHistoryFrom,
    currentDocumentState,
    currentLifecycleEvent,
    byIdAscending,
    DELETED_STATE,
    type DerivedDocument,
    type DocumentPair,
} from './derive-documents.ts';

// Org-nested record-types derive surface, plus the folded
// flat-records history helper (formerly derive-records.ts).
// Pair-plane only: prefix scan + head reduction + lifecycle
// trio, same primitives as derive-ideas / document-family.

const RECORD_TYPES_TABLE = 'record_types';

// Wire row for a live record-type document. Trio stamped from
// the lifecycle-current event (never re-copied from head body).
export interface RecordTypeWireRow {
    readonly id: Id;
    readonly organization_id: Id;
    readonly name: string;
    readonly description: string;
    readonly position: number;
    readonly state: string;
    readonly state_at: string;
    readonly state_event_id: string;
}

export function recordTypesUriPrefix(
    organization: Id,
): string {
    return '/organizations/' + organization
        + '/record-types/';
}

function recordTypeEntityOf(
    document: DerivedDocument,
    organization: Id,
    current: StateEntity,
): RecordTypeWireRow {
    const body = document.body;
    return {
        id: document.uriId,
        organization_id: organization,
        name: pickString(body, 'name'),
        description: pickString(body, 'description'),
        position: pickNumber(body, 'position'),
        state: current.state,
        state_at: current.at,
        state_event_id: current.id,
    };
}

async function fetchRecordTypePairs(
    db: DbAdapter,
    prefix: string,
): Promise<{
    readonly documents: Map<string, DerivedDocument>;
    readonly pairs: readonly DocumentPair[];
}> {
    const [requests, responses] = await Promise.all([
        db.requests.getAllWhere('uri_prefix', prefix),
        db.responses.getAllWhere('uri_prefix', prefix),
    ]);
    return {
        documents: deriveDocumentsAt(
            requests, responses, prefix,
        ),
        pairs: documentPairsAt(
            requests, responses, prefix,
        ),
    };
}

export async function deriveRecordTypeCollection(
    db: DbAdapter,
    organization: Id,
): Promise<RecordTypeWireRow[]> {
    const prefix = recordTypesUriPrefix(organization);
    const { documents, pairs } =
        await fetchRecordTypePairs(db, prefix);
    const pairsById = new Map<Id, DocumentPair[]>();
    for (const pair of pairs) {
        const list = pairsById.get(pair.uriId);
        if (list === undefined) {
            pairsById.set(pair.uriId, [pair]);
        } else {
            list.push(pair);
        }
    }
    const rows: RecordTypeWireRow[] = [];
    for (const [id, document] of documents) {
        const history = stateHistoryFrom(
            documentLifecycleEvents(
                pairsById.get(id) ?? [],
            ),
            id,
        );
        if (currentDocumentState(history) === DELETED_STATE) {
            continue;
        }
        const current = currentLifecycleEvent(history)!;
        rows.push(
            recordTypeEntityOf(
                document, organization, current,
            ),
        );
    }
    return rows.sort(byIdAscending);
}

export async function deriveRecordTypeEntity(
    db: DbAdapter,
    organization: Id,
    id: Id,
): Promise<RecordTypeWireRow> {
    const prefix = recordTypesUriPrefix(organization);
    const { documents, pairs } =
        await fetchRecordTypePairs(db, prefix);
    const document = documents.get(id);
    if (document === undefined) {
        throw await missedReadError(
            db, id, organization, RECORD_TYPES_TABLE,
        );
    }
    const history = stateHistoryFrom(
        documentLifecycleEvents(
            pairs.filter((pair) => pair.uriId === id),
        ),
        id,
    );
    if (currentDocumentState(history) === DELETED_STATE) {
        throw await missedReadError(
            db, id, organization, RECORD_TYPES_TABLE,
        );
    }
    const current = currentLifecycleEvent(history)!;
    return recordTypeEntityOf(
        document, organization, current,
    );
}

// One row per distinct state_event_id — (state_at, id) ASC.
// Handler reverses for DESC on the wire. Empty history is a
// miss (handler maps via missedReadError).
export async function deriveRecordTypeStateHistory(
    db: DbAdapter,
    organization: Id,
    id: Id,
): Promise<StateEntity[]> {
    const prefix = recordTypesUriPrefix(organization);
    const { pairs } =
        await fetchRecordTypePairs(db, prefix);
    return stateHistoryFrom(
        documentLifecycleEvents(
            pairs.filter((pair) => pair.uriId === id),
        ),
        id,
    );
}

export async function requireRecordTypeExists(
    db: DbAdapter,
    organization: Id,
    id: Id,
): Promise<void> {
    await deriveRecordTypeEntity(db, organization, id);
}

// Records' own state-history reduction — deriveIdeaStateHistory's
// (api/derive-ideas.ts) structural mirror by content. Every trio
// family ships its OWN history module built on the shared
// stateHistoryFrom primitive plus a family prefix-scan (deriveIdea
// StateHistory / deriveProjectStateHistory / deriveFlowState
// History are the other three); records is the first whose trio
// walk must also tolerate a DELETE-method pair at its own :id
// address (Author gate 9 — documentLifecycleEvents already skips
// it; see that function's own header). Read-only and additive —
// no route reads this yet (Task 7 wires it);
// tests/drift-records.test.ts's case 9 proves equality against
// the old plane's states.getAllFor.

function recordsUriPrefix(organization: Id): string {
    return canonicalUriPrefix(organization, '/records/');
}

// One row per pair whose state_event_id is NEW — the document
// sequence IS the history, (state_at, id) ascending. Returns
// every event regardless of current lifecycle state (deletion is
// just another transition here) — the deleted-filter lives in
// the entity/collection reads alone (the generic document-family
// machinery), mirroring how the real states table's getAllFor
// never filters either.
export async function deriveRecordStateHistory(
    db: DbAdapter,
    organization: Id,
    recordId: Id,
): Promise<StateEntity[]> {
    const prefix = recordsUriPrefix(organization);
    const [requests, responses] = await Promise.all([
        db.requests.getAllWhere('uri_prefix', prefix),
        db.responses.getAllWhere('uri_prefix', prefix),
    ]);
    const pairs = documentPairsAt(requests, responses, prefix)
        .filter((pair) => pair.uriId === recordId);
    return stateHistoryFrom(
        documentLifecycleEvents(pairs), recordId,
    );
}
