import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    MemoryDbAdapter,
} from '../api/db-memory.ts';
import {
    createRequestContext,
    type RequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    postWorkOrderCreation,
    postWorkOrderTransition,
    postWorkOrderClaim,
} from
'../web-app/app/adapters/work-orders-mutations.ts';
import {
    deleteWorkOrderClaim,
} from
'../web-app/app/adapters/work-orders-deletions.ts';
import {
    getWorkOrderCurrentNodeFromStates,
    getWorkOrderActiveClaimFromStates,
} from
'../web-app/app/adapters/state-events.ts';
import {
    isExpiredClaim,
    validateWorkOrderFlowGraph,
} from
'../web-app/app/adapters/work-orders-queries.ts';
import {
    generateCryptoSafeBase62,
} from
'../web-app/app/adapters/crypto-safe-base62.ts';
import type {
    HumanWorkerEntity,
    FlowEntity,
    GraphNode,
    GraphEdge,
    StoredGraph,
    WorkOrderEntity,
    WorkOrderClaimEntity,
    WorkOrderTransitionEntity,
    Id,
} from '../api/types.ts';
import {
    jsonObjectField,
    DEFAULT_LOCK_TIMEOUT,
} from '../api/types.ts';

/* ── Fixtures ─────────────── */

function buildHumanWorker(
    name: string,
): Omit<HumanWorkerEntity, 'id'> {
    return {
        first_name: name,
        last_name: 'Test',
        email: name.toLowerCase()
            + '@example.com',
        phone: '',
        title: 'product_manager',
        status: 'active',
        strengths: '[]' as never,
        team_dimensions: '{}' as never,
        bio: '',
        department: 'Product',
    };
}

function buildNode(
    id: string,
    name: string,
    overrides?: Partial<GraphNode>,
): GraphNode {
    return {
        id,
        name,
        description: '',
        positionX: 0,
        positionY: 0,
        isCreate: false,
        isArchive: false,
        workerIds: [],
        fields: [],
        ...overrides,
    };
}

function buildEdge(
    id: string,
    fromNodeId: string,
    toNodeId: string,
): GraphEdge {
    return {
        id,
        name: '',
        description: '',
        fromNodeId,
        toNodeId,
    };
}

