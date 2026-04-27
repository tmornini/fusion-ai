import { GET } from '../../../api/api.ts';
import type {
    FlowEntity,
    WorkOrderEntity,
    WorkOrderTransitionEntity,
    WorkOrderClaimEntity,
    WorkOrderFlowGraph,
    GraphNode,
    GraphEdge,
    GraphField,
} from '../../../api/types.ts';
import {
    msSinceUtc,
    MS_PER_SECOND,
} from '../../../api/types.ts';
import {
    validateWorkOrderFlowGraphJson,
    validateTransitionValuesJson,
} from '../../../api/validators.ts';
import {
    getUserMap,
    userName,
} from './shared.ts';
import type { FetchContext } from './shared.ts';

export type {
    WorkOrderEntity,
    WorkOrderTransitionEntity,
    WorkOrderClaimEntity,
    WorkOrderFlowGraph,
    GraphNode,
    GraphEdge,
    GraphField,
} from '../../../api/types.ts';

/* ── Types ───────────────── */

export class WorkOrderInboxRow {
    readonly #id: string;
    readonly #displayId: string;
    readonly #flowName: string;
    readonly #lastTransitionedAt: string | null;
    readonly #stateName: string;
    readonly #transitionerName: string | null;
    readonly #completed: boolean;
    readonly #position: number;

    constructor(data: {
        id: string;
        displayId: string;
        flowName: string;
        stateName: string;
        transitionerName: string | null;
        lastTransitionedAt: string | null;
        completed: boolean;
        position: number;
    }) {
        this.#id = data.id;
        this.#displayId = data.displayId;
        this.#flowName = data.flowName;
        this.#stateName = data.stateName;
        this.#transitionerName =
            data.transitionerName;
        this.#lastTransitionedAt =
            data.lastTransitionedAt;
        this.#completed = data.completed;
        this.#position = data.position;
    }

    idForLink(): string {
        return this.#id;
    }

    displayIdText(): string {
        return this.#displayId;
    }

    flowNameText(): string {
        return this.#flowName;
    }

    lastTransitionedAtDate(): string | null {
        return this.#lastTransitionedAt;
    }

    isCompleted(): boolean {
        return this.#completed;
    }

    currentStateName(): string {
        return this.#stateName;
    }

    lastTransitionerName(): string | null {
        return this.#transitionerName;
    }

    positionSortKey(): number {
        return this.#position;
    }
}

export interface HistoryFieldValue {
    fieldName: string;
    value: string;
}

export interface HistoryEntry {
    fromNodeName: string;
    toNodeName: string;
    userName: string;
    transitionedAt: string;
    fieldValues: HistoryFieldValue[];
}

export type ClaimStatus =
    | { kind: 'unclaimed' }
    | {
        kind: 'claimed';
        claimId: string;
        byCurrentUser: boolean;
    };

/* ── Helpers ─────────────── */

export function validateWorkOrderFlowGraph(
    raw: string,
): WorkOrderFlowGraph {
    return validateWorkOrderFlowGraphJson(
        raw, 'workOrder.flowGraph',
    );
}

export function parseTransitionValues(
    raw: string,
): Record<string, string> {
    return validateTransitionValuesJson(
        raw, 'transition.values',
    );
}

function lastTransitionToNodeId(
    transitions:
        WorkOrderTransitionEntity[],
): string | undefined {
    return transitions.at(-1)
        ?.to_node_id;
}

export function isExpiredClaim(
    claim: WorkOrderClaimEntity,
    lockTimeout: number,
): boolean {
    const elapsed = msSinceUtc(
        claim.claimed_at,
    );
    const ms =
        lockTimeout * MS_PER_SECOND;
    return elapsed >= ms;
}

/* ── Reads ───────────────── */

export async function getAllWorkOrders(
    ctx?: FetchContext,
): Promise<WorkOrderInboxRow[]> {
    const [
        workOrders, transitions,
        claims, userMap,
    ] = await Promise.all([
        GET<WorkOrderEntity[]>(
            'work-orders',
        ),
        GET<WorkOrderTransitionEntity[]>(
            'work-order-transitions',
        ),
        GET<WorkOrderClaimEntity[]>(
            'work-order-claims',
        ),
        getUserMap(ctx),
    ]);

    const transitionsByWo = Map.groupBy(
        transitions,
        t => t.work_order_id,
    );

    const claimByWo = new Map<
        string,
        WorkOrderClaimEntity
    >();
    for (const c of claims) {
        claimByWo.set(
            c.work_order_id, c,
        );
    }

    const items: WorkOrderInboxRow[] = [];
    for (const wo of workOrders) {
        const fg = validateWorkOrderFlowGraph(
            wo.flow_graph,
        );
        const rawTransitions =
            transitionsByWo.get(wo.id);
        if (!rawTransitions) {
            throw new Error(
                `Work order ${wo.id} has no transitions`,
            );
        }
        const woTransitions = rawTransitions.toSorted(
            (a, b) =>
                a.transitioned_at
                    .localeCompare(
                        b.transitioned_at,
                    ),
        );
        const curId =
            lastTransitionToNodeId(
                woTransitions,
            );
        const curNode = fg.nodes.find(
            n => n.id === curId,
        )!;
        const isCompleted =
            curNode.isComplete;

        const claim =
            claimByWo.get(wo.id);
        const isClaimed = claim
            !== undefined
            && !isExpiredClaim(
                claim,
                fg.lockTimeout,
            );

        if (isClaimed && !isCompleted)
            continue;

        const last =
            woTransitions.at(-1);

        items.push(new WorkOrderInboxRow({
            id: wo.id,
            displayId: wo.display_id,
            flowName: fg.name,
            stateName: curNode.name,
            transitionerName:
                last
                    ? userName(
                        userMap, last.user_id,
                    )
                    : null,
            lastTransitionedAt:
                last
                    ? last.transitioned_at
                    : null,
            completed: isCompleted,
            position: wo.position,
        }));
    }

    return items.toSorted(
        (a, b) =>
            a.positionSortKey()
            - b.positionSortKey(),
    );
}

export async function getArchivedWorkOrders(
    ctx?: FetchContext,
): Promise<WorkOrderInboxRow[]> {
    const items = await getAllWorkOrders(ctx);
    return items.filter(
        i => i.isCompleted(),
    );
}

export async function getActiveWorkOrders(
    ctx?: FetchContext,
): Promise<WorkOrderInboxRow[]> {
    const items = await getAllWorkOrders(ctx);
    return items.filter(
        i => !i.isCompleted(),
    );
}

export async function getWorkOrder(
    id: string,
): Promise<WorkOrderEntity> {
    return GET<WorkOrderEntity>(
        `work-orders/${id}`,
    );
}

export async function getWorkOrderTransitionRows(
    workOrderId: string,
): Promise<WorkOrderTransitionEntity[]> {
    const all = await GET<
        WorkOrderTransitionEntity[]
    >('work-order-transitions');
    return all.filter(
        t => t.work_order_id === workOrderId,
    );
}

export async function getWorkOrderClaimRows(
    workOrderId: string,
): Promise<WorkOrderClaimEntity[]> {
    const all = await GET<
        WorkOrderClaimEntity[]
    >('work-order-claims');
    return all.filter(
        c => c.work_order_id === workOrderId,
    );
}

export async function getFlowsForCreation(
): Promise<{
    id: string;
    name: string;
}[]> {
    const flows =
        await GET<FlowEntity[]>('flows');
    return flows.map(f => ({
        id: f.id,
        name: f.name,
    }));
}
