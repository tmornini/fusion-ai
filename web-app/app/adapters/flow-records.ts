import type {
    FlowEntity,
    FlowRecordEntity,
    FlowRecordId,
    Id,
    RecordId,
    FlowWorkOrderEntity,
    WorkOrderEntity,
} from '../../../api/types.ts';
import {
    filterByField,
    type RequestContext,
} from './shared.ts';
import {
    notifyRecordChange,
} from './records.ts';

export type {
    FlowRecordEntity,
    FlowRecordId,
} from '../../../api/types.ts';

async function getFlowRecordEntities(
    ctx: RequestContext,
): Promise<FlowRecordEntity[]> {
    return ctx.GET<FlowRecordEntity[]>(
        'flow-records',
    );
}

export async function putFlowRecord(
    ctx: RequestContext,
    id: FlowRecordId,
    entity: Omit<FlowRecordEntity, 'id'>,
): Promise<void> {
    await ctx.PUT(
        `flow-records/${id}`, entity,
    );
    notifyRecordChange();
}

export async function deleteFlowRecord(
    ctx: RequestContext,
    id: FlowRecordId,
): Promise<void> {
    await ctx.DELETE(
        `flow-records/${id}`,
    );
    notifyRecordChange();
}

export async function getRecordForFlow(
    ctx: RequestContext,
    flowId: Id,
): Promise<RecordId | null> {
    const rows = await getFlowRecordEntities(ctx);
    const found = rows.find(
        r => r.flow_id === flowId,
    );
    return found ? found.record_id : null;
}

export async function getRecordForWorkOrder(
    ctx: RequestContext,
    workOrderId: Id,
): Promise<RecordId | null> {
    const [links, bindings] = await Promise.all([
        ctx.GET<FlowWorkOrderEntity[]>(
            'flow-work-orders',
        ),
        getFlowRecordEntities(ctx),
    ]);
    const link = links.find(
        l => l.work_order_id === workOrderId,
    );
    if (!link) {
        return null;
    }
    const found = bindings.find(
        b => b.flow_id === link.flow_id,
    );
    return found ? found.record_id : null;
}

// The flows bound to a record, shaped for display:
// the adapter owns the flow-records join AND the flow
// name lookup, so the record-detail page never speaks
// a table name or a raw wire row.
export interface BoundFlowSummary {
    readonly id: Id;
    readonly name: string;
}

export async function getFlowSummariesForRecord(
    ctx: RequestContext,
    recordId: RecordId,
): Promise<BoundFlowSummary[]> {
    const [rows, flows] = await Promise.all([
        getFlowRecordEntities(ctx),
        ctx.GET<FlowEntity[]>('flows'),
    ]);
    const wanted = new Set(
        filterByField(rows, 'record_id', recordId)
            .map(r => r.flow_id),
    );
    return flows
        .filter(f => wanted.has(f.id))
        .map(f => ({ id: f.id, name: f.name }));
}

export async function getWorkOrdersForRecord(
    ctx: RequestContext,
    recordId: RecordId,
): Promise<WorkOrderEntity[]> {
    const [bindings, flowWorkOrders, workOrders]
        = await Promise.all([
            getFlowRecordEntities(ctx),
            ctx.GET<FlowWorkOrderEntity[]>(
                'flow-work-orders',
            ),
            ctx.GET<WorkOrderEntity[]>(
                'work-orders',
            ),
        ]);
    const flowIds = new Set(
        filterByField(bindings, 'record_id', recordId)
            .map(b => b.flow_id),
    );
    const workOrderIds = new Set(
        flowWorkOrders
            .filter(
                fwo => flowIds.has(fwo.flow_id),
            )
            .map(fwo => fwo.work_order_id),
    );
    return workOrders.filter(
        wo => workOrderIds.has(wo.id),
    );
}
