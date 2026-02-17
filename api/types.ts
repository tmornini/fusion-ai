// ============================================
// FUSION AI — API Type Definitions
// Row types (snake_case, matching SQL schema) and
// re-exported camelCase frontend types.
// ============================================

// ── Utility ──────────────────────────────────

export function snakeToCamel<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

// ── Row Types (match SQL columns) ────────────

export interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  availability: number;
  performance_score: number;
  projects_completed: number;
  current_projects: number;
  strengths: string; // JSON array
  team_dimensions: string; // JSON object
  phone: string;
  bio: string;
  last_active: string;
}

export interface IdeaRow {
  id: string;
  title: string;
  score: number;
  estimated_impact: number;
  estimated_time: number;
  estimated_cost: number;
  priority: number;
  status: string;
  submitted_by_id: string;
  edge_status: string;
  problem_statement: string;
  proposed_solution: string;
  expected_outcome: string;
  category: string;
  readiness: string;
  waiting_days: number;
  impact_label: string;
  effort_label: string;
  description: string;
  submitted_at: string;
  risks: string; // JSON array
  assumptions: string; // JSON array
  alignments: string; // JSON array
  effort_time_estimate: string;
  effort_team_size: string;
  cost_estimate: string;
  cost_breakdown: string;
}

export interface IdeaScoreRow {
  id: string;
  idea_id: string;
  overall: number;
  impact_score: number;
  impact_breakdown: string; // JSON array
  feasibility_score: number;
  feasibility_breakdown: string; // JSON array
  efficiency_score: number;
  efficiency_breakdown: string; // JSON array
  estimated_time: string;
  estimated_cost: string;
  recommendation: string;
}

export interface ProjectRow {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  start_date: string;
  target_end_date: string;
  lead_id: string;
  estimated_time: number;
  actual_time: number;
  estimated_cost: number;
  actual_cost: number;
  estimated_impact: number;
  actual_impact: number;
  priority: number;
  priority_score: number;
  linked_idea_id: string;
  business_context: string; // JSON object
  timeline_label: string;
  budget_label: string;
}

export interface ProjectTeamRow {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  type: string;
}

export interface MilestoneRow {
  id: string;
  project_id: string;
  title: string;
  status: string;
  date: string;
  sort_order: number;
}

export interface ProjectTaskRow {
  id: string;
  project_id: string;
  name: string;
  priority: string;
  description: string;
  skills: string; // JSON array
  hours: number;
  assigned_to_id: string;
}

export interface DiscussionRow {
  id: string;
  project_id: string;
  author_id: string;
  date: string;
  message: string;
}

export interface ProjectVersionRow {
  id: string;
  project_id: string;
  version: string;
  date: string;
  changes: string;
  author_id: string;
}

export interface EdgeRow {
  id: string;
  idea_id: string;
  status: string;
  confidence: string;
  owner_id: string;
  impact_short_term: string;
  impact_mid_term: string;
  impact_long_term: string;
  updated_at: string;
}

export interface EdgeOutcomeRow {
  id: string;
  edge_id: string;
  description: string;
}

export interface EdgeMetricRow {
  id: string;
  outcome_id: string;
  name: string;
  target: string;
  unit: string;
  current: string;
}

export interface ActivityRow {
  id: string;
  type: string;
  actor_id: string;
  action: string;
  target: string;
  timestamp: string;
  score: number | null;
  status: string | null;
  comment: string | null;
}

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: number; // 0 or 1 (SQLite boolean)
}

export interface ClarificationRow {
  id: string;
  project_id: string;
  question: string;
  asked_by_id: string;
  asked_at: string;
  status: string;
  answer: string | null;
  answered_by_id: string | null;
  answered_at: string | null;
}

export interface CrunchColumnRow {
  id: string;
  original_name: string;
  friendly_name: string;
  data_type: string;
  description: string;
  sample_values: string; // JSON array
  is_acronym: number; // 0 or 1
  acronym_expansion: string;
}

export interface ProcessRow {
  id: string;
  name: string;
  description: string;
  department: string;
}

export interface ProcessStepRow {
  id: string;
  process_id: string;
  title: string;
  description: string;
  owner: string;
  role: string;
  tools: string; // JSON array
  duration: string;
  sort_order: number;
  type: string;
}

export interface CompanySettingsRow {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  timezone: string;
  language: string;
  enforce_sso: number; // 0 or 1
  two_factor: number; // 0 or 1
  ip_whitelist: number; // 0 or 1
  data_retention: string;
}

export interface NotificationCategoryRow {
  id: string;
  label: string;
  icon: string;
}

export interface NotificationPrefRow {
  id: string;
  category_id: string;
  label: string;
  description: string;
  email: number; // 0 or 1
  push: number; // 0 or 1
}

export interface AccountRow {
  id: string;
  plan: string;
  plan_status: string;
  next_billing: string;
  seats: number;
  used_seats: number;
  projects_limit: number;
  projects_current: number;
  ideas_limit: number;
  ideas_current: number;
  storage_limit: number;
  storage_current: number;
  ai_credits_limit: number;
  ai_credits_current: number;
  health_score: number;
  health_status: string;
  last_activity: string;
  active_users: number;
}
