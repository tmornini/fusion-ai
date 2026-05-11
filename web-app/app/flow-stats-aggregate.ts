import type {
    GraphEdge,
    GraphNode,
    Id,
    WorkOrderEntity,
    WorkOrderTransitionEntity,
} from '../../api/types.ts';
import { MS_PER_DAY } from '../../api/types.ts';

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

interface Sojourn {
    readonly nodeId: string;
    readonly enterMs: number;
    readonly exitMs: number;
    readonly personId: string;
}

interface WoRun {
    readonly workOrderId: string;
    readonly sojourns: readonly Sojourn[];
    readonly pathNodeIds: readonly string[];
    readonly completed: boolean;
    readonly hadDroppedStep: boolean;
}

function reconstructRuns(
    input: FlowStatsInput,
    nodeById: ReadonlyMap<string, GraphNode>,
): {
    runs: readonly WoRun[];
    droppedNodeIds: ReadonlySet<string>;
} {
    const byWo =
        new Map<string, WorkOrderTransitionEntity[]>();
    for (const t of input.transitions) {
        const arr = byWo.get(t.work_order_id) ?? [];
        arr.push(t);
        byWo.set(t.work_order_id, arr);
    }
    const dropped = new Set<string>();
    const runs: WoRun[] = [];
    for (const [woId, ts] of byWo) {
        ts.sort((a, b) =>
            a.transitioned_at.localeCompare(
                b.transitioned_at,
            ),
        );
        const sojourns: Sojourn[] = [];
        const pathNodeIds: string[] = [];
        let completed = false;
        let hadDropped = false;
        for (let i = 0; i < ts.length; i++) {
            const t = ts[i]!;
            const node = nodeById.get(t.to_node_id);
            if (!node) {
                dropped.add(t.to_node_id);
                hadDropped = true;
                continue;
            }
            pathNodeIds.push(node.id);
            const enterMs =
                Date.parse(t.transitioned_at);
            const nextT = ts[i + 1];
            // Open-ended sojourn uses nowMs as the
            // exit so in-flight WOs contribute heat.
            const exitMs = nextT
                ? Date.parse(nextT.transitioned_at)
                : input.nowMs;
            if (!node.isStart && !node.isComplete) {
                sojourns.push({
                    nodeId: node.id,
                    enterMs, exitMs,
                    personId: t.person_id,
                });
            }
            if (node.isComplete) completed = true;
        }
        runs.push({
            workOrderId: woId,
            sojourns,
            pathNodeIds,
            completed,
            hadDroppedStep: hadDropped,
        });
    }
    return { runs, droppedNodeIds: dropped };
}

export function buildFlowStats(
    input: FlowStatsInput,
): FlowStatsModel {
    const nodeById = new Map(
        input.nodes.map(n => [n.id, n]),
    );
    const winLo =
        input.nowMs - input.windowDays * MS_PER_DAY;
    const winHi = input.nowMs;
    const { runs, droppedNodeIds } =
        reconstructRuns(input, nodeById);

    const nodeSec = new Map<string, number>();
    let flowSec = 0;
    for (const run of runs) {
        for (const s of run.sojourns) {
            const sec = clipInterval(
                s.enterMs, s.exitMs, winLo, winHi,
            );
            nodeSec.set(
                s.nodeId,
                (nodeSec.get(s.nodeId) ?? 0) + sec,
            );
            flowSec += sec;
        }
    }

    const stats: NodeStat[] = input.nodes.map(n => {
        const sec = nodeSec.get(n.id) ?? 0;
        const heatPct =
            flowSec > 0
            && !n.isStart
            && !n.isComplete
                ? (sec / flowSec) * 100
                : 0;
        const heatT =
            Math.min(1, Math.max(0, heatPct / 100));
        return { ...emptyNodeStat(n), heatPct, heatT };
    });

    return {
        nodes: stats,
        edges: input.edges,
        pathEntries: [],
        completedWorkOrderCount:
            runs.filter(r => r.completed).length,
        incompleteWorkOrderCount:
            runs.filter(r => !r.completed).length,
        windowDays: input.windowDays,
        droppedNodeIds,
        pathsWithDroppedStepsCount:
            runs.filter(r => r.hadDroppedStep).length,
    };
}

export function quantile(
    sorted: readonly number[],
    q: number,
): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0]!;
    const idx = q * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo]!;
    return sorted[lo]!
        + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

export function clipInterval(
    startMs: number, endMs: number,
    loMs:    number, hiMs:  number,
): number {
    if (endMs <= startMs) return 0;
    const start = Math.max(startMs, loMs);
    const end   = Math.min(endMs,   hiMs);
    return end <= start
        ? 0
        : Math.round((end - start) / 1000);
}
