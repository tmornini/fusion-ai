import type { FlowSnapshot } from
    './presenters/flow-designer.ts';
import type { GraphEdge } from
    './adapters/flows.ts';
import {
    postEdgeConnection,
    generateId,
} from './adapters/index.ts';
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
