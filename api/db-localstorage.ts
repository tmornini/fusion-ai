import { TABLE_NAMES } from './db.ts';
import type { DbAdapter } from './db.ts';
import { LocalStorageBackend } from
    './backend-localstorage.ts';
import { EntityStore } from './store-entity.ts';
import { HistoryEntityStore }
    from './store-history-entity.ts';
import { SingletonStore } from './store-singleton.ts';
import { StateStore } from './store-state.ts';
import type {
    HumanWorkerEntity,
    AIWorkerEntity,
    IdeaEntity,
    ProjectEntity,
    FlowEntity,
    FlowVersionEntity,
    OrganizationEntity,
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
    validateHumanWorkerEntity,
    validateAIWorkerEntity,
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
    validateIdeaSubmissionEntity,
    validateObjectiveEntity,
    validateObjectiveRevisionEntity,
    validateBaselineScoreEntity,
    validateActualScoreEntity,
} from './validators.ts';
import {
    parseAndValidateSnapshot,
} from './snapshot-validator.ts';

export async function createLocalStorageAdapter(
): Promise<DbAdapter> {
    const backend = new LocalStorageBackend();
    const stateStore = new StateStore(backend, 'states');

    const adapter: DbAdapter = {
        async initialize(): Promise<void> {},
        async close(): Promise<void> {},
        async flush(): Promise<void> {},

        simulateLatency: () =>
            simulateNetworkLatency(
                DEFAULT_LATENCY_CONFIG,
            ),

        async deleteSchema(): Promise<void> {
            await backend.clearAll();
        },

        async hasSchema(): Promise<boolean> {
            return (await backend.list()).length > 0;
        },

        async createSchema(): Promise<void> {
            const existing = new Set(
                await backend.list(),
            );
            for (const table of TABLE_NAMES) {
                if (!existing.has(table)) {
                    await backend.write(table, []);
                }
            }
        },

        async exportSnapshot(): Promise<string> {
            const obj: Record<string, unknown[]> = {};
            for (const table of TABLE_NAMES) {
                obj[table] = await backend.read(table);
            }
            return JSON.stringify(obj, null, 2);
        },

        async importSnapshot(
            json: string,
        ): Promise<void> {
            const validated =
                parseAndValidateSnapshot(json);
            await backend.clearAll();
            try {
                for (const [
                    table, rows,
                ] of validated) {
                    await backend.write(table, rows);
                }
            } catch (err) {
                await backend.clearAll();
                throw err;
            }
        },

        workers: new EntityStore<HumanWorkerEntity>(
            'workers', backend, stateStore,
            validateHumanWorkerEntity,
        ),
        aiWorkers: new EntityStore<AIWorkerEntity>(
            'ai_workers', backend, stateStore,
            validateAIWorkerEntity,
        ),
        ideas: new EntityStore<IdeaEntity>(
            'ideas', backend, stateStore,
            validateIdeaEntity,
        ),
        projects: new EntityStore<ProjectEntity>(
            'projects', backend, stateStore,
            validateProjectEntity,
        ),
        flows: new EntityStore<FlowEntity>(
            'flows', backend, stateStore,
            validateFlowEntity,
        ),
        flowVersions:
            new HistoryEntityStore<FlowVersionEntity>(
                'flow_versions', backend,
                validateFlowVersionEntity,
            ),
        projectFlows:
            new EntityStore<ProjectFlowEntity>(
                'project_flows', backend, stateStore,
                validateProjectFlowEntity,
            ),
        workOrders: new EntityStore<WorkOrderEntity>(
            'work_orders', backend, stateStore,
            validateWorkOrderEntity,
        ),
        flowWorkOrders:
            new EntityStore<FlowWorkOrderEntity>(
                'flow_work_orders',
                backend, stateStore,
                validateFlowWorkOrderEntity,
            ),
        stateFieldValues:
            new EntityStore<StateFieldValueEntity>(
                'state_field_values',
                backend, stateStore,
                validateStateFieldValueEntity,
            ),
        records:
            new EntityStore<RecordEntity>(
                'records', backend, stateStore,
                validateRecordEntity,
            ),
        recordAttributes:
            new EntityStore<RecordAttributeEntity>(
                'record_attributes',
                backend, stateStore,
                validateRecordAttributeEntity,
            ),
        flowRecords:
            new EntityStore<FlowRecordEntity>(
                'flow_records',
                backend, stateStore,
                validateFlowRecordEntity,
            ),
        organization:
            new SingletonStore<OrganizationEntity>(
                'organization', backend,
            ),
        ideaSubmissions:
            new EntityStore<IdeaSubmissionEntity>(
                'idea_submissions',
                backend, stateStore,
                validateIdeaSubmissionEntity,
            ),
        objectives: new EntityStore<Objective>(
            'objectives', backend, stateStore,
            validateObjectiveEntity,
        ),
        objectiveRevisions:
            new HistoryEntityStore<ObjectiveRevision>(
                'objective_revisions', backend,
                validateObjectiveRevisionEntity,
            ),
        projectObjectiveBaselineScores:
            new HistoryEntityStore<
                ProjectObjectiveBaselineScore
            >(
                'project_objective_baseline_scores',
                backend,
                validateBaselineScoreEntity,
            ),
        projectObjectiveActualScores:
            new HistoryEntityStore<
                ProjectObjectiveActualScore
            >(
                'project_objective_actual_scores',
                backend,
                validateActualScoreEntity,
            ),
        states: stateStore,
    };

    return adapter;
}
