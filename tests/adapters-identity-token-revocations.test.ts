import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateIdentityTokenRevocationEntity,
} from '../api/validators.ts';

test('validates a revocation body', () => {
    assert.deepEqual(
        validateIdentityTokenRevocationEntity({
            identity_id: 'current',
            at: '2026-06-03T00:00:00.000Z',
        }),
        {
            identity_id: 'current',
            at: '2026-06-03T00:00:00.000Z',
        },
    );
});

test('rejects an extra key', () => {
    assert.throws(() =>
        validateIdentityTokenRevocationEntity({
            identity_id: 'c', at: 'x', extra: 1,
        }));
});
