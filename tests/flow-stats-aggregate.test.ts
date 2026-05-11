import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildFlowStats,
    quantile,
    clipInterval,
    type FlowStatsInput,
    type FlowStatsModel,
} from '../web-app/app/flow-stats-aggregate.ts';

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
