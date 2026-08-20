// Slice credential-reveal type for the test-plan seeder.
// AA reuses bootstrap; every other section gets one
// organization plus an admin. Form pairs outside the
// transaction; write them inside it.

import {
    TABLE_NAMES,
    type DbAdapter,
} from './db.ts';
import { nowUtc, SYSTEM_MEMBER_ID } from
    './types.ts';
import {
    postIdentityDocumentOp,
    postIdentityPiiDocumentOp,
    postMembershipDocumentOp,
} from './routes.ts';
import type { MessagePair } from
    './message-pair.ts';
import { appendMessagePair } from
    './message-pair.ts';
import {
    formBootstrapMessagePair,
    formDefaultOrganizationSeedPair,
    formSeedPair,
    seedPairKey,
    organizationSeedBody,
    seatSeedBody,
    bootstrapCurrentIdentityBody,
} from './mock-data/seed-message-pairs.ts';
import { daysFromNow } from
    './mock-data/seed-kit.ts';
import { STARK_ORGANIZATION } from
    './mock-data/seed-constants.ts';
import {
    postBootstrapIn,
    seedHumanCredentials,
    type SeededCredentials,
} from './mock-data.ts';
import { ORGANIZATION_MEMBER_DETAIL_PATTERN }
    from './family-registry.ts';

export type TestPlanSliceReveal = {
    readonly section: string;
    readonly organizationId: string;
    readonly organizationName: string;
    readonly adminUsername: string;
    readonly adminPassword: string;
    readonly secondOrganizationId?: string;
    readonly secondOrganizationName?: string;
    readonly seatUsername?: string;
    readonly seatPassword?: string;
    readonly unseatedUsername?: string;
    readonly unseatedPassword?: string;
    readonly memberUsername?: string;
    readonly memberPassword?: string;
    readonly flowId?: string;
};

export const PARALLEL_SECTIONS = [
    'AA', 'B', 'C', 'D', 'E', 'F', 'F2',
    'FS', 'G', 'H', 'I', 'K', 'R', 'SV',
] as const;

export type ParallelSection =
    typeof PARALLEL_SECTIONS[number];

export function sectionToken(
    section: ParallelSection,
): string {
    return section.toLowerCase();
}

type Hasher = (
    plaintext: string,
) => Promise<string>;

const STARK_NAME = 'Stark Industries';

type TenantAdminPairs = {
    readonly organizationId: string;
    readonly adminId: string;
    readonly email: string;
    readonly requestAt: string;
    readonly piiBody: Record<string, unknown>;
    readonly organizationPair: MessagePair;
    readonly identityPair: MessagePair;
    readonly piiPair: MessagePair;
    readonly seatPair: MessagePair;
    readonly defaultOrganizationPair: MessagePair;
};

function tenantAdminPiiBody(
    name: string,
    email: string,
): Record<string, unknown> {
    return {
        name,
        email,
        phone: '+1 (555) 000-0000',
        bio: 'Test-plan section admin.',
    };
}

async function formTenantAdminPairs(
    section: ParallelSection,
    requestAt: string,
): Promise<TenantAdminPairs> {
    const token = sectionToken(section);
    const organizationId = token + '-org';
    const adminId = token + '-admin';
    const email = token
        + '-admin@test-plan.example';
    const piiBody = tenantAdminPiiBody(
        section + ' Admin',
        email,
    );
    const organizationPair = await formSeedPair(
        {
            key: seedPairKey(
                'organizations/:id',
                organizationId,
            ),
            routePattern: 'organizations/:id',
            idParams: [organizationId],
            organization: undefined,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: organizationSeedBody(
                STARK_NAME,
                token + '.test-plan.example',
                daysFromNow(300, 0, 0),
            ),
        },
        requestAt,
    );
    const identityPair = await formSeedPair(
        {
            key: seedPairKey(
                'identities/:id', adminId,
            ),
            routePattern: 'identities/:id',
            idParams: [adminId],
            organization: undefined,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: bootstrapCurrentIdentityBody(),
        },
        requestAt,
    );
    const piiPair = await formSeedPair(
        {
            key: seedPairKey(
                'identities/:id/pii', adminId,
            ),
            routePattern: 'identities/:id/pii',
            idParams: [adminId],
            organization: undefined,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: piiBody,
        },
        requestAt,
    );
    const seatPair = await formSeedPair(
        {
            key: seedPairKey(
                ORGANIZATION_MEMBER_DETAIL_PATTERN,
                adminId,
            ),
            routePattern:
                ORGANIZATION_MEMBER_DETAIL_PATTERN,
            idParams: [organizationId, adminId],
            organization: organizationId,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: seatSeedBody('admin', requestAt),
        },
        requestAt,
    );
    const defaultOrganizationPair =
        await formDefaultOrganizationSeedPair(
            adminId, organizationId, requestAt,
        );
    return {
        organizationId,
        adminId,
        email,
        requestAt,
        piiBody,
        organizationPair,
        identityPair,
        piiPair,
        seatPair,
        defaultOrganizationPair,
    };
}

