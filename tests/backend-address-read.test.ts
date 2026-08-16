import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryStorageBackend }
    from '../api/backend-memory.ts';
import { HistoryEntityStore } from
    '../api/store-history-entity.ts';
import { backendRunner } from '../api/db.ts';

interface Row {
    id: string;
    uri_collection: string;
    uri_id: string;
    at: string;
}

const ROWS: Row[] = [
    {
        id: 'b',
        uri_collection: '/ideas/',
        uri_id: '1',
        at: '2026-01-01T00:00:00.000002Z',
    },
    {
        id: 'a',
        uri_collection: '/ideas/',
        uri_id: '1',
        at: '2026-01-01T00:00:00.000001Z',
    },
    {
        id: 'c',
        uri_collection: '/ideas/',
        uri_id: '2',
        at: '2026-01-01T00:00:00.000001Z',
    },
    {
        id: 'd',
        uri_collection: '/flows/',
        uri_id: '1',
        at: '2026-01-01T00:00:00.000001Z',
    },
];

test('getAddress is collection+uri_id, ordered by at,id',
async () => {
    const backend = new MemoryStorageBackend();
    await backend.ensureTables(['t']);
    await backend.transaction(
        ['t'], 'readwrite',
        async (tx) => {
            for (const row of ROWS) {
                await tx.put('t', row);
            }
        },
    );
    const got = await backend.transaction(
        ['t'], 'readonly',
        (tx) => tx.getAddress<Row>(
            't', '/ideas/', '1',
        ),
    );
    assert.deepEqual(
        got.map((row) => row.id),
        ['a', 'b'],
    );
});

test('getAllAtAddress delegates to Tx.getAddress',
async () => {
    const backend = new MemoryStorageBackend();
    await backend.ensureTables(['requests']);
    const store = new HistoryEntityStore<Row>(
        'requests',
        backendRunner(backend),
        (body) => body as Omit<Row, 'id'>,
    );
    await store.put('a', {
        uri_collection: '/ideas/',
        uri_id: '1',
        at: '2026-01-01T00:00:00.000001Z',
    });
    await store.put('c', {
        uri_collection: '/ideas/',
        uri_id: '2',
        at: '2026-01-01T00:00:00.000001Z',
    });
    const got = await store.getAllAtAddress(
        '/ideas/', '1',
    );
    assert.deepEqual(got.map((row) => row.id), ['a']);
});

test('getAddressVersion is address+version, ordered',
async () => {
    const backend = new MemoryStorageBackend();
    await backend.ensureTables(['responses']);
    await backend.transaction(
        ['responses'], 'readwrite',
        async (tx) => {
            await tx.put('responses', {
                id: 'old',
                uri_collection: '/ideas/',
                uri_id: '1',
                at: '2026-01-01T00:00:00.000001Z',
                version: 'aa',
            });
            await tx.put('responses', {
                id: 'new',
                uri_collection: '/ideas/',
                uri_id: '1',
                at: '2026-01-01T00:00:00.000002Z',
                version: 'aa',
            });
            await tx.put('responses', {
                id: 'other',
                uri_collection: '/ideas/',
                uri_id: '1',
                at: '2026-01-01T00:00:00.000003Z',
                version: 'bb',
            });
        },
    );
    const got = await backend.transaction(
        ['responses'], 'readonly',
        (tx) => tx.getAddressVersion(
            'responses', '/ideas/', '1', 'aa',
        ),
    );
    assert.deepEqual(
        got.map((row) => row.id),
        ['old', 'new'],
    );
});
