import type { DbAdapter } from './db.ts';
import { EntityNotFoundError } from './db.ts';
import type { Id, ProjectEntity, StateEntity } from './types.ts';
import { pickString, pickNumber } from './validators.ts';
import { latestByKey } from '../shared/ledger-reduction.ts';
import { canonicalUriPrefix } from './message-pair.ts';
import {
    deriveDocumentsAt,
    documentPairsAt,
    type DerivedDocument,
    type DocumentPair,
} from './derive-documents.ts';

// Projects' own reshaping of the generic message-plane reduction
// (derive-documents.ts): the async fetching (one prefix scan per
// derivation, per family address) plus the entity/lifecycle
// knowledge only this family has. Read-only and additive — no
// route, adapter, or seed row reads any of this yet (Task 6 wires
// the route); tests/drift-projects.test.ts is the proof of
// equality against the old plane. Structurally mirrors
// derive-ideas.ts (same private helper shapes, renamed for
// projects) — a conversion-born project derives identically to a
// PUT-born one, so this module carries no conversion special
// case anywhere.

const PROJECTS_TABLE = 'projects';
const DELETED_STATE = 'deleted';

function projectsUriPrefix(organization: Id): string {
    return canonicalUriPrefix(organization, '/projects/');
}

// The derived entity: the head document's body minus the
// lifecycle trio (state/state_at/state_event_id, simply never
// copied across) plus organization_id stamped from the
// derivation's OWN organization parameter — never the body's own
// value. A create body omits organization_id; the org-scoped
// store stamps it on the old plane, and the prefix scanned here
// already IS that same org, so the stamp is unconditional.
function projectEntityOf(
    document: DerivedDocument,
    organization: Id,
): ProjectEntity {
    const body = document.body;
    return {
        id: document.uriId,
        organization_id: organization,
        title: pickString(body, 'title'),
        description: pickString(body, 'description'),
        progress: pickNumber(body, 'progress'),
        start_date: pickString(body, 'start_date'),
        target_end_date:
            pickString(body, 'target_end_date'),
        estimated_cost: pickNumber(body, 'estimated_cost'),
        actual_cost: pickNumber(body, 'actual_cost'),
        position: pickNumber(body, 'position'),
    };
}

// One entry in a project's own lifecycle sequence: the trio a
// document PUT's body carries, plus which identity is credited as
// its author. Deliberately separate from DerivedDocument — the
// entity's OTHER fields follow arrival order (whichever PUT
// landed last), but which lifecycle event is CURRENT follows the
// trio's own (state_at, state_event_id), never arrival order and
// never the envelope's `at` (postProjectDocumentOp's genesis-
// wins-under-skew guarantee, reproduced here).
interface ProjectLifecycleEvent {
    readonly stateEventId: Id;
    readonly state: string;
    readonly stateAt: string;
    readonly memberId: Id;
}

// Walk a project's pairs in ARRIVAL order and keep the FIRST
// occurrence of each distinct state_event_id: a later PUT
// resending the same trio (postProjectDocumentOp's MEMBER_ID
// CAVEAT — an unchanged-state edit replays the STORED head's
// member_id) is a duplicate, not a new lifecycle event, so its
// own requester never surfaces as an author.
function projectLifecycleEvents(
    pairs: readonly DocumentPair[],
): ProjectLifecycleEvent[] {
    const seen = new Set<Id>();
    const events: ProjectLifecycleEvent[] = [];
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
    events: readonly ProjectLifecycleEvent[],
    projectId: Id,
): StateEntity[] {
    const rows: StateEntity[] = events.map((event) => ({
        id: event.stateEventId,
        entity_id: projectId,
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
// reduction over a project's FULL history — a later `at` wins, an
// equal `at` falls to the larger id — never arrival order, never
// the envelope `at`s, so a clock-skewed transition (an older
// state_at than genesis) never displaces genesis. Mirrors
// StateStore.getCurrentForIn's own (at, id) reduction over the
// real states table exactly (shared/ledger-reduction.ts's default
// compare).
function currentProjectState(
    history: readonly StateEntity[],
): string | undefined {
    return latestByKey(history, () => 'current')
        .get('current')?.state;
}

async function fetchProjectPairs(
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
// the head lifecycle state 'deleted' excludes a project exactly
// as EntityStore's states-log tombstone filter does today
// (declined/archived projects are NOT filtered here — client-side
// concerns, untouched).
export async function deriveProjects(
    db: DbAdapter,
    organization: Id,
): Promise<ProjectEntity[]> {
    const prefix = projectsUriPrefix(organization);
    const { documents, pairs } =
        await fetchProjectPairs(db, prefix);
    const pairsByProjectId = new Map<Id, DocumentPair[]>();
    for (const pair of pairs) {
        const list = pairsByProjectId.get(pair.uriId);
        if (list === undefined) {
            pairsByProjectId.set(pair.uriId, [pair]);
        } else {
            list.push(pair);
        }
    }
    const projects: ProjectEntity[] = [];
    for (const [projectId, document] of documents) {
        const history = stateHistoryFrom(
            projectLifecycleEvents(
                pairsByProjectId.get(projectId) ?? [],
            ),
            projectId,
        );
        if (currentProjectState(history) === DELETED_STATE) {
            continue;
        }
        projects.push(projectEntityOf(document, organization));
    }
    return projects.sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export async function deriveProject(
    db: DbAdapter,
    organization: Id,
    projectId: Id,
): Promise<ProjectEntity> {
    const prefix = projectsUriPrefix(organization);
    const { documents, pairs } =
        await fetchProjectPairs(db, prefix);
    const document = documents.get(projectId);
    if (document === undefined) {
        throw new EntityNotFoundError(
            PROJECTS_TABLE, projectId,
        );
    }
    const history = stateHistoryFrom(
        projectLifecycleEvents(
            pairs.filter((pair) => pair.uriId === projectId),
        ),
        projectId,
    );
    if (currentProjectState(history) === DELETED_STATE) {
        throw new EntityNotFoundError(
            PROJECTS_TABLE, projectId,
        );
    }
    return projectEntityOf(document, organization);
}

// One row per pair whose state_event_id is NEW — the document
// sequence IS the history, (state_at, id) ascending. Returns every
// event regardless of current lifecycle state (deletion is just
// another transition here) — the deleted-filter lives in
// deriveProjects/deriveProject alone, mirroring how the real
// states table's getAllFor never filters either. NOT routed —
// drift-proof only.
export async function deriveProjectStateHistory(
    db: DbAdapter,
    organization: Id,
    projectId: Id,
): Promise<StateEntity[]> {
    const prefix = projectsUriPrefix(organization);
    const { pairs } = await fetchProjectPairs(db, prefix);
    return stateHistoryFrom(
        projectLifecycleEvents(
            pairs.filter((pair) => pair.uriId === projectId),
        ),
        projectId,
    );
}
