import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { organizationToken } from './token-fixtures.ts';
import { organizationRow } from './test-fixtures.ts';
import { documentPairsAt } from '../api/derive-documents.ts';

// Phase 8 Task 6: the invitation document plane — the grant's
// PUT-shaped invitation document (the entity minus id, NO email
// by construction) and the accept's PUT-shaped memberships
// document (the B2 closure: the third memberships writer to join
// the document plane, after the live PUT route and the seed).
// Neither document routes anywhere (Author gate 2 — the
// invitations side channel never joins the route table); both
// are storage-only.

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

async function person(
    db: MemoryDbAdapter,
    id: string,
    name: string,
    email: string,
): Promise<void> {
    await db.members.put(id, { type: 'human' });
    await db.identities.put(id, { kind: 'person' });
    await db.identityPii.put(id, {
        name, email, phone: '', bio: '',
    });
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    await db.organizations.put('1', organizationRow('Stark'));
    await db.roleGrants.put('rg-current-1', {
        organization_id: '1', identity_id: 'current',
        role: 'admin', action: 'granted',
        by_member_id: 'system', at: AT,
    });
    await db.memberships.put('m-current-1', {
        organization_id: '1', identity_id: 'current', at: AT,
    });
    await person(db, 'current', 'Tony', 'demo@example.com');
    await person(db, 'sarah', 'Sarah', 'sarah@x.com');
    return db;
}

async function grant(
    db: MemoryDbAdapter,
    invitationId: string,
    email = 'sarah@x.com',
): Promise<Response> {
    return handleRequest(db, req(
        'POST', '/invitations', await organizationToken(),
        {
            email,
            invitationId,
            grantEventId: 'ev-grant-' + invitationId,
            grantAt: AT,
        },
    ));
}

// ── grant: the invitation document pair ──

test('a fresh grant appends 2 pairs — the operation and the'
+ ' invitation document, email ABSENT by construction',
async () => {
    const db = await freshDb();
    const res = await grant(db, 'inv-doc-1');
    assert.equal(res.status, 200);
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, 2);
    const atAddress = requests.filter(
        r => r.uri_prefix === '/invitations/'
            && r.uri_id === 'inv-doc-1',
    );
    assert.equal(atAddress.length, 2);
    // The document head: the ONE PUT/2xx pair at this address —
    // documentPairsAt excludes the operation pair's POST method
    // by construction (design decision 6), so a match here IS
    // the document.
    const documents = documentPairsAt(
        requests, responses, '/invitations/',
    ).filter(pair => pair.uriId === 'inv-doc-1');
    assert.equal(documents.length, 1);
    const wire = documents[0]!.body;
    assert.deepEqual(
        Object.keys(wire).sort(),
        ['at', 'identity_id', 'organization_id'],
    );
    assert.equal(wire.organization_id, '1');
    assert.equal(wire.identity_id, 'sarah');
    assert.equal(wire.at, AT);
    assert.equal(wire.email, undefined);
});

test('a duplicate grant appends ONLY its operation pair — no'
+ ' phantom document at the duplicate\'s submitted id',
async () => {
    const db = await freshDb();
    const first = await grant(db, 'inv-doc-2a');
    assert.equal(first.status, 200);
    const second = await grant(db, 'inv-doc-2b');
    assert.equal(second.status, 200);
    const requests = await db.requests.getAll();
    const atDuplicateId = requests.filter(
        r => r.uri_prefix === '/invitations/'
            && r.uri_id === 'inv-doc-2b',
    );
    assert.equal(atDuplicateId.length, 1);
    const atFreshId = requests.filter(
        r => r.uri_prefix === '/invitations/'
            && r.uri_id === 'inv-doc-2a',
    );
    assert.equal(atFreshId.length, 2);
});

test('a failed (member-conflict) grant appends nothing',
async () => {
    const db = await freshDb();
    await db.memberships.put('m-sarah-conflict', {
        organization_id: '1', identity_id: 'sarah', at: AT,
    });
    const res = await grant(db, 'inv-doc-fail');
    assert.equal(res.status, 409);
    assert.equal((await db.requests.getAll()).length, 0);
    assert.equal((await db.responses.getAll()).length, 0);
});
