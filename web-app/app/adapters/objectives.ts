import type {
    Objective,
    ObjectiveId,
    ObjectiveRevision,
    StateEntity,
} from '../../../api/types.ts';
import { nowUtc } from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    createSubscriptionChannel,
} from '../channels.ts';
import {
    generateCryptoSafeBase62,
} from './crypto-safe-base62.ts';
import {
    getCurrentHumanWorker,
} from './workers.ts';

const objectiveChanges =
    createSubscriptionChannel([
        'objectives',
        'objective_revisions',
        'deprecated',
    ]);

export function subscribeObjectiveChanges(
    fn: () => void,
): () => void {
    return objectiveChanges.subscribe(fn);
}

export function notifyObjectiveChange(): void {
    objectiveChanges.notify();
}

export async function getObjective(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<Objective> {
    return ctx.GET<Objective>(
        `objectives/${id}`,
    );
}

export async function getObjectives(
    ctx: RequestContext,
): Promise<Objective[]> {
    return ctx.GET<Objective[]>('objectives');
}

export async function getDeprecatedObjectiveIds(
    ctx: RequestContext,
): Promise<Set<ObjectiveId>> {
    const rows = await ctx.GET<{ id: string }[]>(
        'deprecated',
    );
    return new Set(
        rows.map(r => r.id as ObjectiveId),
    );
}

// Stage 3 parallel reader. Reads the same truth from
// the states event log, latest-event-wins by `at`. The
// production reads remain on getDeprecatedObjectiveIds
// throughout Stage 3; the parity test asserts the two
// readers agree after every mutation. Stage 4 retires
// the tombstone reader and deletes this comment.
export async function
    getDeprecatedObjectiveIdsFromStates(
        ctx: RequestContext,
    ): Promise<Set<ObjectiveId>> {
    const rows = await ctx.GET<StateEntity[]>('states');
    const latestByEntity = new Map<string, StateEntity>();
    for (const row of rows) {
        const seen = latestByEntity.get(row.entity_id);
        if (seen === undefined || row.at > seen.at) {
            latestByEntity.set(row.entity_id, row);
        }
    }
    const deprecated = new Set<ObjectiveId>();
    for (const [entityId, row] of latestByEntity) {
        if (row.state === 'deprecated') {
            deprecated.add(entityId as ObjectiveId);
        }
    }
    return deprecated;
}

export async function getObjectiveRevisions(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<ObjectiveRevision[]> {
    const all = await ctx.GET<ObjectiveRevision[]>(
        'objective-revisions',
    );
    return all.filter(
        r => r.objective_id === id,
    );
}

export async function getActiveObjectives(
    ctx: RequestContext,
): Promise<Objective[]> {
    const [all, deprecated] = await Promise.all([
        getObjectives(ctx),
        getDeprecatedObjectiveIds(ctx),
    ]);
    return all
        .filter(o => !deprecated.has(o.id))
        .sort((a, b) => a.position - b.position);
}

export async function getCurrentObjectiveDefinition(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<{ name: string; description: string }> {
    const revs = await getObjectiveRevisions(ctx, id);
    if (revs.length === 0) {
        throw new Error(
            'no revisions for objective ' + id,
        );
    }
    revs.sort((a, b) =>
        b.revised_at.localeCompare(a.revised_at),
    );
    const latest = revs[0]!;
    return {
        name: latest.name,
        description: latest.description,
    };
}

export async function getObjectiveDefinitionAt(
    ctx: RequestContext,
    id: ObjectiveId,
    atTime: string,
): Promise<{ name: string; description: string }> {
    const revs = await getObjectiveRevisions(ctx, id);
    const eligible = revs.filter(
        r => r.revised_at <= atTime,
    );
    if (eligible.length === 0) {
        throw new Error(
            'no revision of ' + id
            + ' at or before ' + atTime,
        );
    }
    eligible.sort((a, b) =>
        b.revised_at.localeCompare(a.revised_at),
    );
    const latest = eligible[0]!;
    return {
        name: latest.name,
        description: latest.description,
    };
}

export async function postObjectiveCreation(
    ctx: RequestContext,
    id: ObjectiveId,
    name: string,
    description: string,
    position: number,
): Promise<void> {
    const revisedAt = nowUtc();
    const revisionId = generateCryptoSafeBase62();
    await ctx.commit({
        ops: [
            {
                method: 'put',
                resource: `objectives/${id}`,
                body: { position },
            },
            {
                method: 'put',
                resource:
                    `objective-revisions/${revisionId}`,
                body: {
                    objective_id: id,
                    name,
                    description,
                    revised_at: revisedAt,
                },
            },
        ],
    });
    notifyObjectiveChange();
}

export async function postObjectiveRevision(
    ctx: RequestContext,
    id: ObjectiveId,
    name: string,
    description: string,
): Promise<void> {
    const revisedAt = nowUtc();
    const revisionId = generateCryptoSafeBase62();
    await ctx.commit({
        ops: [{
            method: 'put',
            resource:
                `objective-revisions/${revisionId}`,
            body: {
                objective_id: id,
                name,
                description,
                revised_at: revisedAt,
            },
        }],
    });
    notifyObjectiveChange();
}

export async function postObjectiveDeprecation(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<void> {
    const currentWorker =
        await getCurrentHumanWorker(ctx);
    const stateEventId = generateCryptoSafeBase62();
    await ctx.commit({
        ops: [
            {
                method: 'put',
                resource: `deprecated/${id}`,
                body: {},
            },
            {
                method: 'put',
                resource: `states/${stateEventId}`,
                body: {
                    entity_id: id,
                    state: 'deprecated',
                    worker_id: currentWorker.id,
                    at: nowUtc(),
                },
            },
        ],
    });
    notifyObjectiveChange();
}

export async function postObjectiveReactivation(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<void> {
    const currentWorker =
        await getCurrentHumanWorker(ctx);
    const stateEventId = generateCryptoSafeBase62();
    await ctx.commit({
        ops: [
            {
                method: 'delete',
                resource: `deprecated/${id}`,
            },
            {
                method: 'put',
                resource: `states/${stateEventId}`,
                body: {
                    entity_id: id,
                    state: 'active',
                    worker_id: currentWorker.id,
                    at: nowUtc(),
                },
            },
        ],
    });
    notifyObjectiveChange();
}

export async function postObjectiveReordering(
    ctx: RequestContext,
    idsInOrder: ObjectiveId[],
): Promise<void> {
    const ops = idsInOrder.map((id, i) => ({
        method: 'put' as const,
        resource: `objectives/${id}`,
        body: { position: i },
    }));
    await ctx.commit({ ops });
    notifyObjectiveChange();
}
