import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest, RequestError } from '../api/api.ts';
import { deriveFlowGraphStates } from '../api/derive-states.ts';
import {
    organizationToken, DEV_TOKEN,
} from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { DEFAULT_LOCK_TIMEOUT } from '../api/types.ts';
import {
    createRequestContext,
    type RequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    postFlowCreation,
    putFlow,
} from '../web-app/app/adapters/flow-mutations.ts';
import {
    buildFlowHistorySnapshot,
} from '../web-app/app/flow-history.ts';
import {
    buildInitialFlowSnapshot,
    type FlowSnapshot,
} from '../web-app/app/presenters/flow-designer.ts';
import { performUndo } from '../web-app/app/flow-operations.ts';
import type { GraphNode } from '../api/types.ts';

// Phase 14 Task 8 (undo-as-replay): the hard constraint's FIVE
// pinned sequences, plus the SIDECAR-KEEP proof — see the PINNED
// Step 0 block and its hand trace in
// .superpowers/sdd/phase14-task-8-report.md. Route-level
// (handleRequest) for the cursor-algorithm sequences 1-4 and 6,
// since the cursor lives entirely server-side; client-level
// (performUndo) for sequence 5, the ONE piece that is genuinely
// a client behavior (the 412-absorbing retry loop).

// flow-operations.ts -> logger.ts -> preferences.ts reads
// localStorage, absent in Node — stub it before any log.* call
// in an error path (mirrors flow-operations.test.ts).
// @ts-expect-error — Node global stub
globalThis.localStorage = {
    getItem: (_key: string) => null,
    setItem: () => {},
};

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

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
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

function graphOf(name: string): string {
    return JSON.stringify({
        nodes: [{
            id: 'n-' + name,
            name,
            positionX: 0, positionY: 0,
            isCreate: false, isArchive: false,
            memberIds: [], attributes: [],
            taskInstructions: '',
        }],
        edges: [],
    });
}

// One document PUT body naming its own graph — each call's
// `name` also seeds its ONE node's id/name, so a test can tell
// which save undo landed on just by reading the restored
// graph's node id.
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
        graph: graphOf(name),
        graphDelta: emptyDelta(),
        revivals: [],
        ...(overrides ?? {}),
    };
}

async function createFlow(
    db: MemoryDbAdapter,
    token: string,
    flowId: string,
): Promise<void> {
    const created = await handleRequest(db, req(
        'POST', '/flows', token, {
            id: flowId,
            flow: flowFields('genesis'),
            projectFlowId: flowId + '-pf',
            projectFlow: {
                project_id: 'proj-1',
                flow_id: flowId, at: AT,
            },
            initialState: 'active',
            initialStateEventId: flowId + '-ev',
            initialStateAt: AT,
            graphDelta: emptyDelta(),
        },
    ));
    assert.equal(created.status, 204);
}

async function headResponseId(
    db: MemoryDbAdapter, token: string, flowId: string,
): Promise<string> {
    const got = await handleRequest(db, req(
        'GET', '/flows/' + flowId, token,
    ));
    const id = got.headers.get('Response-ID');
    assert.ok(id, 'no Response-ID on GET /flows/' + flowId);
    return id!;
}

// A genuine save, echoing the current head — the ONLY way undo-
// as-replay's document-pair history grows (matches a real
// putFlow). `name` becomes both this save's own flow name and
// its one node's id (see graphOf), so later assertions can name
// which save undo landed on just by reading the restored graph.
async function save(
    db: MemoryDbAdapter, token: string, flowId: string,
    name: string, eventId: string,
): Promise<void> {
    const head = await headResponseId(db, token, flowId);
    const res = await handleRequest(db, req(
        'PUT', '/flows/' + flowId, token,
        documentBody(name, eventId),
        { 'if-response-id': head },
    ));
    assert.equal(res.status, 200);
}

async function undo(
    db: MemoryDbAdapter, token: string, flowId: string,
    eventId: string, at: string,
): Promise<Response> {
    return handleRequest(db, req(
        'POST', '/flows/' + flowId + '/undo', token,
        { eventId, at },
    ));
}

async function currentGraphName(
    db: MemoryDbAdapter, token: string, flowId: string,
): Promise<string> {
    const got = await handleRequest(db, req(
        'GET', '/flows/' + flowId, token,
    ));
    const body = await got.json() as { name: string };
    return body.name;
}

// -- 1. undo (single) --------------------------

test(
    'undo cursor: a single undo restores the previous'
    + ' save (one step back)',
    async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const flowId = 'cursor-single';
        await createFlow(db, token, flowId);
        await save(db, token, flowId, 'A', flowId + '-a');
        await save(db, token, flowId, 'B', flowId + '-b');

        const res = await undo(
            db, token, flowId, flowId + '-u1', AT,
        );
        assert.equal(res.status, 204);
        assert.equal(
            await currentGraphName(db, token, flowId), 'A',
        );
    },
);

