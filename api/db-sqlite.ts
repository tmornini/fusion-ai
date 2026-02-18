// ============================================
// FUSION AI — SQLite WASM Database Implementation
// Uses sql.js with IndexedDB persistence.
// Uses positional parameters (?) for browser WASM compatibility.
// ============================================

import initSqlJs, { type Database } from 'sql.js';
import { SCHEMA } from './schema';
import type { DbAdapter, EntityStore, SingletonStore } from './db';
import type {
  UserRow, IdeaRow, IdeaScoreRow, ProjectRow, ProjectTeamRow,
  MilestoneRow, ProjectTaskRow, DiscussionRow, ProjectVersionRow,
  EdgeRow, EdgeOutcomeRow, EdgeMetricRow, ActivityRow, NotificationRow,
  ClarificationRow, CrunchColumnRow, ProcessRow, ProcessStepRow,
  CompanySettingsRow, NotificationCategoryRow, NotificationPrefRow,
  AccountRow,
} from './types';

const IDB_NAME = 'fusion-ai-db';
const IDB_STORE = 'database';
const IDB_KEY = 'main';

// ── IndexedDB helpers ────────────────────────

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIdb(): Promise<Uint8Array | null> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(IDB_KEY);
    req.onsuccess = () => resolve(req.result as Uint8Array | null ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => idb.close();
  });
}

async function saveToIdb(data: Uint8Array): Promise<void> {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(data, IDB_KEY);
    tx.oncomplete = () => { idb.close(); resolve(); };
    tx.onerror = () => { idb.close(); reject(tx.error); };
  });
}

// ── SQLite Adapter ──────────────────────────

type SqlVal = string | number | null | Uint8Array;

