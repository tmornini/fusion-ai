import type { RequestContext } from './shared.ts';
import {
    buildStateEventOp,
} from './state-events.ts';

export async function deleteWorkOrderClaim(
    ctx: RequestContext,
    claimId: string,
    workOrderId: string,
): Promise<void> {
    await ctx.commit({
        ops: [
            {
                method: 'delete',
                resource:
                    `work-order-claims/${claimId}`,
            },
            await buildStateEventOp(
                ctx,
                workOrderId,
                'claim_released',
            ),
        ],
    });
}
