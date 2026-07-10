import { EntityNotFoundError } from './db.ts';
import type {
    DbAdapter,
    GuardedDbAdapter,
    GuardedEntityStore,
} from './db.ts';
import type {
    Id,
    FlowWorkOrderEntity,
    FlowRecordEntity,
    ObjectiveRevisionEntity,
    StateFieldValueEntity,
    IdentityPiiEntity,
    IdentityCredentialEntity,
} from './types.ts';
import {
    OrganizationScopedEntityStore,
    type OrganizationScoped,
} from './store-organization-scoped.ts';
import {
    ParentScopedEntityStore,
    ParentScopedStateStore,
    viaParent,
    viaMembership,
    type OwningOrganizationResolver,
} from './store-parent-scoped.ts';
import { resolveOwningOrganization } from './derive-states.ts';
import { deriveMembershipsForIdentity } from
    './derive-memberships.ts';

// Wrap `base` in an org-scoped view. The org-owned entity
// stores fence by their stamped organization_id; the
// parent-derived rows (junctions, ledgers, the states log, the
// identity PII/credential facets) fence by DERIVING their
// owning org from a parent / the membership ledger at READ time
// (`api/store-parent-scoped.ts`); only the global identity/auth
// spine and the organizations directory pass straight through,
// with route guards fencing the directory and credential
// secrets. The scoped set is enumerated explicitly — no
// reflective "wrap everything" — so it stays reviewable, and a
// newly added store is global until deliberately fenced.
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
    const scope = <T extends OrganizationScoped>(
        inner: GuardedEntityStore<T>,
        table: string,
    ): OrganizationScopedEntityStore<T> =>
        new OrganizationScopedEntityStore(
            inner, organization, table,
        );

    const parentScope = <T extends { id: string }>(
        inner: GuardedEntityStore<T>,
        table: string,
        resolver: OwningOrganizationResolver<T>,
    ): ParentScopedEntityStore<T> =>
        new ParentScopedEntityStore(
            inner, organization, table, resolver,
        );

    // Pair-plane membership reader for identity facet fences
    // (Phase 15 Task 5): same three-way viaMembership algorithm,
    // sourced from deriveMembershipsForIdentity rather than the
    // row-plane identity_id index.
    const membershipsFromPairPlane = {
        getAllWhere: async (
            column: string,
            key: string,
        ) => {
            if (column !== 'identity_id') {
                throw new Error(
                    'membershipsFromPairPlane supports only'
                    + ' identity_id',
                );
            }
            return deriveMembershipsForIdentity(base, key);
        },
    };

    // A state event's entity_id is any org-owned entity, or an
    // org-less member visible only to a co-member of this org —
    // resolved on the PAIR PLANE (Phase 15 Task 5).
    const states = new ParentScopedStateStore(
        base.states, organization, 'states',
        (row) => resolveOwningOrganization(
            base, row.entity_id, organization,
        ),
    );

    // state_field_values pin to a parent state event — owned by
    // whatever owns that event. Phase Final Stage B: flow graph
    // tables retired; ownership is pair-plane only.
    const stateFieldValues = parentScope(
        base.stateFieldValues, 'state_field_values',
        async (row: StateFieldValueEntity) => {
            let ev;
            try {
                ev = await base.states.getById(
                    row.state_event_id);
            } catch (e) {
                if (e instanceof EntityNotFoundError) {
                    return null;
                }
                throw e;
            }
            return resolveOwningOrganization(
                base, ev.entity_id, organization,
            );
        },
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

        // Global identity/auth spine — untouched.
        members: base.members,
        humanMembers: base.humanMembers,
        aiMembers: base.aiMembers,
        identities: base.identities,
        identityTokenRevocations:
            base.identityTokenRevocations,
        identityDefaultOrganizations:
            base.identityDefaultOrganizations,
        clients: base.clients,
        identityProviders: base.identityProviders,

        // The organizations directory is global; the
        // organizations/:id and GET /organizations route guards
        // fence it to the caller's memberships.
        organizations: base.organizations,

        // Invitations are global-spine: the invitee must read an
        // invitation to an org they are NOT yet in, which an org
        // fence would hide. The dedicated invitation routes fence
        // by the caller's identity (invitee) or admin role
        // (inviter) instead.
        invitations: base.invitations,

        // The message plane (requests/responses) is the global
        // substrate the migration rides on: tenancy lives IN
        // `uri_prefix`, enforced at the route gate, not by an
        // organization_id column — so both pass through
        // unwrapped, like the identity/auth spine above.
        requests: base.requests,
        responses: base.responses,

        // Identity PII / credential facets — visible to the
        // caller's org only for co-members (need-to-know),
        // derived from the membership PAIR plane. Credentials
        // also get `secret` projected out at the route.
        identityPii: parentScope(
            base.identityPii, 'identity_pii',
            viaMembership(
                membershipsFromPairPlane,
                (r: IdentityPiiEntity) => r.id,
                organization,
            ),
        ),
        identityCredentials: parentScope(
            base.identityCredentials, 'identity_credentials',
            viaMembership(
                membershipsFromPairPlane,
                (r: IdentityCredentialEntity) =>
                    r.identity_id,
                organization,
            ),
        ),

        // Parent-derived leaves still on residual tables until
        // their own Stage B groups. flow_work_orders /
        // flow_records resolve the parent flow via the pair
        // plane (flows table retired this group).
        flowWorkOrders: parentScope(
            base.flowWorkOrders, 'flow_work_orders',
            (r: FlowWorkOrderEntity) =>
                resolveOwningOrganization(
                    base, r.flow_id, organization,
                ),
        ),
        flowRecords: parentScope(
            base.flowRecords, 'flow_records',
            (r: FlowRecordEntity) =>
                resolveOwningOrganization(
                    base, r.flow_id, organization,
                ),
        ),
        objectiveRevisions: parentScope(
            base.objectiveRevisions, 'objective_revisions',
            viaParent(
                base.objectives,
                (r: ObjectiveRevisionEntity) =>
                    r.objective_id,
            ),
        ),
        states,
        stateFieldValues,

        // Organization-owned entities — fenced to `org`.
        roleGrants: scope(base.roleGrants, 'role_grants'),
        workOrders: scope(base.workOrders, 'work_orders'),
        records: scope(base.records, 'records'),
        recordAttributes: scope(
            base.recordAttributes, 'record_attributes'),
        objectives: scope(base.objectives, 'objectives'),
        memberships: scope(base.memberships, 'memberships'),
    };
}
