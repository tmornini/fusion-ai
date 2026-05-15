import type {
    Objective,
    ObjectiveId,
    ObjectiveRevision,
    DeprecatedObjective,
} from '../../../api/types.ts';
import { nowUtc } from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    createSubscriptionChannel,
} from '../channels.ts';

const objectiveChanges =
    createSubscriptionChannel([
        'objectives',
        'objective_revisions',
        'deprecated_objectives',
    ]);

export function subscribeObjectiveChanges(
    fn: () => void,
): () => void {
    return objectiveChanges.subscribe(fn);
}

export function notifyObjectiveChange(): void {
    objectiveChanges.notify();
}

// Monotonic revision sequence counter.
// Two revisions in the same millisecond would collide
// on the composite key `${objectiveId}:${isoTimestamp}`;
// we append a zero-padded sequence to guarantee
// uniqueness while preserving lexicographic sort order.
let _revisionSeq = 0;
let _revisionSeqTs = '';
function revisionKey(
    id: ObjectiveId,
    revisedAt: string,
): string {
    if (revisedAt !== _revisionSeqTs) {
        _revisionSeqTs = revisedAt;
        _revisionSeq = 0;
    }
    const seq = _revisionSeq++;
    const suffix =
        seq === 0
            ? ''
            : `_${String(seq).padStart(3, '0')}`;
    return `${id}:${revisedAt}${suffix}`;
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
    const rows = await ctx.GET<DeprecatedObjective[]>(
        'deprecated-objectives',
    );
    return new Set(rows.map(r => r.objective_id));
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
                    `objective-revisions/`
                    + revisionKey(id, revisedAt),
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
    await ctx.commit({
        ops: [{
            method: 'put',
            resource:
                `objective-revisions/`
                + revisionKey(id, revisedAt),
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
    await ctx.commit({
        ops: [{
            method: 'put',
            resource: `deprecated-objectives/${id}`,
            body: {
                objective_id: id,
                deprecated_at: nowUtc(),
            },
        }],
    });
    notifyObjectiveChange();
}

export async function postObjectiveReactivation(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<void> {
    await ctx.commit({
        ops: [{
            method: 'delete',
            resource: `deprecated-objectives/${id}`,
        }],
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
