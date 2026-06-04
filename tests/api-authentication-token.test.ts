import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { GET, handleRequest } from '../api/api.ts';
import { seedRootAdmin } from './root-admin-fixture.ts';

const BASE = 'http://localhost';

const issuedCode = {
    code: 'the-code', identity_id: 'current',
    client_id: 'web', status: 'issued',
    at: '2026-06-03T00:00:00.000Z',
};

async function freshDb() {
    const db = new MemoryDbAdapter();
    await db.createSchema();
    return db;
}

function tokenRequest(body: Record<string, unknown>): Request {
    return new Request(`${BASE}/authentication/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

test('the token endpoint is reachable without a Bearer',
async () => {
    const db = await freshDb();
    // exempt route: no Authorization header still reaches the
    // handler — a 400 from the grant, not a 401 from the gate
    const res = await handleRequest(db, tokenRequest({}));
    assert.equal(res.status, 400);
});

test('an unknown grant_type is a 400 with no side effects',
async () => {
    const db = await freshDb();
    const res = await handleRequest(
        db, tokenRequest({ grant_type: 'wat' }));
    assert.equal(res.status, 400);
    assert.equal(
        (await db.identityTokens.getAll()).length, 0);
    assert.equal(
        (await db.authorizationCodes.getAll()).length, 0);
});

test('authorization_code grant issues a gate-valid token pair',
async () => {
    const db = await freshDb();
    await seedRootAdmin(db);   // 'current' is admin
    await db.authorizationCodes.put('ev1', issuedCode);
    const res = await handleRequest(db, tokenRequest({
        grant_type: 'authorization_code', code: 'the-code',
    }));
    assert.equal(res.status, 200);
    const body = await res.json() as {
        access_token: string; refresh_token: string;
        token_type: string; expires_in: number;
    };
    assert.equal(body.token_type, 'Bearer');
    assert.ok(body.access_token.length > 0);
    assert.ok(body.refresh_token.length > 0);
    // the minted access token passes the SP-3 gate
    const rows = await GET(db, 'members', body.access_token);
    assert.ok(Array.isArray(rows));
});

test('replaying a consumed code is a 401 no-op', async () => {
    const db = await freshDb();
    await db.authorizationCodes.put('ev1', issuedCode);
    const first = await handleRequest(db, tokenRequest({
        grant_type: 'authorization_code', code: 'the-code',
    }));
    assert.equal(first.status, 200);
    const before = (await db.identityTokens.getAll()).length;
    const replay = await handleRequest(db, tokenRequest({
        grant_type: 'authorization_code', code: 'the-code',
    }));
    assert.equal(replay.status, 401);
    // no new token chain minted on the replay
    assert.equal(
        (await db.identityTokens.getAll()).length, before);
});

test('an unknown code is a 401', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, tokenRequest({
        grant_type: 'authorization_code', code: 'ghost',
    }));
    assert.equal(res.status, 401);
});
