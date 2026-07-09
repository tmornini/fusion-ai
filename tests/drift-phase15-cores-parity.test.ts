import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import {
    EntityNotFoundError, type DbAdapter,
} from '../api/db.ts';
import { jsonObjectField, nowUtc } from '../api/types.ts';
import { postMockDataLoad } from '../api/mock-data.ts';
import {
    workOrderDocumentHeadFor,
    stateEventVisibilityFor,
} from '../api/derive-states.ts';
import {
    STARK_ORGANIZATION,
    ORGANIZATION_TWO,
} from '../api/mock-data/seed-constants.ts';
import { organizationToken } from './token-fixtures.ts';
import { organizationScopedAdapter } from
    '../api/db-organization-scoped.ts';

// Phase 15 Task 1: view-safe derive cores — pre-tx-vs-in-tx
// parity + drift pins against the still-live row plane. Cores
// only; no production call site flips (Tasks 2–6 re-anchor).

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

function workOrderFlowGraph(
    lockTimeoutSeconds: number,
): string {
    return jsonObjectField({
        name: 'Phase15 Head Fixture Flow',
        lockTimeout: lockTimeoutSeconds,
        nodes: [
            {
                id: 'n-start', name: 'Start',
                positionX: 0, positionY: 0,
                isCreate: true, isArchive: false,
                memberIds: [], attributes: [],
                taskInstructions: '',
            },
            {
                id: 'n-finish', name: 'Finish',
                positionX: 0, positionY: 0,
                isCreate: false, isArchive: true,
                memberIds: [], attributes: [],
                taskInstructions: '',
            },
        ],
        edges: [
            {
                id: 'e1', name: '',
                fromNodeId: 'n-start',
                toNodeId: 'n-finish',
            },
        ],
    });
}

// The claim gate's write-tx table list
// (postWorkOrderClaimOp, routes.ts).
const CLAIM_TX_TABLES = [
    'work_orders', 'states', 'requests', 'responses',
] as const;

const EMPTY_FLOW_ID = 'E2BnBlZyrriqsQYkmS4usb';

// -- workOrderDocumentHeadFor ------------------------------------

test('workOrderDocumentHeadFor: byte-equal to'
+ ' workOrders.getById for a live create; null for absent;'
+ ' pre-tx vs in-tx parity', async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const workOrderId = 'wo-p15-doc-head';
    const graph = workOrderFlowGraph(8 * 60 * 60);

    const created = await handleRequest(db, req(
        'POST', '/work-orders', token, {
            id: workOrderId,
            workOrder: {
                display_id: 'p15-' + workOrderId,
                flow_graph: graph,
                position: 7,
            },
            flowWorkOrderId: workOrderId + '-fwo',
            flowWorkOrder: {
                flow_id: EMPTY_FLOW_ID,
                work_order_id: workOrderId,
                at: nowUtc(),
            },
            stateEventIds: [
                workOrderId + '-ev1',
                workOrderId + '-ev2',
                workOrderId + '-ev3',
            ],
            stateEventAts: [nowUtc(), nowUtc(), nowUtc()],
            states: ['n-start', 'n-finish', 'claimed'],
        },
    ));
    assert.equal(created.status, 204);

    const rowOracle = await db.workOrders
        .getById(workOrderId);
    const preTx = await workOrderDocumentHeadFor(
        db, STARK_ORGANIZATION, workOrderId,
    );
    const inTx = await db.transaction(
        [...CLAIM_TX_TABLES],
        (view) => workOrderDocumentHeadFor(
            view, STARK_ORGANIZATION, workOrderId,
        ),
    );
    assert.deepEqual(preTx, inTx);
    assert.deepEqual(preTx, rowOracle);

    // Absent id: pair plane returns null (Task 2 maps to the
    // same EntityNotFoundError bytes as workOrders.getById).
    const preTxMissing = await workOrderDocumentHeadFor(
        db, STARK_ORGANIZATION, 'no-such-work-order',
    );
    const inTxMissing = await db.transaction(
        [...CLAIM_TX_TABLES],
        (view) => workOrderDocumentHeadFor(
            view, STARK_ORGANIZATION, 'no-such-work-order',
        ),
    );
    assert.equal(preTxMissing, null);
    assert.equal(inTxMissing, null);
    await assert.rejects(
        () => db.workOrders.getById('no-such-work-order'),
        EntityNotFoundError,
    );
});

test('workOrderDocumentHeadFor: tracks a later document PUT'
+ ' (head, not create-time body) against the row plane',
async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const workOrderId = 'wo-p15-doc-head-edit';
    const graph1 = workOrderFlowGraph(4 * 60 * 60);
    const graph2 = workOrderFlowGraph(12 * 60 * 60);

    const put1 = await handleRequest(db, req(
        'PUT', '/work-orders/' + workOrderId, token, {
            display_id: 'before',
            flow_graph: graph1,
            position: 1,
        },
    ));
    assert.equal(put1.status, 200);

    const put2 = await handleRequest(db, req(
        'PUT', '/work-orders/' + workOrderId, token, {
            display_id: 'after',
            flow_graph: graph2,
            position: 3,
        },
    ));
    assert.equal(put2.status, 200);

    const rowOracle = await db.workOrders
        .getById(workOrderId);
    const derived = await workOrderDocumentHeadFor(
        db, STARK_ORGANIZATION, workOrderId,
    );
    assert.deepEqual(derived, rowOracle);
    assert.equal(derived!.display_id, 'after');
    assert.equal(derived!.position, 3);
});

