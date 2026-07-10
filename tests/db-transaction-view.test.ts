import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';

const aState = {
    entity_id: 'c1',
    state: 'active',
    member_id: 'm1',
    at: '2026-01-01T00:00:00.000000Z',
};

const aClient = {
    grant_types: '["password"]',
    redirect_uris: '[]',
    jwks: '{}',
    aud: 'fusion-ai',
    status: 'active' as const,
};

test(
    'a view commits writes across stores atomically',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await db.transaction(
            ['clients', 'states'],
            async (view) => {
                await view.clients.put('c1', aClient);
                await view.states.put('s1', aState);
            },
        );
        const client = await db.clients.getById('c1');
        const state = await db.states.getById('s1');
        assert.equal(client.id, 'c1');
        assert.equal(state.id, 's1');
    },
);

test(
    'a throw inside the view rolls back every store',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await assert.rejects(
            () => db.transaction(
                ['clients', 'states'],
                async (view) => {
                    await view.clients.put('c1', aClient);
                    await view.states.put('s1', aState);
                    throw new Error('boom');
                },
            ),
            /boom/,
        );
        const clients = await db.clients.getAll();
        const states = await db.states.getAll();
        assert.deepEqual(clients, []);
        assert.deepEqual(states, []);
    },
);

test(
    'stores in the view share one uncommitted buffer',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        const seen = await db.transaction(
            ['clients', 'states'],
            async (view) => {
                await view.clients.put('c1', aClient);
                // Read back inside the same tx — the put is
                // visible before commit.
                return view.clients.getAll();
            },
        );
        assert.equal(seen.length, 1);
        assert.equal(seen[0]!.id, 'c1');
    },
);

test(
    'a nested view transaction joins the open tx',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await db.transaction(
            ['clients', 'states'],
            async (view) => {
                await view.transaction(
                    ['clients'],
                    async (inner) => {
                        await inner.clients.put(
                            'c1', aClient,
                        );
                    },
                );
                await view.states.put('s1', aState);
            },
        );
        const client = await db.clients.getById('c1');
        const state = await db.states.getById('s1');
        assert.equal(client.id, 'c1');
        assert.equal(state.id, 's1');
    },
);

test(
    'a nested write rolls back with the outer tx',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await assert.rejects(
            () => db.transaction(
                ['clients', 'states'],
                async (view) => {
                    await view.transaction(
                        ['clients'],
                        async (inner) => {
                            await inner.clients.put(
                                'c1', aClient,
                            );
                        },
                    );
                    throw new Error('boom');
                },
            ),
            /boom/,
        );
        assert.deepEqual(
            await db.clients.getAll(), [],
        );
    },
);

test(
    'a nested out-of-scope table throws a clear error',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await assert.rejects(
            () => db.transaction(
                ['clients'],
                async (view) => {
                    await view.transaction(
                        ['states'],
                        async () => undefined,
                    );
                },
            ),
            /states/,
        );
    },
);
