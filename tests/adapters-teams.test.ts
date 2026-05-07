import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import {
    createFetchContext,
} from '../web-app/app/adapters/shared.ts';
import {
    getUsers,
    getUserRows,
    featuredTeamMembers,
    putUserStatus,
    subscribeUserChanges,
} from '../web-app/app/adapters/teams.ts';
import {
    User,
    jsonArrayField,
    jsonObjectField,
} from '../api/types.ts';

function buildUserRow(args: {
    id: string;
    first?: string;
    last?: string;
    department?: string;
    performance?: number;
    status?: 'active' | 'pending' | 'deactivated';
}) {
    const first = args.first ?? 'Alice';
    const last = args.last ?? 'Adams';
    return {
        id: args.id,
        first_name: first,
        last_name: last,
        email:
            `${first}@example.com`.toLowerCase(),
        role: 'product_manager',
        department: args.department ?? 'Product',
        status: args.status ?? 'active',
        availability: 80,
        performance_score:
            args.performance ?? 85,
        projects_completed: 0,
        current_projects: 0,
        strengths: jsonArrayField([]),
        team_dimensions:
            jsonObjectField({ driver: 50 }),
        phone: '',
        bio: '',
        last_active: '2026-01-01T00:00:00Z',
    };
}

async function seed(
    db: MemoryDbAdapter,
    rows: Array<ReturnType<typeof buildUserRow>>,
) {
    for (const row of rows) {
        const { id, ...rest } = row;
        await db.users.put(id, rest);
    }
}

test('getUsers returns all users', async () => {
    const db = new MemoryDbAdapter();
    await seed(db, [
        buildUserRow({ id: 'u1' }),
        buildUserRow({ id: 'u2', first: 'Bob' }),
    ]);
    const ctx = createFetchContext(db);
    const users = await getUsers(ctx);
    assert.equal(users.length, 2);
    assert.ok(users[0] instanceof User);
});

test(
    'getUserRows returns raw entities',
    async () => {
        const db = new MemoryDbAdapter();
        await seed(db, [
            buildUserRow({ id: 'u1' }),
        ]);
        const ctx = createFetchContext(db);
        const rows = await getUserRows(ctx);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].id, 'u1');
        assert.equal(
            rows[0].first_name, 'Alice',
        );
    },
);

test(
    'featuredTeamMembers filters out users'
    + ' missing department',
    () => {
        const populated = new User(
            buildUserRow({ id: 'u1' }),
        );
        const noDept = new User(buildUserRow({
            id: 'u2',
            department: '',
        }));
        const result = featuredTeamMembers([
            populated, noDept,
        ]);
        assert.equal(result.length, 1);
        assert.equal(
            result[0].idForLink(), 'u1',
        );
    },
);

test(
    'featuredTeamMembers filters out users'
    + ' with zero performance score',
    () => {
        const populated = new User(
            buildUserRow({ id: 'u1' }),
        );
        const noPerf = new User(buildUserRow({
            id: 'u2', performance: 0,
        }));
        const result = featuredTeamMembers([
            populated, noPerf,
        ]);
        assert.equal(result.length, 1);
        assert.equal(
            result[0].idForLink(), 'u1',
        );
    },
);

test(
    'featuredTeamMembers slices to 6',
    () => {
        const users = Array.from(
            { length: 10 },
            (_, i) => new User(buildUserRow({
                id: `u${i}`,
            })),
        );
        const result = featuredTeamMembers(users);
        assert.equal(result.length, 6);
    },
);

test(
    'putUserStatus flips status on the row',
    async () => {
        const db = new MemoryDbAdapter();
        await seed(db, [
            buildUserRow({
                id: 'u1', status: 'active',
            }),
        ]);
        const ctx = createFetchContext(db);
        await putUserStatus(
            ctx, 'u1', 'deactivated',
        );
        const row = await db.users.getById('u1');
        assert.equal(row.status, 'deactivated');
    },
);

test(
    'putUserStatus notifies userChanges',
    async () => {
        const db = new MemoryDbAdapter();
        await seed(db, [
            buildUserRow({ id: 'u1' }),
        ]);
        let fired = 0;
        const unsub = subscribeUserChanges(
            () => { fired += 1; },
        );
        try {
            await putUserStatus(
                createFetchContext(db),
                'u1', 'deactivated',
            );
        } finally {
            unsub();
        }
        assert.equal(fired, 1);
    },
);

test(
    'putUserStatus throws on unknown user',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createFetchContext(db);
        await assert.rejects(
            () => putUserStatus(
                ctx, 'missing', 'active',
            ),
            /unknown user missing/,
        );
    },
);
