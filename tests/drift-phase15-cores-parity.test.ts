import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest } from '../api/api.ts';
import {
    EntityNotFoundError, type DbAdapter,
    TABLE_NAMES,
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
    ownerOrganizationOfEntity,
    rawOrganizationOwnedProbes,
    graphEntityProbe,
} from '../api/store-parent-scoped.ts';
import {
    stateFieldValuesForStateEvent,
    deriveStateFieldValueReferrers,
} from '../api/derive-state-field-values.ts';
import {
    flowGraphBindingsFromPairs,
} from '../api/derive-flows.ts';
import {
    relationFailClosed,
} from '../api/flow-graph-relations.ts';
import { latestByKey } from
    '../shared/ledger-reduction.ts';
import type { GraphEdge } from '../api/types.ts';
import {
    collectAttributeReferrers,
    type AttributeReferrers,
} from '../api/record-attribute-refs.ts';
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
import { deriveIdeas } from '../api/derive-ideas.ts';
import {
    latestClaimEvent,
    isClaimEventExpired,
} from '../api/work-order-claims.ts';
import {
    generateCryptoSafeBase62,
} from '../shared/crypto-safe-base62.ts';

// Phase 15: view-safe derive cores (Task 1) + claim-gate
// graph re-anchor pins (Task 2) + field-values visibility
// re-anchor pins (Task 3) + RESTRICT graph-leg re-anchor
// pins (Task 4) + pre-dispatch fence re-anchor parity
// (Task 5). Pre-tx-vs-in-tx parity and residual drift
// against the dual-write row plane.

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
    // entity_id — legal once the pre-dispatch fence rides
    // resolveOwningOrganization (Phase 15 Task 5).
    const put = await handleRequest(db, req(
        'PUT', '/states/' + eventId, token, {
            entity_id: STARK_ORGANIZATION,
            state: 'active',
            at: nowUtc(),
        },
    ));
    assert.equal(put.status, 200);
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
});

// -- Task 5: fence parity across pair plane vs row plane ------

