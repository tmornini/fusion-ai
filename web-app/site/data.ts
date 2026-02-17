// ============================================
// FUSION AI — Data Layer
// Adapter between normalized API data and the
// denormalized shapes that page modules expect.
// All 27 function signatures preserved.
// ============================================

import { GET } from '../../api/api';
import type {
  UserRow, IdeaRow, IdeaScoreRow, ProjectRow, ProjectTeamRow,
  MilestoneRow, ProjectTaskRow, DiscussionRow, ProjectVersionRow,
  EdgeRow, EdgeOutcomeRow, EdgeMetricRow, ActivityRow, NotificationRow,
  ClarificationRow, CrunchColumnRow, ProcessRow, ProcessStepRow,
  CompanySettingsRow, NotificationCategoryRow, NotificationPrefRow,
  AccountRow,
} from '../../api/types';

// ── Helpers ──────────────────────────────────

function userName(u: UserRow): string {
  return `${u.first_name} ${u.last_name}`.trim();
}

async function getUserMap(): Promise<Map<string, UserRow>> {
  const users = await GET('users') as UserRow[];
  return new Map(users.map(u => [u.id, u]));
}

function parseJson<T>(val: string | T): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; }
    catch { return val as unknown as T; }
  }
  return val;
}

// ── Shared ──────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  avatar?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

export async function getCurrentUser(): Promise<User> {
  const row = await GET('current-user') as UserRow | null;
  if (!row) return { id: 'current', name: 'Demo User', email: 'demo@example.com', role: 'Admin', company: 'Demo Company' };
  return {
    id: row.id,
    name: userName(row),
    email: row.email,
    role: row.role,
    company: 'Demo Company',
  };
}

export async function getNotifications(): Promise<Notification[]> {
  const rows = await GET('notifications') as NotificationRow[];
  return rows.map(r => ({
    id: Number(r.id),
    title: r.title,
    message: r.message,
    time: r.time,
    unread: r.unread === 1 || r.unread as unknown === true,
  }));
}

// ── Dashboard ───────────────────────────────

export interface GaugeCardData {
  title: string;
  icon: string;
  iconClass: string;
  theme: 'blue' | 'green' | 'amber';
  outer: { value: number; max: number; label: string; display: string };
  inner: { value: number; max: number; label: string; display: string };
}

export interface QuickAction {
  label: string;
  icon: string;
  href: string;
}

export async function getDashboardGauges(): Promise<GaugeCardData[]> {
  const projects = await GET('projects') as ProjectRow[];
  const totalEstTime = projects.reduce((s, p) => s + p.estimated_time, 0);
  const totalActTime = projects.reduce((s, p) => s + p.actual_time, 0);
  const totalEstCost = projects.reduce((s, p) => s + p.estimated_cost, 0);
  const totalActCost = projects.reduce((s, p) => s + p.actual_cost, 0);
  const avgEstImpact = projects.length ? Math.round(projects.reduce((s, p) => s + p.estimated_impact, 0) / projects.length) : 0;
  const avgActImpact = projects.length ? Math.round(projects.filter(p => p.actual_impact > 0).reduce((s, p) => s + p.actual_impact, 0) / Math.max(1, projects.filter(p => p.actual_impact > 0).length)) : 0;

  return [
    {
      title: 'Time Tracking', icon: 'clock', iconClass: 'text-success', theme: 'green',
      outer: { value: Math.round(totalActTime / 24), max: Math.round(totalEstTime / 24), label: 'Total Duration', display: `${Math.round(totalEstTime / 24)}d` },
      inner: { value: Math.round(totalActTime / 48), max: Math.round(totalEstTime / 24), label: 'Days Elapsed', display: `${Math.round(totalActTime / 48)}d` },
    },
    {
      title: 'Cost Overview', icon: 'dollarSign', iconClass: 'text-primary', theme: 'blue',
      outer: { value: totalActCost, max: totalEstCost, label: 'Budget Spent', display: `$${(totalActCost / 1000).toFixed(1)}K` },
      inner: { value: Math.round(totalActCost * 0.6), max: totalEstCost, label: 'ROI Generated', display: `$${(totalActCost * 0.6 / 1000).toFixed(0)}K` },
    },
    {
      title: 'Project Impact', icon: 'zap', iconClass: 'text-warning', theme: 'amber',
      outer: { value: avgEstImpact, max: 100, label: 'Target Score', display: `${avgEstImpact}%` },
      inner: { value: avgActImpact, max: 100, label: 'Current Score', display: `${avgActImpact}%` },
    },
  ];
}

