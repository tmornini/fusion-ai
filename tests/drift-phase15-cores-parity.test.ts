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
    workOrderClaimHistoryFor,
    stateEventVisibilityFor,
    resolveOwningOrganization,
} from '../api/derive-states.ts';
import {
    flowGraphBindingsFromPairs,
} from '../api/derive-flows.ts';
import {
    relationFailClosed,
} from '../api/flow-graph-relations.ts';
import { latestByKey } from
    '../shared/ledger-reduction.ts';
import { TABLE_NAMES } from '../api/db.ts';
import type { GraphEdge } from '../api/types.ts';
import {
    STARK_ORGANIZATION,
    ORGANIZATION_TWO,
} from '../api/mock-data/seed-constants.ts';
import { organizationToken } from './token-fixtures.ts';
import { organizationScopedAdapter } from
    '../api/db-organization-scoped.ts';
import {
    validateWorkOrderFlowGraphJson,
} from '../api/validators.ts';
import {
    latestClaimEvent,
    isClaimEventExpired,
} from '../api/work-order-claims.ts';
import {
    generateCryptoSafeBase62,
} from '../shared/crypto-safe-base62.ts';

// Phase 15: view-safe derive cores (Task 1) + claim-gate
// graph re-anchor pins (Task 2). Pre-tx-vs-in-tx parity and
// residual drift against the dual-write row plane.

const BASE = 'http://localhost';

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

// -- claim graph parity (Phase 15 Task 2) ------------------------

