// Slice credential-reveal type for the test-plan seeder.

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
