// ============================================
// FUSION AI — localStorage Database Implementation
// Pure localStorage with JSON serialization.
// Works on file:/// and http(s):// protocols.
// ============================================

import type { DbAdapter, EntityStore, SingletonStore } from './db';
import type {
  UserEntity, IdeaEntity, IdeaScoreEntity, ProjectEntity, ProjectTeamEntity,
  MilestoneEntity, ProjectTaskEntity, DiscussionEntity, ProjectVersionEntity,
  EdgeEntity, EdgeOutcomeEntity, EdgeMetricEntity, ActivityEntity, NotificationEntity,
  ClarificationEntity, CrunchColumnEntity, ProcessEntity, ProcessStepEntity,
  CompanySettingsEntity, NotificationCategoryEntity, NotificationPrefEntity,
  AccountEntity,
} from './types';

const KEY_PREFIX = 'fusion-ai:';

// ── Helpers ────────────────────────────────

function readTable<T>(tableName: string): T[] {
  const raw = localStorage.getItem(KEY_PREFIX + tableName);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`fusion-ai: table "${tableName}" is not an array, resetting.`);
      return [];
    }
    return parsed as T[];
  } catch {
    console.warn(`fusion-ai: table "${tableName}" has corrupt JSON, resetting.`);
    return [];
  }
}

function writeTable<T>(tableName: string, rows: T[]): void {
  localStorage.setItem(KEY_PREFIX + tableName, JSON.stringify(rows));
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function serializeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = serializeValue(value);
  }
  return result;
}

// ── Generic store factories ──────────────

function makeEntityStore<T extends { id: string }>(tableName: string): EntityStore<T> {
  return {
    async getAll(): Promise<T[]> {
      return readTable<T>(tableName);
    },
    async getById(id: string): Promise<T | null> {
      const rows = readTable<T>(tableName);
      return rows.find(row => row.id === id) ?? null;
    },
    async put(id: string, data: Record<string, unknown>): Promise<T> {
      const rows = readTable<T>(tableName);
      const idx = rows.findIndex(row => row.id === id);
      const serialized = serializeRecord(data);

      if (idx >= 0) {
        rows[idx] = { ...rows[idx]!, ...serialized, id } as T;
      } else {
        rows.push({ id, ...serialized } as T);
      }

      writeTable(tableName, rows);
      return rows[idx >= 0 ? idx : rows.length - 1]!;
    },
    async delete(id: string): Promise<void> {
      const rows = readTable<T>(tableName);
      writeTable(tableName, rows.filter(row => row.id !== id));
    },
  };
}

function makeSingletonStore<T extends { id: string }>(tableName: string): SingletonStore<T> {
  return {
    async get(): Promise<T> {
      const rows = readTable<T>(tableName);
      const row = rows.find(row => row.id === '1');
      if (row) return row;
      const defaultRow = { id: '1' } as T;
      writeTable(tableName, [defaultRow]);
      return defaultRow;
    },
    async put(data: Record<string, unknown>): Promise<T> {
      const rows = readTable<T>(tableName);
      const serialized = serializeRecord(data);
      const idx = rows.findIndex(row => row.id === '1');

      if (idx >= 0) {
        rows[idx] = { ...rows[idx]!, ...serialized, id: '1' } as T;
      } else {
        rows.push({ id: '1', ...serialized } as T);
      }

      writeTable(tableName, rows);
      return rows[idx >= 0 ? idx : rows.length - 1]!;
    },
  };
}

// ── Table list for bulk operations ─────────

const TABLE_NAMES = [
  'users', 'ideas', 'idea_scores', 'projects', 'project_team',
  'milestones', 'project_tasks', 'discussions', 'project_versions',
  'edges', 'edge_outcomes', 'edge_metrics', 'activities', 'notifications',
  'clarifications', 'crunch_columns', 'processes', 'process_steps',
  'company_settings', 'notification_categories', 'notification_prefs',
  'account',
];

// ── Adapter factory ──────────────────────

