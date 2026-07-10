import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { sha256Hex } from '../shared/digest.ts';
import { DEV_TOKEN } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';

// Phase Final Task 2: roster half (members / ai-members /
// human-members) dual-write RETIRED with the row-half strip.
// Identity spine stays dual-writing until its own strip —
// this file keeps ONLY the identity / pii / credentials
// shadow-ledger pins. Memberships + invitations shadow
// ledger retired wholesale (file deleted).

const BASE = 'http://localhost';
const AT = '2026-01-01T00:00:00.000000Z';

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

function humanPii(name: string) {
    return {
        name,
        email: `${name}@example.com`.toLowerCase(),
        phone: '',
        bio: '',
    };
}

function credentialFields(identityId: string) {
    return {
        identity_id: identityId,
        kind: 'client_secret',
        status: 'set',
        secret: 'hashed-secret',
        at: AT,
    };
}

// ── identities ──

test('an identity (person) create appends its bundle: operation'
+ ' + identities document share the entity address, and its PII'
+ ' intake forms its own pair at identities/:id/pii', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, req(
        'POST', '/identities', DEV_TOKEN,
        { id: 'idp-1', kind: 'person' },
    ));
    assert.equal(res.status, 204);
    const pii = await handleRequest(db, req(
        'PUT', '/identities/idp-1/pii', DEV_TOKEN,
        humanPii('Carol'),
    ));
    assert.equal(pii.status, 200);
    const requests = await db.requests.getAll();
    // The bare create's own bundle — operation + the synthesized
    // identities document, both at the entity address (Task 5's
    // create-address-collapse) — = 2, + the PII intake's own
    // pair at its own address (Phase 10 Task 2's intake
    // decomposition) = 3.
    assert.equal(requests.length, 6);
    const atEntity = requests.filter(
        r => r.uri_prefix === '/identities/'
            && r.uri_id === 'idp-1',
    );
    assert.equal(atEntity.length, 2);
    const responseById = new Map(
        (await db.responses.getAll()).map(r => [r.id, r]),
    );
    const documentRow = atEntity.find(
        r => responseById.get(r.id)?.status === 200,
    );
    assert.ok(documentRow, 'no identities document pair');
    const documentBody = JSON.parse(documentRow!.message) as {
        body: Record<string, unknown>;
    };
    // Byte-indistinguishable from a live PUT identities/:id
    // pair: `kind` alone.
    assert.deepEqual(documentBody.body, { kind: 'person' });
    const atPii = requests.find(
        r => r.uri_prefix === '/identities/idp-1/pii/',
    );
    assert.ok(atPii, 'no request row for the PII intake');
    assert.equal(atPii!.uri_id, '');
});

test('an identity (service) create appends its bundle:'
+ ' operation + identities document share the entity address,'
+ ' credential document sits at its own', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, req(
        'POST', '/identities', DEV_TOKEN,
        {
            id: 'ids-1', kind: 'service',
            credential: {
                id: 'ids-1-secret',
                ...credentialFields('ids-1'),
            },
        },
    ));
    assert.equal(res.status, 204);
    const requests = await db.requests.getAll();
    // operation + identities document (both at the entity
    // address, Task 5's create-address-collapse) + credential
    // document (its own address) = 3.
    assert.equal(requests.length, 6);
    const atEntity = requests.filter(
        r => r.uri_prefix === '/identities/'
            && r.uri_id === 'ids-1',
    );
    assert.equal(atEntity.length, 2);
    const atCredential = requests.filter(
        r => r.uri_prefix === '/identities/ids-1/credentials/'
            && r.uri_id === 'ids-1-secret',
    );
    assert.equal(atCredential.length, 1);
    const credentialBody = JSON.parse(
        atCredential[0]!.message,
    ) as { body: Record<string, unknown> };
    // Byte-indistinguishable from a live PUT
    // identities/:id/credentials/:cid pair: the five credential
    // keys, mirroring the live wire body (hash-bearing per the
    // covenant — the secret arrives already client-hashed).
    assert.deepEqual(
        Object.keys(credentialBody.body).sort(),
        ['at', 'identity_id', 'kind', 'secret', 'status'],
    );
});

test('a service identity create with an invalid credential body'
+ ' appends nothing: the credential-document pair never forms,'
+ ' so postIdentityCreationOp is never even called'
+ ' (bundle-or-nothing)', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, req(
        'POST', '/identities', DEV_TOKEN,
        {
            id: 'ids-bad', kind: 'service',
            credential: {
                id: 'ids-bad-secret',
                ...credentialFields('ids-bad'),
                kind: 'not-a-kind',
            },
        },
    ));
    assert.equal(res.status, 400);
    assert.equal((await db.requests.getAll()).length, 3);
    assert.equal((await db.responses.getAll()).length, 3);
});

test('PUT identities/:id appends its pair, and a second PUT'
+ ' supersedes it', async () => {
    const db = await freshDb();
    const first = await handleRequest(db, req(
        'PUT', '/identities/idp-2', DEV_TOKEN,
        { kind: 'person' },
    ));
    assert.equal(first.status, 200);
    const firstId = first.headers.get('Response-ID');
    assert.ok(firstId);
    const domainRow = await db.identities.getById('idp-2');
    assert.deepEqual(await first.json(), domainRow);
    // A distinct body (person -> service) forces a genuinely
    // different request message — a byte-identical resend would
    // hit the idempotency fast path instead of writing again.
    const second = await handleRequest(db, req(
        'PUT', '/identities/idp-2', DEV_TOKEN,
        { kind: 'service' },
    ));
    assert.equal(second.status, 200);
    assert.equal(second.headers.get('Supersedes'), firstId);
});

