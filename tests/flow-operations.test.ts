import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// flow-operations.ts → logger.ts → preferences.ts
// reads localStorage, which is absent in Node.
// Stub it before any log.* call in an error path.
// @ts-expect-error — Node global stub
globalThis.localStorage = {
    getItem: (_key: string) => null,
    setItem: () => {},
};

import { MemoryDbAdapter } from '../api/db-memory.ts';
import {
    createRequestContext,
    type RequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    postFlowCreation,
    putFlow,
} from
'../web-app/app/adapters/flow-mutations.ts';
import {
    postFlowVersion,
    getFlowGraph,
    type FlowVersion,
} from '../web-app/app/adapters/index.ts';
import {
    buildInitialFlowSnapshot,
    type FlowSnapshot,
} from
'../web-app/app/presenters/flow-designer.ts';
import {
    buildFlowHistorySnapshot,
} from '../web-app/app/flow-history.ts';
import {
    performAddEdge,
    performAddNodeAtPosition,
    performDeleteSelectedNodes,
    performDeleteSelectedEdge,
    performAddField,
    performDeleteField,
    performUndo,
    performRedo,
} from '../web-app/app/flow-operations.ts';
import type {
    GraphNode,
    GraphEdge,
    GraphField,
    StoredGraph,
} from '../api/types.ts';
import {
    DEFAULT_LOCK_TIMEOUT,
} from '../api/types.ts';
import type {
    FlowGraph,
} from '../web-app/app/adapters/flow-queries.ts';

const FLOW_ID = 'flow-1';

function buildNode(
    id: string,
    overrides?: Partial<GraphNode>,
): GraphNode {
    return {
        id,
        name: id,
        description: '',
        positionX: 0,
        positionY: 0,
        isStart: false,
        isComplete: false,
        crew: { kind: 'unassigned' },
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
        name: 'Transition',
        description: '',
        fromNodeId,
        toNodeId,
    };
}

function buildField(
    id: string,
): GraphField {
    return {
        id,
        name: id,
        fieldType: 'text',
        sortOrder: 0,
        isRequired: false,
        options: [],
    };
}

function buildGraph(
    nodes: GraphNode[],
    edges: GraphEdge[] = [],
): FlowGraph {
    return {
        id: FLOW_ID,
        name: 'Test Flow',
        description: '',
        isLocked: false,
        isAutoLayout: true,
        isAutoFit: true,
        lockTimeout: DEFAULT_LOCK_TIMEOUT,
        createdAt: '2026-01-01T00:00:00.000Z',
        nodes,
        edges,
    };
}

function snapFrom(graph: FlowGraph): FlowSnapshot {
    return buildInitialFlowSnapshot(
        graph, 800, 600, new Map(),
    );
}

function withNodeSelection(
    snap: FlowSnapshot,
    ...nodeIds: string[]
): FlowSnapshot {
    return {
        ...snap,
        interaction: {
            ...snap.interaction,
            selection: {
                kind: 'nodes',
                nodeIds: new Set(nodeIds),
            },
        },
    };
}

function withEdgeSelection(
    snap: FlowSnapshot,
    edgeId: string,
): FlowSnapshot {
    return {
        ...snap,
        interaction: {
            ...snap.interaction,
            selection: { kind: 'edge', edgeId },
        },
    };
}

async function setupFlow(): Promise<{
    db: MemoryDbAdapter;
    ctx: RequestContext;
}> {
    const db = new MemoryDbAdapter();
    const ctx = createRequestContext(db);
    await postFlowCreation(ctx, {
        flowId: FLOW_ID,
        linkId: FLOW_ID + '-link',
        projectId: 'project-1',
        name: 'Test Flow',
        description: '',
    });
    return { db, ctx };
}

async function persistedGraph(
    db: MemoryDbAdapter,
): Promise<StoredGraph> {
    const flow = await createRequestContext(db)
        .GET<{ graph: string }>(
            'flows/' + FLOW_ID,
        );
    return JSON.parse(flow.graph) as StoredGraph;
}

