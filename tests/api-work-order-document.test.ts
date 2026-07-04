import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { PUT } from '../api/api.ts';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { DEV_TOKEN } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import {
    jsonObjectField,
    DEFAULT_LOCK_TIMEOUT,
} from '../api/types.ts';
import type { WorkOrderFlowGraph } from '../api/types.ts';
import { ValidationError } from '../api/types.ts';
import {
    validateWorkOrderDocumentBody,
} from '../api/validators.ts';
import { postWorkOrderDocumentOp } from '../api/routes.ts';
import { formWritePair } from '../api/message-pair.ts';

// Phase 5 Task 2 (fourth-family, 'stateless' evidence): PUT
// /work-orders/:id takes the entity's OWN fields only — no
// lifecycle trio, unlike ideas/projects/flows (Decision 7). A
// work order's lifecycle is written ONLY by the create/claim/
// transition ops and the states/:id unclaim path, so a body
// carrying state/state_at/state_event_id 400s at the gate
// (validateWorkOrderDocumentBody), and the op posts no states
// event of its own.

async function freshDb() {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

// The frozen flow graph a work order carries, stored as the raw
// JSON string the work_orders.flow_graph column holds — the
// SAME fixture shape as api-work-orders-create.test.ts's own
// flowGraph() (each test file is an isolated world).
function flowGraph(): string {
    const graph: WorkOrderFlowGraph = {
        name: 'Test flow',
        lockTimeout: DEFAULT_LOCK_TIMEOUT,
        nodes: [
            {
                id: 'n-start', name: 'Start',
                positionX: 0, positionY: 0,
                isCreate: true, isArchive: false,
                memberIds: [], attributes: [],
                taskInstructions: '',
            },
            {
                id: 'n-finish', name: 'Done',
                positionX: 0, positionY: 0,
                isCreate: false, isArchive: true,
                memberIds: [], attributes: [],
                taskInstructions: '',
            },
        ],
        edges: [
            {
                id: 'e1', name: '',
                fromNodeId: 'n-start', toNodeId: 'n-finish',
            },
        ],
    };
    return jsonObjectField(
        graph as unknown as Record<string, unknown>,
    );
}

function documentFields() {
    return {
        display_id: 'wo-doc-1',
        flow_graph: flowGraph(),
        position: 2,
    };
}

// -- 1. validateWorkOrderDocumentBody -----------------------

test('validateWorkOrderDocumentBody accepts the entity fields'
+ ' plus an optional organization_id', () => {
    const doc = validateWorkOrderDocumentBody({
        ...documentFields(),
        organization_id: '1',
    });
    assert.deepEqual(doc.entity, documentFields());
});

test('validateWorkOrderDocumentBody accepts the entity fields'
+ ' with organization_id absent', () => {
    const doc = validateWorkOrderDocumentBody(documentFields());
    assert.deepEqual(doc.entity, documentFields());
});

test('validateWorkOrderDocumentBody rejects a trio key at the'
+ ' gate (the stateless covenant, validator-enforced)', () => {
    assert.throws(
        () => validateWorkOrderDocumentBody({
            ...documentFields(),
            state: 'active',
        }),
        ValidationError,
    );
    assert.throws(
        () => validateWorkOrderDocumentBody({
            ...documentFields(),
            state_at: '2026-01-01T00:00:00.000000Z',
        }),
        ValidationError,
    );
    assert.throws(
        () => validateWorkOrderDocumentBody({
            ...documentFields(),
            state_event_id: 'ev-1',
        }),
        ValidationError,
    );
});

// -- 2. postWorkOrderDocumentOp (below-gate, MemoryDbAdapter) --

test('postWorkOrderDocumentOp writes exactly the work_orders'
+ ' row and the pair', async () => {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    const body = {
        ...documentFields(),
        organization_id: '1',
    };
    const pair = await formWritePair({
        method: 'PUT',
        pathname: '/work-orders/wo-doc-op-1',
        routePattern: 'work-orders/:id',
        routeSegments: ['work-orders', ':id'],
        pathSegments: ['work-orders', 'wo-doc-op-1'],
        headerFields: [], body,
        requesterIdentityId: 'current',
        requestAt: '2026-01-01T00:00:00.000000Z',
        organization: '1',
        responseStatus: 200, responseBody: undefined,
        headPairId: undefined,
    });
    await postWorkOrderDocumentOp(
        db, 'wo-doc-op-1', body, 'current', pair,
    );
    const row = await db.workOrders.getById('wo-doc-op-1');
    assert.deepEqual(row, {
        id: 'wo-doc-op-1',
        organization_id: '1',
        ...documentFields(),
    });
    assert.equal((await db.requests.getAll()).length, 1);
    assert.equal((await db.responses.getAll()).length, 1);
});

// -- 3. byte-identical resend (the shadow-ledger pin's sibling
// at the op level — see tests/api-idea-document.test.ts's own
// "a byte-identical resend converges" case). This exercises the
// CURRENT hand-written work-orders/:id PUT (unchanged until the
// absorption commit registers WORK_ORDERS_WIRING) — the fast
// path lives at the gate (api.ts), agnostic to which op serves
// the route, so this pin holds unchanged straight through the
// absorption (finding 11: wire-byte parity). -----------------

test('a byte-identical PUT resend to work-orders/:id converges'
+ ' to one stored request/response pair', async () => {
    const db = await freshDb();
    const body = documentFields();
    const first = await PUT(
        db, 'work-orders/wo-resend-1', body, DEV_TOKEN,
    );
    const second = await PUT(
        db, 'work-orders/wo-resend-1', body, DEV_TOKEN,
    );
    assert.deepEqual(first, second);
    assert.equal((await db.requests.getAll()).length, 1);
    assert.equal((await db.responses.getAll()).length, 1);
});
