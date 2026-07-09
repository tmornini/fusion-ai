import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { EntityNotFoundError } from '../api/db.ts';
import type { ClientEntity } from '../api/types.ts';
import { postMockDataLoad } from '../api/mock-data.ts';
import { ORGANIZATION_TWO } from
    '../api/mock-data/seed-constants.ts';
import { deriveIdentityPiiRows } from
    '../api/derive-identity-spine.ts';
import {
    deriveInvitations,
    invitationOpStateFor,
} from '../api/derive-invitations.ts';
import {
    pendingInvitationFor,
} from '../api/invitations-domain.ts';
import { handleRequest } from '../api/api.ts';
import { organizationToken } from './token-fixtures.ts';

// Phase 15 gate 6 parity pins: the three re-homes that close
// Author gate 6 for the exit census.
//
// 1. grantInvitation email resolution —
//    deriveIdentityPiiRows email match ≡ identityPii.getAll
// 2. pendingInvitationFor discovery —
//    deriveInvitations pending ≡ row-plane pending
// 3. grantClientCredentials client lookup —
//    rawReadRow('clients', id) ≡ getById for active clients;
//    null for missing ≡ EntityNotFoundError

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
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

async function seededDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await postMockDataLoad(db);
    return db;
}

// Row-plane oracle for pendingInvitationFor's pre-gate-6
// body: invitations.getAll filter + invitationOpStateFor.
// Kept here ONLY as the permanent dual-write oracle.
async function pendingFromRows(
    db: MemoryDbAdapter,
    organization: string,
    identityId: string,
): Promise<{ id: string; at: string } | null> {
    const candidates = (await db.invitations.getAll())
        .filter(inv => inv.organization_id === organization
            && inv.identity_id === identityId);
    for (const inv of candidates) {
        const state = await invitationOpStateFor(db, inv.id);
        if (state === undefined) {
            return { id: inv.id, at: inv.at };
        }
    }
    return null;
}

test('deriveIdentityPiiRows email match ≡ identityPii.getAll'
+ ' email match (grantInvitation\'s email resolution)',
async () => {
    const db = await seededDb();
    const email = 'sarah.chen@company.com';
    const fromRows = (await db.identityPii.getAll())
        .find(p => p.email === email);
    const fromPairs = (await deriveIdentityPiiRows(db))
        .find(p => p.email === email);
    assert.ok(fromRows !== undefined);
    assert.deepEqual(fromPairs, fromRows);

    // Unknown email: both planes miss.
    const missing = 'nobody@example.invalid';
    assert.equal(
        (await db.identityPii.getAll())
            .find(p => p.email === missing),
        undefined,
    );
    assert.equal(
        (await deriveIdentityPiiRows(db))
            .find(p => p.email === missing),
        undefined,
    );
});

