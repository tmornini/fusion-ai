import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    FlowDesignerPresenter,
    buildInitialFlowSnapshot,
} from
    '../web-app/app/presenters/flow-designer.ts';
import {
    buildFlowHistorySnapshot,
} from '../web-app/app/flow-history.ts';
import type {
    InteractionState,
} from '../web-app/app/flow-interactions.ts';

const emptyGraph = {
    id: 'flow-1',
    name: 'Test Flow',
    description: '',
    isLocked: false,
    isAutoLayout: false,
    isAutoFit: false,
    lockTimeout: 0,
    createdAt: '2026-05-01T00:00:00.000Z',
    nodes: [],
    edges: [],
};

function buildPresenter(): FlowDesignerPresenter {
    const snap = buildInitialFlowSnapshot(
        emptyGraph, 800, 600,
    );
    return new FlowDesignerPresenter(
        snap, 800, 600,
        buildFlowHistorySnapshot(false),
    );
}

test(
    'withInteractionState returns snapshot with'
    + ' the given interaction state',
    () => {
        const presenter = buildPresenter();
        const state: InteractionState = {
            selection: {
                kind: 'nodes',
                nodeIds: new Set(['n1']),
            },
            lastClick: {
                kind: 'clicked',
                id: 'n1',
                time: 1000,
            },
            drag: { kind: 'idle' },
            connect: { kind: 'idle' },
            pan: { kind: 'idle' },
            marquee: { kind: 'idle' },
            viewBox: {
                x: -400, y: -300, w: 800, h: 600,
            },
            zoom: 1.5,
            isSpaceDown: false,
        };
        const next = presenter
            .withInteractionState(state);
        assert.equal(next.interaction, state);
        assert.equal(
            next.interaction.selection.kind,
            'nodes',
        );
        if (
            next.interaction.selection.kind
                === 'nodes'
        ) {
            assert.ok(
                next.interaction.selection
                    .nodeIds.has('n1'),
            );
        }
        assert.equal(
            next.interaction.zoom, 1.5,
        );
    },
);

test(
    'withInteractionState preserves all other'
    + ' snapshot fields',
    () => {
        const presenter = buildPresenter();
        const original = presenter.snapshot();
        const state: InteractionState = {
            selection: { kind: 'none' },
            lastClick: { kind: 'none' },
            drag: { kind: 'idle' },
            connect: { kind: 'idle' },
            pan: { kind: 'idle' },
            marquee: { kind: 'idle' },
            viewBox: {
                x: 0, y: 0, w: 100, h: 100,
            },
            zoom: 2.0,
            isSpaceDown: true,
        };
        const next = presenter
            .withInteractionState(state);
        assert.equal(next.flowId, original.flowId);
        assert.equal(
            next.flowName, original.flowName,
        );
        assert.equal(
            next.isPanelOpen, original.isPanelOpen,
        );
        assert.equal(next.nodes, original.nodes);
        assert.equal(next.edges, original.edges);
    },
);