// -- 2. undo-undo (consecutive) ----------------

// The case a naive "N document pairs back" count gets wrong: a
// SECOND consecutive undo must walk FURTHER back (to genesis),
// never oscillate back to B (the state the FIRST undo just
// left).
test(
    'undo cursor: undo-undo walks further back, never'
    + ' oscillating between the two most recent states',
    async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const flowId = 'cursor-undo-undo';
        await createFlow(db, token, flowId);
        await save(db, token, flowId, 'A', flowId + '-a');
        await save(db, token, flowId, 'B', flowId + '-b');

        const first = await undo(
            db, token, flowId, flowId + '-u1', AT,
        );
        assert.equal(first.status, 204);
        assert.equal(
            await currentGraphName(db, token, flowId), 'A',
            'first undo lands on A',
        );

        const second = await undo(
            db, token, flowId, flowId + '-u2',
            '2026-01-01T00:00:01.000000Z',
        );
        assert.equal(second.status, 204);
        assert.equal(
            await currentGraphName(db, token, flowId), 'genesis',
            'second consecutive undo reaches genesis, not'
            + ' back to B',
        );
    },
);

// -- 3. undo-save-undo (branch abandonment) ----

// The scenario that falsified a flat "exclude undo-correlated
// pairs, keep original order" cursor algorithm during Step 0
// (see the PINNED block's hand trace): undo-undo back to
// genesis, then a NEW save from that genesis baseline, must
// make B and A UNREACHABLE — the next undo reverts the new save
// back to genesis, never resurrecting the abandoned A/B branch.
test(
    'undo cursor: undo-save-undo abandons the'
    + ' undone branch — a save after undo-undo, then'
    + ' undo, reverts to the SAVE\'s own baseline, never'
    + ' the abandoned A/B branch',
    async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const flowId = 'cursor-branch';
        await createFlow(db, token, flowId);
        await save(db, token, flowId, 'A', flowId + '-a');
        await save(db, token, flowId, 'B', flowId + '-b');

        await undo(db, token, flowId, flowId + '-u1', AT);
        await undo(
            db, token, flowId, flowId + '-u2',
            '2026-01-01T00:00:01.000000Z',
        );
        assert.equal(
            await currentGraphName(db, token, flowId), 'genesis',
            'undo-undo reaches genesis before the new save',
        );

        // A NEW edit, made from the genesis baseline — A and B
        // are now an abandoned branch.
        await save(db, token, flowId, 'D', flowId + '-d');
        assert.equal(
            await currentGraphName(db, token, flowId), 'D',
        );

        const third = await undo(
            db, token, flowId, flowId + '-u3',
            '2026-01-01T00:00:02.000000Z',
        );
        assert.equal(third.status, 204);
        assert.equal(
            await currentGraphName(db, token, flowId), 'genesis',
            'undo after the save reverts to genesis (D\'s own'
            + ' baseline) — never A or B',
        );
    },
);

// -- 4. undo at history exhaustion -------------

test(
    'undo cursor: undo at exhaustion (nothing before'
    + ' genesis) is a graceful no-op — 204, no document'
    + ' pair, no graph change',
    async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const flowId = 'cursor-exhausted';
        await createFlow(db, token, flowId);

        const before = await db.requests.getAll();
        const res = await undo(
            db, token, flowId, flowId + '-u1', AT,
        );
        assert.equal(res.status, 204);

        const after = await db.requests.getAll();
        assert.equal(
            after.length, before.length + 1,
            'exhaustion appends exactly the operation pair'
            + ' — no document pair',
        );
        assert.equal(
            await currentGraphName(db, token, flowId), 'genesis',
        );

        // A SECOND exhausted undo must ALSO no-op (the first
        // exhausted attempt's own operation pair must not
        // desync a later replay).
        const again = await undo(
            db, token, flowId, flowId + '-u2',
            '2026-01-01T00:00:01.000000Z',
        );
        assert.equal(again.status, 204);
        const afterAgain = await db.requests.getAll();
        assert.equal(
            afterAgain.length, after.length + 1,
            'a second exhausted undo ALSO appends only its'
            + ' own operation pair',
        );
        assert.equal(
            await currentGraphName(db, token, flowId), 'genesis',
        );
    },
);

// -- 5. concurrent-save vs undo (412 + retry) --

