import type { Id, StateEntity } from '../../../api/types.ts';
import { nowUtc } from '../../../api/types.ts';
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

// The state-events parity reader for a work order's
// current position. Returns the to_node_id of the
// latest non-claim event for entity_id = workOrderId,
// or null if no transitions have been recorded. The
// production reader (over work_order_transitions)
// continues to drive UI rendering in Stage 7a; this
// reader runs alongside it in tests until Stage 7b
// switches the production path.
export async function getWorkOrderCurrentNodeFromStates(
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

// The state-events parity reader for a work order's
// active claim. Returns the worker who currently holds
// the claim and the moment they took it — or null if
// the latest claim-vocabulary event is a release or
// expiration, or if no claim events exist. The
// production reader (over work_order_claims, with the
// isExpiredClaim helper) continues to drive UI
// rendering in Stage 7a.
export async function getWorkOrderActiveClaimFromStates(
    ctx: RequestContext,
    workOrderId: Id,
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
    return { workerId: latest.worker_id, at: latest.at };
}