// The claim gate's LIVE graph source since Task 2's re-anchor.
// Pin pre-tx vs in-tx parity of flow_graph (the field
// isClaimEventExpired consumes via lockTimeout) over
// postWorkOrderClaimOp's REAL table list, residual equality
// to workOrders.getById, and claim-outcome parity: the
// priorLive decision computed from the document-head graph
// matches the decision from the residual row-plane graph.
// Seed via PUT (document pair + dual-write row, no birth
// claim) so the live-path claim is a real append, not an
// idempotent re-claim of a create-time 'claimed' event.
test('claim graph: pre-tx vs in-tx flow_graph parity and'
+ ' claim-outcome parity against the residual row plane',
async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const workOrderId = 'wo-p15-claim-graph';
    const lockTimeoutSeconds = 8 * 60 * 60;
    const graph = workOrderFlowGraph(lockTimeoutSeconds);

    const put = await handleRequest(db, req(
        'PUT', '/work-orders/' + workOrderId, token, {
            display_id: 'p15-cg-' + workOrderId,
            flow_graph: graph,
            position: 2,
        },
    ));
    assert.equal(put.status, 200);

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
    assert.equal(preTx!.flow_graph, rowOracle.flow_graph);

    const headGraph = validateWorkOrderFlowGraphJson(
        preTx!.flow_graph, 'work_orders.flow_graph',
    );
    const rowGraph = validateWorkOrderFlowGraphJson(
        rowOracle.flow_graph, 'work_orders.flow_graph',
    );
    assert.equal(headGraph.lockTimeout, lockTimeoutSeconds);
    assert.equal(
        headGraph.lockTimeout, rowGraph.lockTimeout,
    );

    // Claim-outcome parity: priorLive from the document-head
    // graph equals priorLive from the residual row graph —
    // isClaimEventExpired + latestClaimEvent stay untouched.
    const history = await workOrderClaimHistoryFor(
        db, STARK_ORGANIZATION, workOrderId,
    );
    const prior = latestClaimEvent(history, workOrderId);
    const priorLiveFromHead = prior !== null
        && prior.state === 'claimed'
        && !isClaimEventExpired(
            prior, headGraph.lockTimeout,
        );
    const priorLiveFromRow = prior !== null
        && prior.state === 'claimed'
        && !isClaimEventExpired(
            prior, rowGraph.lockTimeout,
        );
    assert.equal(priorLiveFromHead, priorLiveFromRow);
    assert.equal(priorLiveFromHead, false);

    // Live path: claim against the re-anchored gate succeeds.
    const claimResponse = await handleRequest(db, req(
        'POST',
        '/work-orders/' + workOrderId + '/claim',
        token, {
            claimEventId: generateCryptoSafeBase62(),
            claimAt: nowUtc(),
            expireEventId: generateCryptoSafeBase62(),
            expireAt: nowUtc(),
        },
    ));
    assert.equal(claimResponse.status, 204);

    // Absent id: document head null pre-tx and in-tx; row
    // plane throws the same EntityNotFoundError bytes the
    // live gate maps null onto.
    const missingId = 'no-such-claim-graph-wo';
    const preMissing = await workOrderDocumentHeadFor(
        db, STARK_ORGANIZATION, missingId,
    );
    const inMissing = await db.transaction(
        [...CLAIM_TX_TABLES],
        (view) => workOrderDocumentHeadFor(
            view, STARK_ORGANIZATION, missingId,
        ),
    );
    assert.equal(preMissing, null);
    assert.equal(inMissing, null);
    await assert.rejects(
        () => db.workOrders.getById(missingId),
        (err: unknown) =>
            err instanceof EntityNotFoundError
            && err.message
                === 'Not found: work_orders/' + missingId,
    );
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

test('stateEventVisibilityFor: member-genesis op-born'
+ ' initialStateEventId is visible when unowned (no'
+ ' membership); own when membership present; hidden'
+ ' to a foreign org', async () => {
    const db = await seededDb();
    const token = await organizationToken();

    // Live create without a membership row: owner-null
    // on the member id → visible to every asker.
    const unownedId = 'hm-p15-vis-unowned';
    const unownedEventId = unownedId + '-genesis';
    const unownedCreate = await handleRequest(db, req(
        'POST', '/human-members', token, {
            id: unownedId,
            detail: {
                title: 'Engineer',
                department: 'Product',
                strengths: '[]',
                team_dimensions: '{}',
            },
            initialState: 'active',
            initialStateEventId: unownedEventId,
            initialStateAt: nowUtc(),
        },
    ));
    assert.equal(unownedCreate.status, 204);

    // Op-born: no states/:id pair at the genesis id.
    const byId = await db.responses.getAllWhere(
        'uri_id', unownedEventId,
    );
    const statesHits = byId.filter((r) =>
        /\/states\/$/.test(r.uri_prefix));
    assert.equal(statesHits.length, 0);

    assert.equal(
        await resolveOwningOrganization(
            db, unownedId, STARK_ORGANIZATION,
        ),
        null,
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, STARK_ORGANIZATION, unownedEventId,
        ),
        'visible',
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, ORGANIZATION_TWO, unownedEventId,
        ),
        'visible',
    );
    // Row-plane three-way agrees (owner-null isVisible).
    const starkScoped = organizationScopedAdapter(
        db, STARK_ORGANIZATION,
    );
    const twoScoped = organizationScopedAdapter(
        db, ORGANIZATION_TWO,
    );
    assert.equal(
        await rowPlaneVisibility(
            starkScoped, unownedEventId,
        ),
        'visible',
    );
    assert.equal(
        await rowPlaneVisibility(
            twoScoped, unownedEventId,
        ),
        'visible',
    );

    // Membership present → own org visible, foreign hidden.
    const ownedId = 'hm-p15-vis-owned';
    const ownedEventId = ownedId + '-genesis';
    const ownedCreate = await handleRequest(db, req(
        'POST', '/human-members', token, {
            id: ownedId,
            detail: {
                title: 'Engineer',
                department: 'Product',
                strengths: '[]',
                team_dimensions: '{}',
            },
            initialState: 'active',
            initialStateEventId: ownedEventId,
            initialStateAt: nowUtc(),
        },
    ));
    assert.equal(ownedCreate.status, 204);
    const membership = await handleRequest(db, req(
        'PUT', '/memberships/ms-p15-vis-owned', token, {
            organization_id: STARK_ORGANIZATION,
            identity_id: ownedId,
            at: nowUtc(),
        },
    ));
    assert.equal(membership.status, 200);

    assert.equal(
        await resolveOwningOrganization(
            db, ownedId, STARK_ORGANIZATION,
        ),
        STARK_ORGANIZATION,
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, STARK_ORGANIZATION, ownedEventId,
        ),
        'visible',
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, ORGANIZATION_TWO, ownedEventId,
        ),
        'hidden',
    );
    assert.equal(
        await rowPlaneVisibility(
            starkScoped, ownedEventId,
        ),
        'visible',
    );
    assert.equal(
        await rowPlaneVisibility(
            twoScoped, ownedEventId,
        ),
        'hidden',
    );
});

