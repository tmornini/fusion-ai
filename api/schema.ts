// ============================================
// FUSION AI — SQL Schema DDL
// All CREATE TABLE statements for SQLite.
// ============================================

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  availability INTEGER NOT NULL DEFAULT 100,
  performance_score INTEGER NOT NULL DEFAULT 0,
  projects_completed INTEGER NOT NULL DEFAULT 0,
  current_projects INTEGER NOT NULL DEFAULT 0,
  strengths TEXT NOT NULL DEFAULT '[]',
  team_dimensions TEXT NOT NULL DEFAULT '{}',
  phone TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  last_active TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  estimated_impact INTEGER NOT NULL DEFAULT 0,
  estimated_time INTEGER NOT NULL DEFAULT 0,
  estimated_cost INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_by_id TEXT NOT NULL DEFAULT '',
  edge_status TEXT NOT NULL DEFAULT 'incomplete',
  problem_statement TEXT NOT NULL DEFAULT '',
  proposed_solution TEXT NOT NULL DEFAULT '',
  expected_outcome TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  readiness TEXT NOT NULL DEFAULT '',
  waiting_days INTEGER NOT NULL DEFAULT 0,
  impact_label TEXT NOT NULL DEFAULT '',
  effort_label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL DEFAULT '',
  risks TEXT NOT NULL DEFAULT '[]',
  assumptions TEXT NOT NULL DEFAULT '[]',
  alignments TEXT NOT NULL DEFAULT '[]',
  effort_time_estimate TEXT NOT NULL DEFAULT '',
  effort_team_size TEXT NOT NULL DEFAULT '',
  cost_estimate TEXT NOT NULL DEFAULT '',
  cost_breakdown TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (submitted_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS idea_scores (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL,
  overall INTEGER NOT NULL DEFAULT 0,
  impact_score INTEGER NOT NULL DEFAULT 0,
  impact_breakdown TEXT NOT NULL DEFAULT '[]',
  feasibility_score INTEGER NOT NULL DEFAULT 0,
  feasibility_breakdown TEXT NOT NULL DEFAULT '[]',
  efficiency_score INTEGER NOT NULL DEFAULT 0,
  efficiency_breakdown TEXT NOT NULL DEFAULT '[]',
  estimated_time TEXT NOT NULL DEFAULT '',
  estimated_cost TEXT NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (idea_id) REFERENCES ideas(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  progress INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  target_end_date TEXT NOT NULL DEFAULT '',
  lead_id TEXT NOT NULL DEFAULT '',
  estimated_time INTEGER NOT NULL DEFAULT 0,
  actual_time INTEGER NOT NULL DEFAULT 0,
  estimated_cost INTEGER NOT NULL DEFAULT 0,
  actual_cost INTEGER NOT NULL DEFAULT 0,
  estimated_impact INTEGER NOT NULL DEFAULT 0,
  actual_impact INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  priority_score INTEGER NOT NULL DEFAULT 0,
  linked_idea_id TEXT NOT NULL DEFAULT '',
  business_context TEXT NOT NULL DEFAULT '{}',
  timeline_label TEXT NOT NULL DEFAULT '',
  budget_label TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (lead_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_team (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  date TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '[]',
  hours INTEGER NOT NULL DEFAULT 0,
  assigned_to_id TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS discussions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  changes TEXT NOT NULL DEFAULT '',
  author_id TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL DEFAULT '',
  impact_short_term TEXT NOT NULL DEFAULT '',
  impact_mid_term TEXT NOT NULL DEFAULT '',
  impact_long_term TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (idea_id) REFERENCES ideas(id)
);

CREATE TABLE IF NOT EXISTS edge_outcomes (
  id TEXT PRIMARY KEY,
  edge_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (edge_id) REFERENCES edges(id)
);

CREATE TABLE IF NOT EXISTS edge_metrics (
  id TEXT PRIMARY KEY,
  outcome_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  target TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  current TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (outcome_id) REFERENCES edge_outcomes(id)
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT '',
  actor_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  target TEXT NOT NULL DEFAULT '',
  timestamp TEXT NOT NULL DEFAULT '',
  score INTEGER,
  status TEXT,
  comment TEXT,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  unread INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS clarifications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  question TEXT NOT NULL DEFAULT '',
  asked_by_id TEXT NOT NULL DEFAULT '',
  asked_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  answer TEXT,
  answered_by_id TEXT,
  answered_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS crunch_columns (
  id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL DEFAULT '',
  friendly_name TEXT NOT NULL DEFAULT '',
  data_type TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sample_values TEXT NOT NULL DEFAULT '[]',
  is_acronym INTEGER NOT NULL DEFAULT 0,
  acronym_expansion TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS process_steps (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  tools TEXT NOT NULL DEFAULT '[]',
  duration TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'action',
  FOREIGN KEY (process_id) REFERENCES processes(id)
);

CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  name TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT '',
  enforce_sso INTEGER NOT NULL DEFAULT 0,
  two_factor INTEGER NOT NULL DEFAULT 0,
  ip_whitelist INTEGER NOT NULL DEFAULT 0,
  data_retention TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notification_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  email INTEGER NOT NULL DEFAULT 1,
  push INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES notification_categories(id)
);

CREATE TABLE IF NOT EXISTS account_config (
  id TEXT PRIMARY KEY DEFAULT '1',
  plan TEXT NOT NULL DEFAULT '',
  plan_status TEXT NOT NULL DEFAULT '',
  next_billing TEXT NOT NULL DEFAULT '',
  seats INTEGER NOT NULL DEFAULT 0,
  used_seats INTEGER NOT NULL DEFAULT 0,
  projects_limit INTEGER NOT NULL DEFAULT 0,
  projects_current INTEGER NOT NULL DEFAULT 0,
  ideas_limit INTEGER NOT NULL DEFAULT 0,
  ideas_current INTEGER NOT NULL DEFAULT 0,
  storage_limit REAL NOT NULL DEFAULT 0,
  storage_current REAL NOT NULL DEFAULT 0,
  ai_credits_limit INTEGER NOT NULL DEFAULT 0,
  ai_credits_current INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT '',
  last_activity TEXT NOT NULL DEFAULT '',
  active_users INTEGER NOT NULL DEFAULT 0
);
`;