async function writeTenantAdmin(
    adapter: DbAdapter,
    formed: TenantAdminPairs,
): Promise<void> {
    await Promise.all([
        appendMessagePair(
            adapter, formed.organizationPair,
        ),
        postIdentityDocumentOp(
            adapter,
            formed.adminId,
            bootstrapCurrentIdentityBody(),
            SYSTEM_MEMBER_ID,
            formed.identityPair,
        ),
        postIdentityPiiDocumentOp(
            adapter,
            formed.adminId,
            formed.piiBody,
            SYSTEM_MEMBER_ID,
            formed.piiPair,
        ),
        postMembershipDocumentOp(
            adapter,
            formed.adminId,
            seatSeedBody(
                'admin', formed.requestAt,
            ),
            SYSTEM_MEMBER_ID,
            formed.seatPair,
        ),
        appendMessagePair(
            adapter,
            formed.defaultOrganizationPair,
        ),
    ]);
}

function fillPasswords(
    reveals: readonly TestPlanSliceReveal[],
    creds: SeededCredentials,
): TestPlanSliceReveal[] {
    const passwords = new Map<string, string>();
    for (const identity of creds.identities) {
        passwords.set(
            identity.username, identity.password,
        );
    }
    return reveals.map((row) => {
        const adminPassword = passwords.get(
            row.adminUsername,
        );
        if (adminPassword === undefined) {
            throw new Error(
                'seed formed no password for '
                    + row.adminUsername,
            );
        }
        return { ...row, adminPassword };
    });
}

export async function postTestPlanSlices(
    adapter: DbAdapter,
    options?: { readonly hashPassword?: Hasher },
): Promise<readonly TestPlanSliceReveal[]> {
    const requestAt = nowUtc();
    await adapter.ensureTables(TABLE_NAMES);
    const bootstrap =
        await formBootstrapMessagePair(
            requestAt,
        );
    const recipients: Array<{
        readonly identityId: string;
        readonly email: string;
    }> = [{
        identityId: 'current',
        email: 'demo@example.com',
    }];
    const reveals: TestPlanSliceReveal[] = [{
        section: 'AA',
        organizationId: STARK_ORGANIZATION,
        organizationName: STARK_NAME,
        adminUsername: 'demo@example.com',
        adminPassword: '',
    }];
    const formed: TenantAdminPairs[] = [];
    for (const section of PARALLEL_SECTIONS) {
        if (section === 'AA') continue;
        const slice = await formTenantAdminPairs(
            section, requestAt,
        );
        formed.push(slice);
        recipients.push({
            identityId: slice.adminId,
            email: slice.email,
        });
        reveals.push({
            section,
            organizationId: slice.organizationId,
            organizationName: STARK_NAME,
            adminUsername: slice.email,
            adminPassword: '',
        });
    }
    await adapter.transaction(
        TABLE_NAMES,
        async (view) => {
            await postBootstrapIn(
                view,
                bootstrap.identityPair,
                bootstrap.seatPair,
                bootstrap.piiPair,
                bootstrap.systemIdentityPair,
                bootstrap.defaultOrganizationPair,
                bootstrap.organizationPair,
            );
            await Promise.all(
                formed.map((slice) =>
                    writeTenantAdmin(view, slice),
                ),
            );
        },
    );
    const creds = await seedHumanCredentials(
        adapter,
        recipients,
        options?.hashPassword,
    );
    const filled = fillPasswords(reveals, creds);
    await adapter.postSchemaCreation();
    return filled;
}
