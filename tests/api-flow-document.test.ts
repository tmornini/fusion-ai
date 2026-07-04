import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import { postFlowDocumentOp } from '../api/routes.ts';
import { organizationToken } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { DEFAULT_LOCK_TIMEOUT } from '../api/types.ts';

// The flows-specific below-gate op + locked-class e2e coverage
// for Task 3's document PUT (the generic locked arm itself is
// already Task-2-tested against ideas/projects-shaped synthetic
// families in tests/document-family.test.ts).

const BASE = 'http://localhost';
const AT = '2026-01-01T00:00:00.000000Z';

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
            'Authorization': 'Bearer ' + token,
            ...(headers ?? {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

function flowFields(name: string) {
    return {
        name,
        is_locked: false,
        is_auto_layout: false,
        is_auto_fit: false,
        lock_timeout: DEFAULT_LOCK_TIMEOUT,
    };
}

function emptyDelta() {
    return {
        nodes: [],
        edges: [],
        deletions: [],
        memberEvents: [],
        attributeEvents: [],
    };
}

function emptyGraph(): string {
    return JSON.stringify({ nodes: [], edges: [] });
}

// The full wire document PUT /flows/:id now takes (Decision 7):
// the entity fields, the lifecycle trio, the client-authored
// graph snapshot, and the two transitional decomposition
// sidecars (graphDelta/revivals).
function documentBody(
    name: string,
    stateEventId: string,
    overrides?: Record<string, unknown>,
) {
    return {
        ...flowFields(name),
        state: 'updated',
        state_at: AT,
        state_event_id: stateEventId,
        graph: emptyGraph(),
        graphDelta: emptyDelta(),
        revivals: [],
        ...(overrides ?? {}),
    };
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

async function createFlow(
    db: MemoryDbAdapter,
    token: string,
    flowId: string,
): Promise<Response> {
    return handleRequest(db, req(
        'POST', '/flows', token,
        {
            id: flowId,
            flow: flowFields('Fresh Flow'),
            projectFlowId: flowId + '-pf',
            projectFlow: {
                project_id: 'proj-1',
                flow_id: flowId,
                at: AT,
            },
            initialState: 'active',
            initialStateEventId: flowId + '-ev',
            initialStateAt: AT,
            graphDelta: emptyDelta(),
        },
    ));
}

// --- below-gate op tests (postFlowDocumentOp directly — no
// route called it until the flip below wired flows/:id onto
// it) ---

test('postFlowDocumentOp writes the flow row, exactly one'
+ ' updated event, the graph-delta rows, and nothing in'
+ ' flow_versions', async () => {
    const db = await freshDb();
    await db.flows.put('flow-op-1', {
        organization_id: '1',
        ...flowFields('Original'),
    });
    await db.states.postEvent(
        'flow-op-1-create', 'flow-op-1', 'active',
        'current', AT,
    );
    const written = await postFlowDocumentOp(
        db, 'flow-op-1',
        {
            ...documentBody('Renamed', 'flow-op-1-upd', {
                graphDelta: {
                    ...emptyDelta(),
                    nodes: [{
                        id: 'n1',
                        flow_id: 'flow-op-1',
                        name: 'N1',
                        position_x: 0,
                        position_y: 0,
                        is_create: false,
                        is_archive: false,
                        task_instructions: '',
                        at: AT,
                    }],
                },
            }),
            organization_id: '1',
        },
        'current',
    );
    assert.equal(written.name, 'Renamed');
    const flow = await db.flows.getById('flow-op-1');
    assert.equal(flow.name, 'Renamed');
    const events = await db.states.getAllFor('flow-op-1');
    assert.deepEqual(
        events.map(e => e.state), ['active', 'updated'],
    );
    const nodes = await db.flowNodes.getAllWhere(
        'flow_id', 'flow-op-1',
    );
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0]!.id, 'n1');
    const versions = await db.flowVersions.getAll();
    assert.equal(versions.length, 0);
});

test('postFlowDocumentOp with revivals posts the restored'
+ ' events (the undo decomposition parity case)', async () => {
    const db = await freshDb();
    await db.flows.put('flow-op-2', {
        organization_id: '1',
        ...flowFields('Original'),
    });
    await db.states.postEvent(
        'flow-op-2-create', 'flow-op-2', 'active',
        'current', AT,
    );
    await db.states.postEvent(
        'node-x-delete', 'node-x', 'deleted', 'current', AT,
    );
    await postFlowDocumentOp(
        db, 'flow-op-2',
        {
            ...documentBody('Revived', 'flow-op-2-upd'),
            revivals: [
                {
                    eventId: 'node-x-restore',
                    entityId: 'node-x',
                    at: AT,
                },
            ],
            organization_id: '1',
        },
        'current',
    );
    const nodeEvents = await db.states.getAllFor('node-x');
    assert.deepEqual(
        nodeEvents.map(e => e.state),
        ['deleted', 'restored'],
    );
});

test('the document body carries state/state_at/graph while'
+ ' the old-plane flow row carries none of them', async () => {
    const db = await freshDb();
    await db.flows.put('flow-op-4', {
        organization_id: '1',
        ...flowFields('Original'),
    });
    await db.states.postEvent(
        'flow-op-4-create', 'flow-op-4', 'active',
        'current', AT,
    );
    const body = {
        ...documentBody('Doc Shape', 'flow-op-4-upd'),
        organization_id: '1',
    };
    for (const key of ['state', 'state_at', 'graph']) {
        assert.ok(key in body, key + ' missing from wire body');
    }
    await postFlowDocumentOp(db, 'flow-op-4', body, 'current');
    const flow = await db.flows.getById('flow-op-4');
    for (const key of [
        'state', 'state_at', 'state_event_id',
        'graph', 'graphDelta', 'revivals',
    ]) {
        assert.ok(
            !(key in flow),
            'flows row must not carry ' + key,
        );
    }
});

// --- e2e locked-class tests (through handleRequest — flows/:id
// is now wired onto documentPutHandler(FLOWS_WIRING)) ---

test('e2e: a byte-identical resend converges (one event, one'
+ ' pair, stored response returned)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const created = await createFlow(db, token, 'flow-locked-3');
    const createdId = created.headers.get('Response-ID');
    assert.ok(createdId);
    const body = documentBody('Resend', 'flow-locked-3-a');
    const headers = { 'if-response-id': createdId! };
    const first = await handleRequest(db, req(
        'PUT', '/flows/flow-locked-3', token, body, headers,
    ));
    assert.equal(first.status, 200);
    const firstId = first.headers.get('Response-ID');
    const eventsAfterFirst =
        await db.states.getAllFor('flow-locked-3');
    const requestsAfterFirst = await db.requests.getAll();

    const second = await handleRequest(db, req(
        'PUT', '/flows/flow-locked-3', token, body, headers,
    ));
    assert.equal(second.status, 200);
    assert.equal(second.headers.get('Response-ID'), firstId);
    const eventsAfterSecond =
        await db.states.getAllFor('flow-locked-3');
    assert.equal(
        eventsAfterSecond.length, eventsAfterFirst.length,
    );
    const requestsAfterSecond = await db.requests.getAll();
    assert.equal(
        requestsAfterSecond.length, requestsAfterFirst.length,
    );
});

