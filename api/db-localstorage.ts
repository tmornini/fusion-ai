// ============================================
// FUSION AI — localStorage Database Implementation
// Pure localStorage with JSON serialization.
// Works on file:/// and http(s):// protocols.
// ============================================

import type { DbAdapter, EntityStore, SingletonStore } from './db';
import type {
  UserRow, IdeaRow, IdeaScoreRow, ProjectRow, ProjectTeamRow,
  MilestoneRow, ProjectTaskRow, DiscussionRow, ProjectVersionRow,
  EdgeRow, EdgeOutcomeRow, EdgeMetricRow, ActivityRow, NotificationRow,
  ClarificationRow, CrunchColumnRow, ProcessRow, ProcessStepRow,
  CompanySettingsRow, NotificationCategoryRow, NotificationPrefRow,
  AccountRow,
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

function serializeData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = serializeValue(value);
  }
  return out;
}

// ── Generic store factories ──────────────

function makeEntityStore<T extends { id: string }>(tableName: string): EntityStore<T> {
  return {
    async getAll(): Promise<T[]> {
      return readTable<T>(tableName);
    },
    async getById(id: string): Promise<T | null> {
      const rows = readTable<T>(tableName);
      return rows.find(r => r.id === id) ?? null;
    },
    async put(id: string, data: Record<string, unknown>): Promise<T> {
      const rows = readTable<T>(tableName);
      const idx = rows.findIndex(r => r.id === id);
      const serialized = serializeData(data);

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
      writeTable(tableName, rows.filter(r => r.id !== id));
    },
  };
}

