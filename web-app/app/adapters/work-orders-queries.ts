import type {
    FlowWorkOrderEntity,
    WorkOrderEntity,
    StateFieldValueEntity,
    WorkOrderFlowGraph,
    Id,
} from '../../../api/types.ts';
import {
    validateWorkOrderFlowGraphJson,
} from '../../../api/validators.ts';
import type { RequestContext } from './shared.ts';

export type {
    WorkOrderEntity,
    StateFieldValueEntity,
    WorkOrderFlowGraph,
    GraphNode,
    GraphEdge,
    NodeAttribute,
} from '../../../api/types.ts';

export type { TransitionEvent } from './state-events.ts';

export {
    getWorkOrderActiveClaim,
    getActiveClaimsByWorkOrder,
    getWorkOrderCurrentNodeId,
    getWorkOrderTransitionEvents,
    getTransitionEventsByWorkOrder,
} from './state-events.ts';

/* ── Types ───────────────── */

export interface HistoryFieldValue {
    fieldName: string;
    value: string;
}

export interface HistoryEntry {
    fromNodeName: string;
    toNodeName: string;
    memberName: string;
    transitionedAt: string;
    fieldValues: HistoryFieldValue[];
}

export type ClaimStatus =
    | { kind: 'unclaimed' }
    | {
        kind: 'claimed';
        byCurrentMember: boolean;
        at: string;
    };

/* ── Helpers ─────────────── */

export function validateWorkOrderFlowGraph(
    raw: string,
): WorkOrderFlowGraph {
    return validateWorkOrderFlowGraphJson(
        raw, 'workOrder.flowGraph',
    );
}

// The parsed domain twin of WorkOrderEntity: the
// adapter is the divorce point, so above the storage
// seam the flow graph is a real WorkOrderFlowGraph,
// never the JsonObjectField string the datastore
// persists, and the fields speak camelCase.
export interface WorkOrder {
    id: Id;
    organizationId: Id;
    displayId: string;
    flowGraph: WorkOrderFlowGraph;
    position: number;
}

function toWorkOrder(
    entity: WorkOrderEntity,
): WorkOrder {
    return {
        id: entity.id,
        organizationId: entity.organization_id,
        displayId: entity.display_id,
        flowGraph: validateWorkOrderFlowGraph(
            entity.flow_graph,
        ),
        position: entity.position,
    };
}

/* ── state_field_values ─── */

// Group all state_field_values rows by their parent
// state_event_id. Callers iterate the work order's
// transition events and look up its field/values from
// the resulting map; each event that wrote no values
// has no entry (Map.get returns undefined, which the
// call site treats as "no field values").
export async function getStateFieldValuesByEvent(
    ctx: RequestContext,
): Promise<Map<Id, StateFieldValueEntity[]>> {
    const all = await ctx.GET<
        StateFieldValueEntity[]
    >('state-field-values');
    const byEvent = new Map<
        Id,
        StateFieldValueEntity[]
    >();
    for (const row of all) {
        const list =
            byEvent.get(row.state_event_id);
        if (list) {
            list.push(row);
        } else {
            byEvent.set(
                row.state_event_id, [row],
            );
        }
    }
    return byEvent;
}

/* ── Reads ───────────────── */

export async function getWorkOrderEntities(
    ctx: RequestContext,
): Promise<WorkOrderEntity[]> {
    return ctx.GET<WorkOrderEntity[]>(
        'work-orders',
    );
}

export async function getWorkOrders(
    ctx: RequestContext,
): Promise<WorkOrder[]> {
    const rows = await getWorkOrderEntities(ctx);
    return rows.map(toWorkOrder);
}

export async function getFlowWorkOrderEntities(
    ctx: RequestContext,
): Promise<FlowWorkOrderEntity[]> {
    return ctx.GET<
        FlowWorkOrderEntity[]
    >('flow-work-orders');
}

export async function getWorkOrder(
    ctx: RequestContext,
    id: string,
): Promise<WorkOrder> {
    const row = await ctx.GET<WorkOrderEntity>(
        `work-orders/${id}`,
    );
    return toWorkOrder(row);
}
