import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateClientEntity,
} from '../api/validators.ts';
import { MemoryDbAdapter } from '../api/db-memory.ts';

const goodClient = {
    grant_types: 'authorization_code refresh',
    redirect_uris: 'https://app.example.com/cb',
    jwks: '{"keys":[]}',
    aud: 'fusion-ai-web',
    status: 'active',
};

test('validates a client body', () => {
    assert.deepEqual(
        validateClientEntity(goodClient), goodClient);
});

test('rejects an unknown status', () => {
    assert.throws(() =>
        validateClientEntity({
            ...goodClient, status: 'pending',
        }));
});

test('rejects an extra key', () => {
    assert.throws(() =>
        validateClientEntity({ ...goodClient, extra: 1 }));
});

test('clients store upserts and hard-deletes', async () => {
    const db = new MemoryDbAdapter();
    await db.createSchema();
    await db.clients.put('c1', goodClient);
    assert.equal(
        (await db.clients.getById('c1')).status, 'active');
    await db.clients.put('c1', {
        ...goodClient, status: 'disabled',
    });
    assert.equal(
        (await db.clients.getById('c1')).status, 'disabled');
    await db.clients.delete('c1');
    const all = await db.clients.getAll();
    assert.equal(all.find(c => c.id === 'c1'), undefined);
});
