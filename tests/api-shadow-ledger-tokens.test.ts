import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { sha256Hex } from '../shared/digest.ts';
import { DEV_TOKEN } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { latestActionForJti } from '../api/identity-tokens.ts';

// identity-tokens/:jti/rotation is DELIBERATELY not covered
// here — see the comment on rotateRefreshJti
// (api/authentication.ts) for why it stays unwired this
// chunk: wiring it collides with the pre-existing
// tests/api-identity-token-rotation.test.ts replay case.

const BASE = 'http://localhost';
const AT = '2026-01-01T00:00:00.000000Z';
const ROOT_JTI = 'jti-root';

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
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

async function seededDb(): Promise<MemoryDbAdapter> {
    const db = await freshDb();
    await db.identityTokens.put('t-root', {
        jti: ROOT_JTI, identity_id: 'current',
        action: 'issued', chain_id: 'chain-1', at: AT,
    });
    return db;
}

function tokenFields(jti: string) {
    return {
        jti, identity_id: 'current', action: 'issued',
        chain_id: 'chain-x', at: AT,
    };
}

function revocationFields() {
    return { identity_id: 'current', at: AT };
}

// ── identity-tokens/:id — EVENT-APPEND (HistoryEntityStore) ──

test('PUT identity-tokens/:id appends its pair at the entity'
+ ' address', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, req(
        'PUT', '/identity-tokens/tok-1', DEV_TOKEN,
        tokenFields('jti-1'),
    ));
    assert.equal(res.status, 200);
    const requests = await db.requests.getAll();
    assert.equal(requests.length, 1);
    assert.equal(requests[0]!.uri_prefix, '/identity-tokens/');
    assert.equal(requests[0]!.uri_id, 'tok-1');
    const domainRow = await db.identityTokens.getById('tok-1');
    assert.deepEqual(await res.json(), domainRow);
});

test('two PUTs to DIFFERENT identity-tokens/:id ids each'
+ ' form a genesis pair with no Supersedes on either — a'
+ ' ledger row is never revisited', async () => {
    const db = await freshDb();
    const first = await handleRequest(db, req(
        'PUT', '/identity-tokens/tok-2a', DEV_TOKEN,
        tokenFields('jti-2a'),
    ));
    const second = await handleRequest(db, req(
        'PUT', '/identity-tokens/tok-2b', DEV_TOKEN,
        tokenFields('jti-2b'),
    ));
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(first.headers.get('Supersedes'), null);
    assert.equal(second.headers.get('Supersedes'), null);
});

test('a second PUT to the SAME identity-tokens/:id id'
+ ' overwrites the row (a raw store put, no ledger guard)'
+ ' and forms its OWN genesis pair — this address never'
+ ' chains', async () => {
    const db = await freshDb();
    const first = await handleRequest(db, req(
        'PUT', '/identity-tokens/tok-3', DEV_TOKEN,
        tokenFields('jti-3'),
    ));
    assert.equal(first.status, 200);
    const firstId = first.headers.get('Response-ID');
    assert.equal(first.headers.get('Supersedes'), null);
    const second = await handleRequest(db, req(
        'PUT', '/identity-tokens/tok-3', DEV_TOKEN,
        tokenFields('jti-3-again'),
    ));
    assert.equal(second.status, 200);
    assert.notEqual(second.headers.get('Response-ID'), firstId);
    assert.equal(second.headers.get('Supersedes'), null);
    const domainRow = await db.identityTokens.getById('tok-3');
    assert.equal(domainRow.jti, 'jti-3-again');
});

// ── identity-token-revocations/:id — EVENT-APPEND ──

test('PUT identity-token-revocations/:id appends its pair at'
+ ' the entity address', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, req(
        'PUT', '/identity-token-revocations/rev-1', DEV_TOKEN,
        revocationFields(),
    ));
    assert.equal(res.status, 200);
    const requests = await db.requests.getAll();
    assert.equal(requests.length, 1);
    assert.equal(
        requests[0]!.uri_prefix, '/identity-token-revocations/',
    );
    assert.equal(requests[0]!.uri_id, 'rev-1');
    const domainRow =
        await db.identityTokenRevocations.getById('rev-1');
    assert.deepEqual(await res.json(), domainRow);
});

