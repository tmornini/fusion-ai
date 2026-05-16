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
    getHumanWorkerRow,
    postHumanWorkerStateChange,
    putHumanWorker,
} from '../web-app/app/adapters/workers.ts';
import {
    getAIWorkerRow,
    postAIWorkerCreate,
    putAIWorker,
    deleteAIWorker,
} from '../web-app/app/adapters/ai-workers.ts';
import {
    getCurrentWorkerStateFromStates,
} from '../web-app/app/adapters/state-events.ts';
import type {
    HumanWorkerEntity,
    AIWorkerEntity,
    WorkerStatus,
} from '../api/types.ts';

// Worker state lives in one column today
// (workers.status for humans) and on the states log
// as the same alphabet. Stage 10a's covenant: after
// every status mutation the column agrees with the
// latest event on the log. AI workers carry no
// status column — their lifecycle on the log begins
// at 'active' on creation and terminates at
// 'deleted' on deletion. Each scenario below
// mutates a worker, then asserts agreement.

function buildHumanWorker(
    name: string,
    status: WorkerStatus,
): Omit<HumanWorkerEntity, 'id'> {
    return {
        first_name: name,
        last_name: 'Test',
        email: name.toLowerCase()
            + '@example.com',
        title: 'Engineer',
        department: 'Eng',
        status,
        strengths: '[]' as never,
        team_dimensions: '{}' as never,
        phone: '',
        bio: '',
    };
}

function buildAIWorker(
    name: string,
): Omit<AIWorkerEntity, 'id'> {
    return {
        name,
        provider: 'Anthropic',
        description: '',
        auth_token: 'sk-test-XXXX',
        created_at: '2026-01-01T00:00:00Z',
    };
}

