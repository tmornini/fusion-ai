import { GET } from '../../../api/api';
import type {
  ProjectEntity, ProjectTeamEntity, MilestoneEntity, ProjectTaskEntity,
  DiscussionEntity, ProjectVersionEntity,
  IdeaEntity, ClarificationEntity, UserEntity,
} from '../../../api/types';
import { getUsersById, lookupUser, parseJson, getEdgeDataByIdeaId } from './helpers';

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
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    status: row.status as Project['status'],
    priorityScore: row.priority_score,
    estimatedTime: row.estimated_time,
    actualTime: row.actual_time,
    estimatedCost: row.estimated_cost,
    actualCost: row.actual_cost,
    estimatedImpact: row.estimated_impact,
    actualImpact: row.actual_impact,
    progress: row.progress,
    priority: row.priority,
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
  const edgeData = await getEdgeDataByIdeaId(ideaId, usersById);
  if (!edgeData) {
    return { outcomes: [], impact: { shortTerm: '', midTerm: '', longTerm: '' }, confidence: 'medium', owner: '' };
  }
  return {
    ...edgeData,
    confidence: (edgeData.confidence || 'medium') as 'high' | 'medium' | 'low',
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
    team: teamRows.map(member => ({
      id: member.user_id,
      name: lookupUser(usersById, member.user_id),
      role: member.role,
    })),
    milestones: milestoneRows.map(milestone => ({
      id: milestone.id, title: milestone.title, status: milestone.status, date: milestone.date,
    })),
    versions: versionRows.map(version => ({
      id: version.id, version: version.version, date: version.date, changes: version.changes,
      author: lookupUser(usersById, version.author_id),
    })),
    discussions: discussionRows.map(discussion => ({
      id: discussion.id, date: discussion.date, message: discussion.message,
      author: lookupUser(usersById, discussion.author_id),
    })),
    tasks: taskRows.map(task => ({
      name: task.name, priority: task.priority, desc: task.description,
      skills: parseJson<string[]>(task.skills),
      hours: task.hours,
      assigned: lookupUser(usersById, task.assigned_to_id),
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
    team: teamRows.map(member => ({
      id: member.user_id,
      name: lookupUser(usersById, member.user_id),
      role: member.role,
      type: member.type,
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
  return clarRows.map(clarification => ({
    id: clarification.id,
    question: clarification.question,
    askedBy: lookupUser(usersById, clarification.asked_by_id),
    askedAt: clarification.asked_at,
    status: clarification.status as Clarification['status'],
    ...(clarification.answer ? { answer: clarification.answer } : {}),
    ...(clarification.answered_by_id ? { answeredBy: lookupUser(usersById, clarification.answered_by_id) } : {}),
    ...(clarification.answered_at ? { answeredAt: clarification.answered_at } : {}),
  }));
}
