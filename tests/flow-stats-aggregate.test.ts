import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildFlowStats,
    quantile,
    clipInterval,
    type FlowStatsInput,
    type FlowStatsModel,
} from '../web-app/app/flow-stats-aggregate.ts';
import type { JsonObjectField }
    from '../api/types.ts';

export function makeFixture(): FlowStatsInput {
    return {
        nodes: [
            { id: 'c', name: 'Create',
              description: '',
              positionX: 0,   positionY: 0,
              isStart: true,  isComplete: false,
              crew: { kind: 'unassigned' },
              fields: [] },
            { id: 'a', name: 'Data Capture',
              description: '',
              positionX: 200, positionY: 0,
              isStart: false, isComplete: false,
              crew: { kind: 'unassigned' },
              fields: [] },
            { id: 'b', name: 'Review',
              description: '',
              positionX: 400, positionY: 0,
              isStart: false, isComplete: false,
              crew: { kind: 'unassigned' },
              fields: [] },
            { id: 'z', name: 'Archive',
              description: '',
              positionX: 600, positionY: 0,
              isStart: false, isComplete: true,
              crew: { kind: 'unassigned' },
              fields: [] },
        ],
        edges: [
            { id: 'e1', name: '',
              description: '',
              fromNodeId: 'c', toNodeId: 'a' },
            { id: 'e2', name: '',
              description: '',
              fromNodeId: 'a', toNodeId: 'b' },
            { id: 'e3', name: 'approve',
              description: '',
              fromNodeId: 'b', toNodeId: 'z' },
            { id: 'e4', name: 'revise',
              description: '',
              fromNodeId: 'b', toNodeId: 'a' },
        ],
        workOrders: [],
        transitions: [],
        nowMs: Date.parse(
            '2026-05-10T00:00:00.000Z',
        ),
        windowDays: 90,
        roleMemberSetByRoleId: new Map(),
        crewMemberSetByCrewId: new Map(),
        personNameById: new Map(),
        modelNameById:  new Map(),
        roleNameById:   new Map(),
        crewNameById:   new Map(),
    };
}

test('quantile is linear-interpolation, p50 is true median', () => {
    assert.equal(quantile([60, 120, 180, 240, 300], 0.5), 180);
    assert.equal(quantile([60, 120, 180, 240, 300], 0.9), 276);
    assert.equal(quantile([10],                    0.5),  10);
    assert.equal(quantile([1, 3],                  0.5),   2);
});

test('quantile on empty input returns 0', () => {
    assert.equal(quantile([], 0.5), 0);
});

test('clipInterval returns overlap in seconds', () => {
    // window [10000, 100000] ms = [10s, 100s].
    assert.equal(clipInterval(50000,  80000, 10000, 100000), 30);
    assert.equal(clipInterval(0,      50000, 10000, 100000), 40);
    assert.equal(clipInterval(-100000, 200000, 10000, 100000), 90);
    assert.equal(clipInterval(0,      5000,  10000, 100000), 0);
    assert.equal(clipInterval(110000, 200000, 10000, 100000), 0);
    assert.equal(clipInterval(80000,  50000, 10000, 100000), 0);
});

test(
    'buildFlowStats returns the structural shape'
    + ' on empty input',
    () => {
        const m: FlowStatsModel =
            buildFlowStats(makeFixture());
        assert.equal(m.nodes.length, 4);
        assert.deepEqual(
            m.nodes.map(n => n.id),
            ['c', 'a', 'b', 'z'],
        );
        assert.equal(m.edges.length, 4);
        assert.equal(m.pathEntries.length, 0);
        assert.equal(
            m.completedWorkOrderCount, 0,
        );
        assert.equal(
            m.incompleteWorkOrderCount, 0,
        );
        assert.equal(m.windowDays, 90);
        assert.equal(m.droppedNodeIds.size, 0);
        assert.equal(
            m.pathsWithDroppedStepsCount, 0,
        );
    },
);

function tBefore(
    input: FlowStatsInput,
    ms: number,
): string {
    return new Date(input.nowMs - ms).toISOString();
}

function emptyWO(id: string, createdAt: string) {
    return {
        id, display_id: id,
        flow_graph: '{}' as JsonObjectField,
        position: 0, created_at: createdAt,
    };
}

