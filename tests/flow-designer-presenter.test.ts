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

const node = (
    id: string, x = 0, y = 0,
) => ({
    id,
    name: id.toUpperCase(),
    description: '',
    positionX: x,
    positionY: y,
    isStart: false,
    isComplete: false,
    fields: [],
});

function buildPresenterWithNodes(
    isAutoFit: boolean,
): FlowDesignerPresenter {
    const graph = {
        ...emptyGraph,
        isAutoFit,
        nodes: [
            node('n1', -100, -100),
            node('n2', 100, 100),
        ],
    };
    const snap = buildInitialFlowSnapshot(
        graph, 1200, 800,
    );
    return new FlowDesignerPresenter(
        snap, 1200, 800,
        buildFlowHistorySnapshot(false),
    );
}

test(
    'withFitReconciled when isAutoFit is false'
    + ' returns snapshot with viewBox unchanged',
    () => {
        const presenter =
            buildPresenterWithNodes(false);
        const before =
            presenter.snapshot()
                .interaction.viewBox;
        const beforeX = before.x;
        const beforeY = before.y;
        const beforeW = before.w;
        const beforeH = before.h;
        const next =
            presenter.withFitReconciled();
        assert.equal(
            next.interaction.viewBox.x, beforeX,
        );
        assert.equal(
            next.interaction.viewBox.y, beforeY,
        );
        assert.equal(
            next.interaction.viewBox.w, beforeW,
        );
        assert.equal(
            next.interaction.viewBox.h, beforeH,
        );
    },
);

test(
    'withFitReconciled when isAutoFit is true'
    + ' updates viewBox to fit content',
    () => {
        const presenter =
            buildPresenterWithNodes(true);
        const before =
            presenter.snapshot()
                .interaction.viewBox;
        const beforeX = before.x;
        const beforeW = before.w;
        const next =
            presenter.withFitReconciled();
        const after =
            next.interaction.viewBox;
        const xChanged =
            Math.abs(after.x - beforeX) > 0.001;
        const wChanged =
            Math.abs(after.w - beforeW) > 0.001;
        assert.ok(
            xChanged || wChanged,
            'viewBox should change when'
            + ' isAutoFit is true and nodes'
            + ' exist',
        );
    },
);

test(
    'withFitReconciled does NOT re-run auto'
    + '-layout when isAutoLayout is true and'
    + ' isAutoFit is false (Bug 2 contract)',
    () => {
        const graph = {
            ...emptyGraph,
            isAutoLayout: true,
            isAutoFit: false,
            nodes: [
                node('n1', -250, -50),
                node('n2', 250, 50),
            ],
        };
        const snap = buildInitialFlowSnapshot(
            graph, 1200, 800,
        );
        const presenter =
            new FlowDesignerPresenter(
                snap, 1200, 800,
                buildFlowHistorySnapshot(false),
            );
        const before = presenter.snapshot().nodes;
        const beforeN1 = before.find(
            n => n.id === 'n1',
        )!;
        const beforeN2 = before.find(
            n => n.id === 'n2',
        )!;
        const next =
            presenter.withFitReconciled();
        const afterN1 = next.nodes.find(
            n => n.id === 'n1',
        )!;
        const afterN2 = next.nodes.find(
            n => n.id === 'n2',
        )!;
        assert.equal(
            afterN1.positionX,
            beforeN1.positionX,
        );
        assert.equal(
            afterN1.positionY,
            beforeN1.positionY,
        );
        assert.equal(
            afterN2.positionX,
            beforeN2.positionX,
        );
        assert.equal(
            afterN2.positionY,
            beforeN2.positionY,
        );
    },
);

