import { GET } from '../../../api/api';
import type { IdeaEntity, IdeaScoreEntity, IdeaStatus, EdgeStatus, ConfidenceLevel } from '../../../api/types';
import { buildUserMap, parseJson, getEdgeDataWithConfidence } from './helpers';

export interface Idea {
  id: string;
  title: string;
  score: number;
  estimatedImpact: number;
  estimatedTime: number;
  estimatedCost: number;
  priority: number;
  status: IdeaStatus;
  submittedBy: string;
  edgeStatus: 'incomplete' | EdgeStatus;
}

export async function getIdeas(): Promise<Idea[]> {
  const [ideas, userMap] = await Promise.all([
    GET('ideas') as Promise<IdeaEntity[]>,
    buildUserMap(),
  ]);
  return ideas
    .map(idea => ({
      id: idea.id,
      title: idea.title,
      score: idea.score,
      estimatedImpact: idea.estimated_impact,
      estimatedTime: idea.estimated_time,
      estimatedCost: idea.estimated_cost,
      priority: idea.priority,
      status: idea.status as Idea['status'],
      submittedBy: userMap.get(idea.submitted_by_id)?.fullName() ?? 'Unknown',
      edgeStatus: idea.edge_status as Idea['edgeStatus'],
    }));
}

// ── Idea Review Queue ───────────────────────

export interface ReviewIdea {
  id: string;
  title: string;
  submittedBy: string;
  priority: ConfidenceLevel;
  readiness: 'ready' | 'needs-info' | 'incomplete';
  edgeStatus: EdgeStatus;
  score: number;
  impact: string;
  effort: string;
  waitingDays: number;
  category: string;
}

export async function getReviewQueue(): Promise<ReviewIdea[]> {
  const [ideas, userMap] = await Promise.all([
    GET('ideas') as Promise<IdeaEntity[]>,
    buildUserMap(),
  ]);

  return ideas
    .filter(idea => idea.readiness !== '')
    .map(idea => {
      let priority: ReviewIdea['priority'] = 'low';
      if (idea.score >= 80) priority = 'high';
      else if (idea.score >= 60) priority = 'medium';

      return {
        id: idea.id,
        title: idea.title,
        submittedBy: userMap.get(idea.submitted_by_id)?.fullName() ?? 'Unknown',
        priority,
        readiness: (idea.readiness || 'incomplete') as ReviewIdea['readiness'],
        edgeStatus: (idea.edge_status || 'missing') as ReviewIdea['edgeStatus'],
        score: idea.score,
        impact: idea.impact_label,
        effort: idea.effort_label,
        waitingDays: idea.waiting_days,
        category: idea.category,
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
  const idea = await GET(`ideas/${ideaId}`) as IdeaEntity | null;
  if (!idea) throw new Error(`Idea "${ideaId}" not found.`);
  return {
    title: idea.title,
    problemStatement: idea.problem_statement || 'Marketing team spends 20+ hours weekly manually segmenting customers, leading to delayed campaigns and missed opportunities.',
  };
}

export async function getIdeaScore(ideaId: string): Promise<IdeaScore> {
  const row = await GET(`ideas/${ideaId}/score`) as IdeaScoreEntity | null;
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

export interface ConversionIdea {
  id: string;
  title: string;
  problemStatement: string;
  proposedSolution: string;
  expectedOutcome: string;
  score: number;
  estimatedTime: string;
  estimatedCost: string;
}

export async function getIdeaForConversion(ideaId: string): Promise<ConversionIdea> {
  const [idea, scoreRow] = await Promise.all([
    GET(`ideas/${ideaId}`) as Promise<IdeaEntity>,
    GET(`ideas/${ideaId}/score`) as Promise<IdeaScoreEntity | null>,
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
  confidence: ConfidenceLevel;
  owner: string;
}

export async function getIdeaForApproval(ideaId: string): Promise<ApprovalIdea> {
  const [idea, userMap] = await Promise.all([
    GET(`ideas/${ideaId}`) as Promise<IdeaEntity>,
    buildUserMap(),
  ]);

  return {
    id: idea.id,
    title: idea.title,
    description: idea.description || `Implement an intelligent system for ${idea.title.toLowerCase()}.`,
    submittedBy: userMap.get(idea.submitted_by_id)?.fullName() ?? 'Unknown',
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

export async function getEdgeForApproval(ideaId: string): Promise<ApprovalEdge> {
  return getEdgeDataWithConfidence(ideaId);
}