export async function createSqliteAdapter(): Promise<DbAdapter> {
  let db: Database;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const SQL = await initSqlJs({
    locateFile: (file: string) => `../site/${file}`,
  });

  // Try loading persisted database
  const saved = await loadFromIdb();
  if (saved) {
    db = new SQL.Database(saved);
  } else {
    db = new SQL.Database();
  }

  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const data = db.export();
      saveToIdb(new Uint8Array(data));
    }, 500);
  }

  function run(sql: string, params?: SqlVal[]): void {
    if (params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.run(sql);
    }
    scheduleSave();
  }

  function queryAll<T>(sql: string, params?: SqlVal[]): T[] {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  function queryOne<T>(sql: string, params?: SqlVal[]): T | null {
    const rows = queryAll<T>(sql, params);
    return rows[0] ?? null;
  }

  function getTableColumns(tableName: string): string[] {
    const rows = queryAll<{ name: string }>(`PRAGMA table_info(${tableName})`);
    return rows.map(r => r.name);
  }

  function serializeValue(value: unknown): SqlVal {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value as string | number;
  }

  function capitalize(s: string): string {
    return s.split('_').map(w => w[0]!.toUpperCase() + w.slice(1)).join('');
  }

  // ── Generic store factories ──────────────

  function makeEntityStore<T extends { id: string }>(tableName: string): EntityStore<T> {
    return {
      async getAll(): Promise<T[]> {
        return queryAll<T>(`SELECT * FROM ${tableName}`);
      },
      async getById(id: string): Promise<T | null> {
        return queryOne<T>(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      },
      async put(id: string, data: Record<string, unknown>): Promise<T> {
        const columns = getTableColumns(tableName);
        const existing = queryOne<T>(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);

        if (existing) {
          const setClauses: string[] = [];
          const values: SqlVal[] = [];
          for (const [key, value] of Object.entries(data)) {
            if (key === 'id' || !columns.includes(key)) continue;
            setClauses.push(`${key} = ?`);
            values.push(serializeValue(value));
          }
          if (setClauses.length > 0) {
            values.push(id);
            run(`UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`, values);
          }
        } else {
          const insertData = { id, ...data };
          const colNames: string[] = [];
          const values: SqlVal[] = [];
          for (const [key, value] of Object.entries(insertData)) {
            if (!columns.includes(key)) continue;
            colNames.push(key);
            values.push(serializeValue(value));
          }
          const placeholders = colNames.map(() => '?').join(', ');
          run(`INSERT INTO ${tableName} (${colNames.join(', ')}) VALUES (${placeholders})`, values);
        }

        return queryOne<T>(`SELECT * FROM ${tableName} WHERE id = ?`, [id])!;
      },
      async delete(id: string): Promise<void> {
        run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      },
    };
  }

  function makeSingletonStore<T extends { id: string }>(tableName: string): SingletonStore<T> {
    return {
      async get(): Promise<T> {
        const row = queryOne<T>(`SELECT * FROM ${tableName} WHERE id = '1'`);
        if (!row) {
          run(`INSERT OR IGNORE INTO ${tableName} (id) VALUES ('1')`);
          return queryOne<T>(`SELECT * FROM ${tableName} WHERE id = '1'`)!;
        }
        return row;
      },
      async put(data: Record<string, unknown>): Promise<T> {
        const columns = getTableColumns(tableName);
        run(`INSERT OR IGNORE INTO ${tableName} (id) VALUES ('1')`);
        const setClauses: string[] = [];
        const values: SqlVal[] = [];
        for (const [key, value] of Object.entries(data)) {
          if (key === 'id' || !columns.includes(key)) continue;
          setClauses.push(`${key} = ?`);
          values.push(serializeValue(value));
        }
        if (setClauses.length > 0) {
          run(`UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = '1'`, values);
        }
        return queryOne<T>(`SELECT * FROM ${tableName} WHERE id = '1'`)!;
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

  // ── Build stores ──────────────────────────

  const milestoneStore = makeEntityStore<MilestoneRow>('milestones');
  const projectTaskStore = makeEntityStore<ProjectTaskRow>('project_tasks');
  const discussionStore = makeEntityStore<DiscussionRow>('discussions');
  const projectVersionStore = makeEntityStore<ProjectVersionRow>('project_versions');
  const edgeOutcomeStore = makeEntityStore<EdgeOutcomeRow>('edge_outcomes');
  const clarificationStore = makeEntityStore<ClarificationRow>('clarifications');
  const processStepStore = makeEntityStore<ProcessStepRow>('process_steps');

  const adapter: DbAdapter = {
    async initialize(): Promise<void> {
      db.run(SCHEMA);
    },

    async close(): Promise<void> {
      if (saveTimer) clearTimeout(saveTimer);
      const data = db.export();
      await saveToIdb(new Uint8Array(data));
      db.close();
    },

    async flush(): Promise<void> {
      if (saveTimer) clearTimeout(saveTimer);
      const data = db.export();
      await saveToIdb(new Uint8Array(data));
    },

    async wipeAllData(): Promise<void> {
      for (const table of TABLE_NAMES) {
        db.run(`DELETE FROM ${table}`);
      }
      scheduleSave();
    },

    async exportSnapshot(): Promise<string> {
      const dump: Record<string, unknown[]> = {};
      for (const table of TABLE_NAMES) {
        dump[table] = queryAll(`SELECT * FROM ${table}`);
      }
      return JSON.stringify(dump, null, 2);
    },

    async importSnapshot(json: string): Promise<void> {
      const dump = JSON.parse(json) as Record<string, Record<string, unknown>[]>;
      for (const table of TABLE_NAMES) {
        db.run(`DELETE FROM ${table}`);
      }
      for (const table of TABLE_NAMES) {
        const rows = dump[table];
        if (!rows || rows.length === 0) continue;
        const columns = getTableColumns(table);
        for (const row of rows) {
          const colNames: string[] = [];
          const values: SqlVal[] = [];
          for (const [key, value] of Object.entries(row)) {
            if (!columns.includes(key)) continue;
            colNames.push(key);
            values.push(serializeValue(value));
          }
          if (colNames.length > 0) {
            const placeholders = colNames.map(() => '?').join(', ');
            run(`INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`, values);
          }
        }
      }
    },

    users: makeEntityStore<UserRow>('users'),
    ideas: makeEntityStore<IdeaRow>('ideas'),

    ideaScores: {
      async getByIdeaId(id: string): Promise<IdeaScoreRow | null> {
        return queryOne<IdeaScoreRow>('SELECT * FROM idea_scores WHERE idea_id = ?', [id]);
      },
      async put(ideaId: string, data: Record<string, unknown>): Promise<IdeaScoreRow> {
        const existing = queryOne<IdeaScoreRow>('SELECT * FROM idea_scores WHERE idea_id = ?', [ideaId]);
        const id = existing?.id ?? (data.id as string ?? `score-${ideaId}`);
        const columns = getTableColumns('idea_scores');
        const fullData = { ...data, idea_id: ideaId };

        if (existing) {
          const setClauses: string[] = [];
          const values: SqlVal[] = [];
          for (const [key, value] of Object.entries(fullData)) {
            if (key === 'id' || !columns.includes(key)) continue;
            setClauses.push(`${key} = ?`);
            values.push(serializeValue(value));
          }
          if (setClauses.length > 0) {
            values.push(id);
            run(`UPDATE idea_scores SET ${setClauses.join(', ')} WHERE id = ?`, values);
          }
        } else {
          const insertData = { id, ...fullData };
          const colNames: string[] = [];
          const values: SqlVal[] = [];
          for (const [key, value] of Object.entries(insertData)) {
            if (!columns.includes(key)) continue;
            colNames.push(key);
            values.push(serializeValue(value));
          }
          const placeholders = colNames.map(() => '?').join(', ');
          run(`INSERT INTO idea_scores (${colNames.join(', ')}) VALUES (${placeholders})`, values);
        }
        return queryOne<IdeaScoreRow>('SELECT * FROM idea_scores WHERE id = ?', [id])!;
      },
    },

    projects: makeEntityStore<ProjectRow>('projects'),

    projectTeam: {
      async getByProjectId(id: string): Promise<ProjectTeamRow[]> {
        return queryAll<ProjectTeamRow>('SELECT * FROM project_team WHERE project_id = ?', [id]);
      },
      async put(projectId: string, userId: string, data: Record<string, unknown>): Promise<ProjectTeamRow> {
        const existing = queryOne<ProjectTeamRow>(
          'SELECT * FROM project_team WHERE project_id = ? AND user_id = ?',
          [projectId, userId],
        );
        const id = existing?.id ?? (data.id as string ?? `pt-${projectId}-${userId}`);
        const columns = getTableColumns('project_team');
        const fullData = { ...data, project_id: projectId, user_id: userId };

        if (existing) {
          const setClauses: string[] = [];
          const values: SqlVal[] = [];
          for (const [key, value] of Object.entries(fullData)) {
            if (key === 'id' || !columns.includes(key)) continue;
            setClauses.push(`${key} = ?`);
            values.push(serializeValue(value));
          }
          if (setClauses.length > 0) {
            values.push(id);
            run(`UPDATE project_team SET ${setClauses.join(', ')} WHERE id = ?`, values);
          }
        } else {
          const insertData = { id, ...fullData };
          const colNames: string[] = [];
          const values: SqlVal[] = [];
          for (const [key, value] of Object.entries(insertData)) {
            if (!columns.includes(key)) continue;
            colNames.push(key);
            values.push(serializeValue(value));
          }
          const placeholders = colNames.map(() => '?').join(', ');
          run(`INSERT INTO project_team (${colNames.join(', ')}) VALUES (${placeholders})`, values);
        }
        return queryOne<ProjectTeamRow>('SELECT * FROM project_team WHERE id = ?', [id])!;
      },
    },

    milestones: Object.assign(milestoneStore, {
      async getByProjectId(id: string): Promise<MilestoneRow[]> {
        return queryAll<MilestoneRow>(
          'SELECT * FROM milestones WHERE project_id = ? ORDER BY sort_order ASC',
          [id],
        );
      },
    }),

    projectTasks: Object.assign(projectTaskStore, {
      async getByProjectId(id: string): Promise<ProjectTaskRow[]> {
        return queryAll<ProjectTaskRow>(
          'SELECT * FROM project_tasks WHERE project_id = ?',
          [id],
        );
      },
    }),

    discussions: Object.assign(discussionStore, {
      async getByProjectId(id: string): Promise<DiscussionRow[]> {
        return queryAll<DiscussionRow>(
          'SELECT * FROM discussions WHERE project_id = ? ORDER BY date DESC',
          [id],
        );
      },
    }),

    projectVersions: Object.assign(projectVersionStore, {
      async getByProjectId(id: string): Promise<ProjectVersionRow[]> {
        return queryAll<ProjectVersionRow>(
          'SELECT * FROM project_versions WHERE project_id = ? ORDER BY date DESC',
          [id],
        );
      },
    }),

    edges: makeEntityStore<EdgeRow>('edges'),

    edgeOutcomes: Object.assign(edgeOutcomeStore, {
      async getByEdgeId(id: string): Promise<EdgeOutcomeRow[]> {
        return queryAll<EdgeOutcomeRow>(
          'SELECT * FROM edge_outcomes WHERE edge_id = ?',
          [id],
        );
      },
    }),

    edgeMetrics: makeEntityStore<EdgeMetricRow>('edge_metrics'),
    activities: makeEntityStore<ActivityRow>('activities'),
    notifications: makeEntityStore<NotificationRow>('notifications'),

    clarifications: Object.assign(clarificationStore, {
      async getByProjectId(id: string): Promise<ClarificationRow[]> {
        return queryAll<ClarificationRow>(
          'SELECT * FROM clarifications WHERE project_id = ?',
          [id],
        );
      },
    }),

    crunchColumns: makeEntityStore<CrunchColumnRow>('crunch_columns'),
    processes: makeEntityStore<ProcessRow>('processes'),

    processSteps: Object.assign(processStepStore, {
      async getByProcessId(id: string): Promise<ProcessStepRow[]> {
        return queryAll<ProcessStepRow>(
          'SELECT * FROM process_steps WHERE process_id = ? ORDER BY sort_order ASC',
          [id],
        );
      },
    }),

    companySettings: makeSingletonStore<CompanySettingsRow>('company_settings'),
    notificationCategories: makeEntityStore<NotificationCategoryRow>('notification_categories'),

    notificationPrefs: {
      async getAll(): Promise<NotificationPrefRow[]> {
        return queryAll<NotificationPrefRow>('SELECT * FROM notification_prefs');
      },
      async getByCategoryId(id: string): Promise<NotificationPrefRow[]> {
        return queryAll<NotificationPrefRow>(
          'SELECT * FROM notification_prefs WHERE category_id = ?',
          [id],
        );
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
