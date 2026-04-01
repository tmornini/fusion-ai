import type {
    UserEntity,
    IdeaEntity,
    ProjectEntity,
    TeamMembershipEntity,
    TeamMembershipProjectEntity,
    TeamMembershipUserEntity,
    MilestoneEntity,
    MilestoneProjectEntity,
    ProjectTaskEntity,
    ProjectTaskProjectEntity,
    DiscussionEntity,
    ProjectVersionEntity,
    ProjectVersionProjectEntity,
    ActivityEntity,
    ClarificationEntity,
    ClarificationAnswerEntity,
    ClarificationAnswerClarificationEntity,
    WorkflowEntity,
    WfNodeEntity,
    WfEdgeEntity,
    WfFieldEntity,
    CompanySettingsEntity,
    AccountEntity,
    IdeaSubmissionEntity,
    IdeaProjectLinkEntity,
    TaskAssignmentEntity,
    DiscussionAuthorshipEntity,
    DiscussionProjectEntity,
    VersionAuthorshipEntity,
    ActivityActorEntity,
    ClarificationAskerEntity,
    ClarificationAnswererEntity,
    ClarificationProjectEntity,
    ProjectWorkflowEntity,
    WfWorkflowNodeEntity,
    WfNodeEdgeEntity,
    WfNodeFieldEntity,
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
    projects: EntityStore<ProjectEntity>;
    teamMemberships:
        EntityStore<TeamMembershipEntity>;
    teamMembershipProjects:
        EntityStore<
            TeamMembershipProjectEntity
        >;
    teamMembershipUsers:
        EntityStore<
            TeamMembershipUserEntity
        >;
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
    activities: EntityStore<ActivityEntity>;
    clarifications: EntityStore<ClarificationEntity>;
    clarificationAnswers: EntityStore<ClarificationAnswerEntity>;
    clarificationAnswerClarifications:
        EntityStore<
            ClarificationAnswerClarificationEntity
        >;
    clarificationProjects: EntityStore<ClarificationProjectEntity>;
    workflows:
        EntityStore<WorkflowEntity>;
    wfNodes:
        EntityStore<WfNodeEntity>;
    wfEdges:
        EntityStore<WfEdgeEntity>;
    wfFields:
        EntityStore<WfFieldEntity>;
    projectWorkflows:
        EntityStore<
            ProjectWorkflowEntity
        >;
    wfWorkflowNodes:
        EntityStore<
            WfWorkflowNodeEntity
        >;
    wfNodeEdges:
        EntityStore<WfNodeEdgeEntity>;
    wfNodeFields:
        EntityStore<WfNodeFieldEntity>;
    companySettings: SingletonStore<CompanySettingsEntity>;
    account: SingletonStore<AccountEntity>;
    ideaSubmissions: EntityStore<IdeaSubmissionEntity>;
    ideaProjectLinks: EntityStore<IdeaProjectLinkEntity>;
    taskAssignments: EntityStore<TaskAssignmentEntity>;
    discussionAuthorships: EntityStore<DiscussionAuthorshipEntity>;
    versionAuthorships: EntityStore<VersionAuthorshipEntity>;
    activityActors: EntityStore<ActivityActorEntity>;
    clarificationAskers: EntityStore<ClarificationAskerEntity>;
    clarificationAnswerers: EntityStore<ClarificationAnswererEntity>;
}
