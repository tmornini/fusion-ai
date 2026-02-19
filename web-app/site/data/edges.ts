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
  const edge = allEdges.find(edge => edge.idea_id === ideaId);
  if (!edge) return null;

  const { getDbAdapter } = await import('../../../api/api');
  const db = getDbAdapter();
  const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
  const allMetrics = await db.edgeMetrics.getAll();
  const usersById = await getUsersById();

  return {
    outcomes: outcomes.map((outcome: EdgeOutcomeEntity) => ({
      id: outcome.id,
      description: outcome.description,
      metrics: allMetrics.filter((metric: EdgeMetricEntity) => metric.outcome_id === outcome.id).map((metric: EdgeMetricEntity) => ({
        id: metric.id, name: metric.name, target: metric.target, unit: metric.unit,
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

  const ideaMap = new Map(ideaRows.map(idea => [idea.id, idea]));
  const allMetrics = await db.edgeMetrics.getAll();

  return Promise.all(edgeRows.map(async (edge) => {
    const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
    const outcomeIds = new Set(outcomes.map(outcome => outcome.id));
    const metricsCount = allMetrics.filter(metric => outcomeIds.has(metric.outcome_id)).length;

    const idea = ideaMap.get(edge.idea_id);
    return {
      id: edge.id,
      ideaId: edge.idea_id,
      ideaTitle: idea?.title || '',
      status: (edge.status || 'missing') as EdgeListItem['status'],
      outcomesCount: outcomes.length,
      metricsCount,
      confidence: (edge.confidence || null) as EdgeListItem['confidence'],
      owner: lookupUser(usersById, edge.owner_id),
      updatedAt: edge.updated_at,
    };
  }));
}
