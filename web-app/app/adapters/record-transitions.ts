import type {
    Id,
    RecordAttributeId,
    WorkOrderEntity,
} from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    validateWorkOrderFlowGraph,
    getWorkOrderHistory,
    currentNodeIdFromHistory,
} from './work-orders-queries.ts';
import {
    getRecordForWorkOrder,
} from './flow-records.ts';
import {
    getRecordAttributesByRecord,
} from './record-attributes.ts';
import {
    validateAttributeValue,
} from '../../../api/record-constraints.ts';
import type {
    ConstraintViolation,
} from '../../../api/record-constraints.ts';

export type {
    ConstraintViolation,
} from '../../../api/record-constraints.ts';

export class RecordTransitionViolations
    extends Error {
    readonly violations:
        readonly ConstraintViolation[];
    constructor(
        violations: readonly ConstraintViolation[],
    ) {
        super(
            'record transition gate rejected: '
            + violations.length + ' violation(s)',
        );
        this.name = 'RecordTransitionViolations';
        this.violations = violations;
    }
}

// Gate the leave of the CURRENT node — the same node
// the workbox action screen paints. Required attrs and
// constraint checks run against that node's refs only;
// the target node's fields are collected after arrival.
// storedValues is the bound instance head (null when
// unbound — A3 mirror: every required ref reports).
// Constraints run on pending values only; requiredness
// overlays pending on stored (or reports when unbound).
export async function validateRecordTransition(
    ctx: RequestContext,
    workOrderId: Id,
    pendingValues:
        ReadonlyMap<RecordAttributeId, string>,
    storedValues:
        ReadonlyMap<RecordAttributeId, string> | null,
): Promise<ConstraintViolation[]> {
    const wo = await ctx.GET<WorkOrderEntity>(
        `work-orders/${workOrderId}`,
    );
    const fg = validateWorkOrderFlowGraph(
        wo.flow_graph,
    );
    const history = await getWorkOrderHistory(
        ctx, workOrderId,
    );
    const currentNodeId =
        currentNodeIdFromHistory(history);
    if (currentNodeId === null) {
        throw new Error(
            'work order has no current node: '
            + workOrderId,
        );
    }
    const currentNode = fg.nodes.find(
        n => n.id === currentNodeId,
    );
    if (!currentNode) {
        throw new Error(
            'current node not found in work'
            + ' order flow graph: '
            + currentNodeId,
        );
    }
    const recordId = await getRecordForWorkOrder(
        ctx, workOrderId,
    );
    const attributes = recordId === null
        ? []
        : await getRecordAttributesByRecord(
            ctx, recordId,
        );
    const attributeById = new Map(
        attributes.map(a => [a.id, a]),
    );

    const out: ConstraintViolation[] = [];
    for (const ref of currentNode.attributes) {
        const attribute = attributeById.get(
            ref.attributeId,
        );
        if (!attribute) {
            throw new Error(
                'node ' + currentNodeId
                + ' references unknown'
                + ' attribute '
                + ref.attributeId,
            );
        }
        const pending = pendingValues.get(
            attribute.id,
        );
        const stored = storedValues === null
            ? undefined
            : storedValues.get(attribute.id);
        const value = pending
            ?? stored ?? null;
        const isEmpty = value === null
            || value === '';
        if (ref.isRequired && isEmpty) {
            out.push({
                kind: 'required',
                attributeId: attribute.id,
                attributeName: attribute.name,
            });
            continue;
        }
        // Constraints on pending only — stored head
        // is already validated at the instance write.
        if (
            pending !== undefined
            && pending !== ''
        ) {
            for (const v of validateAttributeValue(
                attribute, pending,
            )) {
                out.push(v);
            }
        }
    }
    return out;
}