async function setupDb(): Promise<{
    db: MemoryDbAdapter;
    ctx: RequestContext;
}> {
    const db = new MemoryDbAdapter();
    await db.workers.put(
        'current', buildHumanWorker('Demo', 'active'),
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

async function assertHumanParity(
    ctx: RequestContext,
    workerId: string,
    label: string,
): Promise<void> {
    const worker = await getHumanWorkerRow(
        ctx, workerId,
    );
    const actual =
        await getCurrentWorkerStateFromStates(
            ctx, workerId,
        );
    assert.equal(
        actual, worker.status,
        `${label}: column status "${worker.status}"`
        + ` must match log state "${actual}"`,
    );
}

test(
    'postHumanWorkerStateChange writes worker row '
    + 'and state event in one batch',
    async () => {
        const { db, ctx } = await setupDb();
        const workerId = 'hw1';
        await postHumanWorkerStateChange(
            ctx, workerId,
            buildHumanWorker('First', 'active'),
            'active',
        );
        const events =
            await db.states.allFor(workerId);
        assert.equal(events.length, 1);
        assert.equal(events[0]!.state, 'active');
        assert.equal(events[0]!.worker_id, 'current');
        await assertHumanParity(
            ctx, workerId, 'create',
        );
    },
);

test(
    'create human worker records initial active state',
    async () => {
        const { ctx } = await setupDb();
        await postHumanWorkerStateChange(
            ctx, 'hw-create',
            buildHumanWorker('Create', 'active'),
            'active',
        );
        await assertHumanParity(
            ctx, 'hw-create', 'after create',
        );
    },
);

test(
    'activate moves pending human to active',
    async () => {
        const { ctx } = await setupDb();
        await postHumanWorkerStateChange(
            ctx, 'hw-pa',
            buildHumanWorker('Pending', 'pending'),
            'pending',
        );
        await pause(2);
        const row = await getHumanWorkerRow(
            ctx, 'hw-pa',
        );
        const { id: _id, ...rest } = row;
        await postHumanWorkerStateChange(
            ctx, 'hw-pa',
            { ...rest, status: 'active' },
            'active',
        );
        await assertHumanParity(
            ctx, 'hw-pa', 'after activate',
        );
    },
);

test(
    'deactivate moves active human to deactivated',
    async () => {
        const { ctx } = await setupDb();
        await postHumanWorkerStateChange(
            ctx, 'hw-deact',
            buildHumanWorker('Active', 'active'),
            'active',
        );
        await pause(2);
        const row = await getHumanWorkerRow(
            ctx, 'hw-deact',
        );
        const { id: _id, ...rest } = row;
        await postHumanWorkerStateChange(
            ctx, 'hw-deact',
            { ...rest, status: 'deactivated' },
            'deactivated',
        );
        await assertHumanParity(
            ctx, 'hw-deact', 'after deactivate',
        );
    },
);

test(
    'reactivate moves deactivated human to active',
    async () => {
        const { ctx } = await setupDb();
        await postHumanWorkerStateChange(
            ctx, 'hw-re',
            buildHumanWorker(
                'Deact', 'deactivated',
            ),
            'deactivated',
        );
        await pause(2);
        const row = await getHumanWorkerRow(
            ctx, 'hw-re',
        );
        const { id: _id, ...rest } = row;
        await postHumanWorkerStateChange(
            ctx, 'hw-re',
            { ...rest, status: 'active' },
            'active',
        );
        await assertHumanParity(
            ctx, 'hw-re', 'after reactivate',
        );
    },
);

test(
    'pure edit on human via putHumanWorker '
    + 'emits no state event',
    async () => {
        const { db, ctx } = await setupDb();
        const workerId = 'hw-edit';
        await postHumanWorkerStateChange(
            ctx, workerId,
            buildHumanWorker('Edit', 'active'),
            'active',
        );
        const before =
            await db.states.allFor(workerId);
        assert.equal(before.length, 1);
        await pause(2);

        // Pure edit: change phone/bio, keep status.
        const row = await getHumanWorkerRow(
            ctx, workerId,
        );
        const { id: _id, ...rest } = row;
        await putHumanWorker(
            ctx, workerId,
            {
                ...rest,
                phone: '555-1234',
                bio: 'Edited bio',
            },
        );
        const after =
            await db.states.allFor(workerId);
        assert.equal(after.length, 1);
        await assertHumanParity(
            ctx, workerId, 'after pure edit',
        );
    },
);

test(
    'human worker parity across the full '
    + 'transition arc',
    async () => {
        const { ctx } = await setupDb();
        const workerId = 'hw-arc';

        // 1. Create with pending state
        await postHumanWorkerStateChange(
            ctx, workerId,
            buildHumanWorker('Arc', 'pending'),
            'pending',
        );
        await assertHumanParity(
            ctx, workerId, 'after create',
        );
        await pause(2);

        // 2. Activate
        const r1 = await getHumanWorkerRow(
            ctx, workerId,
        );
        const { id: _id1, ...rest1 } = r1;
        await postHumanWorkerStateChange(
            ctx, workerId,
            { ...rest1, status: 'active' },
            'active',
        );
        await assertHumanParity(
            ctx, workerId, 'after activate',
        );
        await pause(2);

        // 3. Deactivate
        const r2 = await getHumanWorkerRow(
            ctx, workerId,
        );
        const { id: _id2, ...rest2 } = r2;
        await postHumanWorkerStateChange(
            ctx, workerId,
            { ...rest2, status: 'deactivated' },
            'deactivated',
        );
        await assertHumanParity(
            ctx, workerId, 'after deactivate',
        );
        await pause(2);

        // 4. Reactivate
        const r3 = await getHumanWorkerRow(
            ctx, workerId,
        );
        const { id: _id3, ...rest3 } = r3;
        await postHumanWorkerStateChange(
            ctx, workerId,
            { ...rest3, status: 'active' },
            'active',
        );
        await assertHumanParity(
            ctx, workerId, 'after reactivate',
        );

        // Four events recorded in order.
        const events =
            await ctx.GET<unknown[]>(
                `entity-states/${workerId}/history`,
            );
        assert.equal(events.length, 4);
    },
);

test(
    'postAIWorkerCreate writes AI worker row and '
    + 'initial active state in one batch',
    async () => {
        const { db, ctx } = await setupDb();
        const workerId = 'ai1';
        await postAIWorkerCreate(
            ctx, workerId,
            buildAIWorker('Claude'),
        );
        const events =
            await db.states.allFor(workerId);
        assert.equal(events.length, 1);
        assert.equal(events[0]!.state, 'active');
        assert.equal(events[0]!.worker_id, 'current');
        const actual =
            await getCurrentWorkerStateFromStates(
                ctx, workerId,
            );
        assert.equal(actual, 'active');
        // The AI worker row is reachable via the
        // adapter — the entity write committed
        // alongside the state event.
        const row = await getAIWorkerRow(
            ctx, workerId,
        );
        assert.equal(row.name, 'Claude');
    },
);

test(
    'pure edit on AI via putAIWorker '
    + 'emits no state event',
    async () => {
        const { db, ctx } = await setupDb();
        const workerId = 'ai-edit';
        await postAIWorkerCreate(
            ctx, workerId,
            buildAIWorker('Bot'),
        );
        const before =
            await db.states.allFor(workerId);
        assert.equal(before.length, 1);
        await pause(2);

        // Pure edit: change description, keep
        // everything else.
        const row = await getAIWorkerRow(
            ctx, workerId,
        );
        const { id: _id, ...rest } = row;
        await putAIWorker(
            ctx, workerId,
            { ...rest, description: 'Edited' },
        );
        const after =
            await db.states.allFor(workerId);
        assert.equal(after.length, 1);
        const actual =
            await getCurrentWorkerStateFromStates(
                ctx, workerId,
            );
        assert.equal(actual, 'active');
    },
);

test(
    'deleteAIWorker emits deleted state event '
    + '(Stage 5/6 path, sanity check)',
    async () => {
        const { db, ctx } = await setupDb();
        const workerId = 'ai-del';
        await postAIWorkerCreate(
            ctx, workerId,
            buildAIWorker('Doomed'),
        );
        await pause(2);
        await deleteAIWorker(ctx, workerId);
        const events =
            await db.states.allFor(workerId);
        assert.equal(events.length, 2);
        assert.equal(events[0]!.state, 'active');
        assert.equal(events[1]!.state, 'deleted');
        const actual =
            await getCurrentWorkerStateFromStates(
                ctx, workerId,
            );
        assert.equal(actual, 'deleted');
    },
);

test(
    'getCurrentWorkerStateFromStates returns null '
    + 'for a worker with no events',
    async () => {
        const { ctx } = await setupDb();
        const actual =
            await getCurrentWorkerStateFromStates(
                ctx, 'hw-missing',
            );
        assert.equal(actual, null);
    },
);