test('e2e: a save without If-Response-ID on an existing flow'
+ ' 412s; with the stale echo 412s; with the fresh echo'
+ ' succeeds and the stored response carries Follows',
async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const created = await createFlow(db, token, 'flow-locked-1');
    const createdId = created.headers.get('Response-ID');
    assert.ok(createdId);

    const noEcho = await handleRequest(db, req(
        'PUT', '/flows/flow-locked-1', token,
        documentBody('No Echo', 'flow-locked-1-a'),
    ));
    assert.equal(noEcho.status, 412);

    const staleEcho = await handleRequest(db, req(
        'PUT', '/flows/flow-locked-1', token,
        documentBody('Stale Echo', 'flow-locked-1-b'),
        { 'if-response-id': 'not-the-real-head' },
    ));
    assert.equal(staleEcho.status, 412);

    const fresh = await handleRequest(db, req(
        'PUT', '/flows/flow-locked-1', token,
        documentBody('Fresh Echo', 'flow-locked-1-c'),
        { 'if-response-id': createdId! },
    ));
    assert.equal(fresh.status, 200);
    assert.equal(fresh.headers.get('Follows'), createdId);
});

test('e2e: GET flows/:id carries Response-ID == the head pair'
+ ' id (pre-flip old-plane handler)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const created = await createFlow(db, token, 'flow-locked-2');
    const createdId = created.headers.get('Response-ID');
    assert.ok(createdId);
    const got = await handleRequest(
        db, req('GET', '/flows/flow-locked-2', token),
    );
    assert.equal(got.status, 200);
    assert.equal(got.headers.get('Response-ID'), createdId);
});

test('e2e: an old-shape PUT body 400s (validateFlowPutBody'
+ ' retired)', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    await createFlow(db, token, 'flow-old-shape');
    const res = await handleRequest(db, req(
        'PUT', '/flows/flow-old-shape', token,
        {
            flow: flowFields('Old Shape'),
            eventId: 'ev-1',
            at: AT,
            history: { kind: 'none' },
            graphDelta: emptyDelta(),
        },
    ));
    assert.equal(res.status, 400);
});
