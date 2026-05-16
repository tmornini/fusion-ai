import type {
    Id, IdeaStatus, ReadinessLevel, StateEntity,
} from '../../../api/types.ts';
import {
    assertIdeaStatus,
    assertReadinessLevel,
    msSinceUtc,
    MS_PER_SECOND,
    nowUtc,
} from '../../../api/types.ts';
import type { RequestContext, WriteOp } from './shared.ts';
import {
    generateCryptoSafeBase62,
} from './crypto-safe-base62.ts';
import {
    getCurrentHumanWorker,
} from './workers.ts';

// Constructs a single PUT op against the states table —
// the atomic seam between an entity-lifecycle adapter and
// the append-only event log. Composed at the call site
// with sibling ops inside one ctx.commit batch — every op
// lands as one transaction. The current human worker is
// the actor; nowUtc the moment. Caller does NOT pre-
// resolve the worker — the helper owns that read so every
// site speaks the same vocabulary.
export async function buildStateEventOp(
    ctx: RequestContext,
    entityId: Id,
    state: string,
): Promise<WriteOp> {
    const worker = await getCurrentHumanWorker(ctx);
    const eventId = generateCryptoSafeBase62();
    return {
        method: 'put',
        resource: `states/${eventId}`,
        body: {
            entity_id: entityId,
            state,
            worker_id: worker.id,
            at: nowUtc(),
        },
    };
}

// The closed claim vocabulary. Three strings: a claim
// either exists ('claimed'), is voluntarily relinquished
// ('claim_released'), or is forcibly superseded by a
// newer claim ('claim_expired'). Every other state
// string on a work_order entity_id is a node id
// recording a transition. The byte-level split between
// the two families is unambiguous: claim strings are
// snake-cased English, node ids are base62 tokens.
const CLAIM_STATES = new Set([
    'claimed',
    'claim_released',
    'claim_expired',
]);

function isClaimState(state: string): boolean {
    return CLAIM_STATES.has(state);
}

function latestByAt(
    events: readonly StateEntity[],
): StateEntity | null {
    let latest: StateEntity | null = null;
    for (const ev of events) {
        if (latest === null || ev.at >= latest.at) {
            latest = ev;
        }
    }
    return latest;
}

// A transition event in the shape flow-stats-aggregate
// and the workbox detail presenter expect. Derived
// from the states log: each non-claim event for a
// work order is a transition into state=to_node_id;
// from_node_id is the prior event's state, '' for the
// very first event (matching the creation-transition
// convention). The id is the underlying state event's
// id — the foreign-key target for state_field_values.
export interface TransitionEvent {
    id: Id;
    work_order_id: Id;
    from_node_id: Id;
    to_node_id: Id;
    worker_id: Id;
    at: string;
}

// Returns the work order's current node id — the
// state of the latest non-claim event for
// entity_id = workOrderId, or null if no
// transitions have been recorded.
export async function getWorkOrderCurrentNodeId(
    ctx: RequestContext,
    workOrderId: Id,
): Promise<Id | null> {
    const events = await ctx.GET<StateEntity[]>(
        `entity-states/${workOrderId}/history`,
    );
    const transitions = events.filter(
        ev => !isClaimState(ev.state),
    );
    const latest = latestByAt(transitions);
    return latest === null ? null : latest.state;
}

// Returns the worker holding the active claim and
// the moment they took it — or null if no claim is
// live. A 'claimed' event older than lockTimeout is
// implicitly expired and reads as null even if no
// 'claim_expired' / 'claim_released' event has yet
// superseded it. The materialized 'claim_expired'
// event (written by postWorkOrderClaim when a new
// claim notices a stale prior) is the durable
// record of the same condition; the two are
// consistent.
export async function getWorkOrderActiveClaim(
    ctx: RequestContext,
    workOrderId: Id,
    lockTimeout: number,
): Promise<{ workerId: Id; at: string } | null> {
    const events = await ctx.GET<StateEntity[]>(
        `entity-states/${workOrderId}/history`,
    );
    const claims = events.filter(
        ev => isClaimState(ev.state),
    );
    const latest = latestByAt(claims);
    if (latest === null || latest.state !== 'claimed') {
        return null;
    }
    const elapsedMs = msSinceUtc(latest.at);
    if (elapsedMs >= lockTimeout * MS_PER_SECOND) {
        return null;
    }
    return { workerId: latest.worker_id, at: latest.at };
}

