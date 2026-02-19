import { GET } from '../../../api/api';
import type { IdeaEntity, EdgeEntity, EdgeOutcomeEntity, EdgeMetricEntity } from '../../../api/types';
import { getUsersById, lookupUser } from './helpers';

export interface EdgeIdea {
  title: string;
  problem: string;
  solution: string;
  submittedBy: string;
  score: number;
}

export async function getEdgeIdea(ideaId: string): Promise<EdgeIdea> {
  const [idea, usersById] = await Promise.all([
    GET(`ideas/${ideaId}`) as Promise<IdeaEntity>,
    getUsersById(),
  ]);
  return {
    title: idea.title,
    problem: idea.problem_statement || 'Manual customer segmentation is time-consuming and often inaccurate, leading to misaligned marketing efforts.',
    solution: idea.proposed_solution || 'Implement ML-based customer clustering that automatically segments users based on behavior patterns.',
    submittedBy: lookupUser(usersById, idea.submitted_by_id, 'Unknown'),
    score: idea.score,
  };
}

export async function getEdgeOutcomes(ideaId: string): Promise<{
  outcomes: { id: string; description: string; metrics: { id: string; name: string; target: string; unit: string }[] }[];
  impact: { shortTerm: string; midTerm: string; longTerm: string };
  confidence: string;
  owner: string;
} | null> {
  const allEdges = await GET('edges') as EdgeEntity[];
  const edge = allEdges.find(e => e.idea_id === ideaId);
  if (!edge) return null;

  const { getDbAdapter } = await import('../../../api/api');
  const db = getDbAdapter();
  const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
  const allMetrics = await db.edgeMetrics.getAll();
  const usersById = await getUsersById();

  return {
    outcomes: outcomes.map((o: EdgeOutcomeEntity) => ({
      id: o.id,
      description: o.description,
      metrics: allMetrics.filter((m: EdgeMetricEntity) => m.outcome_id === o.id).map((m: EdgeMetricEntity) => ({
        id: m.id, name: m.name, target: m.target, unit: m.unit,
      })),
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

// ── Edge List ───────────────────────────────

export interface EdgeListItem {
  id: string;
  ideaId: string;
  ideaTitle: string;
  status: 'complete' | 'draft' | 'missing';
  outcomesCount: number;
  metricsCount: number;
  confidence: 'high' | 'medium' | 'low' | null;
  owner: string;
  updatedAt: string;
}

export async function getEdgeList(): Promise<EdgeListItem[]> {
  const [edgeRows, ideaRows, usersById] = await Promise.all([
    GET('edges') as Promise<EdgeEntity[]>,
    GET('ideas') as Promise<IdeaEntity[]>,
    getUsersById(),
  ]);
  const { getDbAdapter } = await import('../../../api/api');
  const db = getDbAdapter();

  const ideaMap = new Map(ideaRows.map(i => [i.id, i]));
  const allMetrics = await db.edgeMetrics.getAll();

  return Promise.all(edgeRows.map(async (e) => {
    const outcomes = await db.edgeOutcomes.getByEdgeId(e.id);
    const outcomeIds = new Set(outcomes.map(o => o.id));
    const metricsCount = allMetrics.filter(m => outcomeIds.has(m.outcome_id)).length;

    const idea = ideaMap.get(e.idea_id);
    return {
      id: e.id,
      ideaId: e.idea_id,
      ideaTitle: idea?.title || '',
      status: (e.status || 'missing') as EdgeListItem['status'],
      outcomesCount: outcomes.length,
      metricsCount,
      confidence: (e.confidence || null) as EdgeListItem['confidence'],
      owner: lookupUser(usersById, e.owner_id),
      updatedAt: e.updated_at,
    };
  }));
}
