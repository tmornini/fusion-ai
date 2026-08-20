// Slice credential-reveal type for the test-plan seeder.
// AA reuses bootstrap; every other section gets one
// organization plus an admin. B, G, and SV add extra
// identities (G also a second organization). Form pairs
// outside the transaction; write them inside it.

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
    postFlowDocumentOp,
    postAiAgentDocumentOp,
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
    flowOrg2SeedBody,
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
import { buildAiMembers } from
    './mock-data/ai-members.ts';

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

type ExtraIdentity = {
    readonly identityId: string;
    readonly requestAt: string;
    readonly piiBody: Record<string, unknown>;
    readonly identityPair: MessagePair;
    readonly piiPair: MessagePair;
    readonly seatPair?: MessagePair;
};

type ExtraWrites = {
    readonly identities: readonly ExtraIdentity[];
    readonly organizationPair?: MessagePair;
    readonly extraAdminSeat?: {
        readonly identityId: string;
        readonly requestAt: string;
        readonly pair: MessagePair;
    };
    readonly flow?: {
        readonly id: string;
        readonly body: Record<string, unknown>;
        readonly pair: MessagePair;
    };
    readonly ai?: {
        readonly id: string;
        readonly body: Record<string, unknown>;
        readonly pair: MessagePair;
    };
};

async function formExtraIdentity(
    identityId: string,
    name: string,
    email: string,
    requestAt: string,
    seatOrganizationId?: string,
): Promise<ExtraIdentity> {
    const piiBody = tenantAdminPiiBody(name, email);
    const identityPair = await formSeedPair(
        {
            key: seedPairKey(
                'identities/:id', identityId,
            ),
            routePattern: 'identities/:id',
            idParams: [identityId],
            organization: undefined,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: bootstrapCurrentIdentityBody(),
        },
        requestAt,
    );
    const piiPair = await formSeedPair(
        {
            key: seedPairKey(
                'identities/:id/pii', identityId,
            ),
            routePattern: 'identities/:id/pii',
            idParams: [identityId],
            organization: undefined,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: piiBody,
        },
        requestAt,
    );
    if (seatOrganizationId === undefined) {
        return {
            identityId,
            requestAt,
            piiBody,
            identityPair,
            piiPair,
        };
    }
    const seatPair = await formSeedPair(
        {
            key: seedPairKey(
                ORGANIZATION_MEMBER_DETAIL_PATTERN,
                identityId,
            ),
            routePattern:
                ORGANIZATION_MEMBER_DETAIL_PATTERN,
            idParams: [
                seatOrganizationId, identityId,
            ],
            organization: seatOrganizationId,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: seatSeedBody('member', requestAt),
        },
        requestAt,
    );
    return {
        identityId,
        requestAt,
        piiBody,
        identityPair,
        piiPair,
        seatPair,
    };
}

async function formBExtras(
    organizationId: string,
    requestAt: string,
): Promise<ExtraWrites> {
    const identity = await formExtraIdentity(
        'b-member',
        'B Member',
        'b-member@test-plan.example',
        requestAt,
        organizationId,
    );
    const flowBody = {
        ...flowOrg2SeedBody(),
        organization_id: organizationId,
        name: 'B Return Flow',
    };
    const flowPair = await formSeedPair(
        {
            key: seedPairKey('flows/:id', 'b-flow'),
            routePattern:
                'organizations/:id/flows/:id',
            idParams: [organizationId, 'b-flow'],
            organization: organizationId,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: flowBody,
        },
        requestAt,
    );
    return {
        identities: [identity],
        flow: {
            id: 'b-flow',
            body: flowBody,
            pair: flowPair,
        },
    };
}

async function formGExtras(
    organizationId: string,
    adminId: string,
    requestAt: string,
): Promise<ExtraWrites> {
    const secondOrganizationId = 'g-org-2';
    const organizationPair = await formSeedPair(
        {
            key: seedPairKey(
                'organizations/:id',
                secondOrganizationId,
            ),
            routePattern: 'organizations/:id',
            idParams: [secondOrganizationId],
            organization: undefined,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: organizationSeedBody(
                'Wayne Enterprises',
                'g2.test-plan.example',
                daysFromNow(300, 0, 0),
            ),
        },
        requestAt,
    );
    const extraAdminSeatPair = await formSeedPair(
        {
            key: seedPairKey(
                ORGANIZATION_MEMBER_DETAIL_PATTERN,
                adminId + '-1',
            ),
            routePattern:
                ORGANIZATION_MEMBER_DETAIL_PATTERN,
            idParams: [
                secondOrganizationId, adminId,
            ],
            organization: secondOrganizationId,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: seatSeedBody('admin', requestAt),
        },
        requestAt,
    );
    const unseated = await formExtraIdentity(
        'g-unseated',
        'G Unseated',
        'g-unseated@test-plan.example',
        requestAt,
    );
    const member = await formExtraIdentity(
        'g-member',
        'G Member',
        'g-member@test-plan.example',
        requestAt,
        organizationId,
    );
    const firstAi = buildAiMembers()[0]!;
    const aiBody: Record<string, unknown> = {
        name: firstAi.name,
        description: firstAi.description,
        skill_focus: firstAi.skill_focus,
        model: firstAi.model,
    };
    const aiPair = await formSeedPair(
        {
            key: seedPairKey('ai-agents/:id', 'g-ai'),
            routePattern: 'ai-agents/:id',
            idParams: ['g-ai'],
            organization: undefined,
            requesterIdentityId: SYSTEM_MEMBER_ID,
            body: aiBody,
        },
        requestAt,
    );
    return {
        identities: [unseated, member],
        organizationPair,
        extraAdminSeat: {
            identityId: adminId,
            requestAt,
            pair: extraAdminSeatPair,
        },
        ai: {
            id: 'g-ai',
            body: aiBody,
            pair: aiPair,
        },
    };
}

