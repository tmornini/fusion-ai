import type {
    GraphEdge,
    GraphNode,
    Id,
    WorkOrderEntity,
    WorkOrderTransitionEntity,
} from '../../api/types.ts';

export interface FlowStatsInput {
    readonly nodes: readonly GraphNode[];
    readonly edges: readonly GraphEdge[];
    readonly workOrders:
        readonly WorkOrderEntity[];
    readonly transitions:
        readonly WorkOrderTransitionEntity[];
    readonly nowMs: number;
    readonly windowDays: number;
    readonly roleMemberSetByRoleId:
        ReadonlyMap<Id, ReadonlySet<Id>>;
    readonly crewMemberSetByCrewId:
        ReadonlyMap<Id, ReadonlySet<Id>>;
    readonly personNameById:
        ReadonlyMap<Id, string>;
    readonly modelNameById:
        ReadonlyMap<Id, string>;
    readonly roleNameById:
        ReadonlyMap<Id, string>;
    readonly crewNameById:
        ReadonlyMap<Id, string>;
}

export interface NodeStat {
    readonly id: string;
    readonly displayName: string;
    readonly isStart: boolean;
    readonly isComplete: boolean;
    readonly positionX: number;
    readonly positionY: number;
    readonly outgoingEdgeIds: readonly string[];
    readonly heatPct: number;
    readonly heatT:   number;
    readonly avgSeconds: number | null;
    readonly medianSeconds: number | null;
    readonly p90Seconds: number | null;
    readonly visitsInWindow: number;
    readonly distinctWorkOrders: number;
    readonly currentlyHere: number;
    readonly throughputPerWeek: number;
    readonly revisitRatePct: number;
    readonly clanSize: number;
    readonly activeProducerCount: number;
    readonly topProducer: {
        readonly name: string;
        readonly vsClanAvgPct: number | null;
        readonly sharePct: number | null;
        readonly inCurrentClan: boolean;
    } | null;
    readonly modelName: string | null;
    readonly assignmentLabel: string;
    readonly hasHazard: boolean;
    readonly branchSplit: readonly {
        readonly edgeId: string;
        readonly label: string;
        readonly toNodeId: string;
        readonly pct: number;
    }[];
}

export interface FlowPath {
    readonly nodeIds: readonly string[];
    readonly edgeIds: readonly string[];
    readonly workOrderCount: number;
    readonly sharePct: number;
}

export type PathEntry =
    | { readonly kind: 'path';
        readonly path: FlowPath }
    | { readonly kind: 'rest';
        readonly count: number;
        readonly combinedSharePct: number };

export interface FlowStatsModel {
    readonly nodes: readonly NodeStat[];
    readonly edges: readonly GraphEdge[];
    readonly pathEntries: readonly PathEntry[];
    readonly completedWorkOrderCount: number;
    readonly incompleteWorkOrderCount: number;
    readonly windowDays: number;
    readonly droppedNodeIds:
        ReadonlySet<string>;
    readonly pathsWithDroppedStepsCount:
        number;
}

function emptyNodeStat(n: GraphNode): NodeStat {
    return {
        id: n.id,
        displayName: n.name,
        isStart: n.isStart,
        isComplete: n.isComplete,
        positionX: n.positionX,
        positionY: n.positionY,
        outgoingEdgeIds: [],
        heatPct: 0,
        heatT: 0,
        avgSeconds: null,
        medianSeconds: null,
        p90Seconds: null,
        visitsInWindow: 0,
        distinctWorkOrders: 0,
        currentlyHere: 0,
        throughputPerWeek: 0,
        revisitRatePct: 0,
        clanSize: 0,
        activeProducerCount: 0,
        topProducer: null,
        modelName: null,
        assignmentLabel: 'Unassigned',
        hasHazard: false,
        branchSplit: [],
    };
}

export function buildFlowStats(
    input: FlowStatsInput,
): FlowStatsModel {
    return {
        nodes: input.nodes.map(emptyNodeStat),
        edges: input.edges,
        pathEntries: [],
        completedWorkOrderCount: 0,
        incompleteWorkOrderCount: 0,
        windowDays: input.windowDays,
        droppedNodeIds: new Set(),
        pathsWithDroppedStepsCount: 0,
    };
}
