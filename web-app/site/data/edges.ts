import { GET, getDbAdapter } from '../../../api/api';
import type { IdeaEntity, EdgeEntity, EdgeOutcomeEntity, EdgeStatus, ConfidenceLevel } from '../../../api/types';
import { getUserMap } from './helpers';

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
    getUserMap(),
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
    getUserMap(),
  ]);
  const db = getDbAdapter();
  const ideaById = new Map(ideaRows.map(idea => [idea.id, idea]));
  const [allOutcomes, allMetrics] = await Promise.all([
    db.edgeOutcomes.getAll(),
    db.edgeMetrics.getAll(),
  ]);

  const outcomesByEdgeId = new Map<string, EdgeOutcomeEntity[]>();
  for (const outcome of allOutcomes) {
    const list = outcomesByEdgeId.get(outcome.edge_id) || [];
    list.push(outcome);
    outcomesByEdgeId.set(outcome.edge_id, list);
  }

  return edgeRows.map(edge => {
    const outcomes = outcomesByEdgeId.get(edge.id) || [];
    const outcomeIds = new Set(outcomes.map(outcome => outcome.id));
    const metricsCount = allMetrics.filter(metric => outcomeIds.has(metric.outcome_id)).length;

    const idea = ideaById.get(edge.idea_id);
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
  });
}
