import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateRoleGrantEntity,
} from '../api/validators.ts';

test('validates a role-grant body', () => {
    assert.deepEqual(
        validateRoleGrantEntity({
            identity_id: 'current',
            role: 'admin',
            action: 'granted',
            by_member_id: 'system',
            at: '2026-06-03T00:00:00.000Z',
        }),
        {
            identity_id: 'current',
            role: 'admin',
            action: 'granted',
            by_member_id: 'system',
            at: '2026-06-03T00:00:00.000Z',
        },
    );
});

test('rejects an extra key', () => {
    assert.throws(() =>
        validateRoleGrantEntity({
            identity_id: 'c', role: 'admin',
            action: 'granted', by_member_id: 's',
            at: 'x', extra: 1,
        }));
});

test('rejects an unknown action', () => {
    assert.throws(() =>
        validateRoleGrantEntity({
            identity_id: 'c', role: 'admin',
            action: 'elevated', by_member_id: 's',
            at: '2026-06-03T00:00:00.000Z',
        }));
});

test('rejects an unparseable timestamp', () => {
    assert.throws(() =>
        validateRoleGrantEntity({
            identity_id: 'c', role: 'admin',
            action: 'granted', by_member_id: 's',
            at: 'not-a-date',
        }));
});