test(
    'performAddEdge: returns the new edge'
    + ' and persists it',
    async () => {
        const { db } = await setupFlow();
        const snap = snapFrom(buildGraph([
            buildNode('a'),
            buildNode('b'),
        ]));
        const op = await performAddEdge(
            db, snap, 'a', 'b',
        );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(op.edge.fromNodeId, 'a');
        assert.equal(op.edge.toNodeId, 'b');
        assert.equal(op.advanceHistory, true);
        const g = await persistedGraph(db);
        assert.equal(g.edges.length, 1);
    },
);

test(
    'performAddNodeAtPosition: returns the new'
    + ' node, an edge, and a selectId',
    async () => {
        const { db } = await setupFlow();
        const snap = snapFrom(buildGraph([
            buildNode('a'),
        ]));
        const op = await performAddNodeAtPosition(
            db, snap, 'a', 200, 100,
        );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(
            op.edge.fromNodeId, 'a',
        );
        assert.equal(
            op.edge.toNodeId, op.node.id,
        );
        assert.equal(
            op.selectId, op.node.id,
        );
        assert.equal(op.advanceHistory, true);
        const g = await persistedGraph(db);
        assert.equal(g.nodes.length, 2);
    },
);

test(
    'performDeleteSelectedNodes: removes the'
    + ' selected intermediate node',
    async () => {
        const { db } = await setupFlow();
        const base = snapFrom(buildGraph([
            buildNode('s', { isStart: true }),
            buildNode('a'),
            buildNode('e', { isComplete: true }),
        ]));
        const snap = withNodeSelection(base, 'a');
        const op =
            await performDeleteSelectedNodes(
                db, snap,
            );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(op.advanceHistory, true);
        assert.equal(
            op.nodes.some(n => n.id === 'a'),
            false,
        );
        const g = await persistedGraph(db);
        assert.equal(g.nodes.length, 2);
    },
);

test(
    'performDeleteSelectedEdge: removes the'
    + ' selected edge',
    async () => {
        const { db } = await setupFlow();
        const base = snapFrom(buildGraph(
            [buildNode('a'), buildNode('b')],
            [buildEdge('e1', 'a', 'b')],
        ));
        const snap = withEdgeSelection(base, 'e1');
        const op =
            await performDeleteSelectedEdge(
                db, snap,
            );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(op.edgeId, 'e1');
        assert.equal(op.advanceHistory, true);
        const g = await persistedGraph(db);
        assert.equal(g.edges.length, 0);
    },
);

test(
    'performAddField: appends a field to the'
    + ' single selected node',
    async () => {
        const { db } = await setupFlow();
        const base = snapFrom(buildGraph([
            buildNode('a'),
        ]));
        const snap = withNodeSelection(base, 'a');
        const op = await performAddField(
            db, snap, 'Priority', 'text',
            false, [],
        );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(op.nodeId, 'a');
        assert.equal(op.field.name, 'Priority');
        assert.equal(op.field.sortOrder, 0);
        assert.equal(op.advanceHistory, true);
    },
);

test(
    'performDeleteField: removes the field from'
    + ' the single selected node',
    async () => {
        const { db } = await setupFlow();
        const base = snapFrom(buildGraph([
            buildNode('a', {
                fields: [buildField('f1')],
            }),
        ]));
        const snap = withNodeSelection(base, 'a');
        const op = await performDeleteField(
            db, snap, 'f1',
        );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(op.nodeId, 'a');
        assert.equal(op.fieldId, 'f1');
        assert.equal(op.advanceHistory, true);
    },
);

test(
    'performUndo: with no versions is a no-op'
    + ' that returns the same snapshot',
    async () => {
        const { db } = await setupFlow();
        const snap = snapFrom(buildGraph([
            buildNode('a'), buildNode('b'),
        ]));
        const op = await performUndo(
            db, snap, buildFlowHistorySnapshot(true),
        );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(op.freshSnap, snap);
        assert.equal(
            op.newHistory.hasUndoHistory, false,
        );
    },
);

test(
    'performRedo: with an empty redo stack is a'
    + ' no-op that returns the same snapshot',
    async () => {
        const { db } = await setupFlow();
        const snap = snapFrom(buildGraph([
            buildNode('a'), buildNode('b'),
        ]));
        const op = await performRedo(
            db, snap,
            buildFlowHistorySnapshot(false),
        );
        assert.equal(op.kind, 'ok');
        if (op.kind !== 'ok') return;
        assert.equal(op.freshSnap, snap);
    },
);