// Project the non-claim events for one work order into
// the TransitionEvent shape consumed by the workbox
// detail presenter and (via the bulk variant below)
// flow-stats-aggregate. The first event carries
// from_node_id='' — the existing convention for
// creation transitions.
function projectTransitions(
    workOrderId: Id,
    events: readonly StateEntity[],
): TransitionEvent[] {
    const transitions = events
        .filter(ev => !isClaimState(ev.state))
        .toSorted((a, b) => a.at.localeCompare(b.at));
    const out: TransitionEvent[] = [];
    let prior = '';
    for (const ev of transitions) {
        out.push({
            id: ev.id,
            work_order_id: workOrderId,
            from_node_id: prior,
            to_node_id: ev.state,
            worker_id: ev.worker_id,
            at: ev.at,
        });
        prior = ev.state;
    }
    return out;
}

// Returns the ordered transition history for one work
// order, in the shape the workbox detail presenter
// consumes. Read-once per work-order detail page load.
export async function getWorkOrderTransitionEvents(
    ctx: RequestContext,
    workOrderId: Id,
): Promise<TransitionEvent[]> {
    const events = await ctx.GET<StateEntity[]>(
        `entity-states/${workOrderId}/history`,
    );
    return projectTransitions(workOrderId, events);
}

// Bulk variant for flow-stats-aggregate, which needs
// the transition history for every work order on a
// flow at once. One GET against /states scans the log,
// then per-entity grouping + projection happens in JS.
// O(N) on events; Postgres will use an index on
// entity_id.
export async function getTransitionEventsByWorkOrder(
    ctx: RequestContext,
): Promise<Map<Id, TransitionEvent[]>> {
    const all = await ctx.GET<StateEntity[]>('states');
    const byEntity = new Map<Id, StateEntity[]>();
    for (const ev of all) {
        if (isClaimState(ev.state)) continue;
        const list = byEntity.get(ev.entity_id);
        if (list) {
            list.push(ev);
        } else {
            byEntity.set(ev.entity_id, [ev]);
        }
    }
    const out = new Map<Id, TransitionEvent[]>();
    for (const [entityId, events] of byEntity) {
        out.set(
            entityId,
            projectTransitions(entityId, events),
        );
    }
    return out;
}

// Collapse the two-dimensional (status, readiness)
// shape of an idea into a single composite state
// string. When status is 'active' the readiness
// completes the picture — three values
// (active:ready, active:needs-info, active:incomplete).
// When status is anything else the readiness has no
// semantic effect, so the composite IS the status.
// Six non-active values: in-review, approved,
// promoted, sent-back, archived, deleted. Nine in
// total. Transitional helper — Stage 8c retires it
// alongside the readiness column.
export function compositeStateForIdea(
    status: IdeaStatus,
    readiness: ReadinessLevel,
): string {
    if (status === 'active') {
        return `active:${readiness}`;
    }
    return status;
}

// Inverse of compositeStateForIdea — splits the
// composite back into (status, readiness). When the
// composite begins with 'active:' the suffix is the
// readiness; otherwise the composite IS the status
// and the readiness is null (the dimension collapsed
// on the way in). Used by parity tests and Stage 8b
// readers that need both dimensions back.
export function ideaStateToStatusReadiness(
    state: string,
): {
    status: IdeaStatus;
    readiness: ReadinessLevel | null;
} {
    const ACTIVE_PREFIX = 'active:';
    if (state.startsWith(ACTIVE_PREFIX)) {
        const readiness =
            state.slice(ACTIVE_PREFIX.length);
        return {
            status: 'active',
            readiness: assertReadinessLevel(
                readiness, 'idea composite state',
            ),
        };
    }
    const status = assertIdeaStatus(
        state, 'idea composite state',
    );
    if (status === 'active') {
        throw new Error(
            'expected non-active IdeaStatus for'
            + ' idea composite state, got '
            + state,
        );
    }
    return { status, readiness: null };
}

// Read the latest composite state for one idea from
// the states log. Returns null when no state event
// has yet been recorded (an idea whose creation
// pre-dates dual-write). Stage 8b switches
// production readers to consume this; today only
// the parity test does.
export async function getCurrentIdeaStateFromStates(
    ctx: RequestContext,
    ideaId: Id,
): Promise<string | null> {
    const events = await ctx.GET<StateEntity[]>(
        `entity-states/${ideaId}/history`,
    );
    const latest = latestByAt(events);
    return latest === null ? null : latest.state;
}
