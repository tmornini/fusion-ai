// ============================================
// FUSION AI — REST-style API
// GET/PUT routing for the database adapter.
// ============================================

import type { DbAdapter } from './db';

let _adapter: DbAdapter | null = null;

export function initApi(adapter: DbAdapter): void {
  _adapter = adapter;
}

export function getDbAdapter(): DbAdapter {
  if (!_adapter) throw new Error('API not initialized. Call initApi() first.');
  return _adapter;
}

function db(): DbAdapter {
  return getDbAdapter();
}

// ── GET ──────────────────────────────────────

export async function GET(resource: string): Promise<unknown> {
  const parts = resource.split('/').filter(Boolean);

  // Top-level collections
  if (parts.length === 1) {
    switch (parts[0]) {
      case 'users': return db().users.getAll();
      case 'ideas': return db().ideas.getAll();
      case 'projects': return db().projects.getAll();
      case 'edges': return db().edges.getAll();
      case 'activities': return db().activities.getAll();
      case 'notifications': return db().notifications.getAll();
      case 'crunch-columns': return db().crunchColumns.getAll();
      case 'processes': return db().processes.getAll();
      case 'company-settings': return db().companySettings.get();
      case 'notification-categories': return db().notificationCategories.getAll();
      case 'notification-prefs': return db().notificationPrefs.getAll();
      case 'account': return db().account.get();
      case 'current-user': return db().users.getById('current');
    }
  }

  // Single item by ID
  if (parts.length === 2) {
    const [collection, id] = parts;
    switch (collection) {
      case 'users': return db().users.getById(id!);
      case 'ideas': return db().ideas.getById(id!);
      case 'projects': return db().projects.getById(id!);
      case 'edges': return db().edges.getById(id!);
      case 'processes': return db().processes.getById(id!);
    }
  }

  // Nested resources: /{parent}/{id}/{child}
  if (parts.length === 3) {
    const [parent, parentId, child] = parts;
    if (parent === 'ideas' && child === 'score') {
      return db().ideaScores.getByIdeaId(parentId!);
    }
    if (parent === 'projects') {
      switch (child) {
        case 'team': return db().projectTeam.getByProjectId(parentId!);
        case 'milestones': return db().milestones.getByProjectId(parentId!);
        case 'tasks': return db().projectTasks.getByProjectId(parentId!);
        case 'discussions': return db().discussions.getByProjectId(parentId!);
        case 'versions': return db().projectVersions.getByProjectId(parentId!);
        case 'clarifications': return db().clarifications.getByProjectId(parentId!);
      }
    }
    if (parent === 'edges') {
      if (child === 'outcomes') return db().edgeOutcomes.getByEdgeId(parentId!);
    }
  }

  throw new Error(`GET: Unknown resource "${resource}"`);
}

// ── PUT ──────────────────────────────────────

export async function PUT(resource: string, payload: Record<string, unknown>): Promise<unknown> {
  const parts = resource.split('/').filter(Boolean);

  // Singletons
  if (parts.length === 1) {
    switch (parts[0]) {
      case 'company-settings': return db().companySettings.put(payload);
      case 'account': return db().account.put(payload);
    }
  }

  // /{collection}/{id}
  if (parts.length === 2) {
    const [collection, id] = parts;
    switch (collection) {
      case 'users': return db().users.put(id!, payload);
      case 'ideas': return db().ideas.put(id!, payload);
      case 'projects': return db().projects.put(id!, payload);
      case 'edges': return db().edges.put(id!, payload);
      case 'activities': return db().activities.put(id!, payload);
      case 'notifications': return db().notifications.put(id!, payload);
      case 'crunch-columns': return db().crunchColumns.put(id!, payload);
      case 'processes': return db().processes.put(id!, payload);
      case 'notification-prefs': return db().notificationPrefs.put(id!, payload);
    }
  }

  // /{parent}/{parentId}/{child}/{childId}
  if (parts.length === 3) {
    const [parent, parentId, child] = parts;
    if (parent === 'ideas' && child === 'score') {
      return db().ideaScores.put(parentId!, payload);
    }
  }

  if (parts.length === 4) {
    const [parent, parentId, child, childId] = parts;
    if (parent === 'projects') {
      switch (child) {
        case 'team': return db().projectTeam.put(parentId!, childId!, payload);
        case 'milestones': return db().milestones.put(childId!, { ...payload, project_id: parentId });
        case 'tasks': return db().projectTasks.put(childId!, { ...payload, project_id: parentId });
        case 'discussions': return db().discussions.put(childId!, { ...payload, project_id: parentId });
        case 'versions': return db().projectVersions.put(childId!, { ...payload, project_id: parentId });
        case 'clarifications': return db().clarifications.put(childId!, { ...payload, project_id: parentId });
      }
    }
    if (parent === 'edges') {
      if (child === 'outcomes') return db().edgeOutcomes.put(childId!, { ...payload, edge_id: parentId });
    }
  }

  // /{parent}/{parentId}/{child}/{childId}/{subchild}/{subId}
  if (parts.length === 6) {
    const [parent, , child, , subchild, subId] = parts;
    if (parent === 'edges' && child === 'outcomes' && subchild === 'metrics') {
      return db().edgeMetrics.put(subId!, payload);
    }
  }

  throw new Error(`PUT: Unknown resource "${resource}"`);
}
