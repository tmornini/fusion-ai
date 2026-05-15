import type {
    Objective,
    ObjectiveId,
    ObjectiveRevision,
    DeprecatedObjective,
} from '../../../api/types.ts';
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
