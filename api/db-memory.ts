import {
    EntityNotFound,
    TABLE_NAMES,
} from './db.ts';
import type {
    DbAdapter,
    DeletedStore,
    SingletonStore,
    EntityStore as IEntityStore,
} from './db.ts';
import type {
    Deleted,
    HumanWorkerEntity,
    AIWorkerEntity,
    IdeaEntity,
    ProjectEntity,
    ActivityEntity,
    FlowEntity,
    FlowVersionEntity,
    OrganizationEntity,
    IdeaSubmissionEntity,
    ActivityActorEntity,
    ProjectFlowEntity,
    WorkOrderEntity,
    FlowWorkOrderEntity,
    WorkOrderTransitionEntity,
    TransitionFieldValueEntity,
    WorkOrderClaimEntity,
    Objective,
    ObjectiveRevision,
    DeprecatedObjective,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from './types.ts';
import { nowUtc, type Id } from './types.ts';
import { MemoryStorageBackend }
    from './backend-memory.ts';
import { EntityStore } from './store-entity.ts';
import { HistoryEntityStore }
    from './store-history-entity.ts';

class MemSingletonStore<
    T extends { id: string },
> implements SingletonStore<T>
{
    readonly #table: string;
    readonly #data: Map<string, T> = new Map();

    constructor(table: string) {
        this.#table = table;
    }

    async get(): Promise<T> {
        const all = [...this.#data.values()];
        if (all.length === 0) {
            throw new EntityNotFound(
                this.#table, '<singleton>',
            );
        }
        return all[0]!;
    }

    async put(
        fields: Omit<T, 'id'>,
    ): Promise<T> {
        const existing =
            [...this.#data.values()][0];
        const id = existing?.id ?? 'singleton';
        const next = {
            ...fields, id,
        } as unknown as T;
        this.#data.clear();
        this.#data.set(id, next);
        return next;
    }

    async allRows(): Promise<T[]> {
        return [...this.#data.values()];
    }

    async restore(row: T | undefined): Promise<void> {
        this.#data.clear();
        if (row) {
            this.#data.set(row.id, row);
        }
    }

    async clear(): Promise<void> {
        this.#data.clear();
    }
}

class MemDeletedStore implements DeletedStore {
    readonly #data: Map<string, Deleted> = new Map();

    async isDeleted(id: Id): Promise<boolean> {
        return this.#data.has(id);
    }

    async record(id: Id): Promise<void> {
        this.#data.set(id, {
            id, deleted_at: nowUtc(),
        });
    }

    async allDeletedIds(): Promise<Set<Id>> {
        return new Set(this.#data.keys());
    }

    async allRows(): Promise<Deleted[]> {
        return [...this.#data.values()];
    }

    async restore(rows: readonly Deleted[]): Promise<void> {
        this.#data.clear();
        for (const row of rows) {
            this.#data.set(row.id, row);
        }
    }

    async clear(): Promise<void> {
        this.#data.clear();
    }
}

export class MemoryDbAdapter implements DbAdapter {
    readonly #backend: MemoryStorageBackend;
    readonly #deletedStore: MemDeletedStore;
    readonly #organizationStore:
        MemSingletonStore<OrganizationEntity>;

    readonly workers: IEntityStore<HumanWorkerEntity>;
    readonly aiWorkers: IEntityStore<AIWorkerEntity>;
    readonly ideas: IEntityStore<IdeaEntity>;
    readonly projects: IEntityStore<ProjectEntity>;
    readonly activities: IEntityStore<ActivityEntity>;
    readonly flows: IEntityStore<FlowEntity>;
    readonly flowVersions:
        IEntityStore<FlowVersionEntity>;
    readonly projectFlows:
        IEntityStore<ProjectFlowEntity>;
    readonly workOrders: IEntityStore<WorkOrderEntity>;
    readonly flowWorkOrders:
        IEntityStore<FlowWorkOrderEntity>;
    readonly workOrderTransitions:
        IEntityStore<WorkOrderTransitionEntity>;
    readonly transitionFieldValues:
        IEntityStore<TransitionFieldValueEntity>;
    readonly workOrderClaims:
        IEntityStore<WorkOrderClaimEntity>;
    readonly organization:
        SingletonStore<OrganizationEntity>;
    readonly ideaSubmissions:
        IEntityStore<IdeaSubmissionEntity>;
    readonly activityActors:
        IEntityStore<ActivityActorEntity>;
    readonly objectives: IEntityStore<Objective>;
    readonly objectiveRevisions:
        IEntityStore<ObjectiveRevision>;
    readonly deprecatedObjectives:
        IEntityStore<DeprecatedObjective>;
    readonly projectObjectiveBaselineScores:
        IEntityStore<ProjectObjectiveBaselineScore>;
    readonly projectObjectiveActualScores:
        IEntityStore<ProjectObjectiveActualScore>;
    readonly deleted: DeletedStore;

    constructor() {
        this.#backend = new MemoryStorageBackend();
        this.#deletedStore = new MemDeletedStore();
        this.#organizationStore =
            new MemSingletonStore<OrganizationEntity>(
                'organization',
            );
        this.deleted = this.#deletedStore;
        this.organization = this.#organizationStore;

        const b = this.#backend;
        const ds = this.#deletedStore;
        this.workers =
            new EntityStore('workers', b, ds);
        this.aiWorkers =
            new EntityStore('ai_workers', b, ds);
        this.ideas =
            new EntityStore('ideas', b, ds);
        this.projects =
            new EntityStore('projects', b, ds);
        this.activities =
            new EntityStore('activities', b, ds);
        this.flows =
            new EntityStore('flows', b, ds);
        this.flowVersions =
            new HistoryEntityStore(
                'flow_versions', b,
            );
        this.projectFlows =
            new EntityStore('project_flows', b, ds);
        this.workOrders =
            new EntityStore('work_orders', b, ds);
        this.flowWorkOrders =
            new EntityStore(
                'flow_work_orders', b, ds,
            );
        this.workOrderTransitions =
            new EntityStore(
                'work_order_transitions', b, ds,
            );
        this.transitionFieldValues =
            new EntityStore(
                'transition_field_values', b, ds,
            );
        this.workOrderClaims =
            new EntityStore(
                'work_order_claims', b, ds,
            );
        this.ideaSubmissions =
            new EntityStore(
                'idea_submissions', b, ds,
            );
        this.activityActors =
            new EntityStore(
                'activity_actors', b, ds,
            );
        this.objectives =
            new EntityStore('objectives', b, ds);
        this.objectiveRevisions =
            new HistoryEntityStore(
                'objective_revisions', b,
            );
        this.deprecatedObjectives =
            new HistoryEntityStore(
                'deprecated_objectives', b,
            );
        this.projectObjectiveBaselineScores =
            new HistoryEntityStore(
                'project_objective_baseline_scores',
                b,
            );
        this.projectObjectiveActualScores =
            new HistoryEntityStore(
                'project_objective_actual_scores',
                b,
            );
    }

    async initialize(): Promise<void> {}
    async close(): Promise<void> {}
    async flush(): Promise<void> {}

    async hasSchema(): Promise<boolean> {
        return true;
    }

    async createSchema(): Promise<void> {
    }

    async deleteSchema(): Promise<void> {
        await this.#backend.clearAll();
        await this.#deletedStore.clear();
        await this.#organizationStore.clear();
    }

    async exportSnapshot(): Promise<string> {
        const obj: Record<string, unknown[]> = {};
        for (const table of TABLE_NAMES) {
            if (table === 'organization') {
                obj[table] =
                    await this.#organizationStore
                        .allRows();
            } else if (table === 'deleted') {
                obj[table] =
                    await this.#deletedStore.allRows();
            } else {
                obj[table] =
                    await this.#backend.read(table);
            }
        }
        return JSON.stringify(obj);
    }

    async importSnapshot(json: string): Promise<void> {
        const obj = JSON.parse(json) as
            Record<string, { id: string }[]>;
        await this.deleteSchema();
        for (const table of TABLE_NAMES) {
            const rows = obj[table];
            if (!rows) continue;
            if (table === 'organization') {
                await this.#organizationStore.restore(
                    rows[0] as
                        | OrganizationEntity
                        | undefined,
                );
            } else if (table === 'deleted') {
                await this.#deletedStore.restore(
                    rows as Deleted[],
                );
            } else {
                await this.#backend.write(
                    table, rows,
                );
            }
        }
    }
}
