import type { Id } from '../../../api/types.ts';
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
