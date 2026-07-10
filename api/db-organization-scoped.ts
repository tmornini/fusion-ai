import type {
    DbAdapter,
    GuardedDbAdapter,
} from './db.ts';
import type {
    Id,
} from './types.ts';
import {
    ParentScopedStateStore,
} from './store-parent-scoped.ts';
import { resolveOwningOrganization } from './derive-states.ts';

// Wrap `base` in an org-scoped view. Phase Final Stage B
// retired residual org-owned entity tables; only the states
// log still parent-scopes by pair-plane ownership. Global
// survivors (clients, organizations, requests/responses)
// pass straight through. The scoped set is enumerated
// explicitly — no reflective "wrap everything".
//
// `base` is a class instance (private backend, prototype
// methods), so it cannot be spread; the lifecycle methods
// arrow-delegate to keep `this` bound to `base`.
//
// DEPLOYMENT CONSTRAINT (inherited from access-token.ts): this
// is only as strong as the token whose verified `org` claim
// feeds the guard, and that HMAC key is still client-shipped.
// Do not rely on tenant isolation in a networked / multi-user
// context until the signing key lives server-side.
export function organizationScopedAdapter(
    base: GuardedDbAdapter,
    organization: Id,
): DbAdapter {
    // A state event's entity_id is any org-owned entity, or an
    // org-less member visible only to a co-member of this org —
    // resolved on the PAIR PLANE (Phase 15 Task 5).
    const states = new ParentScopedStateStore(
        base.states, organization, 'states',
        (row) => resolveOwningOrganization(
            base, row.entity_id, organization,
        ),
    );

    return {
        initialize: () => base.initialize(),
        deleteSchema: () => base.deleteSchema(),
        hasSchema: () => base.hasSchema(),
        postSchemaCreation: () => base.postSchemaCreation(),
        ensureTables: (tables) =>
            base.ensureTables(tables),
        getSnapshot: () => base.getSnapshot(),
        putSnapshot: (json) =>
            base.putSnapshot(json),
        postNotification: (e) => base.postNotification(e),
        // Re-scope the open view to `org` so the fence rides
        // INSIDE the tx: a guard's read and its inner write now
        // run in one transaction, closing the TOCTOU for free.
        transaction: (tables, fn) =>
            base.transaction(
                tables,
                (view) => fn(
                    organizationScopedAdapter(
                        view, organization,
                    ),
                ),
            ),

        // Global survivors — untouched.
        clients: base.clients,
        requests: base.requests,
        responses: base.responses,
        states,
    };
}
