import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { sha256Hex } from '../shared/digest.ts';
import { hashPassword } from '../shared/password-hash.ts';
import { seedRootAdmin } from './root-admin-fixture.ts';
import { devToken } from './token-fixtures.ts';
import {
    makeAssertionSigner,
} from './client-assertion-fixtures.ts';

// C1 discharge: the /authentication/{token,authorize} message
// pairs carry live secrets in BOTH directions (a request's
// password/code/refresh_token, a response's minted tokens), so
// this file proves the shadow ledger never stores one — every
// stored request/response row is REDACTED, and the two grant
// routes' own domain guards (double-spend, reuse) — not a
// stored-response replay — govern idempotency.

const BASE = 'http://localhost';
const PASSWORD = 'hunter2-s3cret';

function jsonPost(path: string, body: unknown): Request {
    return new Request(`${BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function dbWithPasswordUser(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    await db.identityPii.put('current', {
        name: 'Demo', email: 'demo@example.com',
        phone: '555-0100', bio: 'demo user',
    });
    await db.identityCredentials.put('c1', {
        identity_id: 'current', kind: 'password',
        status: 'set', secret: await hashPassword(PASSWORD),
        at: '2026-06-03T00:00:00.000000Z',
    });
    return db;
}

async function fullLoginFlow(db: MemoryDbAdapter): Promise<{
    readonly code: string;
    readonly access_token: string;
    readonly refresh_token: string;
}> {
    const authorizeRes = await handleRequest(db, jsonPost(
        'authentication/authorize', {
            method: 'password', username: 'demo@example.com',
            password: PASSWORD, client_id: 'web',
        }));
    assert.equal(authorizeRes.status, 200);
    const { code } = await authorizeRes.json() as {
        code: string;
    };
    const tokenRes = await handleRequest(db, jsonPost(
        'authentication/token', {
            grant_type: 'authorization_code', code,
        }));
    assert.equal(tokenRes.status, 200);
    const grant = await tokenRes.json() as {
        access_token: string;
        refresh_token: string;
    };
    return { code, ...grant };
}

test('no live secret survives into the ledger', async () => {
    const db = await dbWithPasswordUser();
    await seedRootAdmin(db);
    const { code, access_token, refresh_token } =
        await fullLoginFlow(db);
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.ok(requests.length > 0);
    const liveSecrets = [
        PASSWORD, code, access_token, refresh_token,
    ];
    for (const row of [...requests, ...responses]) {
        for (const secret of liveSecrets) {
            assert.ok(
                !row.message.includes(secret),
                'ledger row ' + row.id
                    + ' leaked a live secret',
            );
        }
    }
});

test('the password fingerprint is PBKDF2, not sha256',
async () => {
    const db = await dbWithPasswordUser();
    await handleRequest(db, jsonPost(
        'authentication/authorize', {
            method: 'password', username: 'demo@example.com',
            password: PASSWORD, client_id: 'web',
        }));
    const requests = await db.requests.getAll();
    const authorizeRequest = requests.find(
        r => r.uri_prefix === '/authentication/authorize/');
    assert.ok(authorizeRequest);
    assert.match(
        authorizeRequest!.message, /\$pbkdf2-sha256\$/);
    assert.doesNotMatch(authorizeRequest!.message, /sha256:/);
});

test('a full login flow keeps requests/responses balanced,'
+ ' one genesis pair per hop', async () => {
    const db = await dbWithPasswordUser();
    await seedRootAdmin(db);
    await fullLoginFlow(db);
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, responses.length);
    assert.equal(requests.length, 2);
    for (const row of requests) {
        assert.equal(row.uri_id, '');
        assert.equal(row.supersedes, undefined);
    }
});

test('stored messages verify against their hashes', async () => {
    const db = await dbWithPasswordUser();
    await seedRootAdmin(db);
    await fullLoginFlow(db);
    for (const row of await db.requests.getAll()) {
        assert.equal(
            await sha256Hex(row.message), row.message_hash);
    }
    for (const row of await db.responses.getAll()) {
        assert.equal(
            await sha256Hex(row.message), row.message_hash);
    }
});

test('a wrong password stores nothing', async () => {
    const db = await dbWithPasswordUser();
    const res = await handleRequest(db, jsonPost(
        'authentication/authorize', {
            method: 'password', username: 'demo@example.com',
            password: 'WRONG', client_id: 'web',
        }));
    assert.equal(res.status, 401);
    assert.equal((await db.requests.getAll()).length, 0);
    assert.equal((await db.responses.getAll()).length, 0);
});

test('a double-spent authorization code stores nothing on'
+ ' the replay — the domain guard, not a stored-response'
+ ' replay, governs (REPLAY_EXEMPT_ROUTE_PATTERNS)',
async () => {
    const db = await dbWithPasswordUser();
    await seedRootAdmin(db);
    const { code } = await fullLoginFlow(db);
    const before = (await db.requests.getAll()).length;
    const replay = await handleRequest(db, jsonPost(
        'authentication/token', {
            grant_type: 'authorization_code', code,
        }));
    assert.equal(replay.status, 401);
    assert.equal((await db.requests.getAll()).length, before);
    assert.equal(
        (await db.responses.getAll()).length, before);
});

test('the wire response on a 2xx carries a Response-ID and'
+ ' Date header derived from the stored (redacted) pair',
async () => {
    const db = await dbWithPasswordUser();
    const res = await handleRequest(db, jsonPost(
        'authentication/authorize', {
            method: 'password', username: 'demo@example.com',
            password: PASSWORD, client_id: 'web',
        }));
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('Response-ID'));
    assert.ok(res.headers.get('Date'));
});

test('an unsupported grant_type stores nothing', async () => {
    const db = await dbWithPasswordUser();
    const res = await handleRequest(db, jsonPost(
        'authentication/token', { grant_type: 'wat' }));
    assert.equal(res.status, 400);
    assert.equal((await db.requests.getAll()).length, 0);
});

test('a refresh grant stores its own redacted pair with no'
+ ' live secrets', async () => {
    const db = await dbWithPasswordUser();
    await seedRootAdmin(db);
    const first = await fullLoginFlow(db);
    const res = await handleRequest(db, jsonPost(
        'authentication/token', {
            grant_type: 'refresh',
            refresh_token: first.refresh_token,
        }));
    assert.equal(res.status, 200);
    const rotated = await res.json() as {
        access_token: string; refresh_token: string;
    };
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, responses.length);
    assert.equal(requests.length, 3);   // authorize + token + refresh
    const liveSecrets = [
        first.refresh_token, rotated.access_token,
        rotated.refresh_token,
    ];
    for (const row of [...requests, ...responses]) {
        for (const secret of liveSecrets) {
            assert.ok(!row.message.includes(secret));
        }
    }
});

test('a token-exchange grant stores its own redacted pair'
+ ' with no live secrets', async () => {
    const db = await dbWithPasswordUser();
    await seedRootAdmin(db);
    const subjectToken = await devToken('current');
    const res = await handleRequest(db, jsonPost(
        'authentication/token', {
            grant_type: 'token-exchange',
            subject_token: subjectToken,
            actor_token: subjectToken,
        }));
    assert.equal(res.status, 200);
    const body = await res.json() as {
        access_token: string; refresh_token: string;
    };
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, responses.length);
    assert.equal(requests.length, 1);
    const liveSecrets = [
        subjectToken, body.access_token, body.refresh_token,
    ];
    for (const row of [...requests, ...responses]) {
        for (const secret of liveSecrets) {
            assert.ok(!row.message.includes(secret));
        }
    }
});

test('a client_credentials grant stores its own redacted pair'
+ ' with no live secrets', async () => {
    const db = await dbWithPasswordUser();
    await db.roleGrants.put('rg-svc', {
        organization_id: '1',
        identity_id: 'svc-client', role: 'admin',
        action: 'granted', by_member_id: 'system',
        at: '2020-01-01T00:00:00.000000Z',
    });
    await db.memberships.put('m-svc', {
        organization_id: '1',
        identity_id: 'svc-client',
        at: '2020-01-01T00:00:00.000000Z',
    });
    const signer = await makeAssertionSigner('ES256');
    const now = Math.floor(Date.now() / 1000);
    const assertion = await signer.sign({
        iss: 'svc-client', sub: 'svc-client',
        aud: 'fusion-ai-web',
        exp: now + 300, iat: now, jti: 'assert-shadow-1',
    });
    await db.clients.put('svc-client', {
        grant_types: 'client_credentials',
        redirect_uris: '', jwks: signer.jwks,
        aud: 'fusion-ai-web', status: 'active',
    });
    const res = await handleRequest(db, jsonPost(
        'authentication/token', {
            grant_type: 'client_credentials',
            client_id: 'svc-client',
            client_assertion: assertion,
        }));
    assert.equal(res.status, 200);
    const body = await res.json() as {
        access_token: string; refresh_token: string;
    };
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, responses.length);
    assert.equal(requests.length, 1);
    const liveSecrets = [
        assertion, body.access_token, body.refresh_token,
    ];
    for (const row of [...requests, ...responses]) {
        for (const secret of liveSecrets) {
            assert.ok(!row.message.includes(secret));
        }
    }
});
