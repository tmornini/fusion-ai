// ============================================
// FUSION AI — Database Abstraction Interface
// ============================================

import type {
  UserEntity, IdeaEntity, IdeaScoreEntity, ProjectEntity, ProjectTeamEntity,
  MilestoneEntity, ProjectTaskEntity, DiscussionEntity, ProjectVersionEntity,
  EdgeEntity, EdgeOutcomeEntity, EdgeMetricEntity, ActivityEntity, NotificationEntity,
  ClarificationEntity, CrunchColumnEntity, ProcessEntity, ProcessStepEntity,
  CompanySettingsEntity, NotificationCategoryEntity, NotificationPrefEntity,
  AccountEntity,
} from './types';

export interface EntityStore<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  put(id: string, fields: Record<string, unknown>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface SingletonStore<T> {
  get(): Promise<T>;
  put(fields: Record<string, unknown>): Promise<T>;
}

export interface DbAdapter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  flush(): Promise<void>;
  wipeAllData(): Promise<void>;
  hasSchema(): Promise<boolean>;
  createSchema(): Promise<void>;
  exportSnapshot(): Promise<string>;
  importSnapshot(json: string): Promise<void>;

  users: EntityStore<UserEntity>;
  ideas: EntityStore<IdeaEntity>;
  ideaScores: {
    getByIdeaId(id: string): Promise<IdeaScoreEntity | null>;
    put(ideaId: string, data: Record<string, unknown>): Promise<IdeaScoreEntity>;
  };
  projects: EntityStore<ProjectEntity>;
  projectTeam: {
    getByProjectId(id: string): Promise<ProjectTeamEntity[]>;
    put(projectId: string, userId: string, data: Record<string, unknown>): Promise<ProjectTeamEntity>;
  };
  milestones: EntityStore<MilestoneEntity> & {
    getByProjectId(id: string): Promise<MilestoneEntity[]>;
  };
  projectTasks: EntityStore<ProjectTaskEntity> & {
    getByProjectId(id: string): Promise<ProjectTaskEntity[]>;
  };
  discussions: EntityStore<DiscussionEntity> & {
    getByProjectId(id: string): Promise<DiscussionEntity[]>;
  };
  projectVersions: EntityStore<ProjectVersionEntity> & {
    getByProjectId(id: string): Promise<ProjectVersionEntity[]>;
  };
  edges: EntityStore<EdgeEntity>;
  edgeOutcomes: EntityStore<EdgeOutcomeEntity> & {
    getByEdgeId(id: string): Promise<EdgeOutcomeEntity[]>;
  };
  edgeMetrics: EntityStore<EdgeMetricEntity>;
  activities: EntityStore<ActivityEntity>;
  notifications: EntityStore<NotificationEntity>;
  clarifications: EntityStore<ClarificationEntity> & {
    getByProjectId(id: string): Promise<ClarificationEntity[]>;
  };
  crunchColumns: EntityStore<CrunchColumnEntity>;
  processes: EntityStore<ProcessEntity>;
  processSteps: EntityStore<ProcessStepEntity> & {
    getByProcessId(id: string): Promise<ProcessStepEntity[]>;
  };
  companySettings: SingletonStore<CompanySettingsEntity>;
  notificationCategories: EntityStore<NotificationCategoryEntity>;
  notificationPrefs: {
    getAll(): Promise<NotificationPrefEntity[]>;
    getByCategoryId(id: string): Promise<NotificationPrefEntity[]>;
    put(id: string, data: Record<string, unknown>): Promise<NotificationPrefEntity>;
  };
  account: SingletonStore<AccountEntity>;
}