async function formSvExtras(
    organizationId: string,
    requestAt: string,
): Promise<ExtraWrites> {
    const identity = await formExtraIdentity(
        'sv-member',
        'SV Member',
        'sv-member@test-plan.example',
        requestAt,
        organizationId,
    );
    return { identities: [identity] };
}

async function writeExtraIdentity(
    adapter: DbAdapter,
    formed: ExtraIdentity,
): Promise<void> {
    const writes: Promise<unknown>[] = [
        postIdentityDocumentOp(
            adapter,
            formed.identityId,
            bootstrapCurrentIdentityBody(),
            SYSTEM_MEMBER_ID,
            formed.identityPair,
        ),
        postIdentityPiiDocumentOp(
            adapter,
            formed.identityId,
            formed.piiBody,
            SYSTEM_MEMBER_ID,
            formed.piiPair,
        ),
    ];
    if (formed.seatPair !== undefined) {
        writes.push(postMembershipDocumentOp(
            adapter,
            formed.identityId,
            seatSeedBody('member', formed.requestAt),
            SYSTEM_MEMBER_ID,
            formed.seatPair,
        ));
    }
    await Promise.all(writes);
}

async function writeExtras(
    adapter: DbAdapter,
    extras: ExtraWrites,
): Promise<void> {
    const writes: Promise<unknown>[] =
        extras.identities.map((identity) =>
            writeExtraIdentity(adapter, identity),
        );
    if (extras.organizationPair !== undefined) {
        writes.push(appendMessagePair(
            adapter, extras.organizationPair,
        ));
    }
    if (extras.extraAdminSeat !== undefined) {
        writes.push(postMembershipDocumentOp(
            adapter,
            extras.extraAdminSeat.identityId,
            seatSeedBody(
                'admin',
                extras.extraAdminSeat.requestAt,
            ),
            SYSTEM_MEMBER_ID,
            extras.extraAdminSeat.pair,
        ));
    }
    if (extras.flow !== undefined) {
        writes.push(postFlowDocumentOp(
            adapter,
            extras.flow.id,
            extras.flow.body,
            SYSTEM_MEMBER_ID,
            extras.flow.pair,
        ));
    }
    if (extras.ai !== undefined) {
        writes.push(postAiAgentDocumentOp(
            adapter,
            extras.ai.id,
            extras.ai.body,
            SYSTEM_MEMBER_ID,
            extras.ai.pair,
        ));
    }
    await Promise.all(writes);
}

function passwordFor(
    passwords: Map<string, string>,
    username: string | undefined,
): string | undefined {
    if (username === undefined) {
        return undefined;
    }
    const password = passwords.get(username);
    if (password === undefined) {
        throw new Error(
            'seed formed no password for '
                + username,
        );
    }
    return password;
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
        return {
            ...row,
            adminPassword,
            seatPassword: passwordFor(
                passwords, row.seatUsername,
            ),
            unseatedPassword: passwordFor(
                passwords, row.unseatedUsername,
            ),
            memberPassword: passwordFor(
                passwords, row.memberUsername,
            ),
        };
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
    const extras: ExtraWrites[] = [];
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
        let reveal: TestPlanSliceReveal = {
            section,
            organizationId: slice.organizationId,
            organizationName: STARK_NAME,
            adminUsername: slice.email,
            adminPassword: '',
        };
        if (section === 'B') {
            extras.push(await formBExtras(
                slice.organizationId, requestAt,
            ));
            recipients.push({
                identityId: 'b-member',
                email:
                    'b-member@test-plan.example',
            });
            reveal = {
                ...reveal,
                seatUsername:
                    'b-member@test-plan.example',
                seatPassword: '',
                flowId: 'b-flow',
            };
        } else if (section === 'G') {
            extras.push(await formGExtras(
                slice.organizationId,
                slice.adminId,
                requestAt,
            ));
            recipients.push({
                identityId: 'g-unseated',
                email:
                    'g-unseated@test-plan.example',
            });
            recipients.push({
                identityId: 'g-member',
                email:
                    'g-member@test-plan.example',
            });
            reveal = {
                ...reveal,
                secondOrganizationId: 'g-org-2',
                secondOrganizationName:
                    'Wayne Enterprises',
                unseatedUsername:
                    'g-unseated@test-plan.example',
                unseatedPassword: '',
                memberUsername:
                    'g-member@test-plan.example',
                memberPassword: '',
            };
        } else if (section === 'SV') {
            extras.push(await formSvExtras(
                slice.organizationId, requestAt,
            ));
            recipients.push({
                identityId: 'sv-member',
                email:
                    'sv-member@test-plan.example',
            });
            reveal = {
                ...reveal,
                seatUsername:
                    'sv-member@test-plan.example',
                seatPassword: '',
            };
        }
        reveals.push(reveal);
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
            await Promise.all(
                extras.map((extra) =>
                    writeExtras(view, extra),
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
