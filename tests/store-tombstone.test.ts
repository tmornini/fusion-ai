import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { TombstoneStore } from '../api/store-tombstone.ts';
import { MemoryStorageBackend }
    from '../api/backend-memory.ts';

function newStore(
    table: string, field: string,
): TombstoneStore {
    return new TombstoneStore(
        new MemoryStorageBackend(), table, field,
    );
}

test('record adds an id, isTombstoned reports it',
    async () => {
        const store = newStore('deleted', 'deleted_at');
        assert.equal(await store.isTombstoned('a'), false);
        await store.record('a');
        assert.equal(await store.isTombstoned('a'), true);
    });

test('record is idempotent — same id recorded twice yields one row',
    async () => {
        const store = newStore('deleted', 'deleted_at');
        await store.record('a');
        await store.record('a');
        const rows = await store.allRows();
        assert.equal(rows.length, 1);
    });

test('remove splices the row',
    async () => {
        const store =
            newStore('deprecated', 'deprecated_at');
        await store.record('a');
        await store.record('b');
        await store.remove('a');
        const ids = await store.allTombstonedIds();
        assert.equal(ids.size, 1);
        assert.ok(ids.has('b'));
        assert.ok(!ids.has('a'));
    });

test('remove of an absent id is a no-op',
    async () => {
        const store =
            newStore('deprecated', 'deprecated_at');
        await store.record('a');
        await store.remove('z');
        const ids = await store.allTombstonedIds();
        assert.equal(ids.size, 1);
        assert.ok(ids.has('a'));
    });

test('record writes the configured timestamp field',
    async () => {
        const deleted =
            newStore('deleted', 'deleted_at');
        const deprecated =
            newStore('deprecated', 'deprecated_at');
        await deleted.record('a');
        await deprecated.record('a');
        const deletedRows = await deleted.allRows();
        const deprecatedRows = await deprecated.allRows();
        assert.ok('deleted_at' in deletedRows[0]!);
        assert.ok(
            !('deprecated_at' in deletedRows[0]!),
        );
        assert.ok(
            'deprecated_at' in deprecatedRows[0]!,
        );
        assert.ok(
            !('deleted_at' in deprecatedRows[0]!),
        );
    });

test('allTombstonedIds returns a Set across many rows',
    async () => {
        const store =
            newStore('deprecated', 'deprecated_at');
        for (const id of ['a', 'b', 'c']) {
            await store.record(id);
        }
        const ids = await store.allTombstonedIds();
        assert.equal(ids.size, 3);
        for (const id of ['a', 'b', 'c']) {
            assert.ok(ids.has(id));
        }
    });