// Client-level (not route-level): postFlowUndo's own jittered
// 412-absorb, with NO baseline of its own to rebuild — a 412 on
// attempt 1 means the head moved; attempt 2 (a FRESH eventId/at,
// the E6-split convention) just re-POSTs, and the SERVER
// re-resolves the target fresh against the new head.
test(
    'undo cursor: a 412 on attempt 1 is absorbed —'
    + ' attempt 2 succeeds with no client-side baseline'
    + ' refetch',
    async () => {
        const db = new MemoryDbAdapter();
        await seedAdminSchema(db);
        const flowId = 'cursor-retry';
        const ctx = createRequestContext(db, DEV_TOKEN);
        await postFlowCreation(ctx, {
            flowId,
            linkId: flowId + '-link',
            projectId: 'project-1',
            name: 'Retry Flow',
        });
        await putFlow(ctx, flowId, {
            name: 'Retry Flow',
            isLocked: false,
            isAutoLayout: false,
            isAutoFit: false,
            lockTimeout: DEFAULT_LOCK_TIMEOUT,
            nodes: [buildNode('a')],
            edges: [],
        });

        let posts = 0;
        const flaky: RequestContext = {
            ...ctx,
            POST: <T>(
                resource: string,
                body: Record<string, unknown>,
            ): Promise<T> => {
                if (resource === 'flows/' + flowId + '/undo') {
                    posts += 1;
                    if (posts === 1) {
                        return Promise.reject(
                            new RequestError(
                                'stale head', 412,
                            ),
                        );
                    }
                }
                return ctx.POST<T>(resource, body);
            },
        };

        const snap = snapOf(flowId, [
            buildNode('a'),
        ]);
        const op = await performUndo(
            flaky, snap, buildFlowHistorySnapshot(true),
        );
        assert.equal(op.kind, 'ok');
        assert.equal(posts, 2, 'the retry re-posts once');
    },
);

function buildNode(id: string): GraphNode {
    return {
        id, name: id,
        positionX: 0, positionY: 0,
        isCreate: false, isArchive: false,
        memberIds: [], attributes: [],
        taskInstructions: '',
    };
}

function snapOf(
    flowId: string, nodes: GraphNode[],
): FlowSnapshot {
    return buildInitialFlowSnapshot(
        {
            id: flowId,
            name: 'Retry Flow',
            isLocked: false,
            isAutoLayout: false,
            isAutoFit: false,
            lockTimeout: DEFAULT_LOCK_TIMEOUT,
            createdAt: AT,
            nodes,
            edges: [],
        },
        800, 600, [], [], [],
    );
}

// -- 6. SIDECAR-KEEP ---------------------------

// deriveFlowGraphStates (api/derive-states.ts) scans EVERY
// flows/:id document pair's OWN stored body for
// graphDelta.deletions/revivals — including a pair the UNDO
// route itself synthesized. This proves the sidecar mechanism
// keeps working on an undo-authored pair specifically: a node
// deleted by a save, then revived by undo, must show
// 'deleted' then 'restored' in the derived states log.
test(
    'SIDECAR-KEEP: deriveFlowGraphStates reads the'
    + ' deleted/restored events an undo-authored'
    + ' document pair carries, same as any other save',
    async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const flowId = 'sidecar-undo';
        const nodeId = 'sidecar-node';

        const created = await handleRequest(db, req(
            'POST', '/flows', token, {
                id: flowId,
                flow: flowFields('Sidecar Flow'),
                projectFlowId: flowId + '-pf',
                projectFlow: {
                    project_id: 'proj-1',
                    flow_id: flowId, at: AT,
                },
                initialState: 'active',
                initialStateEventId: flowId + '-ev',
                initialStateAt: AT,
                graphDelta: {
                    nodes: [{
                        id: nodeId, flow_id: flowId,
                        name: 'N', position_x: 0,
                        position_y: 0, is_create: false,
                        is_archive: false,
                        task_instructions: '', at: AT,
                    }],
                    edges: [], deletions: [],
                    memberEvents: [], attributeEvents: [],
                },
            },
        ));
        assert.equal(created.status, 204);

        const head = await headResponseId(db, token, flowId);
        const deleteAt = '2026-01-01T00:00:01.000000Z';
        const deleted = await handleRequest(db, req(
            'PUT', '/flows/' + flowId, token,
            documentBody(
                'Sidecar Trimmed', flowId + '-del', {
                    state_at: deleteAt,
                    graph: JSON.stringify(
                        { nodes: [], edges: [] },
                    ),
                    graphDelta: {
                        ...emptyDelta(),
                        deletions: [{
                            eventId: flowId + '-node-del',
                            entityId: nodeId, at: deleteAt,
                        }],
                    },
                },
            ),
            { 'if-response-id': head },
        ));
        assert.equal(deleted.status, 200);

        const undoAt = '2026-01-01T00:00:02.000000Z';
        const undone = await undo(
            db, token, flowId, flowId + '-undo-ev', undoAt,
        );
        assert.equal(undone.status, 204);

        const states = await deriveFlowGraphStates(db);
        const nodeStates = states
            .filter((s) => s.entity_id === nodeId)
            .sort((a, b) => (a.at < b.at ? -1 : 1));
        assert.deepEqual(
            nodeStates.map((s) => s.state),
            ['deleted', 'restored'],
            'the undo-authored pair\'s own revival is'
            + ' visible to the sidecar reader',
        );
    },
);
