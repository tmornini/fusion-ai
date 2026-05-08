import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import {
    createFetchContext,
} from '../web-app/app/adapters/shared.ts';
import {
    createChannel,
} from '../web-app/app/channels.ts';
import { nowUtc } from '../api/types.ts';

function buildRoleBody(name: string) {
    return {
        name,
        description: '',
        created_at: nowUtc(),
    };
}

test(
    'ctx.commit runs all ops in supplied order',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createFetchContext(db);
        await ctx.commit({
            ops: [
                {
                    method: 'put',
                    resource: 'roles/r-1',
                    body: buildRoleBody('First'),
                },
                {
                    method: 'put',
                    resource: 'roles/r-2',
                    body: buildRoleBody(
                        'Second',
                    ),
                },
                {
                    method: 'delete',
                    resource: 'roles/r-1',
                },
            ],
        });
        const r1 = await db.roles.getAll();
        assert.equal(r1.length, 1);
        assert.equal(r1[0]!.name, 'Second');
    },
);

test(
    'ctx.commit fires each notifyChannel'
    + ' exactly once after ops complete',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createFetchContext(db);
        const ch1 = createChannel<void>();
        const ch2 = createChannel<void>();
        let count1 = 0;
        let count2 = 0;
        ch1.subscribe(() => { count1++; });
        ch2.subscribe(() => { count2++; });
        await ctx.commit({
            ops: [
                {
                    method: 'put',
                    resource: 'roles/r-1',
                    body: buildRoleBody('A'),
                },
                {
                    method: 'put',
                    resource: 'roles/r-2',
                    body: buildRoleBody('B'),
                },
            ],
            notifyChannels: [ch1, ch2],
        });
        assert.equal(count1, 1);
        assert.equal(count2, 1);
    },
);

test(
    'ctx.commit with empty ops still fires'
    + ' notifyChannels',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createFetchContext(db);
        const ch = createChannel<void>();
        let count = 0;
        ch.subscribe(() => { count++; });
        await ctx.commit({
            ops: [],
            notifyChannels: [ch],
        });
        assert.equal(count, 1);
    },
);

test(
    'ctx.commit propagates op error and skips'
    + ' remaining ops + notify (no-rollback'
    + ' contract)',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createFetchContext(db);
        const ch = createChannel<void>();
        let count = 0;
        ch.subscribe(() => { count++; });
        await assert.rejects(
            () => ctx.commit({
                ops: [
                    {
                        method: 'put',
                        resource: 'roles/r-1',
                        body: buildRoleBody('A'),
                    },
                    {
                        method: 'put',
                        resource: 'roles/r-2',
                        body: {
                            rogue_field: 'oops',
                        },
                    },
                    {
                        method: 'put',
                        resource: 'roles/r-3',
                        body: buildRoleBody('C'),
                    },
                ],
                notifyChannels: [ch],
            }),
        );
        const all = await db.roles.getAll();
        // The first op landed; the third never
        // ran. No rollback — that's the contract
        // we're locking in until Postgres lands.
        assert.equal(all.length, 1);
        assert.equal(all[0]!.name, 'A');
        assert.equal(count, 0);
    },
);
