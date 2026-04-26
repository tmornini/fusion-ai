import type {
    GraphNode,
    GraphEdge,
} from './adapters/flows';

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

export function applyAddNode(
    nodes: readonly GraphNode[],
    nodeId: string,
    name: string,
    positionX: number,
    positionY: number,
): GraphNode[] {
    return [
        ...nodes,
        {
            id: nodeId,
            name,
            description: '',
            positionX,
            positionY,
            isStart: false,
            isComplete: false,
            fields: [],
        },
    ];
}

export function applyAddEdge(
    edges: readonly GraphEdge[],
    edgeId: string,
    name: string,
    fromNodeId: string,
    toNodeId: string,
): GraphEdge[] {
    return [
        ...edges,
        {
            id: edgeId,
            name,
            description: '',
            fromNodeId,
            toNodeId,
        },
    ];
}

export interface DeleteNodesResult {
    readonly nodes: GraphNode[];
    readonly edges: GraphEdge[];
}

export function applyDeleteNodes(
    nodes: readonly GraphNode[],
    edges: readonly GraphEdge[],
    nodeIds: ReadonlySet<string>,
): DeleteNodesResult {
    return {
        nodes: nodes.filter(
            n => !nodeIds.has(n.id),
        ),
        edges: edges.filter(
            e => !nodeIds.has(e.fromNodeId)
                && !nodeIds.has(e.toNodeId),
        ),
    };
}

export function applyDeleteEdge(
    edges: readonly GraphEdge[],
    edgeId: string,
): GraphEdge[] {
    return edges.filter(
        e => e.id !== edgeId,
    );
}
