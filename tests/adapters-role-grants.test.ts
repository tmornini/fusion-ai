import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
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

test('role_grants store retains appended events', async () => {
    const db = new MemoryDbAdapter();
    await db.createSchema();
    await db.roleGrants.put('g1', {
        identity_id: 'current', role: 'admin',
        action: 'granted', by_member_id: 'system',
        at: '2026-01-01T00:00:00.000Z',
    });
    await db.roleGrants.put('g2', {
        identity_id: 'current', role: 'admin',
        action: 'revoked', by_member_id: 'system',
        at: '2026-02-01T00:00:00.000Z',
    });
    const rows = await db.roleGrants.getAll();
    assert.equal(rows.length, 2);   // append-only retained
});
