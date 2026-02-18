// ============================================
// FUSION AI — Database Abstraction Interface
// Implement this for SQLite, Postgres, etc.
// ============================================

import type {
  UserRow, IdeaRow, IdeaScoreRow, ProjectRow, ProjectTeamRow,
  MilestoneRow, ProjectTaskRow, DiscussionRow, ProjectVersionRow,
  EdgeRow, EdgeOutcomeRow, EdgeMetricRow, ActivityRow, NotificationRow,
  ClarificationRow, CrunchColumnRow, ProcessRow, ProcessStepRow,
  CompanySettingsRow, NotificationCategoryRow, NotificationPrefRow,
  AccountRow,
} from './types';

export interface EntityStore<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  put(id: string, data: Record<string, unknown>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface SingletonStore<T> {
  get(): Promise<T>;
  put(data: Record<string, unknown>): Promise<T>;
}

export interface DbAdapter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  flush(): Promise<void>;
  wipeAllData(): Promise<void>;
  exportSnapshot(): Promise<string>;
  importSnapshot(json: string): Promise<void>;

  users: EntityStore<UserRow>;
  ideas: EntityStore<IdeaRow>;
  ideaScores: {
    getByIdeaId(id: string): Promise<IdeaScoreRow | null>;
    put(ideaId: string, data: Record<string, unknown>): Promise<IdeaScoreRow>;
  };
  projects: EntityStore<ProjectRow>;
  projectTeam: {
    getByProjectId(id: string): Promise<ProjectTeamRow[]>;
    put(projectId: string, userId: string, data: Record<string, unknown>): Promise<ProjectTeamRow>;
  };
  milestones: EntityStore<MilestoneRow> & {
    getByProjectId(id: string): Promise<MilestoneRow[]>;
  };
  projectTasks: EntityStore<ProjectTaskRow> & {
    getByProjectId(id: string): Promise<ProjectTaskRow[]>;
  };
  discussions: EntityStore<DiscussionRow> & {
    getByProjectId(id: string): Promise<DiscussionRow[]>;
  };
  projectVersions: EntityStore<ProjectVersionRow> & {
    getByProjectId(id: string): Promise<ProjectVersionRow[]>;
  };
  edges: EntityStore<EdgeRow>;
  edgeOutcomes: EntityStore<EdgeOutcomeRow> & {
    getByEdgeId(id: string): Promise<EdgeOutcomeRow[]>;
  };
  edgeMetrics: EntityStore<EdgeMetricRow>;
  activities: EntityStore<ActivityRow>;
  notifications: EntityStore<NotificationRow>;
  clarifications: EntityStore<ClarificationRow> & {
    getByProjectId(id: string): Promise<ClarificationRow[]>;
  };
  crunchColumns: EntityStore<CrunchColumnRow>;
  processes: EntityStore<ProcessRow>;
  processSteps: EntityStore<ProcessStepRow> & {
    getByProcessId(id: string): Promise<ProcessStepRow[]>;
  };
  companySettings: SingletonStore<CompanySettingsRow>;
  notificationCategories: EntityStore<NotificationCategoryRow>;
  notificationPrefs: {
    getAll(): Promise<NotificationPrefRow[]>;
    getByCategoryId(id: string): Promise<NotificationPrefRow[]>;
    put(id: string, data: Record<string, unknown>): Promise<NotificationPrefRow>;
  };
  account: SingletonStore<AccountRow>;
}
