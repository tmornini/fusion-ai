import type { DbAdapter } from './db.ts';
import { EntityNotFoundError } from './db.ts';
import type {
    Id,
    IdeaEntity,
    IdeaSubmissionEntity,
    StateEntity,
} from './types.ts';
import { pickString, pickNumber } from './validators.ts';
import { latestByKey } from '../shared/ledger-reduction.ts';
import { canonicalUriPrefix } from './message-pair.ts';
import {
    deriveDocumentsAt,
    documentPairsAt,
    type DerivedDocument,
    type DocumentPair,
} from './derive-documents.ts';

// Ideas' own reshaping of the generic message-plane reduction
// (derive-documents.ts): the async fetching (one prefix scan per
// derivation, per family address) plus the entity/lifecycle
// knowledge only this family has. Read-only and additive — no
// route, adapter, or seed row reads any of this yet (Task 5 wires
// the route); tests/drift-ideas.test.ts is the proof of equality
// against the old plane.

const IDEAS_TABLE = 'ideas';
const DELETED_STATE = 'deleted';

function ideasUriPrefix(organization: Id): string {
    return canonicalUriPrefix(organization, '/ideas/');
}

function submissionsUriPrefix(
    organization: Id,
    ideaId: Id,
): string {
    return canonicalUriPrefix(
        organization, '/ideas/' + ideaId + '/submissions/',
    );
}

// The derived entity: the head document's body minus the
// lifecycle trio (state/state_at/state_event_id, simply never
// copied across) plus organization_id stamped from the
// derivation's OWN organization parameter — never the body's own
// value. A create body omits organization_id; the org-scoped
// store stamps it on the old plane, and the prefix scanned here
// already IS that same org, so the stamp is unconditional.
function ideaEntityOf(
    document: DerivedDocument,
    organization: Id,
): IdeaEntity {
    const body = document.body;
    return {
        id: document.uriId,
        organization_id: organization,
        title: pickString(body, 'title'),
        position: pickNumber(body, 'position'),
        problem_statement: pickString(body, 'problem_statement'),
        target_users: pickString(body, 'target_users'),
        proposed_solution: pickString(body, 'proposed_solution'),
        expected_outcome: pickString(body, 'expected_outcome'),
        success_metrics: pickString(body, 'success_metrics'),
    };
}

// One entry in an idea's own lifecycle sequence: the trio a
// document PUT's body carries, plus which identity is credited as
// its author. Deliberately separate from DerivedDocument — the
// entity's OTHER fields follow arrival order (whichever PUT
// landed last), but which lifecycle event is CURRENT follows the
// trio's own (state_at, state_event_id), never arrival order and
// never the envelope's `at` (postIdeaDocumentOp's genesis-wins-
// under-skew guarantee, reproduced here).
interface IdeaLifecycleEvent {
    readonly stateEventId: Id;
    readonly state: string;
    readonly stateAt: string;
    readonly memberId: Id;
}

// Walk an idea's pairs in ARRIVAL order and keep the FIRST
// occurrence of each distinct state_event_id: a later PUT
// resending the same trio (postIdeaDocumentOp's MEMBER_ID CAVEAT
// — an unchanged-state edit replays the STORED head's member_id)
// is a duplicate, not a new lifecycle event, so its own requester
// never surfaces as an author.
function ideaLifecycleEvents(
    pairs: readonly DocumentPair[],
): IdeaLifecycleEvent[] {
    const seen = new Set<Id>();
    const events: IdeaLifecycleEvent[] = [];
    for (const pair of pairs) {
        const stateEventId = pickString(
            pair.body, 'state_event_id',
        );
        if (seen.has(stateEventId)) continue;
        seen.add(stateEventId);
        events.push({
            stateEventId,
            state: pickString(pair.body, 'state'),
            stateAt: pickString(pair.body, 'state_at'),
            memberId: pair.requesterIdentityId,
        });
    }
    return events;
}

// One StateEntity row per lifecycle event, (state_at, id)
// ascending — the SAME order store-state.ts's getAllForIn returns
// the real states table rows in.
function stateHistoryFrom(
    events: readonly IdeaLifecycleEvent[],
    ideaId: Id,
): StateEntity[] {
    const rows: StateEntity[] = events.map((event) => ({
        id: event.stateEventId,
        entity_id: ideaId,
        state: event.state,
        member_id: event.memberId,
        at: event.stateAt,
    }));
    return rows.sort((a, b) =>
        a.at < b.at ? -1
            : a.at > b.at ? 1
                : a.id < b.id ? -1
                    : a.id > b.id ? 1
                        : 0);
}

