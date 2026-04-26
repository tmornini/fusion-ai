import type {
    GraphNode,
    GraphEdge,
    GraphField,
} from './adapters/flows';
import {
    computeLayout,
    edgeWaypointKey,
} from './flow-layout';
import {
    computeEdgeLabelWidth,
} from './flow-graph';

export type Waypoint = {
    readonly x: number;
    readonly y: number;
};

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

export function applyUpdateNode(
    nodes: readonly GraphNode[],
    nodeId: string,
    patch: Partial<GraphNode>,
): GraphNode[] {
    return nodes.map(
        n => n.id === nodeId
            ? { ...n, ...patch }
            : n,
    );
}

export function applyUpdateEdge(
    edges: readonly GraphEdge[],
    edgeId: string,
    patch: Partial<GraphEdge>,
): GraphEdge[] {
    return edges.map(
        e => e.id === edgeId
            ? { ...e, ...patch }
            : e,
    );
}

export function applyAddField(
    nodes: readonly GraphNode[],
    nodeId: string,
    field: GraphField,
): GraphNode[] {
    return nodes.map(
        n => n.id === nodeId
            ? {
                ...n,
                fields: [...n.fields, field],
            }
            : n,
    );
}

export function applyDeleteField(
    nodes: readonly GraphNode[],
    nodeId: string,
    fieldId: string,
): GraphNode[] {
    return nodes.map(
        n => n.id === nodeId
            ? {
                ...n,
                fields: n.fields.filter(
                    f => f.id !== fieldId,
                ),
            }
            : n,
    );
}

export interface AutoLayoutResult {
    readonly nodes: GraphNode[];
    readonly edgeWaypoints:
        Map<string, Waypoint[]>;
}

export function applyAutoLayout(
    nodes: readonly GraphNode[],
    edges: readonly GraphEdge[],
    canvasW: number,
    canvasH: number,
    panelOpen: boolean,
    panelWidthPx: number,
): AutoLayoutResult {
    const nodeById = new Map(
        nodes.map(n => [n.id, n]),
    );
    const layoutInputs = nodes.map(n => ({
        id: n.id,
        isStart: n.isStart,
        isComplete: n.isComplete,
    }));
    const layoutEdges = edges.map(e => {
        const from =
            nodeById.get(e.fromNodeId);
        const isStart =
            from?.isStart === true;
        return {
            fromId: e.fromNodeId,
            toId: e.toNodeId,
            labelWidth: isStart
                ? 0
                : computeEdgeLabelWidth(
                    e.name,
                ),
        };
    });
    const effectiveW = panelOpen
        ? Math.max(
            0,
            canvasW - panelWidthPx,
        )
        : canvasW;
    const result = computeLayout({
        nodes: layoutInputs,
        edges: layoutEdges,
        canvasWidth: effectiveW,
        canvasHeight: canvasH,
    });
    const newNodes = nodes.map(n => {
        const pos =
            result.positions.get(n.id)!;
        return {
            ...n,
            positionX: pos.x,
            positionY: pos.y,
        };
    });
    const edgeWaypoints =
        new Map<string, Waypoint[]>();
    for (const e of edges) {
        const key = edgeWaypointKey(
            e.fromNodeId, e.toNodeId,
        );
        const wp =
            result.waypoints.get(key);
        if (wp && wp.length > 0) {
            edgeWaypoints.set(e.id, wp);
        }
    }
    return {
        nodes: newNodes,
        edgeWaypoints,
    };
}