// ── identities/:id/pii — singleton at a collection-style
// address (uriId ''): the pattern's last segment 'pii' is not
// a :param, so messageAddress yields uriId ''. The address is
// ALSO the message plane's sanctioned hard-delete zone (Phase
// 10 Task 3): chainless, single-slot — a second write REPLACES
// the prior pair rather than recording Supersedes over it.

test('PUT identities/:id/pii appends its pair at uriId'
+ ' empty, and a second PUT REPLACES it (the single-slot'
+ ' zone, Phase 10 Task 3)', async () => {
    const db = await freshDb();
    await db.identities.put('sarah', { kind: 'person' });
    const first = await handleRequest(db, req(
        'PUT', '/identities/sarah/pii', DEV_TOKEN,
        humanPii('Sarah'),
    ));
    assert.equal(first.status, 200);
    const firstId = first.headers.get('Response-ID');
    assert.ok(firstId);
    const requests = await db.requests.getAll();
    const row = requests.find(
        r => r.uri_prefix === '/identities/sarah/pii/',
    );
    assert.ok(row);
    assert.equal(row!.uri_id, '');
    const domainRow = await db.identityPii.getById('sarah');
    assert.deepEqual(await first.json(), domainRow);
    const second = await handleRequest(db, req(
        'PUT', '/identities/sarah/pii', DEV_TOKEN,
        humanPii('Sarah Lee'),
    ));
    assert.equal(second.status, 200);
    // Chainless (gate 4): the zone never records Supersedes —
    // the second write REPLACES the slot under its OWN, fresh
    // Response-ID, so exactly ONE pair survives at the address.
    assert.equal(second.headers.get('Supersedes'), null);
    assert.notEqual(second.headers.get('Response-ID'), firstId);
    const atAddress = (await db.requests.getAll()).filter(
        r => r.uri_prefix === '/identities/sarah/pii/',
    );
    assert.equal(atAddress.length, 1);
});

test('DELETE identities/:id/pii appends its tombstone pair,'
+ ' REPLACING the PUT (the single-slot zone)', async () => {
    const db = await freshDb();
    await db.identities.put('sarah2', { kind: 'person' });
    const put = await handleRequest(db, req(
        'PUT', '/identities/sarah2/pii', DEV_TOKEN,
        humanPii('Sarah'),
    ));
    const putId = put.headers.get('Response-ID');
    const del = await handleRequest(db, req(
        'DELETE', '/identities/sarah2/pii', DEV_TOKEN,
    ));
    assert.equal(del.status, 204);
    // Chainless: the tombstone carries no Supersedes either — it
    // physically replaces the PUT's row rather than chaining
    // past it.
    assert.equal(del.headers.get('Supersedes'), null);
    assert.notEqual(del.headers.get('Response-ID'), putId);
    const atAddress = (await db.requests.getAll()).filter(
        r => r.uri_prefix === '/identities/sarah2/pii/',
    );
    assert.equal(atAddress.length, 1);
    await assert.rejects(() => db.identityPii.getById('sarah2'));
});

// ── identities/:id/credentials/:cid — PUT response carries
// `secret` on the wire (zero-change from today's un-wired
// behavior; GETs still project it out via withoutSecret).

test('PUT identities/:id/credentials/:cid appends its pair,'
+ ' and the wire body INCLUDES the secret field', async () => {
    const db = await freshDb();
    await db.identities.put('svc-1', { kind: 'service' });
    const res = await handleRequest(db, req(
        'PUT', '/identities/svc-1/credentials/cred-1', DEV_TOKEN,
        credentialFields('svc-1'),
    ));
    assert.equal(res.status, 200);
    const requests = await db.requests.getAll();
    const row = requests.find(
        r => r.uri_prefix === '/identities/svc-1/credentials/',
    );
    assert.ok(row);
    assert.equal(row!.uri_id, 'cred-1');
    const domainRow =
        await db.identityCredentials.getById('cred-1');
    const wireBody = await res.json() as { secret?: string };
    assert.equal(wireBody.secret, 'hashed-secret');
    assert.deepEqual(wireBody, domainRow);
});

test('stored messages verify against their hashes',
async () => {
    const db = await freshDb();
    await handleRequest(db, req(
        'POST', '/identities', DEV_TOKEN,
        { id: 'idp-9', kind: 'person' },
    ));
    await handleRequest(db, req(
        'PUT', '/identities/idp-9', DEV_TOKEN, { kind: 'service' },
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
+ ' including one failure', async () => {
    const db = await freshDb();
    await handleRequest(db, req(
        'POST', '/identities', DEV_TOKEN,
        { id: 'idp-10', kind: 'person' },
    ));
    await handleRequest(db, req(
        'PUT', '/identities/idp-10', DEV_TOKEN,
        { kind: 'service' },
    ));
    await handleRequest(db, req(
        'POST', '/identities', DEV_TOKEN,
        {
            id: 'ids-10', kind: 'service',
            credential: {
                id: 'ids-10-secret',
                ...credentialFields('ids-10'),
            },
        },
    ));
    const failed = await handleRequest(db, req(
        'POST', '/identities', DEV_TOKEN,
        {
            id: 'ids-fail', kind: 'service',
            credential: {
                id: 'ids-fail-secret',
                ...credentialFields('ids-fail'),
                kind: 'not-a-kind',
            },
        },
    ));
    assert.equal(failed.status, 400);
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, responses.length);
});
