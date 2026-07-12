import type {
    FlowWorkOrderEntity,
    WorkOrderEntity,
    WorkOrderFlowGraph,
    WorkOrderHistoryEventEntity,
    Id,
} from '../../../api/types.ts';
import {
    msSinceUtc,
    MS_PER_SECOND,
} from '../../../api/types.ts';
import {
    validateWorkOrderFlowGraphJson,
} from '../../../api/validators.ts';
import {
    isClaimState,
} from '../../../api/work-order-claims.ts';
import type { RequestContext } from './shared.ts';
import type { TransitionEvent } from './state-events.ts';

export type {
    WorkOrderEntity,
    WorkOrderFlowGraph,
    WorkOrderHistoryEventEntity,
    GraphNode,
    GraphEdge,
    NodeAttribute,
} from '../../../api/types.ts';

export type { TransitionEvent } from './state-events.ts';

// Bulk variants still live on the states log until B9
// re-homes them to GET work-orders/history.
export {
    getActiveClaimsByWorkOrder,
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

/* ── Field values (from history) ─── */

// The camelCase domain shape of one field value
// written with a transition. The parent event id is
// the grouping key; attributeId references the record
// attribute that named the field.
export interface StateFieldValue {
    readonly attributeId: Id;
    readonly value: string;
}

// Group non-empty field_values from history rows by
// parent event id. An event that wrote no values has
// no map entry (Map.get returns undefined — the call
// site treats that as "no field values").
export function fieldValuesByEventFromHistory(
    history: readonly WorkOrderHistoryEventEntity[],
): Map<Id, StateFieldValue[]> {
    const byEvent = new Map<Id, StateFieldValue[]>();
    for (const row of history) {
        if (row.field_values.length === 0) continue;
        byEvent.set(
            row.id,
            row.field_values.map(fv => ({
                attributeId: fv.attribute_id,
                value: fv.value,
            })),
        );
    }
    return byEvent;
}

/* ── Per-id history ──────── */

// GET work-orders/:id/history — lifecycle events with
// field_values folded inline, (at, id) DESC (index 0
// is current). Source of truth for every single-WO
// lifecycle read below.
export async function getWorkOrderHistory(
    ctx: RequestContext,
    id: Id,
): Promise<WorkOrderHistoryEventEntity[]> {
    return ctx.GET<WorkOrderHistoryEventEntity[]>(
        `work-orders/${id}/history`,
    );
}

// History is DESC: the first non-claim event is the
// current node. Null when no transitions exist.
export function currentNodeIdFromHistory(
    history: readonly WorkOrderHistoryEventEntity[],
): Id | null {
    const latest = history.find(
        ev => !isClaimState(ev.state),
    );
    return latest === undefined ? null : latest.state;
}

export async function getWorkOrderCurrentNodeId(
    ctx: RequestContext,
    workOrderId: Id,
): Promise<Id | null> {
    const history = await getWorkOrderHistory(
        ctx, workOrderId,
    );
    return currentNodeIdFromHistory(history);
}

// History is DESC: the first claim-vocabulary event is
// the latest claim state. A 'claimed' event older than
// lockTimeout is implicitly expired.
export function activeClaimFromHistory(
    history: readonly WorkOrderHistoryEventEntity[],
    lockTimeout: number,
): { memberId: Id; at: string } | null {
    const latest = history.find(
        ev => isClaimState(ev.state),
    );
    if (
        latest === undefined
        || latest.state !== 'claimed'
    ) {
        return null;
    }
    if (
        msSinceUtc(latest.at)
        >= lockTimeout * MS_PER_SECOND
    ) {
        return null;
    }
    return {
        memberId: latest.member_id,
        at: latest.at,
    };
}

export async function getWorkOrderActiveClaim(
    ctx: RequestContext,
    workOrderId: Id,
    lockTimeout: number,
): Promise<{ memberId: Id; at: string } | null> {
    const history = await getWorkOrderHistory(
        ctx, workOrderId,
    );
    return activeClaimFromHistory(
        history, lockTimeout,
    );
}

// Project non-claim history rows into TransitionEvent
// ASC order for presenters and the transition gate.
// Creation is first; each later event is a step from
// the prior node. Consumers that need DESC (or the
// raw wire) should read getWorkOrderHistory directly.
function projectTransitions(
    workOrderId: Id,
    events: readonly WorkOrderHistoryEventEntity[],
): TransitionEvent[] {
    const transitions = events
        .filter(ev => !isClaimState(ev.state))
        .toSorted((a, b) => a.at.localeCompare(b.at));
    const out: TransitionEvent[] = [];
    let prior: Id | null = null;
    for (const ev of transitions) {
        const base = {
            id: ev.id,
            workOrderId,
            toNodeId: ev.state,
            memberId: ev.member_id,
            at: ev.at,
        };
        out.push(prior === null
            ? { kind: 'creation', ...base }
            : {
                kind: 'step',
                fromNodeId: prior,
                ...base,
            });
        prior = ev.state;
    }
    return out;
}

export function transitionEventsFromHistory(
    workOrderId: Id,
    history: readonly WorkOrderHistoryEventEntity[],
): TransitionEvent[] {
    return projectTransitions(workOrderId, history);
}

export async function getWorkOrderTransitionEvents(
    ctx: RequestContext,
    workOrderId: Id,
): Promise<TransitionEvent[]> {
    const history = await getWorkOrderHistory(
        ctx, workOrderId,
    );
    return transitionEventsFromHistory(
        workOrderId, history,
    );
}

/* ── Reads ───────────────── */

async function getWorkOrderEntities(
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
    flowId: string,
): Promise<FlowWorkOrderEntity[]> {
    return ctx.GET<
        FlowWorkOrderEntity[]
    >('flows/' + flowId + '/work-orders');
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