// ── identity-tokens/:jti/revocation — operation address ──

test('a revocation appends its pair at an operation address:'
+ ' uriId stays empty', async () => {
    const db = await seededDb();
    const res = await handleRequest(db, req(
        'POST', `/identity-tokens/${ROOT_JTI}/revocation`,
        DEV_TOKEN, {},
    ));
    assert.equal(res.status, 204);
    const requests = await db.requests.getAll();
    const row = requests.find(
        r => r.uri_prefix
            === `/identity-tokens/${ROOT_JTI}/revocation/`,
    );
    assert.ok(row);
    assert.equal(row!.uri_id, '');
    const rows = await db.identityTokens.getAll();
    assert.equal(latestActionForJti(rows, ROOT_JTI), 'revoked');
});

test('revoking an unknown jti is an idempotent 2xx no-op that'
+ ' STILL appends its own pair (the claim-op precedent)',
async () => {
    const db = await seededDb();
    const res = await handleRequest(db, req(
        'POST', '/identity-tokens/ghost/revocation',
        DEV_TOKEN, {},
    ));
    assert.equal(res.status, 204);
    const requests = await db.requests.getAll();
    const row = requests.find(
        r => r.uri_prefix
            === '/identity-tokens/ghost/revocation/',
    );
    assert.ok(row);
    // The domain ledger stays untouched by the no-op — only
    // the shadow pair records that the request happened.
    const rows = await db.identityTokens.getAll();
    assert.equal(rows.length, 1);
});

test('a repeat idempotent revocation of the same chain still'
+ ' appends its own pair (no crash, counts stay balanced)',
async () => {
    const db = await seededDb();
    const first = await handleRequest(db, req(
        'POST', `/identity-tokens/${ROOT_JTI}/revocation`,
        DEV_TOKEN, {},
    ));
    assert.equal(first.status, 204);
    // A distinguishing body keeps this a genuinely NEW request
    // rather than the byte-identical resend covered elsewhere
    // (the route ignores the body either way).
    const second = await handleRequest(db, req(
        'POST', `/identity-tokens/${ROOT_JTI}/revocation`,
        DEV_TOKEN, { attempt: 2 },
    ));
    assert.equal(second.status, 204);
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, responses.length);
    const rows = requests.filter(
        r => r.uri_prefix
            === `/identity-tokens/${ROOT_JTI}/revocation/`,
    );
    assert.equal(rows.length, 2);
});

test('stored messages verify against their hashes',
async () => {
    const db = await seededDb();
    await handleRequest(db, req(
        'PUT', '/identity-tokens/tok-9', DEV_TOKEN,
        tokenFields('jti-9'),
    ));
    await handleRequest(db, req(
        'POST', `/identity-tokens/${ROOT_JTI}/revocation`,
        DEV_TOKEN, {},
    ));
    for (const row of await db.requests.getAll()) {
        assert.equal(
            await sha256Hex(row.message), row.message_hash,
        );
    }
    for (const row of await db.responses.getAll()) {
        assert.equal(
            await sha256Hex(row.message), row.message_hash,
        );
    }
});

test('request and response counts stay equal across a mix'
+ ' including one failed identity-token-revocations PUT',
async () => {
    const db = await seededDb();
    await handleRequest(db, req(
        'PUT', '/identity-tokens/tok-10', DEV_TOKEN,
        tokenFields('jti-10'),
    ));
    await handleRequest(db, req(
        'POST', `/identity-tokens/${ROOT_JTI}/revocation`,
        DEV_TOKEN, {},
    ));
    const failed = await handleRequest(db, req(
        'PUT', '/identity-token-revocations/rev-fail', DEV_TOKEN,
        { identity_id: 'current' }, // missing required `at`
    ));
    assert.equal(failed.status, 400);
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, responses.length);
});