test(
    'attributes sojourns and computes'
    + ' heatPct + heatT',
    () => {
        const f = makeFixture();
        const tCreated =
            tBefore(f, 3 * 3600 * 1000);
        const tEnterB =
            tBefore(f, 1 * 3600 * 1000);
        const tEnterZ = tBefore(f, 0);
        const input: FlowStatsInput = { ...f,
            workOrders: [emptyWO('w1', tCreated)],
            transitions: [
                { id: 't0', work_order_id: 'w1',
                  from_node_id: '',
                  to_node_id: 'c', person_id: 'p1',
                  transitioned_at: tCreated },
                { id: 't1', work_order_id: 'w1',
                  from_node_id: 'c',
                  to_node_id: 'a', person_id: 'p1',
                  transitioned_at: tCreated },
                { id: 't2', work_order_id: 'w1',
                  from_node_id: 'a',
                  to_node_id: 'b', person_id: 'p2',
                  transitioned_at: tEnterB },
                { id: 't3', work_order_id: 'w1',
                  from_node_id: 'b',
                  to_node_id: 'z', person_id: 'p1',
                  transitioned_at: tEnterZ },
            ],
        };
        const m = buildFlowStats(input);
        const byId = new Map(
            m.nodes.map(n => [n.id, n]),
        );
        assert.equal(
            Math.round(byId.get('a')!.heatPct),
            67,
        );
        assert.equal(
            Math.round(byId.get('b')!.heatPct),
            33,
        );
        assert.equal(byId.get('c')!.heatPct, 0);
        assert.equal(byId.get('z')!.heatPct, 0);
        assert.equal(
            byId.get('a')!.heatT.toFixed(2),
            '0.67',
        );
        assert.equal(
            byId.get('b')!.heatT.toFixed(2),
            '0.33',
        );
        assert.equal(
            m.completedWorkOrderCount, 1,
        );
        assert.equal(
            m.incompleteWorkOrderCount, 0,
        );
    },
);

test(
    'drops transitions to nodes missing'
    + ' from the current graph',
    () => {
        const f = makeFixture();
        const tCreated = tBefore(f, 60_000);
        const input: FlowStatsInput = { ...f,
            workOrders: [emptyWO('w1', tCreated)],
            transitions: [
                { id: 't0', work_order_id: 'w1',
                  from_node_id: '',
                  to_node_id: 'c', person_id: 'p1',
                  transitioned_at: tCreated },
                { id: 't1', work_order_id: 'w1',
                  from_node_id: 'c',
                  to_node_id: 'GHOST',
                  person_id: 'p1',
                  transitioned_at:
                      tBefore(f, 30_000) },
            ],
        };
        const m = buildFlowStats(input);
        assert.ok(m.droppedNodeIds.has('GHOST'));
        assert.equal(
            m.pathsWithDroppedStepsCount, 1,
        );
    },
);

test(
    'clips sojourns to the trailing'
    + ' 90-day window',
    () => {
        const f = makeFixture();
        const D = 24 * 3600 * 1000;
        const t100d = tBefore(f, 100 * D);
        const t10d  = tBefore(f, 10  * D);
        const input: FlowStatsInput = { ...f,
            workOrders: [emptyWO('w1', t100d)],
            transitions: [
                { id: 't0', work_order_id: 'w1',
                  from_node_id: '',
                  to_node_id: 'c', person_id: 'p1',
                  transitioned_at: t100d },
                { id: 't1', work_order_id: 'w1',
                  from_node_id: 'c',
                  to_node_id: 'a', person_id: 'p1',
                  transitioned_at: t100d },
                { id: 't2', work_order_id: 'w1',
                  from_node_id: 'a',
                  to_node_id: 'z', person_id: 'p1',
                  transitioned_at: t10d },
            ],
        };
        const m = buildFlowStats(input);
        assert.equal(
            Math.round(
                m.nodes.find(n =>
                    n.id === 'a',
                )!.heatPct,
            ),
            100,
        );
    },
);

test(
    'tracks incomplete (in-flight) work orders',
    () => {
        const f = makeFixture();
        const t = tBefore(f, 60_000);
        const input: FlowStatsInput = { ...f,
            workOrders: [emptyWO('w1', t)],
            transitions: [
                { id: 't0', work_order_id: 'w1',
                  from_node_id: '',
                  to_node_id: 'c', person_id: 'p1',
                  transitioned_at: t },
                { id: 't1', work_order_id: 'w1',
                  from_node_id: 'c',
                  to_node_id: 'a', person_id: 'p1',
                  transitioned_at: t },
            ],
        };
        const m = buildFlowStats(input);
        assert.equal(
            m.completedWorkOrderCount, 0,
        );
        assert.equal(
            m.incompleteWorkOrderCount, 1,
        );
    },
);
