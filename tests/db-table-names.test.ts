import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { TABLE_NAMES } from '../api/db.ts';
import { MemoryDbAdapter } from '../api/db-memory.ts';

// Phase Final Stage B Task 4: TABLE_NAMES shrinks as doomed
// tables delete. Pin permanent survivors and tables this
// commit just dropped.
test('TABLE_NAMES keeps the permanent survivors', () => {
    for (const name of [
        'requests', 'responses', 'clients',
    ] as const) {
        assert.ok(
            TABLE_NAMES.includes(name),
            `TABLE_NAMES missing survivor ${name}`,
        );
    }
});

test(
    'TABLE_NAMES drops ideas..work-orders and records',
    () => {
        for (const name of [
            'ideas',
            'idea_submissions',
            'projects',
            'project_flows',
            'project_objective_baseline_scores',
            'project_objective_actual_scores',
            'flows',
            'flow_versions',
            'flow_nodes',
            'flow_edges',
            'flow_node_members',
            'flow_node_attributes',
            'work_orders',
            'flow_work_orders',
            'state_field_values',
            'records',
            'record_attributes',
            'flow_records',
        ] as const) {
            assert.ok(
                !TABLE_NAMES.includes(name),
                `${name} still in TABLE_NAMES`,
            );
        }
    },
);

test('TABLE_NAMES includes the objective tables', () => {
    for (const name of [
        'objectives',
        'objective_revisions',
    ] as const) {
        assert.ok(
            TABLE_NAMES.includes(name),
            `TABLE_NAMES missing ${name}`,
        );
    }
});

test('MemoryDbAdapter exposes objective stores',
    async () => {
        const db = new MemoryDbAdapter();
        await db.postSchemaCreation();
        await db.objectives.put('o1', {
            organization_id: '1', position: 0,
        });
        const all = await db.objectives.getAll();
        assert.equal(all.length, 1);
        assert.equal(all[0]!.id, 'o1');

        await db.objectiveRevisions.put('o1:t1', {
            objective_id: 'o1',
            name: 'Revenue',
            description: 'd',
            member_id: 'w1',
            at: '2026-05-14T00:00:00.000000Z',
        });
        const revs =
            await db.objectiveRevisions.getAll();
        assert.equal(revs.length, 1);
    });

test('MemoryDbAdapter exposes message stores', async () => {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    await db.requests.put('pair-1', {
        uri_prefix: '/organizations/1/ideas/',
        uri_id: '42',
        at: '2026-01-01T00:00:00.000000Z',
        requester_identity_id: 'current',
        message_hash: 'a'.repeat(64),
        message: '{"kind":"request"}',
    });
    const rows = await db.requests.getAll();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.id, 'pair-1');
});
