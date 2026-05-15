import type {
    Id,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    createSubscriptionChannel,
} from '../channels.ts';

const projectScoreChanges =
    createSubscriptionChannel([
        'project_objective_baseline_scores',
        'project_objective_actual_scores',
    ]);

export function subscribeProjectScoreChanges(
    fn: () => void,
): () => void {
    return projectScoreChanges.subscribe(fn);
}

export function notifyProjectScoreChange(): void {
    projectScoreChanges.notify();
}

export async function getBaselineScoresForProject(
    ctx: RequestContext,
    projectId: Id,
): Promise<ProjectObjectiveBaselineScore[]> {
    const all = await ctx.GET<
        ProjectObjectiveBaselineScore[]
    >('project-objective-baseline-scores');
    return all.filter(
        r => r.project_id === projectId,
    );
}

export async function getActualScoresForProject(
    ctx: RequestContext,
    projectId: Id,
): Promise<ProjectObjectiveActualScore[]> {
    const all = await ctx.GET<
        ProjectObjectiveActualScore[]
    >('project-objective-actual-scores');
    return all.filter(
        r => r.project_id === projectId,
    );
}

export async function getProjectScoring(
    ctx: RequestContext,
    projectId: Id,
): Promise<{
    baseline: ProjectObjectiveBaselineScore[];
    actual: ProjectObjectiveActualScore[];
}> {
    const [baseline, actual] = await Promise.all([
        getBaselineScoresForProject(ctx, projectId),
        getActualScoresForProject(ctx, projectId),
    ]);
    return { baseline, actual };
}
