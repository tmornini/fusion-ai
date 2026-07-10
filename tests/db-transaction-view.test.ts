import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';

const aState = {
    entity_id: 'org1',
    state: 'active',
    member_id: 'm1',
    at: '2026-01-01T00:00:00.000000Z',
};

const aOrganization = {
    name: 'Test Org',
    domain: 'test.example',
    next_billing: '2026-01-01T00:00:00.000000Z',
    seats: 5,
    projects_limit: 10,
    ideas_limit: 20,
};

test(
    'a view commits writes across stores atomically',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await db.transaction(
            ['organizations', 'states'],
            async (view) => {
                await view.organizations.put(
                    'org1', aOrganization,
                );
                await view.states.put('s1', aState);
            },
        );
        const organization =
            await db.organizations.getById('org1');
        const state = await db.states.getById('s1');
        assert.equal(organization.id, 'org1');
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
                ['organizations', 'states'],
                async (view) => {
                    await view.organizations.put(
                        'org1', aOrganization,
                    );
                    await view.states.put('s1', aState);
                    throw new Error('boom');
                },
            ),
            /boom/,
        );
        const organizations =
            await db.organizations.getAll();
        const states = await db.states.getAll();
        assert.deepEqual(organizations, []);
        assert.deepEqual(states, []);
    },
);

test(
    'stores in the view share one uncommitted buffer',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        const seen = await db.transaction(
            ['organizations', 'states'],
            async (view) => {
                await view.organizations.put(
                    'org1', aOrganization,
                );
                // Read back inside the same tx — the put is
                // visible before commit.
                return view.organizations.getAll();
            },
        );
        assert.equal(seen.length, 1);
        assert.equal(seen[0]!.id, 'org1');
    },
);

test(
    'a nested view transaction joins the open tx',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await db.transaction(
            ['organizations', 'states'],
            async (view) => {
                await view.transaction(
                    ['organizations'],
                    async (inner) => {
                        await inner.organizations.put(
                            'org1', aOrganization,
                        );
                    },
                );
                await view.states.put('s1', aState);
            },
        );
        const organization =
            await db.organizations.getById('org1');
        const state = await db.states.getById('s1');
        assert.equal(organization.id, 'org1');
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
                ['organizations', 'states'],
                async (view) => {
                    await view.transaction(
                        ['organizations'],
                        async (inner) => {
                            await inner.organizations.put(
                                'org1', aOrganization,
                            );
                        },
                    );
                    throw new Error('boom');
                },
            ),
            /boom/,
        );
        assert.deepEqual(
            await db.organizations.getAll(), [],
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
                ['organizations'],
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
