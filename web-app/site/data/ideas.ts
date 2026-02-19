import { GET } from '../../../api/api';
import type {
  IdeaRow, IdeaScoreRow, EdgeRow, EdgeOutcomeRow, EdgeMetricRow,
} from '../../../api/types';
import { userName, getUserMap, parseJson } from './helpers';

export interface Idea {
  id: string;
  title: string;
  score: number;
  estimatedImpact: number;
  estimatedTime: number;
  estimatedCost: number;
  priority: number;
  status: 'draft' | 'scored' | 'pending_review' | 'approved' | 'rejected';
  submittedBy: string;
  edgeStatus: 'incomplete' | 'draft' | 'complete' | 'missing';
}

export async function getIdeas(): Promise<Idea[]> {
  const [ideas, userMap] = await Promise.all([
    GET('ideas') as Promise<IdeaRow[]>,
    getUserMap(),
  ]);
  return ideas
    .map(i => ({
      id: i.id,
      title: i.title,
      score: i.score,
      estimatedImpact: i.estimated_impact,
      estimatedTime: i.estimated_time,
      estimatedCost: i.estimated_cost,
      priority: i.priority,
      status: i.status as Idea['status'],
      submittedBy: userMap.get(i.submitted_by_id) ? userName(userMap.get(i.submitted_by_id)!) : 'Unknown',
      edgeStatus: i.edge_status as Idea['edgeStatus'],
    }));
}

// ── Idea Review Queue ───────────────────────

export interface ReviewIdea {
  id: string;
  title: string;
  submittedBy: string;
  priority: 'high' | 'medium' | 'low';
  readiness: 'ready' | 'needs-info' | 'incomplete';
  edgeStatus: 'complete' | 'draft' | 'missing';
  score: number;
  impact: string;
  effort: string;
  waitingDays: number;
  category: string;
}

export async function getReviewQueue(): Promise<ReviewIdea[]> {
  const [ideas, userMap] = await Promise.all([
    GET('ideas') as Promise<IdeaRow[]>,
    getUserMap(),
  ]);

  return ideas
    .filter(i => i.readiness !== '')
    .map(i => {
      let priority: ReviewIdea['priority'] = 'low';
      if (i.score >= 80) priority = 'high';
      else if (i.score >= 60) priority = 'medium';

      return {
        id: i.id,
        title: i.title,
        submittedBy: userMap.get(i.submitted_by_id) ? userName(userMap.get(i.submitted_by_id)!) : 'Unknown',
        priority,
        readiness: (i.readiness || 'incomplete') as ReviewIdea['readiness'],
        edgeStatus: (i.edge_status || 'missing') as ReviewIdea['edgeStatus'],
        score: i.score,
        impact: i.impact_label,
        effort: i.effort_label,
        waitingDays: i.waiting_days,
        category: i.category,
      };
    });
}

// ── Idea Scoring ────────────────────────────

export interface ScoreBreakdown {
  label: string;
  score: number;
  maxScore: number;
  reason: string;
}

export interface IdeaScore {
  overall: number;
  impact: { score: number; breakdown: ScoreBreakdown[] };
  feasibility: { score: number; breakdown: ScoreBreakdown[] };
  efficiency: { score: number; breakdown: ScoreBreakdown[] };
  estimatedTime: string;
  estimatedCost: string;
  recommendation: string;
}

export async function getIdeaForScoring(ideaId: string): Promise<{ title: string; problemStatement: string }> {
  const idea = await GET(`ideas/${ideaId}`) as IdeaRow | null;
  if (!idea) throw new Error(`Idea "${ideaId}" not found.`);
  return {
    title: idea.title,
    problemStatement: idea.problem_statement || 'Marketing team spends 20+ hours weekly manually segmenting customers, leading to delayed campaigns and missed opportunities.',
  };
}

export async function getIdeaScore(ideaId: string): Promise<IdeaScore> {
  const row = await GET(`ideas/${ideaId}/score`) as IdeaScoreRow | null;
  if (!row) {
    return {
      overall: 0, estimatedTime: '', estimatedCost: '', recommendation: '',
      impact: { score: 0, breakdown: [] },
      feasibility: { score: 0, breakdown: [] },
      efficiency: { score: 0, breakdown: [] },
    };
  }
  return {
    overall: row.overall,
    impact: { score: row.impact_score, breakdown: parseJson<ScoreBreakdown[]>(row.impact_breakdown) },
    feasibility: { score: row.feasibility_score, breakdown: parseJson<ScoreBreakdown[]>(row.feasibility_breakdown) },
    efficiency: { score: row.efficiency_score, breakdown: parseJson<ScoreBreakdown[]>(row.efficiency_breakdown) },
    estimatedTime: row.estimated_time,
    estimatedCost: row.estimated_cost,
    recommendation: row.recommendation,
  };
}

