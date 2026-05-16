import type {
    IdeaEntity,
    IdeaSubmissionEntity,
    ProjectEntity,
} from '../../../api/types.ts';
import {
    Idea, nowUtc,
    ideaIsVisible,
} from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    getCurrentHumanWorker,
} from './workers.ts';
import {
    getWorkerMap,
    workerName,
} from './workers-union.ts';
import {
    notifyProjectChange,
} from './projects.ts';
import {
    buildStateEventOp,
    compositeStateForIdea,
} from './state-events.ts';
import {
    createSubscriptionChannel,
} from '../channels.ts';

const ideaChanges =
    createSubscriptionChannel(
        ['ideas', 'idea-submissions', 'states'],
    );

export function subscribeIdeaChanges(
    fn: () => void,
): () => void {
    return ideaChanges.subscribe(fn);
}

export {
    Idea,
    type IdeaStatus,
    type IdeaEntity,
    isIdeaStatus,
    IDEA_STATUS_CONFIG,
} from '../../../api/types.ts';

export async function getIdeaRows(
    ctx: RequestContext,
): Promise<IdeaEntity[]> {
    return ctx.GET<IdeaEntity[]>('ideas');
}

async function getVisibleIdeaRows(
    ctx: RequestContext,
): Promise<IdeaEntity[]> {
    const all = await getIdeaRows(ctx);
    return all.filter(ideaIsVisible);
}

export async function getIdeaRow(
    ctx: RequestContext,
    id: string,
): Promise<IdeaEntity> {
    return ctx.GET<IdeaEntity>(
        `ideas/${id}`,
    );
}

async function getIdeaSubmissionRows(
    ctx: RequestContext,
): Promise<IdeaSubmissionEntity[]> {
    return ctx.GET<
        IdeaSubmissionEntity[]
    >('idea-submissions');
}

async function getIdeaSubmissionRow(
    ctx: RequestContext,
    ideaId: string,
): Promise<IdeaSubmissionEntity> {
    const all = await getIdeaSubmissionRows(ctx);
    const found = all.find(
        s => s.idea_id === ideaId,
    );
    if (!found) {
        throw new Error(
            'Idea submission not found'
                + ' for idea ' + ideaId,
        );
    }
    return found;
}

export type {
    IdeaSubmissionEntity,
} from '../../../api/types.ts';

export interface IdeaWithSubmitter {
    readonly idea: Idea;
    readonly entity: IdeaEntity;
    readonly submitterName: string;
    readonly submittedAt: string;
}

export async function getIdeas(
    ctx: RequestContext,
): Promise<IdeaWithSubmitter[]> {
    const [
        ideas, workerMap, submissions,
    ] = await Promise.all([
        getVisibleIdeaRows(ctx),
        getWorkerMap(ctx),
        getIdeaSubmissionRows(ctx),
    ]);
    const submissionMap = new Map(
        submissions.map(s => [s.idea_id, s]),
    );
    return ideas.map(row => {
        const submission =
            submissionMap.get(row.id);
        if (!submission) {
            throw new Error(
                'Idea has no submission: '
                + row.id,
            );
        }
        return {
            idea: new Idea(row),
            entity: row,
            submitterName: workerName(
                workerMap,
                submission.worker_id,
            ),
            submittedAt:
                submission.created_at,
        };
    });
}

export async function getIdea(
    ctx: RequestContext,
    ideaId: string,
): Promise<IdeaWithSubmitter> {
    const [
        row, submission, workerMap,
    ] = await Promise.all([
        getIdeaRow(ctx, ideaId),
        getIdeaSubmissionRow(ctx, ideaId),
        getWorkerMap(ctx),
    ]);
    return {
        idea: new Idea(row),
        entity: row,
        submitterName: workerName(
            workerMap, submission.worker_id,
        ),
        submittedAt: submission.created_at,
    };
}

export async function putIdea(
    ctx: RequestContext,
    id: string,
    entity: Omit<IdeaEntity, 'id'>,
): Promise<void> {
    await ctx.PUT(`ideas/${id}`, entity);
    ideaChanges.notify();
}

// Idea-row write paired with a states-log event in
// one ctx.commit batch. The composite state is
// computed at the call site from the values being
// committed — never from a stale prior read. Use this
// at every site that mutates status or readiness;
// putIdea remains for writes (edits, position
// reorders) that do not move the composite.
export async function postIdeaStateChange(
    ctx: RequestContext,
    id: string,
    entity: Omit<IdeaEntity, 'id'>,
): Promise<void> {
    const ideaBody =
        entity as unknown as Record<string, unknown>;
    await ctx.commit({
        ops: [
            {
                method: 'put',
                resource: `ideas/${id}`,
                body: ideaBody,
            },
            await buildStateEventOp(
                ctx,
                id,
                compositeStateForIdea(
                    entity.status,
                    entity.readiness,
                ),
            ),
        ],
    });
    ideaChanges.notify();
}

export async function putIdeaSubmission(
    ctx: RequestContext,
    submissionId: string,
    ideaId: string,
): Promise<void> {
    const worker = await getCurrentHumanWorker(ctx);
    await ctx.PUT(
        'idea-submissions/'
            + submissionId,
        {
            idea_id: ideaId,
            worker_id: worker.id,
            created_at: nowUtc(),
        },
    );
}

// Idempotent: retry recovers from partial failure.
// Inlined writes (rather than delegating to the
// putProject / putIdea helpers) so the project and
// idea writes commit together as one logical
// operation. The state event lands in the same batch
// so the composite state on the idea moves to
// 'promoted' atomically with the row update. The
// helpers stay — they have other callers whose
// writes are genuinely independent.
export async function postIdeaConversion(
    ctx: RequestContext,
    ideaId: string,
    projectId: string,
    project: Omit<ProjectEntity, 'id'>,
    promotedIdea: Omit<IdeaEntity, 'id'>,
): Promise<void> {
    type AnyBody = Record<string, unknown>;
    const projectBody =
        project as unknown as AnyBody;
    const ideaBody =
        promotedIdea as unknown as AnyBody;
    await ctx.commit({
        ops: [
            {
                method: 'put',
                resource:
                    `projects/${projectId}`,
                body: projectBody,
            },
            {
                method: 'put',
                resource: `ideas/${ideaId}`,
                body: ideaBody,
            },
            await buildStateEventOp(
                ctx,
                ideaId,
                compositeStateForIdea(
                    promotedIdea.status,
                    promotedIdea.readiness,
                ),
            ),
        ],
    });
    notifyProjectChange();
    ideaChanges.notify();
}
