import type { DbAdapter } from '../api/db.ts';
import { nowUtc, SYSTEM_MEMBER_ID, type Id } from '../api/types.ts';
import {
    postMembershipDocumentOp,
    postRoleGrantDocumentOp,
    WRITE_RESPONSE_SPECS,
} from '../api/routes.ts';
import {
    formWritePair,
    type MessagePair,
} from '../api/message-pair.ts';

// Below-facade pair formation for the two seeded writes below
// (Phase 13 Task 1's blocking prerequisite): every row rides the
// SAME exported api/routes.ts op a live PUT would, with a pair
// formed from the SAME WRITE_RESPONSE_SPECS entry — the
// tests/member-fixtures.ts idiom (membershipDocumentPair),
// mirrored here rather than imported (that helper stays private
// to its own file; this fixture's id shapes differ). Every id and
// field value stays IDENTICAL to the raw puts these replace —
// only the write MECHANISM changes, so a role_grants/memberships
// read that flips onto the pair plane still finds the root admin.
const ROOT_ADMIN_ORGANIZATION: Id = '1';

async function membershipDocumentPair(
    membershipId: Id,
    body: Record<string, unknown>,
    requestAt: string,
): Promise<MessagePair> {
    const spec = WRITE_RESPONSE_SPECS['memberships/:id'];
    if (spec === undefined || !('status' in spec)) {
        throw new Error(
            'no per-write response spec for memberships/:id',
        );
    }
    return formWritePair({
        method: 'PUT',
        pathname: `/memberships/${membershipId}`,
        routePattern: 'memberships/:id',
        routeSegments: ['memberships', ':id'],
        pathSegments: ['memberships', membershipId],
        headerFields: [],
        body,
        requesterIdentityId: SYSTEM_MEMBER_ID,
        requestAt,
        organization: ROOT_ADMIN_ORGANIZATION,
        responseStatus: spec.status,
        responseBody: spec.successBody?.(
            [membershipId], body, SYSTEM_MEMBER_ID,
            ROOT_ADMIN_ORGANIZATION,
        ),
        headPairId: undefined,
    });
}

// The role-grants twin of membershipDocumentPair above — does
// not exist anywhere yet (Phase 13 Task 1's own NEW helper). The
// role-grants/:id response spec's successBody re-derives
// organization_id from the gate-16 fence stamp (its own comment,
// api/routes.ts), so this fixture must supply the SAME
// organization ('1', never undefined) both to formWritePair's own
// `organization` field and as the successBody argument, exactly
// as a live PUT role-grants/:id would through the gate.
async function roleGrantDocumentPair(
    roleGrantId: Id,
    body: Record<string, unknown>,
    requestAt: string,
): Promise<MessagePair> {
    const spec = WRITE_RESPONSE_SPECS['role-grants/:id'];
    if (spec === undefined || !('status' in spec)) {
        throw new Error(
            'no per-write response spec for role-grants/:id',
        );
    }
    return formWritePair({
        method: 'PUT',
        pathname: `/role-grants/${roleGrantId}`,
        routePattern: 'role-grants/:id',
        routeSegments: ['role-grants', ':id'],
        pathSegments: ['role-grants', roleGrantId],
        headerFields: [],
        body,
        requesterIdentityId: SYSTEM_MEMBER_ID,
        requestAt,
        organization: ROOT_ADMIN_ORGANIZATION,
        responseStatus: spec.status,
        responseBody: spec.successBody?.(
            [roleGrantId], body, SYSTEM_MEMBER_ID,
            ROOT_ADMIN_ORGANIZATION,
        ),
        headPairId: undefined,
    });
}

// Seed the demo `current` identity as a root admin directly at
// the storage layer (below the gate): the admin role grant AND
// the org membership the gate now resolves the request's org
// from. Both are needed — an admin of an org is a member of it —
// so a test driving the gate as `current` (devToken) resolves
// to an org and passes deny-by-default. Mirrors how the
// bootstrap/mock-data seeds plant the root admin. Both rows now
// form their message pair via the SAME exported ops the live PUT
// routes use, so a role_grants/memberships read that derives from
// the pair plane (this phase's blocking prerequisite) still finds
// the root admin — every id/field value stays IDENTICAL to the
// raw puts this replaces.
export async function seedRootAdmin(
    db: DbAdapter,
): Promise<void> {
    const requestAt = nowUtc();
    const roleGrantId = 'test-role-current-admin';
    const roleGrantBody = {
        organization_id: '1',
        identity_id: 'current',
        role: 'admin',
        action: 'granted',
        by_member_id: 'system',
        at: '2020-01-01T00:00:00.000000Z',
    };
    await postRoleGrantDocumentOp(
        db, roleGrantId, roleGrantBody, SYSTEM_MEMBER_ID,
        await roleGrantDocumentPair(
            roleGrantId, roleGrantBody, requestAt,
        ),
    );
    const membershipId = 'test-membership-current';
    const membershipBody = {
        organization_id: '1',
        identity_id: 'current',
        at: '2020-01-01T00:00:00.000000Z',
    };
    await postMembershipDocumentOp(
        db, membershipId, membershipBody, SYSTEM_MEMBER_ID,
        await membershipDocumentPair(
            membershipId, membershipBody, requestAt,
        ),
    );
}

// Seed an identity as a plain content-tier member of org '1':
// the member role grant AND the membership the gate resolves
// the org and liveness from. The member-tier counterpart of
// seedRootAdmin above — the SAME pair-forming mechanism, every
// id/field value IDENTICAL to the raw puts this replaces.
export async function seedOrganizationMember(
    db: DbAdapter,
    identityId: string,
): Promise<void> {
    const requestAt = nowUtc();
    const roleGrantId = 'test-role-' + identityId + '-member';
    const roleGrantBody = {
        organization_id: '1',
        identity_id: identityId,
        role: 'member',
        action: 'granted',
        by_member_id: 'system',
        at: '2020-01-01T00:00:00.000000Z',
    };
    await postRoleGrantDocumentOp(
        db, roleGrantId, roleGrantBody, SYSTEM_MEMBER_ID,
        await roleGrantDocumentPair(
            roleGrantId, roleGrantBody, requestAt,
        ),
    );
    const membershipId = 'test-membership-' + identityId;
    const membershipBody = {
        organization_id: '1',
        identity_id: identityId,
        at: '2020-01-01T00:00:00.000000Z',
    };
    await postMembershipDocumentOp(
        db, membershipId, membershipBody, SYSTEM_MEMBER_ID,
        await membershipDocumentPair(
            membershipId, membershipBody, requestAt,
        ),
    );
}