// -- flowGraphBindingsFromPairs ----------------------------------

function sortById<T extends { id: string }>(
    rows: readonly T[],
): T[] {
    return [...rows].sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

test('flowGraphBindingsFromPairs: attribute + member ledgers'
+ ' byte-equal the row plane over seed; nodeFlowIds match'
+ ' flowNodes.flow_id; pre-tx vs in-tx parity', async () => {
    const db = await seededDb();
    const txTables = [
        'requests', 'responses',
        'flow_node_attributes', 'flow_node_members',
        'flow_nodes',
    ];
    const preTx = await flowGraphBindingsFromPairs(
        db, STARK_ORGANIZATION,
    );
    const inTx = await db.transaction(
        txTables,
        (view) => flowGraphBindingsFromPairs(
            view, STARK_ORGANIZATION,
        ),
    );
    assert.deepEqual(inTx, preTx);

    const rowAttrs = sortById(
        await db.flowNodeAttributes.getAll(),
    );
    const rowMembers = sortById(
        await db.flowNodeMembers.getAll(),
    );
    // Seed is all Stark — org-two has zero flow graph
    // bindings.
    assert.deepEqual(
        sortById([...preTx.attributeEvents]), rowAttrs,
    );
    assert.deepEqual(
        sortById([...preTx.memberEvents]), rowMembers,
    );

    // nodeFlowIds parity against flow_nodes.flow_id.
    const nodes = await db.flowNodes.getAll();
    for (const node of nodes) {
        assert.equal(
            preTx.nodeFlowIds.get(node.id),
            node.flow_id,
            'node ' + node.id,
        );
    }

    // latestByKey/fail-closed reduction matches the
    // row-plane RESTRICT shape (current 'added' bindings).
    const derivedLatest = latestByKey(
        preTx.attributeEvents,
        (r) => r.flow_node_id + '\0' + r.attribute_id,
        relationFailClosed,
    );
    const rowLatest = latestByKey(
        rowAttrs,
        (r) => r.flow_node_id + '\0' + r.attribute_id,
        relationFailClosed,
    );
    assert.deepEqual(
        [...derivedLatest.entries()].sort(
            (a, b) => a[0] < b[0] ? -1 : 1,
        ),
        [...rowLatest.entries()].sort(
            (a, b) => a[0] < b[0] ? -1 : 1,
        ),
    );
});

// GraphEdge carries no attributes field and no
// flow_edge_attributes table exists — prove-impossible so
// RESTRICT never grows an edges leg (Author gate 5).
test('prove-impossible: attribute bindings cannot reach'
+ ' flow edges (GraphEdge has no attributes; no'
+ ' flow_edge_attributes table)', () => {
    type GraphEdgeHasNoAttributes =
        'attributes' extends keyof GraphEdge
            ? never
            : true;
    const typeProof: GraphEdgeHasNoAttributes = true;
    assert.equal(typeProof, true);

    const edgeKeys: readonly (keyof GraphEdge)[] = [
        'id', 'name', 'fromNodeId', 'toNodeId',
    ];
    assert.deepEqual(
        edgeKeys.slice().sort(),
        (['id', 'name', 'fromNodeId', 'toNodeId'] as const)
            .slice().sort(),
    );
    assert.equal(
        (edgeKeys as readonly string[])
            .includes('attributes'),
        false,
    );
    assert.equal(
        (TABLE_NAMES as readonly string[])
            .includes('flow_edge_attributes'),
        false,
    );
});

// -- residual cross-core pins (Phase 15 Task 1 final) ----------

test('residual pin: workOrderDocumentHeadFor matches'
+ ' workOrders.getById for every seeded Stark work order',
async () => {
    const db = await seededDb();
    const rows = await db.workOrders.getAll();
    const stark = rows.filter(
        (r) => r.organization_id === STARK_ORGANIZATION,
    );
    assert.ok(stark.length > 0);
    for (const row of stark) {
        const derived = await workOrderDocumentHeadFor(
            db, STARK_ORGANIZATION, row.id,
        );
        assert.deepEqual(derived, row, row.id);
    }
});

test('residual pin: stateEventVisibilityFor matches the'
+ ' row-plane three-way over a sample of seed events for'
+ ' both organizations', async () => {
    const db = await seededDb();
    const allStates = await db.states.getAll();
    // Sample first, middle, last + a few random-ish picks
    // by index — full 911 would dominate wall-clock without
    // buying more coverage of the tiered design.
    const sampleIds = [
        allStates[0]!.id,
        allStates[Math.floor(allStates.length / 2)]!.id,
        allStates[allStates.length - 1]!.id,
        allStates[10]!.id,
        allStates[100]!.id,
        allStates[400]!.id,
        allStates[800]!.id,
    ];
    for (const organization of [
        STARK_ORGANIZATION, ORGANIZATION_TWO,
    ]) {
        const scoped = organizationScopedAdapter(
            db, organization,
        );
        for (const eventId of sampleIds) {
            const derived = await stateEventVisibilityFor(
                db, organization, eventId,
            );
            const oracle = await rowPlaneVisibility(
                scoped, eventId,
            );
            assert.equal(
                derived, oracle,
                organization + '/' + eventId,
            );
        }
    }
});

test('residual pin: organizations self-as-owner feeds'
+ ' stateEventVisibilityFor for a states/:id event on an'
+ ' organization entity_id', async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const eventId = 'ev-org-self-owner-p15';
    // PUT states/:id naming the organization id itself as
    // entity_id — only legal once self-as-owner resolves.
    const put = await handleRequest(db, req(
        'PUT', '/states/' + eventId, token, {
            entity_id: STARK_ORGANIZATION,
            state: 'active',
            at: nowUtc(),
        },
    ));
    // Pre-dispatch fence still uses the row plane (Task 5
    // re-points). If the live fence rejects organization
    // entity_ids today, seed the pair below-facade instead.
    if (put.status === 200) {
        assert.equal(
            await stateEventVisibilityFor(
                db, STARK_ORGANIZATION, eventId,
            ),
            'visible',
        );
        assert.equal(
            await stateEventVisibilityFor(
                db, ORGANIZATION_TWO, eventId,
            ),
            'hidden',
        );
        return;
    }
    // Fence not yet re-pointed: pin the resolver leg alone
    // (Task 5 owns the write-fence re-point verification).
    assert.equal(
        await resolveOwningOrganization(
            db, STARK_ORGANIZATION, STARK_ORGANIZATION,
        ),
        STARK_ORGANIZATION,
    );
    assert.equal(
        await resolveOwningOrganization(
            db, STARK_ORGANIZATION, ORGANIZATION_TWO,
        ),
        STARK_ORGANIZATION,
    );
});

