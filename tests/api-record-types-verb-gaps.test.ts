import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    memoryDbAdapter,
    type MemoryDbAdapter,
} from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { organizationToken } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';

// Pins deliberate verb gaps on nested record-types so Task 9's
// composed POST cannot silently inherit an accidental handler.
// Mirror of tests/api-records-verb-gaps.test.ts phrasing.

const BASE = 'http://localhost';
const COLLECTION = '/organizations/1/record-types';
const DETAIL = COLLECTION + '/rt-1';
const HISTORY = DETAIL + '/history';

function req(
    method: string,
    path: string,
    token: string,
    body?: unknown,
): Request {
    return new Request(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
        },
        ...(body === undefined
            ? {} : { body: JSON.stringify(body) }),
    });
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = memoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

test('PUT .../record-types 405s (no put handler wired)',
async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(db, req(
        'PUT', COLLECTION, token, {},
    ));
    assert.equal(res.status, 405);
});

test('DELETE .../record-types 405s (no delete handler '
+ 'wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(
        db, req('DELETE', COLLECTION, token),
    );
    assert.equal(res.status, 405);
});

test('POST .../record-types/:id 405s (no post handler '
+ 'wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(db, req(
        'POST', DETAIL, token, {},
    ));
    assert.equal(res.status, 405);
});

test('PUT .../record-types/:id/history 405s (no put '
+ 'handler wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(db, req(
        'PUT', HISTORY, token, {},
    ));
    assert.equal(res.status, 405);
});

test('POST .../record-types/:id/history 405s (no post '
+ 'handler wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(db, req(
        'POST', HISTORY, token, {},
    ));
    assert.equal(res.status, 405);
});

test('DELETE .../record-types/:id/history 405s (no '
+ 'delete handler wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(
        db, req('DELETE', HISTORY, token),
    );
    assert.equal(res.status, 405);
});