export async function getDashboardQuickActions(): Promise<QuickAction[]> {
  return [
    { label: 'New Idea', icon: 'lightbulb', href: '../idea-create/index.html' },
    { label: 'Create Project', icon: 'folderKanban', href: '../projects/index.html' },
    { label: 'Invite Team', icon: 'users', href: '../team/index.html' },
    { label: 'View Reports', icon: 'trendingUp', href: '../dashboard/index.html' },
  ];
}

export async function getDashboardStats(): Promise<{ label: string; value: number; trend: string }[]> {
  const [ideas, projects] = await Promise.all([
    GET('ideas') as Promise<IdeaRow[]>,
    GET('projects') as Promise<ProjectRow[]>,
  ]);
  const doneCount = projects.filter(p => p.progress >= 90).length;
  const reviewCount = ideas.filter(i => i.status === 'pending_review').length;
  return [
    { label: 'Ideas', value: ideas.length, trend: `+${Math.min(3, ideas.length)}` },
    { label: 'Projects', value: projects.length, trend: `+${Math.min(1, projects.length)}` },
    { label: 'Done', value: doneCount, trend: '' },
    { label: 'Review', value: reviewCount, trend: '' },
  ];
}

// ── Ideas ───────────────────────────────────

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
  edgeStatus: 'incomplete' | 'draft' | 'complete';
}

export async function getIdeas(): Promise<Idea[]> {
  const [ideas, userMap] = await Promise.all([
    GET('ideas') as Promise<IdeaRow[]>,
    getUserMap(),
  ]);
  return ideas
    .filter(i => i.priority > 0)
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

// ── Projects ────────────────────────────────

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
  const rows = await GET('projects') as ProjectRow[];
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

export async function getProjectById(id: string): Promise<ProjectDetail> {
  const [project, teamRows, milestoneRows, taskRows, discussionRows, versionRows, userMap] = await Promise.all([
    GET(`projects/${id}`) as Promise<ProjectRow>,
    GET(`projects/${id}/team`) as Promise<ProjectTeamRow[]>,
    GET(`projects/${id}/milestones`) as Promise<MilestoneRow[]>,
    GET(`projects/${id}/tasks`) as Promise<ProjectTaskRow[]>,
    GET(`projects/${id}/discussions`) as Promise<DiscussionRow[]>,
    GET(`projects/${id}/versions`) as Promise<ProjectVersionRow[]>,
    getUserMap(),
  ]);

  // Get edge data for this project's linked idea
  const ideaId = project.linked_idea_id || id;
  const allEdges = await GET('edges') as EdgeRow[];
  const edge = allEdges.find(e => e.idea_id === ideaId);
  let edgeData: ProjectDetail['edge'] = {
    outcomes: [], impact: { shortTerm: '', midTerm: '', longTerm: '' }, confidence: 'medium', owner: '',
  };

  if (edge) {
    const { getDbAdapter } = await import('../../api/api');
    const db = getDbAdapter();
    const outcomes = await db.edgeOutcomes.getByEdgeId(edge.id);
    const allMetrics = await db.edgeMetrics.getAll();

    edgeData = {
      outcomes: outcomes.map((o: EdgeOutcomeRow) => ({
        id: o.id,
        description: o.description,
        metrics: allMetrics.filter((m: EdgeMetricRow) => m.outcome_id === o.id).map((m: EdgeMetricRow) => ({
          id: m.id, name: m.name, target: m.target, unit: m.unit, current: m.current,
        })),
      })),
      impact: {
        shortTerm: edge.impact_short_term,
        midTerm: edge.impact_mid_term,
        longTerm: edge.impact_long_term,
      },
      confidence: (edge.confidence || 'medium') as 'high' | 'medium' | 'low',
      owner: userMap.get(edge.owner_id) ? userName(userMap.get(edge.owner_id)!) : '',
    };
  }

  const leadUser = userMap.get(project.lead_id);

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    progress: project.progress,
    startDate: project.start_date,
    targetEndDate: project.target_end_date,
    projectLead: leadUser ? userName(leadUser) : '',
    metrics: {
      time: { baseline: project.estimated_time, current: project.actual_time },
      cost: { baseline: project.estimated_cost, current: project.actual_cost },
      impact: { baseline: project.estimated_impact, current: project.actual_impact },
    },
    edge: edgeData,
    team: teamRows.map(t => ({
      id: t.user_id,
      name: userMap.get(t.user_id) ? userName(userMap.get(t.user_id)!) : '',
      role: t.role,
    })),
    milestones: milestoneRows.map(m => ({
      id: m.id, title: m.title, status: m.status, date: m.date,
    })),
    versions: versionRows.map(v => ({
      id: v.id, version: v.version, date: v.date, changes: v.changes,
      author: userMap.get(v.author_id) ? userName(userMap.get(v.author_id)!) : '',
    })),
    discussions: discussionRows.map(d => ({
      id: d.id, date: d.date, message: d.message,
      author: userMap.get(d.author_id) ? userName(userMap.get(d.author_id)!) : '',
    })),
    tasks: taskRows.map(t => ({
      name: t.name, priority: t.priority, desc: t.description,
      skills: parseJson<string[]>(t.skills),
      hours: t.hours,
      assigned: t.assigned_to_id && userMap.get(t.assigned_to_id) ? userName(userMap.get(t.assigned_to_id)!) : '',
    })),
  };
}

