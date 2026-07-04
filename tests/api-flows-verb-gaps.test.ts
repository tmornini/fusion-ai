import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { organizationToken } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';

// Pins the CURRENT status of every deliberate flows-family
// verb gap, through handleRequest, so the third-family
// absorption (api/document-family.ts) cannot silently move
// one — the generic constructors replace ideas/projects route
// scaffolding, never flows/:id (Task 3 flips flows), but a
// gate-level regression could still shift these. A future
// change to any of these five statuses must re-derive the
// covenant deliberately, not by accident of refactoring.

const BASE = 'http://localhost';

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
            'Authorization': 'Bearer ' + token,
        },
        ...(body === undefined
            ? {} : { body: JSON.stringify(body) }),
    });
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

test('DELETE flows/:id 405s (no delete handler wired)',
async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(
        db, req('DELETE', '/flows/f1', token),
    );
    assert.equal(res.status, 405);
});

test('POST flows/:id/versions/:vid 405s (no post handler'
+ ' wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(db, req(
        'POST', '/flows/f1/versions/v1', token, {},
    ));
    assert.equal(res.status, 405);
});

test('GET projects/:id/flows/:pfid 405s (no get handler'
+ ' wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(
        db, req('GET', '/projects/p1/flows/pf1', token),
    );
    assert.equal(res.status, 405);
});

test('DELETE flows/:id/work-orders/:woid 405s (no delete'
+ ' handler wired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(db, req(
        'DELETE', '/flows/f1/work-orders/wo1', token,
    ));
    assert.equal(res.status, 405);
});

test('PUT flows/:id/undo 405s (no put handler wired)',
async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const res = await handleRequest(db, req(
        'PUT', '/flows/f1/undo', token, {},
    ));
    assert.equal(res.status, 405);
});