export async function createLocalStorageAdapter(): Promise<DbAdapter> {
  // Migrate account_config → account (one-time rename)
  const oldAccountKey = KEY_PREFIX + 'account_config';
  const newAccountKey = KEY_PREFIX + 'account';
  if (localStorage.getItem(oldAccountKey) !== null && localStorage.getItem(newAccountKey) === null) {
    localStorage.setItem(newAccountKey, localStorage.getItem(oldAccountKey)!);
    localStorage.removeItem(oldAccountKey);
  }

  const milestoneStore = makeEntityStore<MilestoneEntity>('milestones');
  const projectTaskStore = makeEntityStore<ProjectTaskEntity>('project_tasks');
  const discussionStore = makeEntityStore<DiscussionEntity>('discussions');
  const projectVersionStore = makeEntityStore<ProjectVersionEntity>('project_versions');
  const edgeOutcomeStore = makeEntityStore<EdgeOutcomeEntity>('edge_outcomes');
  const clarificationStore = makeEntityStore<ClarificationEntity>('clarifications');
  const processStepStore = makeEntityStore<ProcessStepEntity>('process_steps');

  const adapter: DbAdapter = {
    async initialize(): Promise<void> {
      // No schema needed — tables auto-create on first write
    },

    async close(): Promise<void> {
      // No cleanup needed — writes are immediate
    },

    async flush(): Promise<void> {
      // No-op — writes are immediate
    },

    async wipeAllData(): Promise<void> {
      for (const table of TABLE_NAMES) {
        localStorage.removeItem(KEY_PREFIX + table);
      }
    },

    async hasSchema(): Promise<boolean> {
      return TABLE_NAMES.some(table => localStorage.getItem(KEY_PREFIX + table) !== null);
    },

    async createSchema(): Promise<void> {
      for (const table of TABLE_NAMES) {
        if (localStorage.getItem(KEY_PREFIX + table) === null) {
          writeTable(table, []);
        }
      }
    },

    async exportSnapshot(): Promise<string> {
      const dump: Record<string, unknown[]> = {};
      for (const table of TABLE_NAMES) {
        dump[table] = readTable(table);
      }
      return JSON.stringify(dump, null, 2);
    },

    async importSnapshot(json: string): Promise<void> {
      let dump: unknown;
      try {
        dump = JSON.parse(json);
      } catch {
        throw new Error('Invalid snapshot: not valid JSON.');
      }
      if (typeof dump !== 'object' || dump === null || Array.isArray(dump)) {
        throw new Error('Invalid snapshot: expected an object with table keys.');
      }
      const record = dump as Record<string, unknown>;
      for (const table of TABLE_NAMES) {
        const rows = record[table];
        if (rows !== undefined && !Array.isArray(rows)) {
          throw new Error(`Invalid snapshot: table "${table}" is not an array.`);
        }
      }
      for (const table of TABLE_NAMES) {
        localStorage.removeItem(KEY_PREFIX + table);
      }
      for (const table of TABLE_NAMES) {
        const rows = record[table];
        writeTable(table, Array.isArray(rows) ? rows : []);
      }
    },

    users: makeEntityStore<UserEntity>('users'),
    ideas: makeEntityStore<IdeaEntity>('ideas'),

    ideaScores: {
      async getByIdeaId(ideaId: string): Promise<IdeaScoreEntity | null> {
        const rows = readTable<IdeaScoreEntity>('idea_scores');
        return rows.find(row => row.idea_id === ideaId) ?? null;
      },
      async put(ideaId: string, data: Record<string, unknown>): Promise<IdeaScoreEntity> {
        const rows = readTable<IdeaScoreEntity>('idea_scores');
        const serialized = serializeRecord(data);
        const idx = rows.findIndex(row => row.idea_id === ideaId);
        const id = idx >= 0 ? rows[idx]!.id : (data.id as string ?? `score-${ideaId}`);

        if (idx >= 0) {
          rows[idx] = { ...rows[idx]!, ...serialized, id, idea_id: ideaId } as IdeaScoreEntity;
        } else {
          rows.push({ id, ...serialized, idea_id: ideaId } as IdeaScoreEntity);
        }

        writeTable('idea_scores', rows);
        return rows[idx >= 0 ? idx : rows.length - 1]!;
      },
    },

    projects: makeEntityStore<ProjectEntity>('projects'),

    projectTeam: {
      async getByProjectId(projectId: string): Promise<ProjectTeamEntity[]> {
        return readTable<ProjectTeamEntity>('project_team').filter(row => row.project_id === projectId);
      },
      async put(projectId: string, userId: string, data: Record<string, unknown>): Promise<ProjectTeamEntity> {
        const rows = readTable<ProjectTeamEntity>('project_team');
        const serialized = serializeRecord(data);
        const idx = rows.findIndex(row => row.project_id === projectId && row.user_id === userId);
        const id = idx >= 0 ? rows[idx]!.id : (data.id as string ?? `pt-${projectId}-${userId}`);

        if (idx >= 0) {
          rows[idx] = { ...rows[idx]!, ...serialized, id, project_id: projectId, user_id: userId } as ProjectTeamEntity;
        } else {
          rows.push({ id, ...serialized, project_id: projectId, user_id: userId } as ProjectTeamEntity);
        }

        writeTable('project_team', rows);
        return rows[idx >= 0 ? idx : rows.length - 1]!;
      },
    },

    milestones: Object.assign(milestoneStore, {
      async getByProjectId(projectId: string): Promise<MilestoneEntity[]> {
        return readTable<MilestoneEntity>('milestones')
          .filter(row => row.project_id === projectId)
          .sort((a, b) => a.sort_order - b.sort_order);
      },
    }),

    projectTasks: Object.assign(projectTaskStore, {
      async getByProjectId(projectId: string): Promise<ProjectTaskEntity[]> {
        return readTable<ProjectTaskEntity>('project_tasks').filter(row => row.project_id === projectId);
      },
    }),

    discussions: Object.assign(discussionStore, {
      async getByProjectId(projectId: string): Promise<DiscussionEntity[]> {
        return readTable<DiscussionEntity>('discussions')
          .filter(row => row.project_id === projectId)
          .sort((a, b) => b.date.localeCompare(a.date));
      },
    }),

    projectVersions: Object.assign(projectVersionStore, {
      async getByProjectId(projectId: string): Promise<ProjectVersionEntity[]> {
        return readTable<ProjectVersionEntity>('project_versions')
          .filter(row => row.project_id === projectId)
          .sort((a, b) => b.date.localeCompare(a.date));
      },
    }),

    edges: makeEntityStore<EdgeEntity>('edges'),

    edgeOutcomes: Object.assign(edgeOutcomeStore, {
      async getByEdgeId(edgeId: string): Promise<EdgeOutcomeEntity[]> {
        return readTable<EdgeOutcomeEntity>('edge_outcomes').filter(row => row.edge_id === edgeId);
      },
    }),

    edgeMetrics: makeEntityStore<EdgeMetricEntity>('edge_metrics'),
    activities: makeEntityStore<ActivityEntity>('activities'),
    notifications: makeEntityStore<NotificationEntity>('notifications'),

    clarifications: Object.assign(clarificationStore, {
      async getByProjectId(projectId: string): Promise<ClarificationEntity[]> {
        return readTable<ClarificationEntity>('clarifications').filter(row => row.project_id === projectId);
      },
    }),

    crunchColumns: makeEntityStore<CrunchColumnEntity>('crunch_columns'),
    processes: makeEntityStore<ProcessEntity>('processes'),

    processSteps: Object.assign(processStepStore, {
      async getByProcessId(processId: string): Promise<ProcessStepEntity[]> {
        return readTable<ProcessStepEntity>('process_steps')
          .filter(row => row.process_id === processId)
          .sort((a, b) => a.sort_order - b.sort_order);
      },
    }),

    companySettings: makeSingletonStore<CompanySettingsEntity>('company_settings'),
    notificationCategories: makeEntityStore<NotificationCategoryEntity>('notification_categories'),

    notificationPrefs: (() => {
      const store = makeEntityStore<NotificationPrefEntity>('notification_prefs');
      return {
        async getAll(): Promise<NotificationPrefEntity[]> {
          return readTable<NotificationPrefEntity>('notification_prefs');
        },
        async getByCategoryId(categoryId: string): Promise<NotificationPrefEntity[]> {
          return readTable<NotificationPrefEntity>('notification_prefs').filter(row => row.category_id === categoryId);
        },
        async put(id: string, data: Record<string, unknown>): Promise<NotificationPrefEntity> {
          return store.put(id, data);
        },
      };
    })(),

    account: makeSingletonStore<AccountEntity>('account'),
  };

  return adapter;
}