test('deriveInvitations pending ≡ row pending for'
+ ' pendingInvitationFor (grant/decline/reinvite)',
async () => {
    const db = await seededDb();
    const admin = await organizationToken(
        'current', ORGANIZATION_TWO);
    const inviteeId = 'LhfaUUf4IumVsCSGB4xjdK';
    const inviteeToken = await organizationToken(
        inviteeId, ORGANIZATION_TWO);

    async function assertPendingParity(): Promise<
        { id: string; at: string } | null
    > {
        const fromFn = await pendingInvitationFor(
            db, ORGANIZATION_TWO, inviteeId);
        const fromRows = await pendingFromRows(
            db, ORGANIZATION_TWO, inviteeId);
        assert.deepEqual(fromFn, fromRows);
        // Also: deriveInvitations' own state field agrees with
        // the pending discovery for the matched id.
        if (fromFn !== null) {
            const derived = (await deriveInvitations(db))
                .find(r => r.id === fromFn.id);
            assert.equal(derived?.state, 'pending');
            assert.equal(
                derived?.organization_id, ORGANIZATION_TWO);
            assert.equal(derived?.identity_id, inviteeId);
        }
        return fromFn;
    }

    assert.equal(await assertPendingParity(), null);

    const grant = await handleRequest(db, req(
        'POST', '/invitations', admin, {
            email: 'sarah.chen@company.com',
            invitationId: 'inv-rehome-parity-1',
            grantEventId: 'inv-rehome-parity-1-grant',
            grantAt: '2026-06-02T00:00:00.000000Z',
        },
    ));
    assert.equal(grant.status, 200);
    assert.equal(
        (await assertPendingParity())?.id,
        'inv-rehome-parity-1',
    );

    const decline = await handleRequest(db, req(
        'POST',
        '/invitations/inv-rehome-parity-1/decline',
        inviteeToken, {
            declineEventId: 'inv-rehome-parity-1-decline',
            declineAt: '2026-06-02T00:00:01.000000Z',
        },
    ));
    assert.equal(decline.status, 204);
    assert.equal(await assertPendingParity(), null);

    // Declined-reinvite: multi-candidate on the same
    // (organization, identity) pair.
    const regrant = await handleRequest(db, req(
        'POST', '/invitations', admin, {
            email: 'sarah.chen@company.com',
            invitationId: 'inv-rehome-parity-2',
            grantEventId: 'inv-rehome-parity-2-grant',
            grantAt: '2026-06-02T00:00:02.000000Z',
        },
    ));
    assert.equal(regrant.status, 200);
    assert.equal(
        (await assertPendingParity())?.id,
        'inv-rehome-parity-2',
    );
});

test('loadInvitation shape: deriveInvitations find-by-id ≡'
+ ' invitations.getById for a live grant, null for missing',
async () => {
    const db = await seededDb();
    const admin = await organizationToken(
        'current', ORGANIZATION_TWO);
    const grant = await handleRequest(db, req(
        'POST', '/invitations', admin, {
            email: 'sarah.chen@company.com',
            invitationId: 'inv-rehome-load-1',
            grantEventId: 'inv-rehome-load-1-grant',
            grantAt: '2026-06-02T00:00:00.000000Z',
        },
    ));
    assert.equal(grant.status, 200);

    const row = await db.invitations.getById(
        'inv-rehome-load-1');
    const derived = (await deriveInvitations(db))
        .find(r => r.id === 'inv-rehome-load-1');
    assert.ok(derived !== undefined);
    assert.equal(derived.id, row.id);
    assert.equal(
        derived.organization_id, row.organization_id);
    assert.equal(derived.identity_id, row.identity_id);
    assert.equal(derived.at, row.at);

    // Missing id: both planes absent.
    await assert.rejects(
        () => db.invitations.getById('inv-ghost'),
        EntityNotFoundError,
    );
    assert.equal(
        (await deriveInvitations(db))
            .find(r => r.id === 'inv-ghost'),
        undefined,
    );
});

test('rawReadRow clients ≡ getById for an active client;'
+ ' null for a missing client',
async () => {
    const db = await seededDb();
    const fields = {
        grant_types: 'client_credentials',
        redirect_uris: '',
        jwks: '{"keys":[]}',
        aud: 'fusion-ai-web',
        status: 'active' as const,
    };
    await db.clients.put('svc-rehome-parity', fields);

    const fromStore = await db.clients.getById(
        'svc-rehome-parity');
    const fromRaw = await db.rawReadRow<ClientEntity>(
        'clients', 'svc-rehome-parity',
    );
    assert.ok(fromRaw !== null);
    assert.deepEqual(fromRaw, fromStore);

    // Missing: raw null ≡ EntityNotFoundError.
    assert.equal(
        await db.rawReadRow<ClientEntity>(
            'clients', 'ghost-client',
        ),
        null,
    );
    await assert.rejects(
        () => db.clients.getById('ghost-client'),
        EntityNotFoundError,
    );
});