// ── Team ─────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  availability: number;
  performanceScore: number;
  projectsCompleted: number;
  currentProjects: number;
  strengths: string[];
  teamDimensions: Record<string, number>;
  status: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const rows = await GET('users') as UserRow[];
  return rows
    .filter(u => u.id !== 'current' && u.department !== '' && u.performance_score > 0)
    .slice(0, 6)
    .map(u => ({
      id: u.id,
      name: userName(u),
      role: u.role,
      department: u.department,
      email: u.email,
      availability: u.availability,
      performanceScore: u.performance_score,
      projectsCompleted: u.projects_completed,
      currentProjects: u.current_projects,
      strengths: parseJson<string[]>(u.strengths),
      teamDimensions: parseJson<Record<string, number>>(u.team_dimensions),
      status: u.status,
    }));
}

// ── Edge (per-idea definition) ──────────────

export interface EdgeIdea {
  title: string;
  problem: string;
  solution: string;
  submittedBy: string;
  score: number;
}

export async function getEdgeIdea(ideaId: string): Promise<EdgeIdea> {
  const [idea, userMap] = await Promise.all([
    GET(`ideas/${ideaId}`) as Promise<IdeaRow>,
    getUserMap(),
  ]);
  return {
    title: idea.title,
    problem: idea.problem_statement || 'Manual customer segmentation is time-consuming and often inaccurate, leading to misaligned marketing efforts.',
    solution: idea.proposed_solution || 'Implement ML-based customer clustering that automatically segments users based on behavior patterns.',
    submittedBy: userMap.get(idea.submitted_by_id) ? userName(userMap.get(idea.submitted_by_id)!) : 'Unknown',
    score: idea.score,
  };
}

// ── Edge List ───────────────────────────────

export interface EdgeItem {
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

export async function getEdges(): Promise<EdgeItem[]> {
  const [edgeRows, ideaRows, userMap] = await Promise.all([
    GET('edges') as Promise<EdgeRow[]>,
    GET('ideas') as Promise<IdeaRow[]>,
    getUserMap(),
  ]);
  const { getDbAdapter } = await import('../../api/api');
  const db = getDbAdapter();

  const ideaMap = new Map(ideaRows.map(i => [i.id, i]));

  return Promise.all(edgeRows.map(async (e) => {
    const outcomes = await db.edgeOutcomes.getByEdgeId(e.id);
    const allMetrics = await db.edgeMetrics.getAll();
    const outcomeIds = new Set(outcomes.map(o => o.id));
    const metricsCount = allMetrics.filter(m => outcomeIds.has(m.outcome_id)).length;

    const idea = ideaMap.get(e.idea_id);
    return {
      id: e.id,
      ideaId: e.idea_id,
      ideaTitle: idea?.title || '',
      status: (e.status || 'missing') as EdgeItem['status'],
      outcomesCount: outcomes.length,
      metricsCount,
      confidence: (e.confidence || null) as EdgeItem['confidence'],
      owner: e.owner_id && userMap.get(e.owner_id) ? userName(userMap.get(e.owner_id)!) : '',
      updatedAt: e.updated_at,
    };
  }));
}

// ── Account ─────────────────────────────────

export interface AccountData {
  company: {
    name: string;
    plan: string;
    planStatus: string;
    nextBilling: string;
    seats: number;
    usedSeats: number;
  };
  usage: {
    projects: { current: number; limit: number };
    ideas: { current: number; limit: number };
    storage: { current: number; limit: number };
    aiCredits: { current: number; limit: number };
  };
  health: { score: number; status: string; lastActivity: string; activeUsers: number };
  recentActivity: { type: string; description: string; time: string }[];
}

export async function getAccountData(): Promise<AccountData> {
  const [account, settings, activities] = await Promise.all([
    GET('account') as Promise<AccountRow>,
    GET('company-settings') as Promise<CompanySettingsRow>,
    GET('activities') as Promise<ActivityRow[]>,
  ]);

  const userMap = await getUserMap();

  return {
    company: {
      name: settings.name,
      plan: account.plan,
      planStatus: account.plan_status,
      nextBilling: account.next_billing,
      seats: account.seats,
      usedSeats: account.used_seats,
    },
    usage: {
      projects: { current: account.projects_current, limit: account.projects_limit },
      ideas: { current: account.ideas_current, limit: account.ideas_limit },
      storage: { current: account.storage_current, limit: account.storage_limit },
      aiCredits: { current: account.ai_credits_current, limit: account.ai_credits_limit },
    },
    health: { score: account.health_score, status: account.health_status, lastActivity: account.last_activity, activeUsers: account.active_users },
    recentActivity: activities.slice(0, 3).map(a => ({
      type: a.type,
      description: `${userMap.get(a.actor_id) ? userName(userMap.get(a.actor_id)!) : 'Unknown'} ${a.action} ${a.target}`,
      time: a.timestamp,
    })),
  };
}

// ── Profile ─────────────────────────────────

export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  bio: string;
}

