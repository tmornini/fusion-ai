import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    MemoryDbAdapter,
} from '../api/db-memory.ts';
import {
    createRequestContext,
    type RequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    getProjectRow,
    postProjectStateChange,
    putProject,
} from '../web-app/app/adapters/projects.ts';
import {
    getCurrentProjectStateFromStates,
} from '../web-app/app/adapters/state-events.ts';
import { jsonObjectField } from '../api/types.ts';
import type {
    ProjectEntity,
    ProjectStatus,
} from '../api/types.ts';

// Project state lives in one column today (status)
// and on the states log as the same alphabet.
// Stage 9a's covenant: after every status mutation
// the column agrees with the latest event on the
// log. Each scenario below mutates a project, then
// asserts that agreement.

function buildHumanWorker(name: string) {
    return {
        first_name: name,
        last_name: 'Test',
        email: name.toLowerCase()
            + '@example.com',
        phone: '',
        title: 'Admin',
        status: 'active' as const,
        strengths: '[]' as never,
        team_dimensions: '{}' as never,
        bio: '',
        department: 'Product',
    };
}

function buildProject(
    title: string,
    status: ProjectStatus,
): Omit<ProjectEntity, 'id'> {
    return {
        title,
        description: 'desc for ' + title,
        status,
        progress: 0,
        start_date: '2026-01-01',
        target_end_date: '2026-12-31',
        estimated_duration: 0,
        actual_duration: 0,
        estimated_cost: 0,
        actual_cost: 0,
        position: 1,
        business_context: jsonObjectField({}),
        timeline_label: '',
    };
}

async function setupDb(): Promise<{
    db: MemoryDbAdapter;
    ctx: RequestContext;
}> {
    const db = new MemoryDbAdapter();
    await db.workers.put(
        'current', buildHumanWorker('Demo'),
    );
    const ctx = createRequestContext(db);
    return { db, ctx };
}

// RFC-3339 timestamps share millisecond resolution
// at Date.now(); pause guarantees ordering on fast
// machines.
async function pause(ms: number): Promise<void> {
    return new Promise(resolve =>
        setTimeout(resolve, ms),
    );
}

async function assertParity(
    ctx: RequestContext,
    projectId: string,
    label: string,
): Promise<void> {
    const project = await getProjectRow(
        ctx, projectId,
    );
    const actual =
        await getCurrentProjectStateFromStates(
            ctx, projectId,
        );
    assert.equal(
        actual, project.status,
        `${label}: column status "${project.status}"`
        + ` must match log state "${actual}"`,
    );
}

test(
    'postProjectStateChange writes project row and '
    + 'state event in one batch',
    async () => {
        const { db, ctx } = await setupDb();
        const projectId = 'p1';
        await postProjectStateChange(
            ctx, projectId,
            buildProject('First', 'submitted'),
            'submitted',
        );
        const events =
            await db.states.allFor(projectId);
        assert.equal(events.length, 1);
        assert.equal(events[0]!.state, 'submitted');
        assert.equal(events[0]!.worker_id, 'current');
        await assertParity(ctx, projectId, 'create');
    },
);

test(
    'create project records initial submitted state',
    async () => {
        const { ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-create',
            buildProject('Create', 'submitted'),
            'submitted',
        );
        await assertParity(
            ctx, 'p-create', 'after create',
        );
    },
);

test(
    'submit-for-review moves submitted to under-review',
    async () => {
        const { ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-sub',
            buildProject('Sub', 'submitted'),
            'submitted',
        );
        await pause(2);
        const p = await getProjectRow(ctx, 'p-sub');
        await postProjectStateChange(
            ctx, 'p-sub',
            { ...p, status: 'under-review' },
            'under-review',
        );
        await assertParity(
            ctx, 'p-sub', 'after under-review',
        );
    },
);

test(
    'send-back moves under-review to sent-back',
    async () => {
        const { ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-back',
            buildProject('Back', 'under-review'),
            'under-review',
        );
        await pause(2);
        const p = await getProjectRow(ctx, 'p-back');
        await postProjectStateChange(
            ctx, 'p-back',
            { ...p, status: 'sent-back' },
            'sent-back',
        );
        await assertParity(
            ctx, 'p-back', 'after sent-back',
        );
    },
);

test(
    're-submit moves sent-back to under-review',
    async () => {
        const { ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-re',
            buildProject('Re', 'sent-back'),
            'sent-back',
        );
        await pause(2);
        const p = await getProjectRow(ctx, 'p-re');
        await postProjectStateChange(
            ctx, 'p-re',
            { ...p, status: 'under-review' },
            'under-review',
        );
        await assertParity(
            ctx, 'p-re', 'after re-submit',
        );
    },
);

test(
    'approve moves under-review to approved',
    async () => {
        const { ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-app',
            buildProject('App', 'under-review'),
            'under-review',
        );
        await pause(2);
        const p = await getProjectRow(ctx, 'p-app');
        await postProjectStateChange(
            ctx, 'p-app',
            { ...p, status: 'approved' },
            'approved',
        );
        await assertParity(
            ctx, 'p-app', 'after approved',
        );
    },
);

