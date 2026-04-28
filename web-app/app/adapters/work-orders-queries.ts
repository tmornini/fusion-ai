import { GET } from '../../../api/api.ts';
import type {
    FlowEntity,
    WorkOrderEntity,
    WorkOrderTransitionEntity,
    TransitionFieldValueEntity,
    WorkOrderClaimEntity,
    WorkOrderFlowGraph,
    Id,
} from '../../../api/types.ts';
import {
    msSinceUtc,
    MS_PER_SECOND,
} from '../../../api/types.ts';
import {
    validateWorkOrderFlowGraphJson,
} from '../../../api/validators.ts';

export type {
    WorkOrderEntity,
    WorkOrderTransitionEntity,
    TransitionFieldValueEntity,
    WorkOrderClaimEntity,
    WorkOrderFlowGraph,
    GraphNode,
    GraphEdge,
    GraphField,
} from '../../../api/types.ts';

/* ── Types ───────────────── */

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

/* ── transition_field_values ─── */

// Group all transition_field_values rows by their
// parent transition_id. Callers iterate the work
// order's transitions and look up its field/values
// from the resulting map; each transition that wrote
// no values has no entry (Map.get returns undefined,
// which the call site treats as "no field values").
export async function getTransitionFieldValuesByTransition(
): Promise<Map<Id, TransitionFieldValueEntity[]>> {
    const all = await GET<
        TransitionFieldValueEntity[]
    >('transition-field-values');
    const byTransition = new Map<
        Id,
        TransitionFieldValueEntity[]
    >();
    for (const row of all) {
        const list =
            byTransition.get(row.transition_id);
        if (list) {
            list.push(row);
        } else {
            byTransition.set(
                row.transition_id, [row],
            );
        }
    }
    return byTransition;
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

export async function getWorkOrderRows(
): Promise<WorkOrderEntity[]> {
    return GET<WorkOrderEntity[]>(
        'work-orders',
    );
}

export async function getAllWorkOrderTransitionRows(
): Promise<WorkOrderTransitionEntity[]> {
    return GET<
        WorkOrderTransitionEntity[]
    >('work-order-transitions');
}

export async function getAllWorkOrderClaimRows(
): Promise<WorkOrderClaimEntity[]> {
    return GET<
        WorkOrderClaimEntity[]
    >('work-order-claims');
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