export const allStrengths = ['Strategic Planning', 'Data Analysis', 'Stakeholder Management', 'Agile Methods', 'Team Leadership', 'Risk Management', 'Budget Planning', 'Technical Writing', 'User Research', 'Prototyping'];

export async function getProfileData(): Promise<ProfileData> {
  const user = await GET('current-user') as UserRow | null;
  if (!user) return { firstName: 'Alex', lastName: 'Thompson', email: 'alex.thompson@company.com', phone: '+1 (555) 123-4567', role: 'Product Manager', department: 'Product', bio: 'Passionate about building products that solve real problems.' };
  return {
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    department: user.department,
    bio: user.bio,
  };
}

// ── Company Settings ────────────────────────

export interface CompanySettingsData {
  name: string;
  domain: string;
  industry: string;
  size: string;
  timezone: string;
  language: string;
  enforceSSO: boolean;
  twoFactor: boolean;
  ipWhitelist: boolean;
  dataRetention: string;
}

export async function getCompanySettings(): Promise<CompanySettingsData> {
  const row = await GET('company-settings') as CompanySettingsRow;
  return {
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    size: row.size,
    timezone: row.timezone,
    language: row.language,
    enforceSSO: row.enforce_sso === 1 || row.enforce_sso as unknown === true,
    twoFactor: row.two_factor === 1 || row.two_factor as unknown === true,
    ipWhitelist: row.ip_whitelist === 1 || row.ip_whitelist as unknown === true,
    dataRetention: row.data_retention,
  };
}

// ── Manage Users ────────────────────────────

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  department: string;
  status: 'active' | 'pending' | 'deactivated';
  lastActive: string;
}

export async function getUsers(): Promise<UserData[]> {
  const rows = await GET('users') as UserRow[];
  return rows
    .filter(u => u.id !== 'current')
    .map(u => ({
      id: u.id,
      name: userName(u),
      email: u.email,
      role: u.role as UserData['role'],
      department: u.department,
      status: u.status as UserData['status'],
      lastActive: u.last_active,
    }));
}

// ── Activity Feed ───────────────────────────

export interface ActivityItem {
  id: string;
  type: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  score?: number;
  status?: string;
  comment?: string;
}

export async function getActivityFeed(): Promise<ActivityItem[]> {
  const [activities, userMap] = await Promise.all([
    GET('activities') as Promise<ActivityRow[]>,
    getUserMap(),
  ]);
  return activities.map(a => ({
    id: a.id,
    type: a.type,
    actor: userMap.get(a.actor_id) ? userName(userMap.get(a.actor_id)!) : 'Unknown',
    action: a.action,
    target: a.target,
    timestamp: a.timestamp,
    ...(a.score != null ? { score: a.score } : {}),
    ...(a.status != null ? { status: a.status } : {}),
    ...(a.comment != null ? { comment: a.comment } : {}),
  }));
}

