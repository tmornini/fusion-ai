import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    LocalStorageDbAdapter,
} from '../api/db-localstorage.ts';
import {
    jsonObjectField,
} from '../api/types.ts';
import {
    SNAPSHOT_SCHEMA_VERSION,
    SNAPSHOT_SCHEMA_VERSION_KEY,
} from '../api/db.ts';

const KEY_PREFIX = 'fusion-ai:';

function installShim(): Map<string, string> {
    const map = new Map<string, string>();
    (globalThis as unknown as {
        localStorage: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
            removeItem(key: string): void;
        };
    }).localStorage = {
        getItem(key) { return map.get(key) ?? null; },
        setItem(key, value) { map.set(key, value); },
        removeItem(key) { map.delete(key); },
    };
    return map;
}

// Phase Final Stage B: flow_versions retired — pin the
// localStorage write surface on work_orders (surviving store
// with a nested JSON field + numeric).
const baseWorkOrder = {
    organization_id: '1',
    display_id: 'WO-1',
    flow_graph: jsonObjectField({
        name: 'Test Flow',
        lockTimeout: 60,
        nodes: [
            {
                id: 'n1',
                name: 'Start',
                isCreate: true,
                isArchive: false,
                memberIds: [],
                attributes: [],
                positionX: 0,
                positionY: 0,
                taskInstructions: '',
            },
        ],
        edges: [],
    }),
    position: 1,
};

// Writes are plain JSON since the F-080 measurement
// retired compression; the gz1: decoder survives for
// READS of legacy payloads only (pinned below).
test(
    'work_orders write stores raw JSON',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.workOrders.put(
            'wo-prefix-test', baseWorkOrder,
        );
        const stored = map.get(
            KEY_PREFIX + 'work_orders',
        );
        assert.ok(stored, 'expected stored value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array, got '
            + stored.slice(0, 20),
        );
    },
);

test(
    'work_orders round-trips through put → getById',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.workOrders.put(
            'wo-rt', baseWorkOrder,
        );
        const got = await adapter.workOrders.getById(
            'wo-rt',
        );
        assert.equal(got.id, 'wo-rt');
        assert.equal(got.display_id, 'WO-1');
        assert.equal(
            got.organization_id,
            baseWorkOrder.organization_id,
        );
    },
);

test(
    'numbers round-trip as numbers, not strings',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.workOrders.put(
            'wo-num', baseWorkOrder,
        );
        const got = await adapter.workOrders.getById(
            'wo-num',
        );
        assert.strictEqual(got.position, 1);
        assert.strictEqual(typeof got.position, 'number');
    },
);

test(
    'concurrent puts to same store do not race',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        const ids = Array.from(
            { length: 11 },
            (_, i) => `u-${i}`,
        );
        await Promise.all(
            ids.map(id => adapter.members.put(id, {
                type: 'human',
            })),
        );
        const all = await adapter.members.getAll();
        assert.equal(
            all.length, 11,
            'all 11 concurrent puts must persist',
        );
        const gotIds = new Set(all.map(u => u.id));
        for (const id of ids) {
            assert.ok(
                gotIds.has(id),
                'expected id ' + id + ' present',
            );
        }
    },
);

test(
    'states write stores raw JSON',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.states.put(
            'evt-prefix-test',
            {
                entity_id: 'wo-1',
                state: 'n-to',
                member_id: 'u-1',
                at:
                    '2026-01-01T00:00:00.000000Z',
            },
        );
        const stored = map.get(
            KEY_PREFIX + 'states',
        );
        assert.ok(stored, 'expected stored value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array, got '
            + stored.slice(0, 20),
        );
    },
);

test(
    'members table is not compressed (raw JSON in storage)',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.members.put('u1', {
            type: 'human',
        });
        const stored = map.get(KEY_PREFIX + 'members');
        assert.ok(stored, 'expected stored people value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array, got '
            + stored.slice(0, 20),
        );
    },
);

test(
    'snapshot export emits parsed objects, not gz1: blob',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.workOrders.put(
            'wo-export', baseWorkOrder,
        );
        const json = await adapter.getSnapshot();
        const parsed = JSON.parse(json);
        assert.ok(
            Array.isArray(parsed.work_orders),
            'work_orders should be an array in snapshot',
        );
        assert.equal(parsed.work_orders.length, 1);
        assert.equal(
            parsed.work_orders[0].id, 'wo-export',
        );
    },
);

test(
    'snapshot import stores work_orders raw',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        const snapshot = JSON.stringify({
            [SNAPSHOT_SCHEMA_VERSION_KEY]:
                SNAPSHOT_SCHEMA_VERSION,
            work_orders: [
                { id: 'wo-imp', ...baseWorkOrder },
            ],
        });
        await adapter.putSnapshot(snapshot);
        const stored = map.get(
            KEY_PREFIX + 'work_orders',
        );
        assert.ok(stored, 'expected stored value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array after import, got '
            + (stored?.slice(0, 20) ?? ''),
        );
    },
);

test(
    'read tolerates gz1: payload on normally-uncompressed table',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        const workOrderRow = {
            id: 'wo-gz1',
            ...baseWorkOrder,
        };
        const rawJson = JSON.stringify([workOrderRow]);
        const stream = new Blob([rawJson]).stream()
            .pipeThrough(new CompressionStream('gzip'));
        const buffer = await new Response(stream)
            .arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (const b of bytes) {
            binary += String.fromCharCode(b);
        }
        map.set(
            KEY_PREFIX + 'work_orders',
            'gz1:' + btoa(binary),
        );
        const result = await adapter.workOrders.getAll();
        assert.equal(result.length, 1);
        assert.equal(result[0]!.display_id, 'WO-1');
    },
);
