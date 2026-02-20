import { GET, getDbAdapter } from '../../../api/api';
import type { UserEntity, EdgeEntity, Id, ConfidenceLevel } from '../../../api/types';
import { User } from '../../../api/types';

export async function buildUserMap(): Promise<Map<Id, User>> {
  const users = await GET('users') as UserEntity[];
  return new Map(users.map(entity => [entity.id, new User(entity)]));
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

export async function getEdgeDataByIdeaId(ideaId: string, existingUserMap?: Map<Id, User>): Promise<EdgeData | null> {
  const allEdges = await GET('edges') as EdgeEntity[];
  const edge = allEdges.find(entry => entry.idea_id === ideaId);
  if (!edge) return null;

  const db = getDbAdapter();
  const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
  const allMetrics = await db.edgeMetrics.getAll();
  const userMap = existingUserMap ?? await buildUserMap();

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
    owner: userMap.get(edge.owner_id)?.fullName() ?? '',
  };
}

// ── Edge Data with Confidence ───────────────

export function emptyEdgeData(): EdgeData & { confidence: ConfidenceLevel } {
  return {
    outcomes: [],
    impact: { shortTerm: '', midTerm: '', longTerm: '' },
    confidence: 'medium',
    owner: '',
  };
}

export async function getEdgeDataWithConfidence(
  ideaId: string,
  existingUserMap?: Map<Id, User>,
): Promise<EdgeData & { confidence: ConfidenceLevel }> {
  const edgeData = await getEdgeDataByIdeaId(ideaId, existingUserMap);
  if (!edgeData) return emptyEdgeData();
  return {
    ...edgeData,
    confidence: (edgeData.confidence || 'medium') as ConfidenceLevel,
  };
}
