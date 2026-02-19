import { GET } from '../../../api/api';
import type {
  ProjectEntity, ProjectTeamEntity, MilestoneEntity, ProjectTaskEntity,
  DiscussionEntity, ProjectVersionEntity, EdgeEntity, EdgeOutcomeEntity, EdgeMetricEntity,
  IdeaEntity, ClarificationEntity, UserEntity,
} from '../../../api/types';
import { getUsersById, lookupUser, parseJson } from './helpers';

export interface Project {
  id: string;
  title: string;
  status: 'approved' | 'under_review' | 'sent_back';
  priorityScore: number;
  estimatedTime: number;
  actualTime: number;
  estimatedCost: number;
  actualCost: number;
  estimatedImpact: number;
  actualImpact: number;
  progress: number;
  priority: number;
}

export async function getProjects(): Promise<Project[]> {
  const rows = await GET('projects') as ProjectEntity[];
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    status: r.status as Project['status'],
    priorityScore: r.priority_score,
    estimatedTime: r.estimated_time,
    actualTime: r.actual_time,
    estimatedCost: r.estimated_cost,
    actualCost: r.actual_cost,
    estimatedImpact: r.estimated_impact,
    actualImpact: r.actual_impact,
    progress: r.progress,
    priority: r.priority,
  }));
}

// ── Project Detail ──────────────────────────

export interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  startDate: string;
  targetEndDate: string;
  projectLead: string;
  metrics: {
    time: { baseline: number; current: number };
    cost: { baseline: number; current: number };
    impact: { baseline: number; current: number };
  };
  edge: {
    outcomes: { id: string; description: string; metrics: { id: string; name: string; target: string; unit: string; current: string }[] }[];
    impact: { shortTerm: string; midTerm: string; longTerm: string };
    confidence: 'high' | 'medium' | 'low';
    owner: string;
  };
  team: { id: string; name: string; role: string }[];
  milestones: { id: string; title: string; status: string; date: string }[];
  versions: { id: string; version: string; date: string; changes: string; author: string }[];
  discussions: { id: string; author: string; date: string; message: string }[];
  tasks: { name: string; priority: string; desc: string; skills: string[]; hours: number; assigned: string }[];
}

async function getEdgeForProject(
  ideaId: string,
  usersById: Map<string, UserEntity>,
): Promise<ProjectDetail['edge']> {
  const allEdges = await GET('edges') as EdgeEntity[];
  const edge = allEdges.find(e => e.idea_id === ideaId);
  if (!edge) {
    return { outcomes: [], impact: { shortTerm: '', midTerm: '', longTerm: '' }, confidence: 'medium', owner: '' };
  }

  const { getDbAdapter } = await import('../../../api/api');
  const db = getDbAdapter();
  const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
  const allMetrics = await db.edgeMetrics.getAll();

  return {
    outcomes: outcomes.map((o: EdgeOutcomeEntity) => ({
      id: o.id,
      description: o.description,
      metrics: allMetrics.filter((m: EdgeMetricEntity) => m.outcome_id === o.id).map((m: EdgeMetricEntity) => ({
        id: m.id, name: m.name, target: m.target, unit: m.unit, current: m.current,
      })),
    })),
    impact: {
      shortTerm: edge.impact_short_term,
      midTerm: edge.impact_mid_term,
      longTerm: edge.impact_long_term,
    },
    confidence: (edge.confidence || 'medium') as 'high' | 'medium' | 'low',
    owner: lookupUser(usersById, edge.owner_id),
  };
}

