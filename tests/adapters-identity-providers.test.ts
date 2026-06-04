import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateIdentityProviderEntity,
} from '../api/validators.ts';
import { MemoryDbAdapter } from '../api/db-memory.ts';

const goodRow = {
    identity_id: 'current',
    provider: 'google',
    provider_subject: 'sub-123',
    action: 'linked',
    at: '2026-06-03T00:00:00.000Z',
};

test('validates an identity-provider link', () => {
    assert.deepEqual(
        validateIdentityProviderEntity(goodRow), goodRow);
});

test('rejects an unknown action', () => {
    assert.throws(() =>
        validateIdentityProviderEntity({
            ...goodRow, action: 'merged',
        }));
});

test('rejects an extra key', () => {
    assert.throws(() =>
        validateIdentityProviderEntity({
            ...goodRow, extra: 1,
        }));
});

test('identity_providers store retains events', async () => {
    const db = new MemoryDbAdapter();
    await db.createSchema();
    await db.identityProviders.put('p1', goodRow);
    await db.identityProviders.put('p2', {
        ...goodRow, action: 'unlinked',
        at: '2026-07-01T00:00:00.000Z',
    });
    assert.equal(
        (await db.identityProviders.getAll()).length, 2);
});
