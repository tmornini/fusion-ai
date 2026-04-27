import type { FlowSnapshot } from
    './presenters/flow-designer.ts';
import type {
    GraphEdge,
    GraphNode,
} from './adapters/flows.ts';
import {
    postEdgeConnection,
    postNodeAddition,
    generateId,
} from './adapters/index.ts';
import {
    NODE_WIDTH,
    NODE_HEIGHT,
} from './flow-layout.ts';
import { log } from './logger.ts';

export type ToastVariant =
    | 'success'
    | 'error'
    | 'warning'
    | 'info';

export interface OpFail {
    readonly kind: 'fail';
    readonly toast: string;
    readonly toastVariant: ToastVariant;
}

export type OpResult<TOk extends object> =
    | (TOk & { readonly kind: 'ok' })
    | OpFail;

export function failOp(
    toast: string,
    toastVariant: ToastVariant = 'error',
): OpFail {
    return { kind: 'fail', toast, toastVariant };
}

export interface EdgeAddOk {
    readonly edge: GraphEdge;
    readonly advanceHistory: true;
}

export async function performAddEdge(
    snap: FlowSnapshot,
    fromId: string,
    toId: string,
): Promise<OpResult<EdgeAddOk>> {
    if (snap.isLocked) {
        return failOp('Flow is locked');
    }
    const from = snap.nodes.find(
        n => n.id === fromId,
    );
    const to = snap.nodes.find(
        n => n.id === toId,
    );
    if (!from) {
        throw new Error(
            'performAddEdge: unknown fromId '
                + fromId,
        );
    }
    if (!to) {
        throw new Error(
            'performAddEdge: unknown toId '
                + toId,
        );
    }
    if (from.isComplete) {
        return failOp(
            'Cannot create transition'
            + ' from end state',
        );
    }
    if (to.isStart) {
        return failOp(
            'Cannot create transition'
            + ' to start state',
        );
    }
    const hasDuplicate = snap.edges.some(
        e => e.fromNodeId === fromId
            && e.toNodeId === toId,
    );
    if (hasDuplicate) {
        return failOp('Transition already exists');
    }
    if (from.isStart) {
        const hasOutgoing = snap.edges.some(
            e => e.fromNodeId === fromId,
        );
        if (hasOutgoing) {
            return failOp(
                'Start state allows'
                + ' only one outgoing'
                + ' transition',
            );
        }
    }
    const edgeId = generateId();
    const name = 'Transition';
    try {
        await postEdgeConnection({
            edgeId,
            flowId: snap.flowId,
            name,
            fromNodeId: fromId,
            toNodeId: toId,
        });
    } catch (err) {
        log.error(
            'performAddEdge failed',
            'flow-operations', err,
        );
        return failOp(
            'Failed to create transition',
        );
    }
    return {
        kind: 'ok',
        edge: {
            id: edgeId,
            name,
            description: '',
            fromNodeId: fromId,
            toNodeId: toId,
        },
        advanceHistory: true,
    };
}

export interface NodeAddOk {
    readonly node: GraphNode;
    readonly edge: GraphEdge;
    readonly selectId: string;
    readonly advanceHistory: true;
}

export async function performAddNodeAtPosition(
    snap: FlowSnapshot,
    fromNodeId: string,
    x: number,
    y: number,
): Promise<OpResult<NodeAddOk>> {
    if (snap.isLocked) {
        return failOp('Flow is locked');
    }
    const fromNode = snap.nodes.find(
        n => n.id === fromNodeId,
    );
    if (!fromNode) {
        throw new Error(
            'performAddNodeAtPosition:'
                + ' unknown fromNodeId '
                + fromNodeId,
        );
    }
    if (fromNode.isComplete) {
        return failOp(
            'Cannot create from end state',
        );
    }
    if (fromNode.isStart) {
        const hasOut = snap.edges.some(
            e => e.fromNodeId === fromNodeId,
        );
        if (hasOut) {
            return failOp(
                'Start state allows'
                + ' only one outgoing'
                + ' transition',
            );
        }
    }
    const nodeId = generateId();
    const edgeId = generateId();
    const posX = x - NODE_WIDTH / 2;
    const posY = y - NODE_HEIGHT / 2;
    try {
        await postNodeAddition({
            nodeId,
            flowId: snap.flowId,
            name: 'New State',
            positionX: posX,
            positionY: posY,
        });
    } catch (err) {
        log.error(
            'performAddNodeAtPosition'
            + ' postNodeAddition failed',
            'flow-operations', err,
        );
        return failOp('Failed to add state');
    }
    try {
        await postEdgeConnection({
            edgeId,
            flowId: snap.flowId,
            name: 'Transition',
            fromNodeId,
            toNodeId: nodeId,
        });
    } catch (err) {
        log.error(
            'performAddNodeAtPosition'
            + ' postEdgeConnection failed',
            'flow-operations', err,
        );
        return failOp(
            'Failed to connect transition',
        );
    }
    return {
        kind: 'ok',
        node: {
            id: nodeId,
            name: 'New State',
            description: '',
            isStart: false,
            isComplete: false,
            positionX: posX,
            positionY: posY,
            fields: [],
        },
        edge: {
            id: edgeId,
            name: 'Transition',
            description: '',
            fromNodeId,
            toNodeId: nodeId,
        },
        selectId: nodeId,
        advanceHistory: true,
    };
}