// ── Idea Convert ────────────────────────────

export interface ConvertIdea {
  id: string;
  title: string;
  problemStatement: string;
  proposedSolution: string;
  expectedOutcome: string;
  score: number;
  estimatedTime: string;
  estimatedCost: string;
}

export async function getIdeaForConversion(ideaId: string): Promise<ConvertIdea> {
  const [idea, scoreRow] = await Promise.all([
    GET(`ideas/${ideaId}`) as Promise<IdeaRow>,
    GET(`ideas/${ideaId}/score`) as Promise<IdeaScoreRow | null>,
  ]);
  return {
    id: idea.id,
    title: idea.title,
    problemStatement: idea.problem_statement || 'Marketing team spends 20+ hours weekly manually segmenting customers.',
    proposedSolution: idea.proposed_solution || 'Implement machine learning model to automatically segment customers.',
    expectedOutcome: idea.expected_outcome || 'Reduce segmentation time by 80% and increase conversion rates by 25%.',
    score: scoreRow?.overall || idea.score,
    estimatedTime: scoreRow?.estimated_time || '6-8 weeks',
    estimatedCost: scoreRow?.estimated_cost || '$45,000 - $65,000',
  };
}

// ── Approval Detail ─────────────────────────

export interface ApprovalIdea {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  priority: string;
  score: number;
  category: string;
  impact: { level: string; description: string };
  effort: { level: string; timeEstimate: string; teamSize: string };
  cost: { estimate: string; breakdown: string };
  risks: { title: string; severity: 'high' | 'medium' | 'low'; mitigation: string }[];
  assumptions: string[];
  alignments: string[];
}

export interface ApprovalEdge {
  outcomes: { id: string; description: string; metrics: { id: string; name: string; target: string; unit: string }[] }[];
  impact: { shortTerm: string; midTerm: string; longTerm: string };
  confidence: 'high' | 'medium' | 'low';
  owner: string;
}

export async function getApprovalIdea(id: string): Promise<ApprovalIdea> {
  const [idea, userMap] = await Promise.all([
    GET(`ideas/${id}`) as Promise<IdeaRow>,
    getUserMap(),
  ]);

  return {
    id: idea.id,
    title: idea.title,
    description: idea.description || `Implement an intelligent system for ${idea.title.toLowerCase()}.`,
    submittedBy: userMap.get(idea.submitted_by_id) ? userName(userMap.get(idea.submitted_by_id)!) : 'Unknown',
    submittedAt: idea.submitted_at || 'January 15, 2024',
    priority: idea.score >= 80 ? 'high' : idea.score >= 60 ? 'medium' : 'low',
    score: idea.score,
    category: idea.category || 'General',
    impact: {
      level: idea.impact_label || 'High',
      description: idea.description || `Expected to significantly improve operations through ${idea.title.toLowerCase()}.`,
    },
    effort: {
      level: idea.effort_label || 'Medium',
      timeEstimate: idea.effort_time_estimate || '3-4 months',
      teamSize: idea.effort_team_size || '4-5 engineers',
    },
    cost: {
      estimate: idea.cost_estimate || '$120,000 - $150,000',
      breakdown: idea.cost_breakdown || 'Development: $80K, API costs: $20K/year, Training: $10K',
    },
    risks: parseJson<ApprovalIdea['risks']>(idea.risks),
    assumptions: parseJson<string[]>(idea.assumptions),
    alignments: parseJson<string[]>(idea.alignments),
  };
}

export async function getApprovalEdge(id: string): Promise<ApprovalEdge> {
  const [edges, userMap] = await Promise.all([
    GET('edges') as Promise<EdgeRow[]>,
    getUserMap(),
  ]);

  const edge = edges.find(e => e.idea_id === id);
  if (!edge) {
    return { outcomes: [], impact: { shortTerm: '', midTerm: '', longTerm: '' }, confidence: 'medium', owner: '' };
  }

  const { getDbAdapter } = await import('../../../api/api');
  const db = getDbAdapter();
  const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
  const allMetrics = await db.edgeMetrics.getAll();

  return {
    outcomes: outcomes.map(o => ({
      id: o.id,
      description: o.description,
      metrics: allMetrics.filter(m => m.outcome_id === o.id).map(m => ({
        id: m.id, name: m.name, target: m.target, unit: m.unit,
      })),
    })),
    impact: {
      shortTerm: edge.impact_short_term,
      midTerm: edge.impact_mid_term,
      longTerm: edge.impact_long_term,
    },
    confidence: (edge.confidence || 'medium') as 'high' | 'medium' | 'low',
    owner: edge.owner_id && userMap.get(edge.owner_id) ? userName(userMap.get(edge.owner_id)!) : '',
  };
}
