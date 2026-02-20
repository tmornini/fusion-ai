import { GET, getDbAdapter } from '../../../api/api';
import type { IdeaEntity, EdgeEntity, EdgeStatus, ConfidenceLevel } from '../../../api/types';
import { buildUserMap } from './helpers';

export interface EdgeIdea {
  title: string;
  problem: string;
  solution: string;
  submittedBy: string;
  score: number;
}

export async function getIdeaForEdge(ideaId: string): Promise<EdgeIdea> {
  const [idea, userMap] = await Promise.all([
    GET(`ideas/${ideaId}`) as Promise<IdeaEntity>,
    buildUserMap(),
  ]);
  return {
    title: idea.title,
    problem: idea.problem_statement || 'Manual customer segmentation is time-consuming and often inaccurate, leading to misaligned marketing efforts.',
    solution: idea.proposed_solution || 'Implement ML-based customer clustering that automatically segments users based on behavior patterns.',
    submittedBy: userMap.get(idea.submitted_by_id)?.fullName() ?? 'Unknown',
    score: idea.score,
  };
}

// ── Edge List ───────────────────────────────

export interface EdgeListItem {
  id: string;
  ideaId: string;
  ideaTitle: string;
  status: EdgeStatus;
  outcomesCount: number;
  metricsCount: number;
  confidence: ConfidenceLevel | null;
  owner: string;
  updatedAt: string;
}

export async function getEdgeList(): Promise<EdgeListItem[]> {
  const [edgeRows, ideaRows, userMap] = await Promise.all([
    GET('edges') as Promise<EdgeEntity[]>,
    GET('ideas') as Promise<IdeaEntity[]>,
    buildUserMap(),
  ]);
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
      owner: userMap.get(edge.owner_id)?.fullName() ?? '',
      updatedAt: edge.updated_at,
    };
  }));
}
