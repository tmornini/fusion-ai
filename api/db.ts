import type {
    UserEntity,
    IdeaEntity,
    IdeaScoreEntity,
    IdeaScoreIdeaEntity,
    ProjectEntity,
    ProjectTeamEntity,
    MilestoneEntity,
    MilestoneProjectEntity,
    ProjectTaskEntity,
    ProjectTaskProjectEntity,
    DiscussionEntity,
    ProjectVersionEntity,
    ProjectVersionProjectEntity,
    EdgeEntity,
    EdgeOutcomeEntity,
    EdgeMetricEntity,
    ActivityEntity,
    ClarificationEntity,
    CrunchColumnEntity,
    FlowEntity,
    FlowStepEntity,
    CompanySettingsEntity,
    AccountEntity,
    IdeaSubmissionEntity,
    IdeaProjectLinkEntity,
    EdgeOwnershipEntity,
    TaskAssignmentEntity,
    DiscussionAuthorshipEntity,
    DiscussionProjectEntity,
    VersionAuthorshipEntity,
    ActivityActorEntity,
    ClarificationAskerEntity,
    ClarificationAnswererEntity,
    ClarificationProjectEntity,
    ProcessStepProcessEntity,
} from './types';

export interface EntityStore<T> {
    getAll(): Promise<T[]>;
    getById(id: string): Promise<T | null>;
    put(id: string, fields: Partial<T>): Promise<T>;
    delete(id: string): Promise<void>;
}

export interface SingletonStore<T> {
    get(): Promise<T>;
    put(fields: Partial<T>): Promise<T>;
}

export interface DbAdapter {
    initialize(): Promise<void>;
    close(): Promise<void>;
    flush(): Promise<void>;
    deleteSchema(): Promise<void>;
    hasSchema(): Promise<boolean>;
    createSchema(): Promise<void>;
    exportSnapshot(): Promise<string>;
    importSnapshot(json: string): Promise<void>;

    users: EntityStore<UserEntity>;
    ideas: EntityStore<IdeaEntity>;
    ideaScores:
        EntityStore<IdeaScoreEntity>;
    ideaScoreIdeas:
        EntityStore<IdeaScoreIdeaEntity>;
    projects: EntityStore<ProjectEntity>;
    projectTeam: {
        getByProjectId(
            projectId: string,
        ): Promise<ProjectTeamEntity[]>;
        put(
            projectId: string,
            userId: string,
            fields: Partial<ProjectTeamEntity>,
        ): Promise<ProjectTeamEntity>;
    };
    milestones:
        EntityStore<MilestoneEntity>;
    milestoneProjects:
        EntityStore<MilestoneProjectEntity>;
    projectTasks:
        EntityStore<ProjectTaskEntity>;
    projectTaskProjects:
        EntityStore<
            ProjectTaskProjectEntity
        >;
    discussions:
        EntityStore<DiscussionEntity>;
    discussionProjects:
        EntityStore<
            DiscussionProjectEntity
        >;
    projectVersions:
        EntityStore<ProjectVersionEntity>;
    projectVersionProjects:
        EntityStore<
            ProjectVersionProjectEntity
        >;
    edges: EntityStore<EdgeEntity> & {
        getByIdeaId(ideaId: string): Promise<EdgeEntity | null>;
    };
    edgeOutcomes: EntityStore<EdgeOutcomeEntity> & {
        getByEdgeId(edgeId: string): Promise<EdgeOutcomeEntity[]>;
    };
    edgeMetrics: EntityStore<EdgeMetricEntity>;
    activities: EntityStore<ActivityEntity>;
    clarifications: EntityStore<ClarificationEntity>;
    clarificationProjects: EntityStore<ClarificationProjectEntity>;
    crunchColumns: EntityStore<CrunchColumnEntity>;
    flows: EntityStore<FlowEntity>;
    flowSteps: EntityStore<FlowStepEntity>;
    processStepProcesses: EntityStore<ProcessStepProcessEntity>;
    companySettings: SingletonStore<CompanySettingsEntity>;
    account: SingletonStore<AccountEntity>;
    ideaSubmissions: EntityStore<IdeaSubmissionEntity>;
    ideaProjectLinks: EntityStore<IdeaProjectLinkEntity>;
    edgeOwnerships: EntityStore<EdgeOwnershipEntity>;
    taskAssignments: EntityStore<TaskAssignmentEntity>;
    discussionAuthorships: EntityStore<DiscussionAuthorshipEntity>;
    versionAuthorships: EntityStore<VersionAuthorshipEntity>;
    activityActors: EntityStore<ActivityActorEntity>;
    clarificationAskers: EntityStore<ClarificationAskerEntity>;
    clarificationAnswerers: EntityStore<ClarificationAnswererEntity>;
}
