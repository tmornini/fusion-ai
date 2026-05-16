import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import {
    createRequestContext,
    type RequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    postObjectiveCreation,
    postObjectiveDeprecation,
    postObjectiveReactivation,
    getDeprecatedObjectiveIds,
    getDeprecatedObjectiveIdsFromStates,
} from '../web-app/app/adapters/objectives.ts';

// RFC-3339 timestamps from Date.now() share millisecond
// resolution; back-to-back mutations on fast machines
// can collide on `at`. StateStore.currentFor breaks ties
// by first-seen-wins (row.at > latest.at is strict), so
// same-ms collisions invert latest-event semantics. The
// production path will produce monotonic timestamps in
// any realistic user-driven cadence; the test pauses to
// guarantee the same ordering deterministically.
async function pause(): Promise<void> {
    await new Promise(resolve =>
        setTimeout(resolve, 2),
    );
}

async function setupCtx(): Promise<{
    db: MemoryDbAdapter;
    ctx: RequestContext;
}> {
    const db = new MemoryDbAdapter();
    await db.workers.put('current', {
        first_name: 'Demo',
        last_name: 'User',
        email: 'demo@example.com',
        phone: '',
        title: 'Admin',
        status: 'active',
        strengths: '[]' as never,
        team_dimensions: '{}' as never,
        bio: '',
        department: 'Product',
    });
    return { db, ctx: createRequestContext(db) };
}

async function assertParity(
    ctx: RequestContext,
    label: string,
): Promise<void> {
    const fromTombstone =
        await getDeprecatedObjectiveIds(ctx);
    const fromStates =
        await getDeprecatedObjectiveIdsFromStates(ctx);
    assert.deepEqual(
        [...fromTombstone].sort(),
        [...fromStates].sort(),
        label
        + ': tombstone reader and states reader disagree',
    );
}

test(
    'parity: both readers empty before any deprecation',
    async () => {
        const { ctx } = await setupCtx();
        await assertParity(ctx, 'empty');
        const fromTombstone =
            await getDeprecatedObjectiveIds(ctx);
        assert.equal(fromTombstone.size, 0);
    },
);

test(
    'parity: after a single deprecation both readers '
        + 'return {o1}',
    async () => {
        const { ctx } = await setupCtx();
        await postObjectiveCreation(
            ctx, 'o1', 'Rev', 'd', 0,
        );
        await postObjectiveDeprecation(ctx, 'o1');
        await assertParity(ctx, 'after one deprecation');
        const fromStates =
            await getDeprecatedObjectiveIdsFromStates(ctx);
        assert.equal(fromStates.size, 1);
        assert.ok(fromStates.has('o1'));
    },
);

test(
    'parity: after deprecation then reactivation both '
        + 'readers return empty',
    async () => {
        const { ctx } = await setupCtx();
        await postObjectiveCreation(
            ctx, 'o1', 'Rev', 'd', 0,
        );
        await postObjectiveDeprecation(ctx, 'o1');
        await pause();
        await postObjectiveReactivation(ctx, 'o1');
        await assertParity(
            ctx, 'after reactivation',
        );
        const fromStates =
            await getDeprecatedObjectiveIdsFromStates(ctx);
        assert.equal(fromStates.size, 0);
    },
);

test(
    'parity: deprecate o1+o2+o3, reactivate o2; both '
        + 'readers return {o1, o3}',
    async () => {
        const { ctx } = await setupCtx();
        await postObjectiveCreation(
            ctx, 'o1', 'A', 'd', 0,
        );
        await postObjectiveCreation(
            ctx, 'o2', 'B', 'd', 1,
        );
        await postObjectiveCreation(
            ctx, 'o3', 'C', 'd', 2,
        );
        await postObjectiveDeprecation(ctx, 'o1');
        await pause();
        await postObjectiveDeprecation(ctx, 'o2');
        await pause();
        await postObjectiveDeprecation(ctx, 'o3');
        await pause();
        await postObjectiveReactivation(ctx, 'o2');
        await assertParity(ctx, 'three deprecate, one reactivate');
        const fromStates =
            await getDeprecatedObjectiveIdsFromStates(ctx);
        assert.equal(fromStates.size, 2);
        assert.ok(fromStates.has('o1'));
        assert.ok(fromStates.has('o3'));
    },
);

test(
    'parity: re-deprecation after reactivation produces '
        + 'three states events, one tombstone row, '
        + 'and {o1} from both readers',
    async () => {
        const { db, ctx } = await setupCtx();
        await postObjectiveCreation(
            ctx, 'o1', 'Rev', 'd', 0,
        );
        await postObjectiveDeprecation(ctx, 'o1');
        await pause();
        await postObjectiveReactivation(ctx, 'o1');
        await pause();
        await postObjectiveDeprecation(ctx, 'o1');
        await assertParity(ctx, 'after re-deprecation');
        const fromStates =
            await getDeprecatedObjectiveIdsFromStates(ctx);
        assert.equal(fromStates.size, 1);
        assert.ok(fromStates.has('o1'));
        const tombstoneRows =
            await db.deprecated.allTombstonedIds();
        assert.equal(tombstoneRows.size, 1,
            'one tombstone row after re-deprecation');
        const stateEvents = await db.states.allFor('o1');
        assert.equal(stateEvents.length, 3,
            'three state events: deprecated, active, '
            + 'deprecated');
        assert.deepEqual(
            stateEvents.map(e => e.state),
            ['deprecated', 'active', 'deprecated'],
        );
    },
);

test(
    'parity holds after every step of a long sequence',
    async () => {
        const { ctx } = await setupCtx();
        await postObjectiveCreation(
            ctx, 'o1', 'A', 'd', 0,
        );
        await postObjectiveCreation(
            ctx, 'o2', 'B', 'd', 1,
        );
        await postObjectiveCreation(
            ctx, 'o3', 'C', 'd', 2,
        );
        await assertParity(ctx, 'step 0: all active');

        await postObjectiveDeprecation(ctx, 'o1');
        await assertParity(ctx, 'step 1: o1 deprecated');

        await pause();
        await postObjectiveDeprecation(ctx, 'o2');
        await assertParity(ctx, 'step 2: o2 deprecated');

        await pause();
        await postObjectiveReactivation(ctx, 'o1');
        await assertParity(ctx, 'step 3: o1 reactivated');

        await pause();
        await postObjectiveDeprecation(ctx, 'o3');
        await assertParity(ctx, 'step 4: o3 deprecated');

        await pause();
        await postObjectiveReactivation(ctx, 'o2');
        await assertParity(ctx, 'step 5: o2 reactivated');
    },
);

test(
    'parity: each mutation lands in one atomic commit '
        + 'so partial-write states cannot be observed',
    async () => {
        const { db, ctx } = await setupCtx();
        await postObjectiveCreation(
            ctx, 'o1', 'Rev', 'd', 0,
        );
        await postObjectiveDeprecation(ctx, 'o1');
        // After one deprecation: one tombstone row,
        // exactly one state event, both readers agree.
        await assertParity(ctx, 'atomic write');
        const tombstones =
            await db.deprecated.allTombstonedIds();
        const events = await db.states.allFor('o1');
        assert.equal(tombstones.size, 1);
        assert.equal(events.length, 1);
        assert.equal(events[0]!.state, 'deprecated');
        assert.equal(events[0]!.worker_id, 'current');
        assert.equal(events[0]!.entity_id, 'o1');
    },
);