test('fence parity: resolveOwningOrganization agrees with'
+ ' ownerOrganizationOfEntity on dual-write seed entities;'
+ ' pair plane is strictly stronger on WP1 + hard-delete',
async () => {
    const db = await seededDb();
    const probes = rawOrganizationOwnedProbes(db);
    const graph = graphEntityProbe(db, db.flows);
    async function bothPlanes(
        entityId: string,
        boundOrganization: string,
    ): Promise<{
        pair: string | null;
        row: string | null;
    }> {
        return {
            pair: await resolveOwningOrganization(
                db, entityId, boundOrganization,
            ),
            row: await ownerOrganizationOfEntity(
                probes, db.memberships, boundOrganization,
                entityId, graph,
            ),
        };
    }

    // Phase Final Task 2: ideas seed row half stripped —
    // load ideas from the pair plane. Dual-write agreement
    // no longer holds for ideas (row plane empty); pair-plane
    // ownership still resolves.
    const ideasStark = await deriveIdeas(
        db, STARK_ORGANIZATION,
    );
    const ideasTwo = await deriveIdeas(
        db, ORGANIZATION_TWO,
    );
    const records = await db.records.getAll();
    const flows = await db.flows.getAll();
    const nodes = await db.flowNodes.getAll();
    const memberships = await db.memberships.getAll();

    const ideaStark = ideasStark[0]!;
    const ideaTwo = ideasTwo[0]!;
    assert.ok(ideaStark, 'stark ideas non-empty');
    assert.ok(ideaTwo, 'org-two ideas non-empty');
    const recordStark = records.find(
        (r) => r.organization_id === STARK_ORGANIZATION,
    )!;
    const flowStark = flows.find(
        (r) => r.organization_id === STARK_ORGANIZATION,
    )!;
    const nodeStark = nodes.find(
        (n) => n.flow_id === flowStark.id,
    )!;
    const memberStark = memberships.find(
        (m) => m.organization_id === STARK_ORGANIZATION,
    )!;

    // Pair-plane ownership for stripped ideas family.
    for (const [entityId, owner] of [
        [ideaStark.id, STARK_ORGANIZATION],
        [ideaTwo.id, ORGANIZATION_TWO],
    ] as const) {
        const own = await bothPlanes(entityId, owner);
        assert.equal(own.pair, owner);
        assert.equal(own.row, null);
        const foreignBound = owner === STARK_ORGANIZATION
            ? ORGANIZATION_TWO
            : STARK_ORGANIZATION;
        const foreign = await bothPlanes(
            entityId, foreignBound,
        );
        assert.equal(foreign.pair, owner);
        assert.equal(foreign.row, null);
    }

    // Dual-write agreement across bound orgs (families that
    // still dual-write their rows).
    for (const entityId of [
        recordStark.id,
        flowStark.id, nodeStark.id,
        memberStark.identity_id,
    ]) {
        for (const bound of [
            STARK_ORGANIZATION, ORGANIZATION_TWO,
        ]) {
            const { pair, row } =
                await bothPlanes(entityId, bound);
            assert.equal(
                pair, row,
                'dual-write parity for ' + entityId
                + ' bound=' + bound,
            );
        }
    }
    // Genuine orphan: both null.
    {
        const { pair, row } = await bothPlanes(
            'ghost-nowhere-p15-fence', STARK_ORGANIZATION,
        );
        assert.equal(pair, null);
        assert.equal(row, null);
    }

    // WP1 strengthening: organization id self-as-owner on
    // the pair plane; row plane treats it as an orphan.
    {
        const own = await bothPlanes(
            STARK_ORGANIZATION, STARK_ORGANIZATION,
        );
        assert.equal(own.pair, STARK_ORGANIZATION);
        assert.equal(own.row, null);
        const foreign = await bothPlanes(
            STARK_ORGANIZATION, ORGANIZATION_TWO,
        );
        assert.equal(foreign.pair, STARK_ORGANIZATION);
        assert.equal(foreign.row, null);
    }

    // Hard-delete strengthening (finding 1i inverted): pair
    // plane retains ownership after the row is spliced; row
    // plane resolves orphan (null).
    await db.records.delete(recordStark.id);
    {
        const own = await bothPlanes(
            recordStark.id, STARK_ORGANIZATION,
        );
        assert.equal(own.pair, STARK_ORGANIZATION);
        assert.equal(own.row, null);
        const foreign = await bothPlanes(
            recordStark.id, ORGANIZATION_TWO,
        );
        assert.equal(foreign.pair, STARK_ORGANIZATION);
        assert.equal(foreign.row, null);
    }
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

// F1 fix pin: soft-deleting a node via graphDelta.deletions
// must drop it from nodeFlowIds. writeFlowGraphDelta does
// NOT emit attributeEvents 'removed' for attributes on a
// fully deleted node — residual 'added' must NOT RESTRICT
// attribute DELETE (old path: flowNodes.getById →
// EntityNotFoundError → skip; new path must match).
test('residual pin: soft-deleted node drops from'
+ ' nodeFlowIds so residual attribute binding is not a'
+ ' RESTRICT referrer (DELETE → 204)', async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const flowId = 'p15-softdel-flow';
    const nodeId = 'p15-softdel-node';
    const attrId = 'p15-softdel-attr';
    const at1 = '2026-06-17T00:00:00.000000Z';
    const at2 = '2026-06-17T00:00:01.000000Z';
    const projectId = 'u6YkHhlGc91oDMkr3x0isa';

    const attrPut = await handleRequest(db, req(
        'PUT', '/record-attributes/' + attrId, token, {
            record_id: 'rec01CustProfRec0rdAB1',
            name: 'P15 SoftDel',
            attribute_type: 'text',
            sort_order: 99,
            options: '[]',
            constraints: '[]',
        },
    ));
    assert.equal(attrPut.status, 200);

    const created = await handleRequest(db, req(
        'POST', '/flows', token, {
            id: flowId,
            flow: {
                name: 'P15 SoftDel Flow',
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
                    name: 'Doomed',
                    position_x: 0, position_y: 0,
                    is_create: true, is_archive: false,
                    task_instructions: '', at: at1,
                }],
                edges: [],
                deletions: [],
                memberEvents: [],
                attributeEvents: [{
                    id: 'p15-softdel-fna',
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
    assert.equal(
        afterAdd.nodeFlowIds.get(nodeId), flowId,
    );

    const headGet = await handleRequest(
        db, req('GET', '/flows/' + flowId, token),
    );
    assert.equal(headGet.status, 200);
    const headId = headGet.headers.get('Response-ID');
    assert.ok(headId);

    // Soft-delete the bound node only — residual 'added'
    // attributeEvent remains; no attributeEvents 'removed'.
    const putDelete = await handleRequest(db, req(
        'PUT', '/flows/' + flowId, token,
        {
            name: 'P15 SoftDel Flow',
            is_locked: false,
            is_auto_layout: false,
            is_auto_fit: false,
            lock_timeout: 8 * 60 * 60,
            state: 'active',
            state_at: at2,
            state_event_id: flowId + '-ev-del',
            graph: jsonObjectField({
                nodes: [],
                edges: [],
            }),
            graphDelta: {
                nodes: [],
                edges: [],
                deletions: [{
                    eventId: 'p15-softdel-del',
                    entityId: nodeId,
                    at: at2,
                }],
                memberEvents: [],
                attributeEvents: [],
            },
            revivals: [],
        },
        { 'if-response-id': headId! },
    ));
    assert.equal(putDelete.status, 200);

    const afterDel = await flowGraphBindingsFromPairs(
        db, STARK_ORGANIZATION,
    );
    assert.equal(
        afterDel.nodeFlowIds.has(nodeId), false,
        'soft-deleted node must leave nodeFlowIds',
    );
    // Residual 'added' still in the event ledger.
    const residual = afterDel.attributeEvents.find(
        (r) => r.id === 'p15-softdel-fna',
    );
    assert.ok(residual);
    assert.equal(residual!.action, 'added');

    const scoped = organizationScopedAdapter(
        db, STARK_ORGANIZATION,
    );
    const pairPlane = await collectAttributeReferrers(
        scoped, STARK_ORGANIZATION, [attrId],
    );
    const rowPlane = await rowPlaneGraphReferrers(
        scoped, STARK_ORGANIZATION, [attrId],
    );
    assertReferrerParity(
        'soft-deleted node', pairPlane, rowPlane, [attrId],
    );
    assert.deepEqual(
        pairPlane.get(attrId)!.flowIds, [],
        'no current-node flow referrer',
    );

    // Wire contract: residual binding on a soft-deleted
    // node is NOT a RESTRICT referrer → DELETE 204.
    const deleted = await handleRequest(db, req(
        'DELETE',
        '/record-attributes/' + attrId,
        token,
    ));
    assert.equal(deleted.status, 204);
});

// -- field-values visibility re-anchor (Phase 15 Task 3) ------

// Shared fixture: live create a work order (so tier-ii can
// discover its id from the collection pair), then transition
// with ONE folded field-value. Op-born transitionEventId has
// no states/:id pair — visibility rides tier (ii)/(iii).
async function transitionWithFieldValue(
    db: MemoryDbAdapter,
    workOrderId: string,
    transitionEventId: string,
    fieldValueId: string,
    attributeId: string,
): Promise<void> {
    const token = await organizationToken();
    const graph = workOrderFlowGraph(8 * 60 * 60);
    const created = await handleRequest(db, req(
        'POST', '/work-orders', token, {
            id: workOrderId,
            workOrder: {
                display_id: 'fv-' + workOrderId,
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

    await db.recordAttributes.put(attributeId, {
        organization_id: STARK_ORGANIZATION,
        record_id: 'rec-p15-fv',
        name: 'Note',
        attribute_type: 'text',
        sort_order: 0,
        options: '[]',
        constraints: '[]',
    });

    const transitioned = await handleRequest(db, req(
        'POST',
        '/work-orders/' + workOrderId + '/transition',
        token,
        {
            transitionEventId,
            targetState: 'n-finish',
            fieldValues: [{
                id: fieldValueId,
                fields: {
                    state_event_id: transitionEventId,
                    attribute_id: attributeId,
                    value: 'high',
                },
            }],
            release: null,
            transitionAt: nowUtc(),
        },
    ));
    assert.equal(transitioned.status, 204);
}

// Wire-shape pin: GET states/:id/field-values is ALWAYS 200
// with a three-way filtered array (own → rows; foreign → [];
// nowhere → []). Never 404. Pair-plane visibility successor
// (stateEventVisibilityFor) must hold these bytes exactly.
test('field-values GET: always-200 three-way array for'
+ ' own / foreign / orphan parent events', async () => {
    const db = await seededDb();
    const starkToken = await organizationToken(
        'current', STARK_ORGANIZATION,
    );
    const twoToken = await organizationToken(
        'current', ORGANIZATION_TWO,
    );
    const workOrderId = 'wo-p15-fv-get';
    const transitionEventId = workOrderId + '-te';
    const fieldValueId = workOrderId + '-fv';
    await transitionWithFieldValue(
        db, workOrderId, transitionEventId,
        fieldValueId, workOrderId + '-attr',
    );

    // (own) Stark sees the folded row.
    const own = await handleRequest(
        db,
        req(
            'GET',
            '/states/' + transitionEventId + '/field-values',
            starkToken,
        ),
    );
    assert.equal(own.status, 200);
    const ownRows = await own.json() as { id: string }[];
    assert.deepEqual(
        ownRows.map((r) => r.id), [fieldValueId],
    );

    // (foreign) Org two sees [] — never 404.
    const foreign = await handleRequest(
        db,
        req(
            'GET',
            '/states/' + transitionEventId + '/field-values',
            twoToken,
        ),
    );
    assert.equal(foreign.status, 200);
    const foreignRows =
        await foreign.json() as { id: string }[];
    assert.deepEqual(foreignRows, []);

    // (orphan / nowhere) Ghost event id → [] / 200.
    const orphan = await handleRequest(
        db,
        req(
            'GET',
            '/states/ghost-p15-nowhere/field-values',
            starkToken,
        ),
    );
    assert.equal(orphan.status, 200);
    const orphanRows =
        await orphan.json() as { id: string }[];
    assert.deepEqual(orphanRows, []);
});

// Derive-path parity: stateFieldValuesForStateEvent's
// visibility gate matches the row-plane three-way oracle
// (rawHasRow + fenced getById) for own / foreign / orphan.
test('stateFieldValuesForStateEvent visibility matches'
+ ' the row-plane three-way (own / foreign / orphan)',
async () => {
    const db = await seededDb();
    const workOrderId = 'wo-p15-fv-derive';
    const transitionEventId = workOrderId + '-te';
    const fieldValueId = workOrderId + '-fv';
    await transitionWithFieldValue(
        db, workOrderId, transitionEventId,
        fieldValueId, workOrderId + '-attr',
    );

    const starkScoped = organizationScopedAdapter(
        db, STARK_ORGANIZATION,
    );
    const twoScoped = organizationScopedAdapter(
        db, ORGANIZATION_TWO,
    );

    // Own → visible on both planes; derive returns the row.
    assert.equal(
        await rowPlaneVisibility(
            starkScoped, transitionEventId,
        ),
        'visible',
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, STARK_ORGANIZATION, transitionEventId,
        ),
        'visible',
    );
    const ownDerived = await stateFieldValuesForStateEvent(
        db, STARK_ORGANIZATION, transitionEventId,
    );
    assert.equal(ownDerived.length, 1);
    assert.equal(ownDerived[0]!.id, fieldValueId);

    // Foreign → hidden on both planes; derive returns [].
    assert.equal(
        await rowPlaneVisibility(
            twoScoped, transitionEventId,
        ),
        'hidden',
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, ORGANIZATION_TWO, transitionEventId,
        ),
        'hidden',
    );
    const foreignDerived =
        await stateFieldValuesForStateEvent(
            db, ORGANIZATION_TWO, transitionEventId,
        );
    assert.deepEqual(foreignDerived, []);

    // Orphan → orphan on both planes; derive returns []
    // (no field-value pairs name the ghost id).
    assert.equal(
        await rowPlaneVisibility(
            starkScoped, 'ghost-p15-vis',
        ),
        'orphan',
    );
    assert.equal(
        await stateEventVisibilityFor(
            db, STARK_ORGANIZATION, 'ghost-p15-vis',
        ),
        'orphan',
    );
    const orphanDerived =
        await stateFieldValuesForStateEvent(
            db, STARK_ORGANIZATION, 'ghost-p15-vis',
        );
    assert.deepEqual(orphanDerived, []);
});

// -- RESTRICT graph-leg re-anchor (Phase 15 Task 4) ------------

// Row-plane oracle for the three graph legs collectAttribute
// Referrers used BEFORE Task 4: workOrders.getAll graph walk,
// flowNodeAttributes.getAllWhere + flowNodes.getById. SFV
// valueCount is already pair-plane (Phase 14 Task 6 / Task 3);
// the production collectAttributeReferrers is the pair-plane
// NEW legs. Parity pin: sorted flowIds / workOrderIds /
// valueCount byte-equal over seed + live fixtures.
async function rowPlaneGraphReferrers(
    view: DbAdapter,
    boundOrganization: string,
    attributeIds: readonly string[],
): Promise<Map<string, AttributeReferrers>> {
    const workOrders = await view.workOrders.getAll();
    const workOrderGraphs = workOrders.map((wo) => ({
        id: wo.id,
        graph: validateWorkOrderFlowGraphJson(
            wo.flow_graph, 'work_orders.flow_graph',
        ),
    }));
    // valueCount rides the same pair-plane SFV derive the
    // production path uses — this pin isolates the GRAPH legs.
    const fieldValuesByAttribute =
        await deriveStateFieldValueReferrers(
            view, boundOrganization, attributeIds,
        );
    const referrers = new Map<string, AttributeReferrers>();
    for (const attributeId of attributeIds) {
        const values =
            fieldValuesByAttribute.get(attributeId) ?? [];
        const attrRows = await view.flowNodeAttributes
            .getAllWhere('attribute_id', attributeId);
        const latestPerNode = latestByKey(
            attrRows,
            (r) => r.flow_node_id,
            relationFailClosed,
        );
        const flowIds = new Set<string>();
        for (const [flowNodeId, last] of latestPerNode) {
            if (last.action !== 'added') continue;
            try {
                const node = await view.flowNodes.getById(
                    flowNodeId,
                );
                flowIds.add(node.flow_id);
            } catch (e) {
                if (e instanceof EntityNotFoundError) {
                    continue;
                }
                throw e;
            }
        }
        const workOrderIds = workOrderGraphs
            .filter((wo) => wo.graph.nodes.some((node) =>
                node.attributes.some(
                    (a) => a.attributeId === attributeId,
                ),
            ))
            .map((wo) => wo.id);
        referrers.set(attributeId, {
            valueCount: values.length,
            flowIds: [...flowIds],
            workOrderIds,
        });
    }
    return referrers;
}

function sortedReferrerShape(
    refs: AttributeReferrers,
): {
    valueCount: number;
    flowIds: string[];
    workOrderIds: string[];
} {
    return {
        valueCount: refs.valueCount,
        flowIds: [...refs.flowIds].sort(),
        workOrderIds: [...refs.workOrderIds].sort(),
    };
}

function assertReferrerParity(
    label: string,
    pairPlane: Map<string, AttributeReferrers>,
    rowPlane: Map<string, AttributeReferrers>,
    attributeIds: readonly string[],
): void {
    for (const attributeId of attributeIds) {
        const pair = pairPlane.get(attributeId);
        const row = rowPlane.get(attributeId);
        assert.ok(pair, label + ' pair ' + attributeId);
        assert.ok(row, label + ' row ' + attributeId);
        assert.deepEqual(
            sortedReferrerShape(pair!),
            sortedReferrerShape(row!),
            label + ' ' + attributeId,
        );
    }
}

test('collectAttributeReferrers graph legs: pair plane'
+ ' byte-equal the row plane over seed attributes with'
+ ' any referrer; pre-tx vs in-tx parity', async () => {
    const db = await seededDb();
    const scoped = organizationScopedAdapter(
        db, STARK_ORGANIZATION,
    );
    // Every seeded attribute that appears in a live binding
    // or a WO graph — union of flow_node_attributes +
    // attributes named inside work_orders.flow_graph.
    const attrFromRelations = new Set(
        (await db.flowNodeAttributes.getAll())
            .map((r) => r.attribute_id),
    );
    const attrFromWorkOrders = new Set<string>();
    for (const wo of await db.workOrders.getAll()) {
        if (wo.organization_id !== STARK_ORGANIZATION) {
            continue;
        }
        const graph = validateWorkOrderFlowGraphJson(
            wo.flow_graph, 'work_orders.flow_graph',
        );
        for (const node of graph.nodes) {
            for (const attr of node.attributes) {
                attrFromWorkOrders.add(attr.attributeId);
            }
        }
    }
    const attributeIds = [...new Set([
        ...attrFromRelations,
        ...attrFromWorkOrders,
    ])].sort();
    assert.ok(
        attributeIds.length > 0,
        'seed must name at least one bound attribute',
    );

    const preTx = await collectAttributeReferrers(
        scoped, STARK_ORGANIZATION, attributeIds,
    );
    const inTx = await db.transaction(
        [
            'flows', 'work_orders', 'states', 'ideas',
            'projects', 'records', 'objectives',
            'invitations', 'memberships',
            'flow_node_attributes', 'flow_nodes',
            'requests', 'responses',
        ],
        (view) => collectAttributeReferrers(
            organizationScopedAdapter(
                view, STARK_ORGANIZATION,
            ),
            STARK_ORGANIZATION,
            attributeIds,
        ),
    );
    assertReferrerParity(
        'pre-tx vs in-tx', preTx, inTx, attributeIds,
    );

    const rowOracle = await rowPlaneGraphReferrers(
        scoped, STARK_ORGANIZATION, attributeIds,
    );
    assertReferrerParity(
        'pair vs row seed', preTx, rowOracle, attributeIds,
    );
});

test('collectAttributeReferrers graph legs: live-minted'
+ ' flow binding + work-order head stay pair/row equal',
async () => {
    const db = await seededDb();
    const token = await organizationToken();
    const flowId = 'p15-restrict-flow';
    const nodeId = 'p15-restrict-node';
    const attrId = 'p15-restrict-attr';
    const woId = 'p15-restrict-wo';
    const at = '2026-06-16T00:00:00.000000Z';
    const projectId = 'u6YkHhlGc91oDMkr3x0isa';

    const attrPut = await handleRequest(db, req(
        'PUT', '/record-attributes/' + attrId, token, {
            record_id: 'rec01CustProfRec0rdAB1',
            name: 'P15 Restrict',
            attribute_type: 'text',
            sort_order: 99,
            options: '[]',
            constraints: '[]',
        },
    ));
    assert.equal(attrPut.status, 200);

    const created = await handleRequest(db, req(
        'POST', '/flows', token, {
            id: flowId,
            flow: {
                name: 'P15 Restrict Flow',
                is_locked: false,
                is_auto_layout: false,
                is_auto_fit: false,
                lock_timeout: 8 * 60 * 60,
            },
            projectFlowId: flowId + '-pf',
            projectFlow: {
                project_id: projectId,
                flow_id: flowId,
                at,
            },
            initialState: 'active',
            initialStateEventId: flowId + '-ev',
            initialStateAt: at,
            graphDelta: {
                nodes: [{
                    id: nodeId, flow_id: flowId,
                    name: 'Bind',
                    position_x: 0, position_y: 0,
                    is_create: true, is_archive: false,
                    task_instructions: '', at,
                }],
                edges: [],
                deletions: [],
                memberEvents: [],
                attributeEvents: [{
                    id: 'p15-restrict-fna',
                    flow_node_id: nodeId,
                    attribute_id: attrId,
                    mode: 'editable',
                    is_required: false,
                    action: 'added',
                    at,
                }],
            },
        },
    ));
    assert.equal(created.status, 204);

    const woGraph = jsonObjectField({
        name: 'P15 Restrict WO',
        lockTimeout: 8 * 60 * 60,
        nodes: [{
            id: 'n-wo', name: 'Step',
            positionX: 0, positionY: 0,
            isCreate: true, isArchive: false,
            memberIds: [],
            attributes: [{
                attribute_id: attrId,
                mode: 'editable',
                isRequired: false,
            }],
            taskInstructions: '',
        }],
        edges: [],
    });
    const woCreated = await handleRequest(db, req(
        'POST', '/work-orders', token, {
            id: woId,
            workOrder: {
                display_id: 'p15-restrict-wo',
                flow_graph: woGraph,
                position: 1,
            },
            flowWorkOrderId: woId + '-fwo',
            flowWorkOrder: {
                flow_id: EMPTY_FLOW_ID,
                work_order_id: woId,
                at: nowUtc(),
            },
            stateEventIds: [
                woId + '-ev1',
                woId + '-ev2',
                woId + '-ev3',
            ],
            stateEventAts: [nowUtc(), nowUtc(), nowUtc()],
            states: ['n-start', 'n-finish', 'claimed'],
        },
    ));
    assert.equal(woCreated.status, 204);

    const scoped = organizationScopedAdapter(
        db, STARK_ORGANIZATION,
    );
    const pairPlane = await collectAttributeReferrers(
        scoped, STARK_ORGANIZATION, [attrId],
    );
    const rowPlane = await rowPlaneGraphReferrers(
        scoped, STARK_ORGANIZATION, [attrId],
    );
    assertReferrerParity(
        'live mint', pairPlane, rowPlane, [attrId],
    );
    const refs = pairPlane.get(attrId)!;
    assert.ok(refs.flowIds.includes(flowId));
    assert.ok(refs.workOrderIds.includes(woId));
});
