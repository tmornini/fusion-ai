import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { DEV_TOKEN } from './token-fixtures.ts';
import {
    stateEventCollisionFromPairs,
} from '../api/derive-states.ts';

// Phase 15 Task 6: stateEventCollisionFromPairs — pair-plane
// twin of StateStore.put's sameEvent check. REDUCE over all
// pairs at the event-append address (finding 2: singularity
// is FALSE).

const BASE = 'http://localhost';
const AT = '2026-01-01T00:00:00.000000Z';
const EVENT_ID = 'ev-collision-1';
const BODY = {
    entity_id: 'ghost-collision',
    state: 'active',
    at: AT,
};

function req(
    method: string,
    path: string,
    token: string,
    body?: unknown,
    headers?: Record<string, string>,
): Request {
    return new Request(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
            ...(headers ?? {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

// DEV_TOKEN's sub is the root admin identity — that id is
// stamped as member_id / requesterIdentityId on live writes.
async function rootActorId(
    db: MemoryDbAdapter,
): Promise<string> {
    const row = await db.states.getById(EVENT_ID);
    return row.member_id;
}

test('stateEventCollisionFromPairs: absent when no pairs'
+ ' name the event id', async () => {
    const db = await freshDb();
    const disposition = await stateEventCollisionFromPairs(
        db, EVENT_ID, {
            entity_id: BODY.entity_id,
            state: BODY.state,
            member_id: 'anyone',
            at: BODY.at,
        },
    );
    assert.equal(disposition, 'absent');
});

test('stateEventCollisionFromPairs: same after a live PUT'
+ ' lands one pair', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, req(
        'PUT', '/states/' + EVENT_ID, DEV_TOKEN, BODY,
    ));
    assert.equal(res.status, 200);
    const actor = await rootActorId(db);
    const disposition = await stateEventCollisionFromPairs(
        db, EVENT_ID, {
            entity_id: BODY.entity_id,
            state: BODY.state,
            member_id: actor,
            at: BODY.at,
        },
    );
    assert.equal(disposition, 'same');
});

test('stateEventCollisionFromPairs: conflict when candidate'
+ ' differs from the stored pair body', async () => {
    const db = await freshDb();
    const res = await handleRequest(db, req(
        'PUT', '/states/' + EVENT_ID, DEV_TOKEN, BODY,
    ));
    assert.equal(res.status, 200);
    const actor = await rootActorId(db);
    const disposition = await stateEventCollisionFromPairs(
        db, EVENT_ID, {
            entity_id: BODY.entity_id,
            state: 'deleted',
            member_id: actor,
            at: BODY.at,
        },
    );
    assert.equal(disposition, 'conflict');
});

test('stateEventCollisionFromPairs: different-envelope resend'
+ ' yields two pairs and still reports same', async () => {
    const db = await freshDb();
    const first = await handleRequest(db, req(
        'PUT', '/states/' + EVENT_ID, DEV_TOKEN, BODY,
        { 'x-request-id': 'envelope-a' },
    ));
    assert.equal(first.status, 200);
    const second = await handleRequest(db, req(
        'PUT', '/states/' + EVENT_ID, DEV_TOKEN, BODY,
        { 'x-request-id': 'envelope-b' },
    ));
    assert.equal(second.status, 200);

    const responses = await db.responses.getAllWhere(
        'uri_id', EVENT_ID,
    );
    const statesPairs = responses.filter((r) =>
        /\/states\/$/.test(r.uri_prefix)
        && r.status >= 200
        && r.status < 300,
    );
    assert.equal(
        statesPairs.length, 2,
        'finding 2: two 2xx pairs at one uri_id',
    );

    const actor = await rootActorId(db);
    const disposition = await stateEventCollisionFromPairs(
        db, EVENT_ID, {
            entity_id: BODY.entity_id,
            state: BODY.state,
            member_id: actor,
            at: BODY.at,
        },
    );
    assert.equal(disposition, 'same');
});