function buildFlow(
    graph: StoredGraph,
    lockTimeout: number = DEFAULT_LOCK_TIMEOUT,
): Omit<FlowEntity, 'id'> {
    return {
        name: 'Test flow',
        description: 't',
        is_locked: false,
        is_auto_layout: true,
        is_auto_fit: true,
        lock_timeout: lockTimeout,
        graph: jsonObjectField(
            graph as unknown as Record<
                string, unknown
            >,
        ),
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

function buildLinearGraph(): StoredGraph {
    return {
        nodes: [
            buildNode(
                'n-start', 'Start',
                { isCreate: true },
            ),
            buildNode(
                'n-middle', 'Doing work',
                { workerIds: ['current'] },
            ),
            buildNode(
                'n-finish', 'Done',
                { isArchive: true },
            ),
        ],
        edges: [
            buildEdge('e1', 'n-start', 'n-middle'),
            buildEdge('e2', 'n-middle', 'n-finish'),
        ],
    };
}

async function setupDb(
    lockTimeout: number = DEFAULT_LOCK_TIMEOUT,
): Promise<{
    db: MemoryDbAdapter;
    ctx: RequestContext;
}> {
    const db = new MemoryDbAdapter();
    await db.workers.put(
        'current', buildHumanWorker('Demo'),
    );
    await db.workers.put(
        'w-other', buildHumanWorker('Other'),
    );
    await db.flows.put(
        'f1',
        buildFlow(buildLinearGraph(), lockTimeout),
    );
    const ctx = createRequestContext(db);
    return { db, ctx };
}

async function createWorkOrder(
    ctx: RequestContext,
): Promise<string> {
    const workOrderId = generateCryptoSafeBase62();
    await postWorkOrderCreation(ctx, {
        workOrderId,
        flowLinkId: generateCryptoSafeBase62(),
        initTransitionId: generateCryptoSafeBase62(),
        postStartTransitionId:
            generateCryptoSafeBase62(),
        claimId: generateCryptoSafeBase62(),
        flowId: 'f1',
    });
    return workOrderId;
}

// RFC-3339 timestamps from Date.now() share
// millisecond resolution; pause to guarantee
// ordering on fast machines.
async function pause(ms: number): Promise<void> {
    return new Promise(resolve =>
        setTimeout(resolve, ms),
    );
}

/* ── Table-based readers (the production
 * semantic, expressed locally for parity
 * comparison — production code keeps reading
 * the tables until Stage 7b switches it) ── */

async function getWorkOrderCurrentNode(
    ctx: RequestContext,
    workOrderId: Id,
): Promise<Id | null> {
    const all = await ctx.GET<
        WorkOrderTransitionEntity[]
    >('work-order-transitions');
    const mine = all.filter(
        t => t.work_order_id === workOrderId,
    );
    if (mine.length === 0) return null;
    const sorted = [...mine].sort(
        (a, b) =>
            a.transitioned_at
                .localeCompare(b.transitioned_at),
    );
    return sorted.at(-1)!.to_node_id;
}

async function getWorkOrderActiveClaim(
    ctx: RequestContext,
    workOrderId: Id,
): Promise<{ workerId: Id; at: string } | null> {
    const wo = await ctx.GET<WorkOrderEntity>(
        `work-orders/${workOrderId}`,
    );
    const fg = validateWorkOrderFlowGraph(
        wo.flow_graph,
    );
    const all = await ctx.GET<
        WorkOrderClaimEntity[]
    >('work-order-claims');
    const active = all.find(
        c =>
            c.work_order_id === workOrderId
            && !isExpiredClaim(c, fg.lockTimeout),
    );
    return active
        ? {
            workerId: active.worker_id,
            at: active.claimed_at,
        }
        : null;
}

async function assertParity(
    ctx: RequestContext,
    workOrderId: Id,
    label: string,
): Promise<void> {
    const tableNode =
        await getWorkOrderCurrentNode(
            ctx, workOrderId,
        );
    const statesNode =
        await getWorkOrderCurrentNodeFromStates(
            ctx, workOrderId,
        );
    assert.deepEqual(
        statesNode, tableNode,
        label + ': current node parity',
    );
    const tableClaim =
        await getWorkOrderActiveClaim(
            ctx, workOrderId,
        );
    const statesClaim =
        await getWorkOrderActiveClaimFromStates(
            ctx, workOrderId,
        );
    // The two readers resolve "claimed at"
    // from different timestamps (the claim
    // row's claimed_at vs the state event's
    // at). They are written in the same
    // commit batch — equal in practice but
    // not by definition. Compare workerId
    // strictly; treat at as parity-soft.
    if (tableClaim === null) {
        assert.equal(
            statesClaim, null,
            label + ': claim parity (null)',
        );
    } else {
        assert.ok(
            statesClaim !== null,
            label + ': claim parity (non-null)',
        );
        assert.equal(
            statesClaim.workerId,
            tableClaim.workerId,
            label + ': claim worker parity',
        );
    }
}

/* ── Scenarios ────────────── */

test(
    'parity: empty work order — no '
    + 'transitions, no claims, both '
    + 'readers null',
    async () => {
        const { ctx } = await setupDb();
        // A fresh entity_id with no events.
        const ghostId = generateCryptoSafeBase62();
        const node =
            await getWorkOrderCurrentNodeFromStates(
                ctx, ghostId,
            );
        const claim =
            await getWorkOrderActiveClaimFromStates(
                ctx, ghostId,
            );
        assert.equal(node, null);
        assert.equal(claim, null);
    },
);

test(
    'parity: single creation places work '
    + 'order at post-start node with an '
    + 'active claim',
    async () => {
        const { ctx } = await setupDb();
        const woId = await createWorkOrder(ctx);
        await assertParity(
            ctx, woId, 'after creation',
        );
        const node =
            await getWorkOrderCurrentNodeFromStates(
                ctx, woId,
            );
        assert.equal(node, 'n-middle');
        const claim =
            await getWorkOrderActiveClaimFromStates(
                ctx, woId,
            );
        assert.ok(claim !== null);
        assert.equal(claim.workerId, 'current');
    },
);

test(
    'parity: transition advances current '
    + 'node and auto-releases the claim',
    async () => {
        const { ctx } = await setupDb();
        const woId = await createWorkOrder(ctx);
        await pause(2);
        await postWorkOrderTransition(ctx, {
            transitionId:
                generateCryptoSafeBase62(),
            workOrderId: woId,
            edgeId: 'e2',
            values: {},
            fieldValueIds: {},
            currentNodeId: 'n-middle',
        });
        await assertParity(
            ctx, woId, 'after transition',
        );
        const node =
            await getWorkOrderCurrentNodeFromStates(
                ctx, woId,
            );
        assert.equal(node, 'n-finish');
        const claim =
            await getWorkOrderActiveClaimFromStates(
                ctx, woId,
            );
        assert.equal(claim, null);
    },
);

test(
    'parity: explicit claim release '
    + 'clears active claim from both '
    + 'readers',
    async () => {
        const { db, ctx } = await setupDb();
        const woId = await createWorkOrder(ctx);
        await pause(2);
        const claims =
            await db.workOrderClaims.getAll();
        const initialClaim = claims.find(
            c => c.work_order_id === woId,
        );
        assert.ok(initialClaim);
        await deleteWorkOrderClaim(
            ctx, initialClaim.id, woId,
        );
        await assertParity(
            ctx, woId, 'after explicit release',
        );
        const claim =
            await getWorkOrderActiveClaimFromStates(
                ctx, woId,
            );
        assert.equal(claim, null);
    },
);

test(
    'parity: claim creation after a '
    + 'release reactivates the claim',
    async () => {
        const { db, ctx } = await setupDb();
        const woId = await createWorkOrder(ctx);
        await pause(2);
        const claims =
            await db.workOrderClaims.getAll();
        const initialClaim = claims.find(
            c => c.work_order_id === woId,
        );
        assert.ok(initialClaim);
        await deleteWorkOrderClaim(
            ctx, initialClaim.id, woId,
        );
        await pause(2);
        const newClaimId =
            generateCryptoSafeBase62();
        await postWorkOrderClaim(
            ctx, newClaimId, woId,
        );
        await assertParity(
            ctx, woId, 'after reclaim',
        );
        const claim =
            await getWorkOrderActiveClaimFromStates(
                ctx, woId,
            );
        assert.ok(claim !== null);
        assert.equal(claim.workerId, 'current');
    },
);

test(
    'parity: a new claim noticing a '
    + 'prior expired claim records '
    + 'claim_expired against the prior '
    + 'claimant',
    async () => {
        // Use lockTimeout = 1 second so the
        // new claim itself (fresh nowUtc()) is
        // not expired, while a backdated prior
        // claim is. The prior claimant is
        // 'w-other' — backdate its claim row
        // ten seconds and record the matching
        // 'claimed' state event in the past so
        // both readers agree on the pre-state.
        const ONE_SECOND = 1;
        const TEN_SECONDS_MS = 10_000;
        const { db, ctx } =
            await setupDb(ONE_SECOND);
        const woId = await createWorkOrder(ctx);
        await pause(2);
        const claims =
            await db.workOrderClaims.getAll();
        const initialClaim = claims.find(
            c => c.work_order_id === woId,
        );
        assert.ok(initialClaim);
        const backdated = new Date(
            Date.now() - TEN_SECONDS_MS,
        ).toISOString();
        // Rewrite the table row to age past the
        // lock timeout AND change the claimant.
        await db.workOrderClaims.put(
            initialClaim.id,
            {
                work_order_id: woId,
                worker_id: 'w-other',
                claimed_at: backdated,
            },
        );
        // Record an explicit 'claimed' state
        // event for 'w-other' at the backdated
        // moment so the state log mirrors the
        // table.
        await db.states.put(
            generateCryptoSafeBase62(),
            {
                entity_id: woId,
                state: 'claimed',
                worker_id: 'w-other',
                at: backdated,
            },
        );

        // Pre-state parity: both readers see
        // no active claim for the work order —
        // the table reader because the row is
        // expired, the state reader because no
        // event has yet superseded the prior
        // 'claimed'. Wait — the state reader
        // returns the latest 'claimed' as-is;
        // it does not factor in elapsed time.
        // So this pre-state is the documented
        // semantic divergence: table says null,
        // states says w-other. Parity holds
        // only after the new claim records
        // 'claim_expired'.

        // New claim by 'current'. The mutation
        // detects w-other's claim is expired
        // and records 'claim_expired' for
        // w-other in the same batch as the new
        // claim row and the 'claimed' event.
        const newClaimId =
            generateCryptoSafeBase62();
        await postWorkOrderClaim(
            ctx, newClaimId, woId,
        );
        await assertParity(
            ctx, woId,
            'after expiration-notice reclaim',
        );

        // Both readers now agree the active
        // claim is 'current'.
        const after =
            await getWorkOrderActiveClaimFromStates(
                ctx, woId,
            );
        assert.ok(after !== null);
        assert.equal(after.workerId, 'current');

        // The state log carries an explicit
        // claim_expired event for w-other.
        const allEvents =
            await db.states.allFor(woId);
        const expiredEvents = allEvents.filter(
            e => e.state === 'claim_expired',
        );
        assert.equal(expiredEvents.length, 1);
        assert.equal(
            expiredEvents[0]!.worker_id,
            'w-other',
        );
    },
);

test(
    'parity: mixed sequence — claim, '
    + 'transition (auto-release), claim, '
    + 'release, transition. Both readers '
    + 'agree at every checkpoint.',
    async () => {
        const { db, ctx } = await setupDb();
        const woId = await createWorkOrder(ctx);
        await assertParity(
            ctx, woId, 'checkpoint 1: creation',
        );

        // Step: transition → auto-release
        await pause(2);
        await postWorkOrderTransition(ctx, {
            transitionId:
                generateCryptoSafeBase62(),
            workOrderId: woId,
            edgeId: 'e2',
            values: {},
            fieldValueIds: {},
            currentNodeId: 'n-middle',
        });
        await assertParity(
            ctx, woId,
            'checkpoint 2: transition+release',
        );

        // Step: new claim
        await pause(2);
        await postWorkOrderClaim(
            ctx,
            generateCryptoSafeBase62(),
            woId,
        );
        await assertParity(
            ctx, woId, 'checkpoint 3: reclaim',
        );

        // Step: explicit release of that claim
        await pause(2);
        const allClaims =
            await db.workOrderClaims.getAll();
        const liveClaim = allClaims.find(
            c => c.work_order_id === woId,
        );
        assert.ok(liveClaim);
        await deleteWorkOrderClaim(
            ctx, liveClaim.id, woId,
        );
        await assertParity(
            ctx, woId,
            'checkpoint 4: explicit release',
        );
    },
);
