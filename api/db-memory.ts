import { TABLE_NAMES, backendRunner } from './db.ts';
import type {
    DbAdapter,
    DbStores,
    EntityStore as IEntityStore,
    StateStore as IStateStore,
    TxRunner,
} from './db.ts';
import type {
    MemberEntity,
    HumanMemberEntity,
    AIMemberEntity,
    IdentityEntity,
    IdentityPiiEntity,
    IdentityCredentialEntity,
    IdentityTokenRevocationEntity,
    IdentityDefaultOrgEntity,
    RoleGrantEntity,
    IdentityTokenEntity,
    ClientEntity,
    IdentityProviderEntity,
    AuthorizationCodeEntity,
    IdeaEntity,
    ProjectEntity,
    FlowEntity,
    FlowVersionEntity,
    OrganizationEntity,
    MembershipEntity,
    IdeaSubmissionEntity,
    ProjectFlowEntity,
    WorkOrderEntity,
    FlowWorkOrderEntity,
    StateFieldValueEntity,
    RecordEntity,
    RecordAttributeEntity,
    FlowRecordEntity,
    Objective,
    ObjectiveRevision,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from './types.ts';
import { MemoryStorageBackend }
    from './backend-memory.ts';
import {
    parseAndValidateSnapshot,
} from './snapshot-validator.ts';
import { EntityStore } from './store-entity.ts';
import { HistoryEntityStore }
    from './store-history-entity.ts';
import { StateStore } from './store-state.ts';
import {
    validateBaselineScoreEntity,
    validateActualScoreEntity,
    validateMemberEntity,
    validateHumanMemberEntity,
    validateAIMemberEntity,
    validateIdentityEntity,
    validateIdentityPiiEntity,
    validateIdentityCredentialEntity,
    validateIdentityTokenRevocationEntity,
    validateIdentityDefaultOrgEntity,
    validateRoleGrantEntity,
    validateIdentityTokenEntity,
    validateClientEntity,
    validateIdentityProviderEntity,
    validateAuthorizationCodeEntity,
    validateIdeaEntity,
    validateProjectEntity,
    validateFlowEntity,
    validateFlowVersionEntity,
    validateProjectFlowEntity,
    validateWorkOrderEntity,
    validateFlowWorkOrderEntity,
    validateStateFieldValueEntity,
    validateRecordEntity,
    validateRecordAttributeEntity,
    validateFlowRecordEntity,
    validateIdeaSubmissionEntity,
    validateObjectiveEntity,
    validateObjectiveRevisionEntity,
    validateOrganizationEntity,
    validateMembershipEntity,
} from './validators.ts';

export class MemoryDbAdapter implements DbAdapter {
    readonly #backend: MemoryStorageBackend;

    readonly members!: IEntityStore<MemberEntity>;
    readonly humanMembers!:
        IEntityStore<HumanMemberEntity>;
    readonly aiMembers!: IEntityStore<AIMemberEntity>;
    readonly identities!:
        IEntityStore<IdentityEntity>;
    readonly identityPii!:
        IEntityStore<IdentityPiiEntity>;
    readonly identityCredentials!:
        IEntityStore<IdentityCredentialEntity>;
    readonly identityTokenRevocations!:
        IEntityStore<IdentityTokenRevocationEntity>;
    readonly identityDefaultOrgs!:
        IEntityStore<IdentityDefaultOrgEntity>;
    readonly roleGrants!: IEntityStore<RoleGrantEntity>;
    readonly identityTokens!:
        IEntityStore<IdentityTokenEntity>;
    readonly clients!: IEntityStore<ClientEntity>;
    readonly identityProviders!:
        IEntityStore<IdentityProviderEntity>;
    readonly authorizationCodes!:
        IEntityStore<AuthorizationCodeEntity>;
    readonly ideas!: IEntityStore<IdeaEntity>;
    readonly projects!: IEntityStore<ProjectEntity>;
    readonly flows!: IEntityStore<FlowEntity>;
    readonly flowVersions!:
        IEntityStore<FlowVersionEntity>;
    readonly projectFlows!:
        IEntityStore<ProjectFlowEntity>;
    readonly workOrders!: IEntityStore<WorkOrderEntity>;
    readonly flowWorkOrders!:
        IEntityStore<FlowWorkOrderEntity>;
    readonly stateFieldValues!:
        IEntityStore<StateFieldValueEntity>;
    readonly records!:
        IEntityStore<RecordEntity>;
    readonly recordAttributes!:
        IEntityStore<RecordAttributeEntity>;
    readonly flowRecords!:
        IEntityStore<FlowRecordEntity>;
    readonly organizations!:
        IEntityStore<OrganizationEntity>;
    readonly memberships!:
        IEntityStore<MembershipEntity>;
    readonly ideaSubmissions!:
        IEntityStore<IdeaSubmissionEntity>;
    readonly objectives!: IEntityStore<Objective>;
    readonly objectiveRevisions!:
        IEntityStore<ObjectiveRevision>;
    readonly projectObjectiveBaselineScores!:
        IEntityStore<ProjectObjectiveBaselineScore>;
    readonly projectObjectiveActualScores!:
        IEntityStore<ProjectObjectiveActualScore>;
    readonly states!: IStateStore;

    constructor() {
        this.#backend = new MemoryStorageBackend();
        Object.assign(
            this,
            this.#buildStores(
                backendRunner(this.#backend),
            ),
        );
    }

    // The 32-store wiring lives here once. The constructor
    // binds it to the backend; A9's transaction view rebinds
    // the same wiring to an open tx via ambientRunner.
    #buildStores(run: TxRunner): DbStores {
        const stateStore = new StateStore(run, 'states');
        return {
            states: stateStore,
            organizations: new EntityStore(
                'organizations', run, stateStore,
                validateOrganizationEntity,
            ),
            memberships: new EntityStore(
                'memberships', run, stateStore,
                validateMembershipEntity,
            ),
            members: new EntityStore(
                'members', run, stateStore,
                validateMemberEntity,
            ),
            humanMembers: new EntityStore(
                'human_members', run, stateStore,
                validateHumanMemberEntity,
            ),
            aiMembers: new EntityStore(
                'ai_members', run, stateStore,
                validateAIMemberEntity,
            ),
            identities: new EntityStore(
                'identities', run, stateStore,
                validateIdentityEntity,
            ),
            identityPii: new EntityStore(
                'identity_pii', run, stateStore,
                validateIdentityPiiEntity,
            ),
            identityCredentials: new HistoryEntityStore(
                'identity_credentials', run,
                validateIdentityCredentialEntity,
            ),
            identityTokenRevocations: new HistoryEntityStore(
                'identity_token_revocations', run,
                validateIdentityTokenRevocationEntity,
            ),
            identityDefaultOrgs: new HistoryEntityStore(
                'identity_default_orgs', run,
                validateIdentityDefaultOrgEntity,
            ),
            roleGrants: new HistoryEntityStore(
                'role_grants', run,
                validateRoleGrantEntity,
            ),
            identityTokens: new HistoryEntityStore(
                'identity_tokens', run,
                validateIdentityTokenEntity,
            ),
            clients: new EntityStore(
                'clients', run, stateStore,
                validateClientEntity,
            ),
            identityProviders: new HistoryEntityStore(
                'identity_providers', run,
                validateIdentityProviderEntity,
            ),
            authorizationCodes: new HistoryEntityStore(
                'authorization_codes', run,
                validateAuthorizationCodeEntity,
            ),
            ideas: new EntityStore(
                'ideas', run, stateStore,
                validateIdeaEntity,
            ),
            projects: new EntityStore(
                'projects', run, stateStore,
                validateProjectEntity,
            ),
            flows: new EntityStore(
                'flows', run, stateStore,
                validateFlowEntity,
            ),
            flowVersions: new HistoryEntityStore(
                'flow_versions', run,
                validateFlowVersionEntity,
            ),
            projectFlows: new EntityStore(
                'project_flows', run, stateStore,
                validateProjectFlowEntity,
            ),
            workOrders: new EntityStore(
                'work_orders', run, stateStore,
                validateWorkOrderEntity,
            ),
            flowWorkOrders: new EntityStore(
                'flow_work_orders', run, stateStore,
                validateFlowWorkOrderEntity,
            ),
            stateFieldValues: new EntityStore(
                'state_field_values', run, stateStore,
                validateStateFieldValueEntity,
            ),
            records: new EntityStore(
                'records', run, stateStore,
                validateRecordEntity,
            ),
            recordAttributes: new EntityStore(
                'record_attributes', run, stateStore,
                validateRecordAttributeEntity,
            ),
            flowRecords: new EntityStore(
                'flow_records', run, stateStore,
                validateFlowRecordEntity,
            ),
            ideaSubmissions: new EntityStore(
                'idea_submissions', run, stateStore,
                validateIdeaSubmissionEntity,
            ),
            objectives: new EntityStore(
                'objectives', run, stateStore,
                validateObjectiveEntity,
            ),
            objectiveRevisions: new HistoryEntityStore(
                'objective_revisions', run,
                validateObjectiveRevisionEntity,
            ),
            projectObjectiveBaselineScores:
                new HistoryEntityStore(
                    'project_objective_baseline_scores',
                    run,
                    validateBaselineScoreEntity,
                ),
            projectObjectiveActualScores:
                new HistoryEntityStore(
                    'project_objective_actual_scores',
                    run,
                    validateActualScoreEntity,
                ),
        };
    }

    async initialize(): Promise<void> {}
    async close(): Promise<void> {}
    async flush(): Promise<void> {}
    async simulateLatency(): Promise<void> {}

    async hasSchema(): Promise<boolean> {
        return (await this.#backend.list()).length > 0;
    }

    async createSchema(): Promise<void> {
        await this.#backend.ensureTables(TABLE_NAMES);
    }

    async deleteSchema(): Promise<void> {
        await this.#backend.clearAll();
    }

    async exportSnapshot(): Promise<string> {
        const obj = await this.#backend.transaction(
            TABLE_NAMES, 'readonly',
            async (tx) => {
                const out: Record<string, unknown[]> = {};
                for (const table of TABLE_NAMES) {
                    out[table] = await tx.getAll(table);
                }
                return out;
            },
        );
        return JSON.stringify(obj, null, 2);
    }

    async importSnapshot(json: string): Promise<void> {
        // Validators run at the gate, before any storage
        // touch — a bad snapshot throws here, leaving prior
        // data intact. The clear+put then runs in one
        // transaction; a logic error discards the buffer
        // (rollback). The multi-key localStorage flush is
        // still not OS-atomic on a mid-write quota error —
        // the gap the IndexedDB tier (Phase B) closes.
        const validated = parseAndValidateSnapshot(json);
        await this.#backend.ensureTables(TABLE_NAMES);
        await this.#backend.transaction(
            TABLE_NAMES, 'readwrite',
            async (tx) => {
                for (const [table, rows] of validated) {
                    await tx.clear(table);
                    for (const row of rows) {
                        await tx.put(table, row);
                    }
                }
            },
        );
    }
}
