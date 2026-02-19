import { GET, getDbAdapter } from '../../../api/api';
import type { UserEntity, EdgeEntity } from '../../../api/types';

export function userName(user: UserEntity): string {
  return `${user.first_name} ${user.last_name}`.trim();
}

export async function getUsersById(): Promise<Map<string, UserEntity>> {
  const users = await GET('users') as UserEntity[];
  return new Map(users.map(user => [user.id, user]));
}

export function lookupUser(usersById: Map<string, UserEntity>, id: string | null | undefined, fallback = ''): string {
  if (!id) return fallback;
  const user = usersById.get(id);
  return user ? userName(user) : fallback;
}

export function parseJson<T>(value: string | T): T {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; }
    catch { return value as unknown as T; }
  }
  return value;
}

// ── Shared Edge Data Fetching ───────────────

export interface EdgeData {
  outcomes: { id: string; description: string; metrics: { id: string; name: string; target: string; unit: string; current: string }[] }[];
  impact: { shortTerm: string; midTerm: string; longTerm: string };
  confidence: string;
  owner: string;
}

export async function getEdgeDataByIdeaId(ideaId: string, existingUsersById?: Map<string, UserEntity>): Promise<EdgeData | null> {
  const allEdges = await GET('edges') as EdgeEntity[];
  const edge = allEdges.find(entry => entry.idea_id === ideaId);
  if (!edge) return null;

  const db = getDbAdapter();
  const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
  const allMetrics = await db.edgeMetrics.getAll();
  const usersById = existingUsersById ?? await getUsersById();

  return {
    outcomes: outcomes.map(outcome => ({
      id: outcome.id,
      description: outcome.description,
      metrics: allMetrics
        .filter(metric => metric.outcome_id === outcome.id)
        .map(metric => ({ id: metric.id, name: metric.name, target: metric.target, unit: metric.unit, current: metric.current })),
    })),
    impact: {
      shortTerm: edge.impact_short_term,
      midTerm: edge.impact_mid_term,
      longTerm: edge.impact_long_term,
    },
    confidence: edge.confidence || '',
    owner: lookupUser(usersById, edge.owner_id),
  };
}