// -- stateEventVisibilityFor -------------------------------------

// Row-plane three-way oracle matching isVisibleStateEvent
// (derive-state-field-values.ts): (1) no raw row → orphan;
// (2) fenced getById succeeds → visible; (3) raw row but
// fenced getById 404s → hidden.
async function rowPlaneVisibility(
    scoped: DbAdapter,
    eventId: string,
): Promise<'orphan' | 'visible' | 'hidden'> {
    if (!(await scoped.states.rawHasRow(eventId))) {
        return 'orphan';
    }
    try {
        await scoped.states.getById(eventId);
        return 'visible';
    } catch (e) {
        if (e instanceof EntityNotFoundError) {
            return 'hidden';
        }
        throw e;
    }
}

test('stateEventVisibilityFor: tier (i) event-append pairs'
+ ' match the row-plane three-way (own / foreign / orphan);'
+ ' pre-tx vs in-tx parity', async () => {
    const db = await seededDb();
    const allStates = await db.states.getAll();
    const starkScoped = organizationScopedAdapter(
        db, STARK_ORGANIZATION,
    );
    let ownEventId = '';
    for (const row of allStates) {
        const v = await rowPlaneVisibility(
            starkScoped, row.id,
        );
        if (v === 'visible') {
            ownEventId = row.id;
            break;
        }
    }
    assert.notEqual(ownEventId, '');

    const twoScoped = organizationScopedAdapter(
        db, ORGANIZATION_TWO,
    );
    let foreignEventId = '';
    for (const row of allStates) {
        const v = await rowPlaneVisibility(
            twoScoped, row.id,
        );
        if (v === 'hidden') {
            foreignEventId = row.id;
            break;
        }
    }
    assert.notEqual(foreignEventId, '');

    const txTables = ['requests', 'responses', 'states'];

    // Own → visible (tier i).
    const preOwn = await stateEventVisibilityFor(
        db, STARK_ORGANIZATION, ownEventId,
    );
    const inOwn = await db.transaction(
        txTables,
        (view) => stateEventVisibilityFor(
            view, STARK_ORGANIZATION, ownEventId,
        ),
    );
    assert.equal(preOwn, 'visible');
    assert.equal(inOwn, preOwn);
    assert.equal(
        await rowPlaneVisibility(starkScoped, ownEventId),
        'visible',
    );

    // Foreign → hidden (tier i, cross-org by construction).
    // foreignEventId is hidden TO org two — so its owner is
    // not org two. Ask as org two.
    const preForeign = await stateEventVisibilityFor(
        db, ORGANIZATION_TWO, foreignEventId,
    );
    assert.equal(preForeign, 'hidden');
    assert.equal(
        await rowPlaneVisibility(twoScoped, foreignEventId),
        'hidden',
    );

    // Nowhere → orphan.
    const preOrphan = await stateEventVisibilityFor(
        db, STARK_ORGANIZATION, 'ghost-event-nowhere',
    );
    const inOrphan = await db.transaction(
        txTables,
        (view) => stateEventVisibilityFor(
            view, STARK_ORGANIZATION, 'ghost-event-nowhere',
        ),
    );
    assert.equal(preOrphan, 'orphan');
    assert.equal(inOrphan, 'orphan');
    assert.equal(
        await rowPlaneVisibility(
            starkScoped, 'ghost-event-nowhere',
        ),
        'orphan',
    );
});

test('stateEventVisibilityFor: tier (ii) op-born transition'
+ ' event is visible to the owning org and hidden to a'
+ ' foreign org (tier iii)', async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const workOrderId = 'wo-p15-vis-transition';
    const graph = workOrderFlowGraph(8 * 60 * 60);
    const transitionEventId = workOrderId + '-te1';

    const created = await handleRequest(db, req(
        'POST', '/work-orders', token, {
            id: workOrderId,
            workOrder: {
                display_id: 'vis-' + workOrderId,
                flow_graph: graph,
                position: 1,
            },
            flowWorkOrderId: workOrderId + '-fwo',
            flowWorkOrder: {
                flow_id: EMPTY_FLOW_ID,
                work_order_id: workOrderId,
                at: nowUtc(),
            },
            stateEventIds: [
                workOrderId + '-ev1',
                workOrderId + '-ev2',
                workOrderId + '-ev3',
            ],
            stateEventAts: [nowUtc(), nowUtc(), nowUtc()],
            states: ['n-start', 'n-finish', 'claimed'],
        },
    ));
    assert.equal(created.status, 204);

    const transitioned = await handleRequest(db, req(
        'POST',
        '/work-orders/' + workOrderId + '/transition',
        token,
        {
            transitionEventId,
            targetState: 'n-finish',
            fieldValues: [],
            release: null,
            transitionAt: nowUtc(),
        },
    ));
    assert.equal(transitioned.status, 204);

    // Op-born: no states/:id pair at transitionEventId;
    // lives only inside the transition op body.
    const byId = await db.responses.getAllWhere(
        'uri_id', transitionEventId,
    );
    const statesHits = byId.filter((r) =>
        /\/states\/$/.test(r.uri_prefix));
    assert.equal(statesHits.length, 0);

    assert.equal(
        await stateEventVisibilityFor(
            db, STARK_ORGANIZATION, transitionEventId,
        ),
        'visible',
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, ORGANIZATION_TWO, transitionEventId,
        ),
        'hidden',
    );
});
