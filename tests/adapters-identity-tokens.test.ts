import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateIdentityTokenEntity,
} from '../api/validators.ts';

const goodRow = {
    jti: 'jti-1',
    identity_id: 'current',
    action: 'issued',
    chain_id: 'chain-1',
    parent_jti: '',
    at: '2026-06-03T00:00:00.000Z',
};

test('validates an issued token event', () => {
    assert.deepEqual(
        validateIdentityTokenEntity(goodRow), goodRow);
});

test('accepts a non-empty parent_jti for a rotation', () => {
    const rotated = {
        ...goodRow, action: 'rotated', parent_jti: 'jti-0',
    };
    assert.deepEqual(
        validateIdentityTokenEntity(rotated), rotated);
});

test('rejects an unknown action', () => {
    assert.throws(() =>
        validateIdentityTokenEntity({
            ...goodRow, action: 'minted',
        }));
});

test('rejects an extra key', () => {
    assert.throws(() =>
        validateIdentityTokenEntity({
            ...goodRow, extra: 1,
        }));
});

test('rejects an unparseable timestamp', () => {
    assert.throws(() =>
        validateIdentityTokenEntity({
            ...goodRow, at: 'not-a-date',
        }));
});
