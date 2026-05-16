import type {
    WorkerId,
    HumanWorkerEntity,
    WorkerStatus,
} from '../../../api/types.ts';
import { HumanWorker } from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    buildStateEventOp,
} from './state-events.ts';
import {
    createSubscriptionChannel,
} from '../channels.ts';
export {
    HumanWorker,
    WORKER_STATUS_CONFIG,
    isWorkerStatus,
} from '../../../api/types.ts';
export type {
    WorkerId,
    HumanWorkerEntity,
    WorkerStatus,
} from '../../../api/types.ts';

const humanWorkerChanges =
    createSubscriptionChannel(['workers', 'states']);

export function subscribeHumanWorkerChanges(
    fn: () => void,
): () => void {
    return humanWorkerChanges.subscribe(fn);
}

export function notifyHumanWorkerChange(): void {
    humanWorkerChanges.notify();
}

export async function getHumanWorkerRows(
    ctx: RequestContext,
): Promise<HumanWorkerEntity[]> {
    return ctx.GET<HumanWorkerEntity[]>('workers');
}

export async function getHumanWorkerMap(
    ctx: RequestContext,
): Promise<Map<WorkerId, HumanWorker>> {
    const rows = await getHumanWorkerRows(ctx);
    return new Map(
        rows.map(
            entity => [
                entity.id,
                new HumanWorker(entity),
            ],
        ),
    );
}

export async function getCurrentHumanWorker(
    ctx: RequestContext,
): Promise<HumanWorkerEntity> {
    return ctx.GET<HumanWorkerEntity>(
        'current-worker',
    );
}

const TOP_HUMAN_WORKER_COUNT = 6;

export async function getHumanWorkers(
    ctx: RequestContext,
): Promise<HumanWorker[]> {
    const workerMap = await getHumanWorkerMap(ctx);
    return Array.from(workerMap.values());
}

export function featuredHumanWorkers(
    workers: HumanWorker[],
): HumanWorker[] {
    return workers
        .filter(worker => worker.hasDepartment())
        .slice(0, TOP_HUMAN_WORKER_COUNT);
}

export async function getHumanWorker(
    ctx: RequestContext,
    id: string,
): Promise<HumanWorker> {
    const row = await ctx.GET<HumanWorkerEntity>(
        `workers/${id}`,
    );
    return new HumanWorker(row);
}

export async function getHumanWorkerRow(
    ctx: RequestContext,
    id: string,
): Promise<HumanWorkerEntity> {
    return ctx.GET<HumanWorkerEntity>(
        `workers/${id}`,
    );
}

export async function putHumanWorker(
    ctx: RequestContext,
    id: string,
    entity: Omit<HumanWorkerEntity, 'id'>,
): Promise<void> {
    await ctx.PUT(`workers/${id}`, entity);
    humanWorkerChanges.notify();
}

// Human-worker row write paired with a states-log
// event in one ctx.commit batch. Use at every site
// that creates a worker or moves its status.
// putHumanWorker remains for pure edits (phone,
// bio, title) that do not change status. The state
// value IS the status string — the worker lifecycle
// alphabet (active / pending / deactivated) shares
// one vocabulary with the log.
export async function postHumanWorkerStateChange(
    ctx: RequestContext,
    id: string,
    entity: Omit<HumanWorkerEntity, 'id'>,
    state: WorkerStatus,
): Promise<void> {
    const workerBody =
        entity as unknown as Record<string, unknown>;
    await ctx.commit({
        ops: [
            {
                method: 'put',
                resource: `workers/${id}`,
                body: workerBody,
            },
            await buildStateEventOp(ctx, id, state),
        ],
    });
    humanWorkerChanges.notify();
}