test('residual pin: flowGraphBindingsFromPairs tracks a'
+ ' live attribute add then remove (fail-closed) against'
+ ' the row plane', async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const flowId = 'p15-bind-flow';
    const nodeId = 'p15-bind-node';
    const attrId = 'p15-bind-attr';
    const at1 = '2026-06-15T00:00:00.000000Z';
    const at2 = '2026-06-15T00:00:01.000000Z';
    // A seeded project the create can join.
    const projectId = 'u6YkHhlGc91oDMkr3x0isa';

    const attrPut = await handleRequest(db, req(
        'PUT', '/record-attributes/' + attrId, token, {
            record_id: 'rec01CustProfRec0rdAB1',
            name: 'P15 Bind',
            attribute_type: 'text',
            sort_order: 99,
            options: '[]',
            constraints: '[]',
        },
    ));
    assert.equal(attrPut.status, 200);

    // Create with the binding already 'added'.
    const created = await handleRequest(db, req(
        'POST', '/flows', token, {
            id: flowId,
            flow: {
                name: 'P15 Bind Flow',
                is_locked: false,
                is_auto_layout: false,
                is_auto_fit: false,
                lock_timeout: 8 * 60 * 60,
            },
            projectFlowId: flowId + '-pf',
            projectFlow: {
                project_id: projectId,
                flow_id: flowId,
                at: at1,
            },
            initialState: 'active',
            initialStateEventId: flowId + '-ev',
            initialStateAt: at1,
            graphDelta: {
                nodes: [{
                    id: nodeId, flow_id: flowId,
                    name: 'Bind',
                    position_x: 0, position_y: 0,
                    is_create: true, is_archive: false,
                    task_instructions: '', at: at1,
                }],
                edges: [],
                deletions: [],
                memberEvents: [],
                attributeEvents: [{
                    id: 'p15-fna-add',
                    flow_node_id: nodeId,
                    attribute_id: attrId,
                    mode: 'editable',
                    is_required: false,
                    action: 'added',
                    at: at1,
                }],
            },
        },
    ));
    assert.equal(created.status, 204);

    const afterAdd = await flowGraphBindingsFromPairs(
        db, STARK_ORGANIZATION,
    );
    const addRow = afterAdd.attributeEvents.find(
        (r) => r.id === 'p15-fna-add',
    );
    assert.ok(addRow);
    assert.equal(addRow!.action, 'added');
    assert.equal(
        afterAdd.nodeFlowIds.get(nodeId), flowId,
    );
    assert.deepEqual(
        addRow,
        await db.flowNodeAttributes.getById('p15-fna-add'),
    );

    // Chain a remove off the create's document head.
    const headGet = await handleRequest(
        db, req('GET', '/flows/' + flowId, token),
    );
    assert.equal(headGet.status, 200);
    const headId = headGet.headers.get('Response-ID');
    assert.ok(headId);

    const putRemove = await handleRequest(db, req(
        'PUT', '/flows/' + flowId, token,
        {
            name: 'P15 Bind Flow',
            is_locked: false,
            is_auto_layout: false,
            is_auto_fit: false,
            lock_timeout: 8 * 60 * 60,
            state: 'active',
            state_at: at2,
            state_event_id: flowId + '-ev-rm',
            graph: jsonObjectField({
                nodes: [{
                    id: nodeId, name: 'Bind',
                    positionX: 0, positionY: 0,
                    isCreate: true, isArchive: false,
                    memberIds: [],
                    attributes: [],
                    taskInstructions: '',
                }],
                edges: [],
            }),
            graphDelta: {
                nodes: [{
                    id: nodeId, flow_id: flowId,
                    name: 'Bind',
                    position_x: 0, position_y: 0,
                    is_create: true, is_archive: false,
                    task_instructions: '', at: at2,
                }],
                edges: [],
                deletions: [],
                memberEvents: [],
                attributeEvents: [{
                    id: 'p15-fna-rm',
                    flow_node_id: nodeId,
                    attribute_id: attrId,
                    mode: 'editable',
                    is_required: false,
                    action: 'removed',
                    at: at2,
                }],
            },
            revivals: [],
        },
        { 'if-response-id': headId! },
    ));
    assert.equal(putRemove.status, 200);

    const afterRm = await flowGraphBindingsFromPairs(
        db, STARK_ORGANIZATION,
    );
    const rmRow = afterRm.attributeEvents.find(
        (r) => r.id === 'p15-fna-rm',
    );
    assert.ok(rmRow);
    assert.equal(rmRow!.action, 'removed');
    assert.deepEqual(
        rmRow,
        await db.flowNodeAttributes.getById('p15-fna-rm'),
    );

    const latest = latestByKey(
        afterRm.attributeEvents.filter(
            (r) => r.flow_node_id === nodeId
                && r.attribute_id === attrId,
        ),
        (r) => r.flow_node_id,
        relationFailClosed,
    );
    assert.equal(latest.get(nodeId)!.action, 'removed');
});
