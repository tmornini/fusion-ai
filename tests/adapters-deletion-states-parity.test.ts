import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import {
    createRequestContext,
    type RequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    getAllDeletedIdsFromStates,
} from '../web-app/app/adapters/state-events.ts';
import {
    deleteAIWorker,
} from '../web-app/app/adapters/ai-workers.ts';

// Seeds the `current` human worker — required by every
// dual-write call site because buildStateEventOp resolves
// the actor through getCurrentHumanWorker(ctx). Mirrors
// the helper in adapters-objectives.test.ts.
async function seedCurrentWorker(
    db: MemoryDbAdapter,
): Promise<void> {
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
}

async function putAIWorker(
    db: MemoryDbAdapter,
    id: string,
    name: string,
): Promise<void> {
    await db.aiWorkers.put(id, {
        name,
        provider: 'Anthropic',
        description: '',
        auth_token: 'sk-test-' + id,
        created_at: '2026-01-01T00:00:00.000Z',
    });
}

// The doctrine: db.deleted.allTombstonedIds() (the
// existing reader) and getAllDeletedIdsFromStates(ctx)
// (the new parallel reader) MUST agree after every
// adapter call that hard-deletes an entity. Wrapped to
// keep test bodies declarative.
async function assertParity(
    db: MemoryDbAdapter,
    ctx: RequestContext,
    label: string,
): Promise<void> {
    const fromTombstone =
        await db.deleted.allTombstonedIds();
    const fromStates =
        await getAllDeletedIdsFromStates(ctx);
    assert.equal(
        fromStates.size, fromTombstone.size,
        label + ': size disagrees ('
        + 'tombstone=' + fromTombstone.size + ', '
        + 'states=' + fromStates.size + ')',
    );
    for (const id of fromTombstone) {
        assert.ok(
            fromStates.has(id),
            label + ': states missing id ' + id,
        );
    }
    for (const id of fromStates) {
        assert.ok(
            fromTombstone.has(id),
            label + ': tombstone missing id ' + id,
        );
    }
}

test(
    'parity: empty case — both readers return empty',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createRequestContext(db);
        await assertParity(db, ctx, 'empty');
    },
);

test(
    'parity: deleteAIWorker dual-writes to '
    + 'tombstone and states',
    async () => {
        const db = new MemoryDbAdapter();
        await seedCurrentWorker(db);
        await putAIWorker(db, 'ai_1', 'Claude');
        const ctx = createRequestContext(db);
        await deleteAIWorker(ctx, 'ai_1');
        await assertParity(db, ctx, 'after one delete');
        // Both readers must agree it is the one we deleted.
        const fromStates =
            await getAllDeletedIdsFromStates(ctx);
        assert.ok(fromStates.has('ai_1'));
    },
);

test(
    'parity: three sequential AI worker deletes',
    async () => {
        const db = new MemoryDbAdapter();
        await seedCurrentWorker(db);
        await putAIWorker(db, 'a', 'AlphaAI');
        await putAIWorker(db, 'b', 'BetaAI');
        await putAIWorker(db, 'c', 'GammaAI');
        const ctx = createRequestContext(db);
        await deleteAIWorker(ctx, 'a');
        await assertParity(db, ctx, 'after a');
        await deleteAIWorker(ctx, 'b');
        await assertParity(db, ctx, 'after a,b');
        await deleteAIWorker(ctx, 'c');
        await assertParity(db, ctx, 'after a,b,c');
        const fromStates =
            await getAllDeletedIdsFromStates(ctx);
        assert.equal(fromStates.size, 3);
        for (const id of ['a', 'b', 'c']) {
            assert.ok(fromStates.has(id));
        }
    },
);

test(
    'parity: states log records the actor on '
    + 'each deletion event',
    async () => {
        const db = new MemoryDbAdapter();
        await seedCurrentWorker(db);
        await putAIWorker(db, 'ai_1', 'Claude');
        const ctx = createRequestContext(db);
        await deleteAIWorker(ctx, 'ai_1');
        const events = await db.states.allFor('ai_1');
        assert.equal(events.length, 1);
        assert.equal(events[0]!.state, 'deleted');
        assert.equal(events[0]!.worker_id, 'current');
    },
);

test(
    'parity: deletion is one atomic commit — '
    + 'tombstone and states agree row-for-row',
    async () => {
        const db = new MemoryDbAdapter();
        await seedCurrentWorker(db);
        await putAIWorker(db, 'ai_1', 'Claude');
        const ctx = createRequestContext(db);
        await deleteAIWorker(ctx, 'ai_1');
        const tombstoneRows = await db.deleted.allRows();
        const stateRows = await db.states.allFor('ai_1');
        assert.equal(tombstoneRows.length, 1);
        assert.equal(stateRows.length, 1);
        assert.equal(tombstoneRows[0]!.id, 'ai_1');
        assert.equal(stateRows[0]!.entity_id, 'ai_1');
        assert.equal(stateRows[0]!.state, 'deleted');
    },
);
