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
// with sibling ops (e.g., a DELETE op that hard-deletes
// the entity row, or a PUT op that flips an enum) inside
// one ctx.commit batch — both ops land as one transaction.
// The current human worker is the actor; nowUtc the moment.
// Caller does NOT pre-resolve the worker — the helper owns
// that read so every site speaks the same vocabulary.
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

// The parallel reader that answers "which entities are
// currently in state=deleted?" by scanning the states log
// and keeping the latest event per entity_id (>= tiebreak
// so same-millisecond writes resolve to insertion order —
// the deterministic order the append-only log already
// captures). Sibling of getDeprecatedObjectiveIds in
// objectives.ts; the two share a comparator shape.
//
// Stage 5 introduces this as the parallel reader; only
// the parity test consumes it. Stage 6 switches
// EntityStore reads to consult this log instead of the
// tombstone; Stage 7+ retires the tombstone.
export async function getAllDeletedIdsFromStates(
    ctx: RequestContext,
): Promise<Set<Id>> {
    const rows = await ctx.GET<StateEntity[]>('states');
    const latestByEntity = new Map<Id, StateEntity>();
    for (const row of rows) {
        const seen = latestByEntity.get(row.entity_id);
        if (seen === undefined || row.at >= seen.at) {
            latestByEntity.set(row.entity_id, row);
        }
    }
    const deleted = new Set<Id>();
    for (const [entityId, row] of latestByEntity) {
        if (row.state === 'deleted') {
            deleted.add(entityId);
        }
    }
    return deleted;
}
