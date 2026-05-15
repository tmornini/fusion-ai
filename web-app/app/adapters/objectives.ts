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
        'deprecated_objectives',
    );
    return new Set(rows.map(r => r.objective_id));
}

export async function getObjectiveRevisions(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<ObjectiveRevision[]> {
    const all = await ctx.GET<ObjectiveRevision[]>(
        'objective_revisions',
    );
    return all.filter(
        r => r.objective_id === id,
    );
}
