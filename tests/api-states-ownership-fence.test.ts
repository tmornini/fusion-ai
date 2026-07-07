import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { EntityNotFoundError } from '../api/db.ts';
import { organizationToken } from './token-fixtures.ts';
import { organizationRow } from './test-fixtures.ts';
import { jsonObjectField } from '../api/types.ts';

// The state ownership WRITE fence (Phase 11 Task 1).
// MEMBER_VERBS permits member-tier PUT /states/:id
// (api/authorization.ts), and the body names entity_id
// itself — with no upstream ownership check, a member of one
// org could PUT a state event naming ANOTHER org's entity and
// forge or tombstone its lifecycle. The fence resolves
// ownership through the RAW probes (deleted-blind), so a
// foreign entity 404s whether it is live or already
// soft-deleted.

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
            Authorization: 'Bearer ' + token,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

function tokenFor(
    sub: string,
    organization: string,
): Promise<string> {
    return organizationToken(sub, organization);
}

// Two orgs (A, B), one member each (the tier MEMBER_VERBS
// actually grants PUT /states to), an idea owned by each org,
// plus a work order and an objective owned by A — the other
// organizationOwnedProbes table kinds case 4 exercises —
// and memberA's own member id, resolved through the
// membership-ledger fallback rather than any owned table.
async function seed(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    await db.organizations.put('A', organizationRow('Acme'));
    await db.organizations.put('B', organizationRow('Beta'));
    await db.memberships.put('m-a', {
        organization_id: 'A', identity_id: 'memberA', at: AT,
    });
    await db.memberships.put('m-b', {
        organization_id: 'B', identity_id: 'memberB', at: AT,
    });
    await db.roleGrants.put('rg-a', {
        organization_id: 'A', identity_id: 'memberA',
        role: 'member', action: 'granted',
        by_member_id: 'system', at: AT,
    });
    await db.roleGrants.put('rg-b', {
        organization_id: 'B', identity_id: 'memberB',
        role: 'member', action: 'granted',
        by_member_id: 'system', at: AT,
    });
    await db.ideas.put('idea-a', {
        organization_id: 'A', title: 'Idea A', position: 0,
        problem_statement: '', target_users: '',
        proposed_solution: '', expected_outcome: '',
        success_metrics: '',
    });
    await db.ideas.put('idea-b', {
        organization_id: 'B', title: 'Idea B', position: 0,
        problem_statement: '', target_users: '',
        proposed_solution: '', expected_outcome: '',
        success_metrics: '',
    });
    await db.workOrders.put('wo-a', {
        organization_id: 'A', display_id: 'WO-1',
        flow_graph: jsonObjectField({
            name: 'Flow', lockTimeout: 0, nodes: [], edges: [],
        }),
        position: 0,
    });
    await db.objectives.put('obj-a', {
        organization_id: 'A', position: 0,
    });
    return db;
}

// ---- 1. cross-org write is 404, and writes nothing ----

test('a member of org A cannot PUT a states event naming an'
+ ' org-B entity_id', async () => {
    const db = await seed();
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-cross', await tokenFor('memberA', 'A'),
        { entity_id: 'idea-b', state: 'active', at: AT },
    ));
    assert.equal(res.status, 404);
    await assert.rejects(
        () => db.states.getById('ev-cross'),
        EntityNotFoundError,
    );
});

// ---- 2. own-org write succeeds ----

test('a member of org A can PUT a states event naming its'
+ ' own idea', async () => {
    const db = await seed();
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-own', await tokenFor('memberA', 'A'),
        { entity_id: 'idea-a', state: 'active', at: AT },
    ));
    assert.equal(res.status, 200);
    assert.equal(
        (await db.states.getById('ev-own')).entity_id,
        'idea-a',
    );
});

// ---- 3. genuine orphan write succeeds ----

test('a state event naming an entity_id owned by no row'
+ ' still writes (an orphan, not a foreign tenant)',
async () => {
    const db = await seed();
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-orphan', await tokenFor('memberA', 'A'),
        { entity_id: 'ghost-1', state: 'active', at: AT },
    ));
    assert.equal(res.status, 200);
});

// ---- 4. legitimate own-org flows across entity kinds ----

test('workbox unclaim (own-org work order) still writes',
async () => {
    const db = await seed();
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-wo', await tokenFor('memberA', 'A'),
        { entity_id: 'wo-a', state: 'claim_released', at: AT },
    ));
    assert.equal(res.status, 200);
});

test('member archive (own-org member, via the membership'
+ ' ledger) still writes', async () => {
    const db = await seed();
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-member', await tokenFor('memberA', 'A'),
        { entity_id: 'memberA', state: 'archived', at: AT },
    ));
    assert.equal(res.status, 200);
});

test('objective archive (own-org objective) still writes',
async () => {
    const db = await seed();
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-obj', await tokenFor('memberA', 'A'),
        { entity_id: 'obj-a', state: 'archived', at: AT },
    ));
    assert.equal(res.status, 200);
});

// ---- 6. the write escalation: live AND already-deleted ----

test('PUT states/:id naming an org-B LIVE entity is 404',
async () => {
    const db = await seed();
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-live', await tokenFor('memberA', 'A'),
        { entity_id: 'idea-b', state: 'deleted', at: AT },
    ));
    assert.equal(res.status, 404);
});

test('PUT states/:id naming an ALREADY-DELETED org-B entity'
+ ' is still 404 (the raw probe resolves it)', async () => {
    const db = await seed();
    await db.states.put('ev-b-del', {
        entity_id: 'idea-b', state: 'deleted',
        member_id: 'memberB', at: AT,
    });
    const res = await handleRequest(db, req(
        'PUT', '/states/ev-second', await tokenFor('memberA', 'A'),
        { entity_id: 'idea-b', state: 'active', at: AT },
    ));
    assert.equal(res.status, 404);
});