function makeSingletonStore<T extends { id: string }>(tableName: string): SingletonStore<T> {
  return {
    async get(): Promise<T> {
      const rows = readTable<T>(tableName);
      const row = rows.find(r => r.id === '1');
      if (row) return row;
      const defaultRow = { id: '1' } as T;
      writeTable(tableName, [defaultRow]);
      return defaultRow;
    },
    async put(data: Record<string, unknown>): Promise<T> {
      const rows = readTable<T>(tableName);
      const serialized = serializeData(data);
      const idx = rows.findIndex(r => r.id === '1');

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
  'account_config',
];

// ── Adapter factory ──────────────────────

export async function createLocalStorageAdapter(): Promise<DbAdapter> {
  const milestoneStore = makeEntityStore<MilestoneRow>('milestones');
  const projectTaskStore = makeEntityStore<ProjectTaskRow>('project_tasks');
  const discussionStore = makeEntityStore<DiscussionRow>('discussions');
  const projectVersionStore = makeEntityStore<ProjectVersionRow>('project_versions');
  const edgeOutcomeStore = makeEntityStore<EdgeOutcomeRow>('edge_outcomes');
  const clarificationStore = makeEntityStore<ClarificationRow>('clarifications');
  const processStepStore = makeEntityStore<ProcessStepRow>('process_steps');

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
      return TABLE_NAMES.some(t => localStorage.getItem(KEY_PREFIX + t) !== null);
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

    users: makeEntityStore<UserRow>('users'),
    ideas: makeEntityStore<IdeaRow>('ideas'),

    ideaScores: {
      async getByIdeaId(id: string): Promise<IdeaScoreRow | null> {
        const rows = readTable<IdeaScoreRow>('idea_scores');
        return rows.find(r => r.idea_id === id) ?? null;
      },
      async put(ideaId: string, data: Record<string, unknown>): Promise<IdeaScoreRow> {
        const rows = readTable<IdeaScoreRow>('idea_scores');
        const serialized = serializeData(data);
        const idx = rows.findIndex(r => r.idea_id === ideaId);
        const id = idx >= 0 ? rows[idx]!.id : (data.id as string ?? `score-${ideaId}`);

        if (idx >= 0) {
          rows[idx] = { ...rows[idx]!, ...serialized, id, idea_id: ideaId } as IdeaScoreRow;
        } else {
          rows.push({ id, ...serialized, idea_id: ideaId } as IdeaScoreRow);
        }

        writeTable('idea_scores', rows);
        return rows[idx >= 0 ? idx : rows.length - 1]!;
      },
    },

    projects: makeEntityStore<ProjectRow>('projects'),

    projectTeam: {
      async getByProjectId(id: string): Promise<ProjectTeamRow[]> {
        return readTable<ProjectTeamRow>('project_team').filter(r => r.project_id === id);
      },
      async put(projectId: string, userId: string, data: Record<string, unknown>): Promise<ProjectTeamRow> {
        const rows = readTable<ProjectTeamRow>('project_team');
        const serialized = serializeData(data);
        const idx = rows.findIndex(r => r.project_id === projectId && r.user_id === userId);
        const id = idx >= 0 ? rows[idx]!.id : (data.id as string ?? `pt-${projectId}-${userId}`);

        if (idx >= 0) {
          rows[idx] = { ...rows[idx]!, ...serialized, id, project_id: projectId, user_id: userId } as ProjectTeamRow;
        } else {
          rows.push({ id, ...serialized, project_id: projectId, user_id: userId } as ProjectTeamRow);
        }

        writeTable('project_team', rows);
        return rows[idx >= 0 ? idx : rows.length - 1]!;
      },
    },

    milestones: Object.assign(milestoneStore, {
      async getByProjectId(id: string): Promise<MilestoneRow[]> {
        return readTable<MilestoneRow>('milestones')
          .filter(r => r.project_id === id)
          .sort((a, b) => a.sort_order - b.sort_order);
      },
    }),

    projectTasks: Object.assign(projectTaskStore, {
      async getByProjectId(id: string): Promise<ProjectTaskRow[]> {
        return readTable<ProjectTaskRow>('project_tasks').filter(r => r.project_id === id);
      },
    }),

    discussions: Object.assign(discussionStore, {
      async getByProjectId(id: string): Promise<DiscussionRow[]> {
        return readTable<DiscussionRow>('discussions')
          .filter(r => r.project_id === id)
          .sort((a, b) => b.date.localeCompare(a.date));
      },
    }),

    projectVersions: Object.assign(projectVersionStore, {
      async getByProjectId(id: string): Promise<ProjectVersionRow[]> {
        return readTable<ProjectVersionRow>('project_versions')
          .filter(r => r.project_id === id)
          .sort((a, b) => b.date.localeCompare(a.date));
      },
    }),

    edges: makeEntityStore<EdgeRow>('edges'),

    edgeOutcomes: Object.assign(edgeOutcomeStore, {
      async getByEdgeId(id: string): Promise<EdgeOutcomeRow[]> {
        return readTable<EdgeOutcomeRow>('edge_outcomes').filter(r => r.edge_id === id);
      },
    }),

    edgeMetrics: makeEntityStore<EdgeMetricRow>('edge_metrics'),
    activities: makeEntityStore<ActivityRow>('activities'),
    notifications: makeEntityStore<NotificationRow>('notifications'),

    clarifications: Object.assign(clarificationStore, {
      async getByProjectId(id: string): Promise<ClarificationRow[]> {
        return readTable<ClarificationRow>('clarifications').filter(r => r.project_id === id);
      },
    }),

    crunchColumns: makeEntityStore<CrunchColumnRow>('crunch_columns'),
    processes: makeEntityStore<ProcessRow>('processes'),

    processSteps: Object.assign(processStepStore, {
      async getByProcessId(id: string): Promise<ProcessStepRow[]> {
        return readTable<ProcessStepRow>('process_steps')
          .filter(r => r.process_id === id)
          .sort((a, b) => a.sort_order - b.sort_order);
      },
    }),

    companySettings: makeSingletonStore<CompanySettingsRow>('company_settings'),
    notificationCategories: makeEntityStore<NotificationCategoryRow>('notification_categories'),

    notificationPrefs: {
      async getAll(): Promise<NotificationPrefRow[]> {
        return readTable<NotificationPrefRow>('notification_prefs');
      },
      async getByCategoryId(id: string): Promise<NotificationPrefRow[]> {
        return readTable<NotificationPrefRow>('notification_prefs').filter(r => r.category_id === id);
      },
      async put(id: string, data: Record<string, unknown>): Promise<NotificationPrefRow> {
        const store = makeEntityStore<NotificationPrefRow>('notification_prefs');
        return store.put(id, data);
      },
    },

    account: makeSingletonStore<AccountRow>('account_config'),
  };

  return adapter;
}