// ── Notification Settings ───────────────────

export interface NotificationPref {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

export interface NotificationCategory {
  id: string;
  label: string;
  icon: string;
  prefs: NotificationPref[];
}

export async function getNotificationCategories(): Promise<NotificationCategory[]> {
  const [categories, prefs] = await Promise.all([
    GET('notification-categories') as Promise<NotificationCategoryRow[]>,
    GET('notification-prefs') as Promise<NotificationPrefRow[]>,
  ]);

  const prefsByCategory = new Map<string, NotificationPrefRow[]>();
  for (const p of prefs) {
    const list = prefsByCategory.get(p.category_id) || [];
    list.push(p);
    prefsByCategory.set(p.category_id, list);
  }

  return categories.map(c => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    prefs: (prefsByCategory.get(c.id) || []).map(p => ({
      id: p.id,
      label: p.label,
      description: p.description,
      email: p.email === 1 || p.email as unknown === true,
      push: p.push === 1 || p.push as unknown === true,
    })),
  }));
}

// ── Crunch ───────────────────────────────────

export interface CrunchColumn {
  id: string;
  originalName: string;
  friendlyName: string;
  dataType: string;
  description: string;
  sampleValues: string[];
  isAcronym: boolean;
  acronymExpansion: string;
}

export async function getCrunchColumns(): Promise<CrunchColumn[]> {
  const rows = await GET('crunch-columns') as CrunchColumnRow[];
  return rows.map(r => ({
    id: r.id,
    originalName: r.original_name,
    friendlyName: r.friendly_name,
    dataType: r.data_type,
    description: r.description,
    sampleValues: parseJson<string[]>(r.sample_values),
    isAcronym: r.is_acronym === 1 || r.is_acronym as unknown === true,
    acronymExpansion: r.acronym_expansion,
  }));
}

// ── Flow ─────────────────────────────────────

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
  owner: string;
  role: string;
  tools: string[];
  duration: string;
  order: number;
  type: 'action' | 'decision' | 'start' | 'end';
}

export interface FlowData {
  processName: string;
  processDescription: string;
  processDepartment: string;
  steps: ProcessStep[];
}

export async function getFlowData(): Promise<FlowData> {
  const processes = await GET('processes') as ProcessRow[];
  const process = processes[0];
  if (!process) {
    return { processName: '', processDescription: '', processDepartment: '', steps: [] };
  }

  const { getDbAdapter } = await import('../../api/api');
  const db = getDbAdapter();
  const steps = await db.processSteps.getByProcessId(process.id);

  return {
    processName: process.name,
    processDescription: process.description,
    processDepartment: process.department,
    steps: steps.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      owner: s.owner,
      role: s.role,
      tools: parseJson<string[]>(s.tools),
      duration: s.duration,
      order: s.sort_order,
      type: s.type as ProcessStep['type'],
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
  const [project, teamRows, userMap] = await Promise.all([
    GET(`projects/${projectId}`) as Promise<ProjectRow>,
    GET(`projects/${projectId}/team`) as Promise<ProjectTeamRow[]>,
    getUserMap(),
  ]);

  const bizCtx = parseJson<{ problem?: string; expectedOutcome?: string; successMetrics?: string[]; constraints?: string[] }>(project.business_context);
  const linkedIdea = project.linked_idea_id
    ? await GET(`ideas/${project.linked_idea_id}`) as IdeaRow | null
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
      name: userMap.get(t.user_id) ? userName(userMap.get(t.user_id)!) : '',
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
  const [clarRows, userMap] = await Promise.all([
    GET(`projects/${projectId}/clarifications`) as Promise<ClarificationRow[]>,
    getUserMap(),
  ]);
  return clarRows.map(c => ({
    id: c.id,
    question: c.question,
    askedBy: userMap.get(c.asked_by_id) ? userName(userMap.get(c.asked_by_id)!) : '',
    askedAt: c.asked_at,
    status: c.status as Clarification['status'],
    ...(c.answer ? { answer: c.answer } : {}),
    ...(c.answered_by_id ? { answeredBy: userMap.get(c.answered_by_id) ? userName(userMap.get(c.answered_by_id)!) : '' } : {}),
    ...(c.answered_at ? { answeredAt: c.answered_at } : {}),
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
  const idea = await GET(`ideas/${ideaId}`) as IdeaRow;
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

  const { getDbAdapter } = await import('../../api/api');
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
