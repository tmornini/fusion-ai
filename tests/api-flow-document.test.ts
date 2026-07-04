import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { postFlowDocumentOp } from '../api/routes.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { DEFAULT_LOCK_TIMEOUT } from '../api/types.ts';

// The flows-specific below-gate op coverage for Task 3's
// document PUT. The locked-class e2e cases land alongside the
// flip commit that wires flows/:id onto this op (the generic
// locked arm itself is already Task-2-tested against ideas/
// projects-shaped synthetic families in
// tests/document-family.test.ts) — until then no route calls
// postFlowDocumentOp, so only its below-gate behavior is
// pinned here.

const AT = '2026-01-01T00:00:00.000000Z';

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