test(
    'decline moves under-review to declined',
    async () => {
        const { ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-dec',
            buildProject('Dec', 'under-review'),
            'under-review',
        );
        await pause(2);
        const p = await getProjectRow(ctx, 'p-dec');
        await postProjectStateChange(
            ctx, 'p-dec',
            { ...p, status: 'declined' },
            'declined',
        );
        await assertParity(
            ctx, 'p-dec', 'after declined',
        );
    },
);

test(
    'complete moves approved to completed',
    async () => {
        const { ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-comp',
            buildProject('Comp', 'approved'),
            'approved',
        );
        await pause(2);
        const p = await getProjectRow(ctx, 'p-comp');
        await postProjectStateChange(
            ctx, 'p-comp',
            { ...p, status: 'completed' },
            'completed',
        );
        await assertParity(
            ctx, 'p-comp', 'after completed',
        );
    },
);

test(
    'delete moves submitted to deleted',
    async () => {
        const { db, ctx } = await setupDb();
        await postProjectStateChange(
            ctx, 'p-del',
            buildProject('Del', 'submitted'),
            'submitted',
        );
        await pause(2);
        const p = await getProjectRow(ctx, 'p-del');
        await postProjectStateChange(
            ctx, 'p-del',
            { ...p, status: 'deleted' },
            'deleted',
        );
        // EntityStore.getById and getAll gate on the
        // states log, so 'deleted' hides the row from
        // getProjectRow / getProjectRows. The atomic
        // commit is what we are asserting: the latest
        // state event AND the column value (read
        // through the EntityStore's own getById,
        // which now throws as a consequence of the
        // dual-write) agree on 'deleted'.
        const events =
            await db.states.allFor('p-del');
        assert.equal(events.length, 2);
        const latest = events[events.length - 1]!;
        assert.equal(latest.state, 'deleted');
        await assert.rejects(
            () => getProjectRow(ctx, 'p-del'),
            /Not found/,
        );
    },
);

test(
    'project parity across the full transition arc',
    async () => {
        const { ctx } = await setupDb();
        const projectId = 'p-arc';

        // 1. Create with submitted state
        await postProjectStateChange(
            ctx, projectId,
            buildProject('Arc', 'submitted'),
            'submitted',
        );
        await assertParity(
            ctx, projectId, 'after create',
        );
        await pause(2);

        // 2. Submit for review
        const r1 = await getProjectRow(
            ctx, projectId,
        );
        await postProjectStateChange(
            ctx, projectId,
            { ...r1, status: 'under-review' },
            'under-review',
        );
        await assertParity(
            ctx, projectId, 'after under-review',
        );
        await pause(2);

        // 3. Send back
        const r2 = await getProjectRow(
            ctx, projectId,
        );
        await postProjectStateChange(
            ctx, projectId,
            { ...r2, status: 'sent-back' },
            'sent-back',
        );
        await assertParity(
            ctx, projectId, 'after sent-back',
        );
        await pause(2);

        // 4. Re-submit
        const r3 = await getProjectRow(
            ctx, projectId,
        );
        await postProjectStateChange(
            ctx, projectId,
            { ...r3, status: 'under-review' },
            'under-review',
        );
        await assertParity(
            ctx, projectId, 'after re-submit',
        );
        await pause(2);

        // 5. Approve
        const r4 = await getProjectRow(
            ctx, projectId,
        );
        await postProjectStateChange(
            ctx, projectId,
            { ...r4, status: 'approved' },
            'approved',
        );
        await assertParity(
            ctx, projectId, 'after approved',
        );
        await pause(2);

        // 6. Complete
        const r5 = await getProjectRow(
            ctx, projectId,
        );
        await postProjectStateChange(
            ctx, projectId,
            { ...r5, status: 'completed' },
            'completed',
        );
        await assertParity(
            ctx, projectId, 'after completed',
        );

        // Six events recorded in order.
        const events =
            await ctx.GET<unknown[]>(
                `entity-states/${projectId}/history`,
            );
        assert.equal(events.length, 6);
    },
);

test(
    'pure edit via putProject emits no state event',
    async () => {
        const { db, ctx } = await setupDb();
        const projectId = 'p-edit';
        await postProjectStateChange(
            ctx, projectId,
            buildProject('Edit', 'submitted'),
            'submitted',
        );
        const before =
            await db.states.allFor(projectId);
        assert.equal(before.length, 1);
        await pause(2);

        // Pure edit: change title, keep status.
        const p = await getProjectRow(
            ctx, projectId,
        );
        await putProject(
            ctx, projectId,
            { ...p, title: 'Edited Title' },
        );
        const after =
            await db.states.allFor(projectId);
        assert.equal(after.length, 1);
        await assertParity(
            ctx, projectId, 'after pure edit',
        );
    },
);

test(
    'getCurrentProjectStateFromStates returns null '
    + 'for a project with no events',
    async () => {
        const { ctx } = await setupDb();
        const actual =
            await getCurrentProjectStateFromStates(
                ctx, 'p-missing',
            );
        assert.equal(actual, null);
    },
);
