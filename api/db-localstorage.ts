import { TABLE_NAMES, backendRunner } from './db.ts';
import type {
    DbAdapter,
    DbStores,
    EntityStore as IEntityStore,
    StateStore as IStateStore,
    TxRunner,
} from './db.ts';
import { LocalStorageBackend } from
    './backend-localstorage.ts';
import { EntityStore } from './store-entity.ts';
import { HistoryEntityStore }
    from './store-history-entity.ts';
import { StateStore } from './store-state.ts';
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
import {
    simulateNetworkLatency,
    DEFAULT_LATENCY_CONFIG,
} from './latency.ts';
import {
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
    validateOrganizationEntity,
    validateMembershipEntity,
    validateIdeaSubmissionEntity,
    validateObjectiveEntity,
    validateObjectiveRevisionEntity,
    validateBaselineScoreEntity,
    validateActualScoreEntity,
} from './validators.ts';
import {
    parseAndValidateSnapshot,
} from './snapshot-validator.ts';

export class LocalStorageDbAdapter implements DbAdapter {
    readonly #backend: LocalStorageBackend;

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
        this.#backend = new LocalStorageBackend();
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

    async simulateLatency(): Promise<void> {
        await simulateNetworkLatency(
            DEFAULT_LATENCY_CONFIG,
        );
    }

    async hasSchema(): Promise<boolean> {
        return (await this.#backend.list()).length > 0;
    }

    async createSchema(): Promise<void> {
        const existing = new Set(
            await this.#backend.list(),
        );
        for (const table of TABLE_NAMES) {
            if (!existing.has(table)) {
                await this.#backend.write(table, []);
            }
        }
    }

    async deleteSchema(): Promise<void> {
        await this.#backend.clearAll();
    }

    async exportSnapshot(): Promise<string> {
        const obj: Record<string, unknown[]> = {};
        for (const table of TABLE_NAMES) {
            obj[table] = await this.#backend.read(table);
        }
        return JSON.stringify(obj, null, 2);
    }

    async importSnapshot(json: string): Promise<void> {
        const validated =
            parseAndValidateSnapshot(json);
        await this.#backend.clearAll();
        try {
            for (const [table, rows] of validated) {
                await this.#backend.write(table, rows);
            }
        } catch (err) {
            await this.#backend.clearAll();
            throw err;
        }
    }
}
