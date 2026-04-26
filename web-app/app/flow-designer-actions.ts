import type { GraphNode } from './adapters/flows';

export interface NodeMove {
    readonly nodeId: string;
    readonly x: number;
    readonly y: number;
}

export function applyMoveNodes(
    nodes: readonly GraphNode[],
    updates: readonly NodeMove[],
): GraphNode[] {
    const updateMap = new Map(
        updates.map(u => [u.nodeId, u]),
    );
    return nodes.map(n => {
        const u = updateMap.get(n.id);
        if (!u) return n;
        return {
            ...n,
            positionX: u.x,
            positionY: u.y,
        };
    });
}

export interface LockToggleResult {
    readonly isLocked: boolean;
    readonly isEditingName: boolean;
}

export function applyToggleLock(
    isLocked: boolean,
    isEditingName: boolean,
): LockToggleResult {
    const next = !isLocked;
    return {
        isLocked: next,
        isEditingName:
            next ? false : isEditingName,
    };
}

export interface FlowNameUpdateResult {
    readonly flowName: string;
    readonly isEditingName: boolean;
}

export function applyUpdateFlowName(
    name: string,
): FlowNameUpdateResult {
    return {
        flowName: name.trim(),
        isEditingName: false,
    };
}