// The CURRENT lifecycle state: the (state_at, state_event_id)
// reduction over an idea's FULL history — a later `at` wins, an
// equal `at` falls to the larger id — never arrival order, never
// the envelope `at`s, so a clock-skewed transition (an older
// state_at than genesis) never displaces genesis. Mirrors
// StateStore.getCurrentForIn's own (at, id) reduction over the
// real states table exactly (shared/ledger-reduction.ts's default
// compare).
function currentIdeaState(
    history: readonly StateEntity[],
): string | undefined {
    return latestByKey(history, () => 'current')
        .get('current')?.state;
}

async function fetchIdeaPairs(
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
        documents: deriveDocumentsAt(requests, responses, prefix),
        pairs: documentPairsAt(requests, responses, prefix),
    };
}

// id-lex ordered (the IndexedDB reference), deleted-filtered —
// the head lifecycle state 'deleted' excludes an idea exactly as
// EntityStore's states-log tombstone filter does today (archived
// ideas are NOT filtered here; ideaIsVisible does that downstream,
// untouched).
export async function deriveIdeas(
    db: DbAdapter,
    organization: Id,
): Promise<IdeaEntity[]> {
    const prefix = ideasUriPrefix(organization);
    const { documents, pairs } = await fetchIdeaPairs(db, prefix);
    const pairsByIdeaId = new Map<Id, DocumentPair[]>();
    for (const pair of pairs) {
        const list = pairsByIdeaId.get(pair.uriId);
        if (list === undefined) {
            pairsByIdeaId.set(pair.uriId, [pair]);
        } else {
            list.push(pair);
        }
    }
    const ideas: IdeaEntity[] = [];
    for (const [ideaId, document] of documents) {
        const history = stateHistoryFrom(
            ideaLifecycleEvents(pairsByIdeaId.get(ideaId) ?? []),
            ideaId,
        );
        if (currentIdeaState(history) === DELETED_STATE) continue;
        ideas.push(ideaEntityOf(document, organization));
    }
    return ideas.sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export async function deriveIdea(
    db: DbAdapter,
    organization: Id,
    ideaId: Id,
): Promise<IdeaEntity> {
    const prefix = ideasUriPrefix(organization);
    const { documents, pairs } = await fetchIdeaPairs(db, prefix);
    const document = documents.get(ideaId);
    if (document === undefined) {
        throw new EntityNotFoundError(IDEAS_TABLE, ideaId);
    }
    const history = stateHistoryFrom(
        ideaLifecycleEvents(
            pairs.filter((pair) => pair.uriId === ideaId),
        ),
        ideaId,
    );
    if (currentIdeaState(history) === DELETED_STATE) {
        throw new EntityNotFoundError(IDEAS_TABLE, ideaId);
    }
    return ideaEntityOf(document, organization);
}

export async function deriveIdeaSubmissions(
    db: DbAdapter,
    organization: Id,
    ideaId: Id,
): Promise<IdeaSubmissionEntity[]> {
    const prefix = submissionsUriPrefix(organization, ideaId);
    const [requests, responses] = await Promise.all([
        db.requests.getAllWhere('uri_prefix', prefix),
        db.responses.getAllWhere('uri_prefix', prefix),
    ]);
    const documents = deriveDocumentsAt(requests, responses, prefix);
    const submissions: IdeaSubmissionEntity[] = [];
    for (const [submissionId, document] of documents) {
        submissions.push({
            id: submissionId,
            idea_id: pickString(document.body, 'idea_id'),
            member_id: pickString(document.body, 'member_id'),
            at: pickString(document.body, 'at'),
        });
    }
    return submissions.sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// One row per pair whose state_event_id is NEW — the document
// sequence IS the history, (state_at, id) ascending. Returns every
// event regardless of current lifecycle state (deletion is just
// another transition here) — the deleted-filter lives in
// deriveIdeas/deriveIdea alone, mirroring how the real states
// table's getAllFor never filters either.
export async function deriveIdeaStateHistory(
    db: DbAdapter,
    organization: Id,
    ideaId: Id,
): Promise<StateEntity[]> {
    const prefix = ideasUriPrefix(organization);
    const { pairs } = await fetchIdeaPairs(db, prefix);
    return stateHistoryFrom(
        ideaLifecycleEvents(
            pairs.filter((pair) => pair.uriId === ideaId),
        ),
        ideaId,
    );
}