export async function getProjectById(projectId: string): Promise<ProjectDetail> {
  const [project, teamRows, milestoneRows, taskRows, discussionRows, versionRows, usersById] = await Promise.all([
    GET(`projects/${projectId}`) as Promise<ProjectEntity>,
    GET(`projects/${projectId}/team`) as Promise<ProjectTeamEntity[]>,
    GET(`projects/${projectId}/milestones`) as Promise<MilestoneEntity[]>,
    GET(`projects/${projectId}/tasks`) as Promise<ProjectTaskEntity[]>,
    GET(`projects/${projectId}/discussions`) as Promise<DiscussionEntity[]>,
    GET(`projects/${projectId}/versions`) as Promise<ProjectVersionEntity[]>,
    getUsersById(),
  ]);

  const edgeData = await getEdgeForProject(project.linked_idea_id || projectId, usersById);

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    progress: project.progress,
    startDate: project.start_date,
    targetEndDate: project.target_end_date,
    projectLead: lookupUser(usersById, project.lead_id),
    metrics: {
      time: { baseline: project.estimated_time, current: project.actual_time },
      cost: { baseline: project.estimated_cost, current: project.actual_cost },
      impact: { baseline: project.estimated_impact, current: project.actual_impact },
    },
    edge: edgeData,
    team: teamRows.map(t => ({
      id: t.user_id,
      name: lookupUser(usersById, t.user_id),
      role: t.role,
    })),
    milestones: milestoneRows.map(m => ({
      id: m.id, title: m.title, status: m.status, date: m.date,
    })),
    versions: versionRows.map(v => ({
      id: v.id, version: v.version, date: v.date, changes: v.changes,
      author: lookupUser(usersById, v.author_id),
    })),
    discussions: discussionRows.map(d => ({
      id: d.id, date: d.date, message: d.message,
      author: lookupUser(usersById, d.author_id),
    })),
    tasks: taskRows.map(t => ({
      name: t.name, priority: t.priority, desc: t.description,
      skills: parseJson<string[]>(t.skills),
      hours: t.hours,
      assigned: lookupUser(usersById, t.assigned_to_id),
    })),
  };
}

// ── Engineering Requirements ─────────────────

export interface Clarification {
  id: string;
  question: string;
  askedBy: string;
  askedAt: string;
  status: 'pending' | 'answered';
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
}

export interface EngineeringProject {
  id: string;
  title: string;
  description: string;
  businessContext: {
    problem: string;
    expectedOutcome: string;
    successMetrics: string[];
    constraints: string[];
  };
  team: { id: string; name: string; role: string; type: string }[];
  linkedIdea: { id: string; title: string; score: number };
  timeline: string;
  budget: string;
}

export async function getEngineeringProject(projectId: string): Promise<EngineeringProject> {
  const [project, teamRows, usersById] = await Promise.all([
    GET(`projects/${projectId}`) as Promise<ProjectEntity>,
    GET(`projects/${projectId}/team`) as Promise<ProjectTeamEntity[]>,
    getUsersById(),
  ]);

  const bizCtx = parseJson<{ problem?: string; expectedOutcome?: string; successMetrics?: string[]; constraints?: string[] }>(project.business_context);
  const linkedIdea = project.linked_idea_id
    ? await GET(`ideas/${project.linked_idea_id}`) as IdeaEntity | null
    : null;

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    businessContext: {
      problem: bizCtx.problem || '',
      expectedOutcome: bizCtx.expectedOutcome || '',
      successMetrics: bizCtx.successMetrics || [],
      constraints: bizCtx.constraints || [],
    },
    team: teamRows.map(t => ({
      id: t.user_id,
      name: lookupUser(usersById, t.user_id),
      role: t.role,
      type: t.type,
    })),
    linkedIdea: linkedIdea
      ? { id: linkedIdea.id, title: linkedIdea.title, score: linkedIdea.score }
      : { id: '', title: '', score: 0 },
    timeline: project.timeline_label,
    budget: project.budget_label,
  };
}

export async function getClarifications(projectId: string): Promise<Clarification[]> {
  const [clarRows, usersById] = await Promise.all([
    GET(`projects/${projectId}/clarifications`) as Promise<ClarificationEntity[]>,
    getUsersById(),
  ]);
  return clarRows.map(c => ({
    id: c.id,
    question: c.question,
    askedBy: lookupUser(usersById, c.asked_by_id),
    askedAt: c.asked_at,
    status: c.status as Clarification['status'],
    ...(c.answer ? { answer: c.answer } : {}),
    ...(c.answered_by_id ? { answeredBy: lookupUser(usersById, c.answered_by_id) } : {}),
    ...(c.answered_at ? { answeredAt: c.answered_at } : {}),
  }));
}
