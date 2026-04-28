import {
    isUserStatus,
    isIdeaStatus,
    isProjectStatus,
    isReadinessLevel,
} from './types.ts';
import type {
    GraphNode,
    GraphEdge,
    GraphField,
    StoredGraph,
    WorkOrderFlowGraph,
    FlowFieldType,
    UserStatus,
    IdeaStatus,
    ProjectStatus,
    ReadinessLevel,
    JsonArrayField,
    JsonObjectField,
    UserEntity,
    IdeaEntity,
    ProjectEntity,
    TeamEntity,
    TeamProjectEntity,
    TeamUserEntity,
    ActivityEntity,
    FlowEntity,
    FlowVersionEntity,
    WorkOrderEntity,
    FlowWorkOrderEntity,
    WorkOrderTransitionEntity,
    WorkOrderClaimEntity,
    CompanyEntity,
    OrganizationEntity,
    IdeaSubmissionEntity,
    ActivityActorEntity,
    ProjectFlowEntity,
} from './types.ts';

export interface Risk {
    title: string;
    severity: string;
    mitigation: string;
}

const FLOW_FIELD_TYPE_VALUES:
    readonly FlowFieldType[] = [
        'text', 'textarea', 'number',
        'date', 'select', 'checkbox',
        'file', 'email', 'url', 'phone',
        'currency', 'multi_select',
        'radio', 'image',
    ];

export function parseOrThrow(
    raw: string,
    label: string,
): unknown {
    try {
        return JSON.parse(raw);
    } catch (e) {
        const msg = e instanceof Error
            ? e.message
            : String(e);
        throw new Error(
            'invalid JSON for '
                + label + ': ' + msg,
        );
    }
}

export function asArray(
    value: unknown,
    label: string,
): unknown[] {
    if (!Array.isArray(value)) {
        throw new Error(
            'expected array for '
                + label
                + ', got '
                + typeName(value),
        );
    }
    return value;
}

export function asObject(
    value: unknown,
    label: string,
): Record<string, unknown> {
    if (
        typeof value !== 'object'
        || value === null
        || Array.isArray(value)
    ) {
        throw new Error(
            'expected object for '
                + label
                + ', got '
                + typeName(value),
        );
    }
    return value as Record<string, unknown>;
}

export function asString(
    value: unknown,
    label: string,
): string {
    if (typeof value !== 'string') {
        throw new Error(
            'expected string for '
                + label
                + ', got '
                + typeName(value),
        );
    }
    return value;
}

export function asNumber(
    value: unknown,
    label: string,
): number {
    if (
        typeof value !== 'number'
        || !Number.isFinite(value)
    ) {
        throw new Error(
            'expected finite number for '
                + label
                + ', got '
                + typeName(value),
        );
    }
    return value;
}

export function asBoolean(
    value: unknown,
    label: string,
): boolean {
    if (typeof value !== 'boolean') {
        throw new Error(
            'expected boolean for '
                + label
                + ', got '
                + typeName(value),
        );
    }
    return value;
}

export function asFlowFieldType(
    value: unknown,
    label: string,
): FlowFieldType {
    const str = asString(value, label);
    if (
        !(FLOW_FIELD_TYPE_VALUES as
            readonly string[]).includes(str)
    ) {
        throw new Error(
            'expected FlowFieldType for '
                + label + ', got ' + str,
        );
    }
    return str as FlowFieldType;
}

function typeName(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

export function validateStringArrayJson(
    raw: string,
    label: string,
): string[] {
    const parsed = parseOrThrow(raw, label);
    const arr = asArray(parsed, label);
    return arr.map((item, i) =>
        asString(
            item,
            label + '[' + i + ']',
        ),
    );
}

export function
validateStringNumberRecordJson(
    raw: string,
    label: string,
): Record<string, number> {
    const parsed = parseOrThrow(raw, label);
    const obj = asObject(parsed, label);
    const out: Record<string, number> = {};
    for (
        const [k, v] of Object.entries(obj)
    ) {
        out[k] = asNumber(
            v, label + '.' + k,
        );
    }
    return out;
}

export function validateRisksJson(
    raw: string,
): Risk[] {
    const label = 'risks';
    const parsed = parseOrThrow(raw, label);
    const arr = asArray(parsed, label);
    return arr.map((item, i) => {
        const itemLabel =
            label + '[' + i + ']';
        const obj = asObject(
            item, itemLabel,
        );
        return {
            title: asString(
                obj['title'],
                itemLabel + '.title',
            ),
            severity: asString(
                obj['severity'],
                itemLabel + '.severity',
            ),
            mitigation: asString(
                obj['mitigation'],
                itemLabel + '.mitigation',
            ),
        };
    });
}

function asGraphField(
    value: unknown,
    label: string,
): GraphField {
    const obj = asObject(value, label);
    const optsArr = asArray(
        obj['options'],
        label + '.options',
    );
    const name = asString(
        obj['name'], label + '.name',
    );
    if (name.length === 0) {
        throw new Error(
            'expected non-empty string'
            + ' for ' + label + '.name',
        );
    }
    return {
        id: asString(
            obj['id'], label + '.id',
        ),
        name,
        fieldType: asFlowFieldType(
            obj['fieldType'],
            label + '.fieldType',
        ),
        sortOrder: asNumber(
            obj['sortOrder'],
            label + '.sortOrder',
        ),
        isRequired: asBoolean(
            obj['isRequired'],
            label + '.isRequired',
        ),
        options: optsArr.map((o, i) =>
            asString(
                o,
                label + '.options['
                    + i + ']',
            ),
        ),
    };
}

function asGraphNode(
    value: unknown,
    label: string,
): GraphNode {
    const obj = asObject(value, label);
    const fieldsArr = asArray(
        obj['fields'],
        label + '.fields',
    );
    return {
        id: asString(
            obj['id'], label + '.id',
        ),
        name: asString(
            obj['name'], label + '.name',
        ),
        description: asString(
            obj['description'],
            label + '.description',
        ),
        positionX: asNumber(
            obj['positionX'],
            label + '.positionX',
        ),
        positionY: asNumber(
            obj['positionY'],
            label + '.positionY',
        ),
        isStart: asBoolean(
            obj['isStart'],
            label + '.isStart',
        ),
        isComplete: asBoolean(
            obj['isComplete'],
            label + '.isComplete',
        ),
        fields: fieldsArr.map((f, i) =>
            asGraphField(
                f,
                label + '.fields['
                    + i + ']',
            ),
        ),
    };
}

function asGraphEdge(
    value: unknown,
    label: string,
): GraphEdge {
    const obj = asObject(value, label);
    return {
        id: asString(
            obj['id'], label + '.id',
        ),
        name: asString(
            obj['name'], label + '.name',
        ),
        description: asString(
            obj['description'],
            label + '.description',
        ),
        fromNodeId: asString(
            obj['fromNodeId'],
            label + '.fromNodeId',
        ),
        toNodeId: asString(
            obj['toNodeId'],
            label + '.toNodeId',
        ),
    };
}

export function asStoredGraph(
    value: unknown,
    label: string,
): StoredGraph {
    const obj = asObject(value, label);
    const nodesArr = asArray(
        obj['nodes'],
        label + '.nodes',
    );
    const edgesArr = asArray(
        obj['edges'],
        label + '.edges',
    );
    return {
        nodes: nodesArr.map((n, i) =>
            asGraphNode(
                n,
                label + '.nodes['
                    + i + ']',
            ),
        ),
        edges: edgesArr.map((e, i) =>
            asGraphEdge(
                e,
                label + '.edges['
                    + i + ']',
            ),
        ),
    };
}

export function validateStoredGraphJson(
    raw: string,
    label: string,
): StoredGraph {
    const parsed = parseOrThrow(raw, label);
    return asStoredGraph(parsed, label);
}

export function
validateWorkOrderFlowGraphJson(
    raw: string,
    label: string,
): WorkOrderFlowGraph {
    const parsed = parseOrThrow(raw, label);
    const obj = asObject(parsed, label);
    const nodesArr = asArray(
        obj['nodes'],
        label + '.nodes',
    );
    const edgesArr = asArray(
        obj['edges'],
        label + '.edges',
    );
    return {
        flowId: asString(
            obj['flowId'],
            label + '.flowId',
        ),
        name: asString(
            obj['name'], label + '.name',
        ),
        description: asString(
            obj['description'],
            label + '.description',
        ),
        lockTimeout: asNumber(
            obj['lockTimeout'],
            label + '.lockTimeout',
        ),
        nodes: nodesArr.map((n, i) =>
            asGraphNode(
                n,
                label + '.nodes['
                    + i + ']',
            ),
        ),
        edges: edgesArr.map((e, i) =>
            asGraphEdge(
                e,
                label + '.edges['
                    + i + ']',
            ),
        ),
    };
}

export function
validateTransitionValuesJson(
    raw: string,
    label: string,
): Record<string, string> {
    const parsed = parseOrThrow(raw, label);
    const obj = asObject(parsed, label);
    const out: Record<string, string> = {};
    for (
        const [k, v] of Object.entries(obj)
    ) {
        out[k] = asString(
            v, label + '.' + k,
        );
    }
    return out;
}

// ── JSON field helpers ────────────────

function asJsonArrayField(
    value: unknown,
    label: string,
): JsonArrayField {
    const raw = asString(value, label);
    const parsed = parseOrThrow(raw, label);
    asArray(parsed, label);
    return raw as JsonArrayField;
}

function asJsonObjectField(
    value: unknown,
    label: string,
): JsonObjectField {
    const raw = asString(value, label);
    const parsed = parseOrThrow(raw, label);
    asObject(parsed, label);
    return raw as JsonObjectField;
}

// ── Enum validators ─────────────────

export function asUserStatus(
    value: unknown,
    label: string,
): UserStatus {
    const str = asString(value, label);
    if (!isUserStatus(str)) {
        throw new Error(
            'expected UserStatus for '
            + label + ', got ' + str,
        );
    }
    return str;
}

export function asIdeaStatus(
    value: unknown,
    label: string,
): IdeaStatus {
    const str = asString(value, label);
    if (!isIdeaStatus(str)) {
        throw new Error(
            'expected IdeaStatus for '
            + label + ', got ' + str,
        );
    }
    return str;
}

export function asProjectStatus(
    value: unknown,
    label: string,
): ProjectStatus {
    const str = asString(value, label);
    if (!isProjectStatus(str)) {
        throw new Error(
            'expected ProjectStatus for '
            + label + ', got ' + str,
        );
    }
    return str;
}

export function asReadinessLevel(
    value: unknown,
    label: string,
): ReadinessLevel {
    const str = asString(value, label);
    if (!isReadinessLevel(str)) {
        throw new Error(
            'expected ReadinessLevel for '
            + label + ', got ' + str,
        );
    }
    return str;
}

// ── Entity validators ────────────────

export function validateUserEntity(
    body: Record<string, unknown>,
): Omit<UserEntity, 'id'> {
    return {
        first_name: asString(
            body['first_name'], 'first_name',
        ),
        last_name: asString(
            body['last_name'], 'last_name',
        ),
        email: asString(
            body['email'], 'email',
        ),
        role: asString(
            body['role'], 'role',
        ),
        department: asString(
            body['department'], 'department',
        ),
        status: asUserStatus(
            body['status'], 'status',
        ),
        availability: asNumber(
            body['availability'],
            'availability',
        ),
        performance_score: asNumber(
            body['performance_score'],
            'performance_score',
        ),
        projects_completed: asNumber(
            body['projects_completed'],
            'projects_completed',
        ),
        current_projects: asNumber(
            body['current_projects'],
            'current_projects',
        ),
        strengths: asJsonArrayField(
            body['strengths'], 'strengths',
        ),
        team_dimensions: asJsonObjectField(
            body['team_dimensions'],
            'team_dimensions',
        ),
        phone: asString(
            body['phone'], 'phone',
        ),
        bio: asString(
            body['bio'], 'bio',
        ),
        last_active: asString(
            body['last_active'], 'last_active',
        ),
    };
}

export function validateIdeaEntity(
    body: Record<string, unknown>,
): Omit<IdeaEntity, 'id'> {
    return {
        title: asString(
            body['title'], 'title',
        ),
        position: asNumber(
            body['position'], 'position',
        ),
        status: asIdeaStatus(
            body['status'], 'status',
        ),
        problem_statement: asString(
            body['problem_statement'],
            'problem_statement',
        ),
        target_users: asString(
            body['target_users'],
            'target_users',
        ),
        proposed_solution: asString(
            body['proposed_solution'],
            'proposed_solution',
        ),
        expected_outcome: asString(
            body['expected_outcome'],
            'expected_outcome',
        ),
        success_metrics: asString(
            body['success_metrics'],
            'success_metrics',
        ),
        readiness: asReadinessLevel(
            body['readiness'], 'readiness',
        ),
        risks: asJsonArrayField(
            body['risks'], 'risks',
        ),
        assumptions: asJsonArrayField(
            body['assumptions'],
            'assumptions',
        ),
        alignments: asJsonArrayField(
            body['alignments'], 'alignments',
        ),
    };
}

export function validateProjectEntity(
    body: Record<string, unknown>,
): Omit<ProjectEntity, 'id'> {
    return {
        title: asString(
            body['title'], 'title',
        ),
        description: asString(
            body['description'],
            'description',
        ),
        status: asProjectStatus(
            body['status'], 'status',
        ),
        progress: asNumber(
            body['progress'], 'progress',
        ),
        start_date: asString(
            body['start_date'], 'start_date',
        ),
        target_end_date: asString(
            body['target_end_date'],
            'target_end_date',
        ),
        estimated_duration: asNumber(
            body['estimated_duration'],
            'estimated_duration',
        ),
        actual_duration: asNumber(
            body['actual_duration'],
            'actual_duration',
        ),
        estimated_cost: asNumber(
            body['estimated_cost'],
            'estimated_cost',
        ),
        actual_cost: asNumber(
            body['actual_cost'],
            'actual_cost',
        ),
        estimated_impact: asNumber(
            body['estimated_impact'],
            'estimated_impact',
        ),
        actual_impact: asNumber(
            body['actual_impact'],
            'actual_impact',
        ),
        position: asNumber(
            body['position'], 'position',
        ),
        business_context: asJsonObjectField(
            body['business_context'],
            'business_context',
        ),
        timeline_label: asString(
            body['timeline_label'],
            'timeline_label',
        ),
        budget_label: asString(
            body['budget_label'],
            'budget_label',
        ),
    };
}

export function validateTeamEntity(
    body: Record<string, unknown>,
): Omit<TeamEntity, 'id'> {
    return {
        role: asString(
            body['role'], 'role',
        ),
        type: asString(
            body['type'], 'type',
        ),
    };
}

export function validateTeamProjectEntity(
    body: Record<string, unknown>,
): Omit<TeamProjectEntity, 'id'> {
    return {
        team_id: asString(
            body['team_id'], 'team_id',
        ),
        project_id: asString(
            body['project_id'], 'project_id',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}

export function validateTeamUserEntity(
    body: Record<string, unknown>,
): Omit<TeamUserEntity, 'id'> {
    return {
        team_id: asString(
            body['team_id'], 'team_id',
        ),
        user_id: asString(
            body['user_id'], 'user_id',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}

export function validateActivityEntity(
    body: Record<string, unknown>,
): Omit<ActivityEntity, 'id'> {
    return {
        type: asString(
            body['type'], 'type',
        ),
        action: asString(
            body['action'], 'action',
        ),
        target: asString(
            body['target'], 'target',
        ),
        timestamp: asString(
            body['timestamp'], 'timestamp',
        ),
        status: asString(
            body['status'], 'status',
        ),
        feedback: asString(
            body['feedback'], 'feedback',
        ),
    };
}

export function validateFlowEntity(
    body: Record<string, unknown>,
): Omit<FlowEntity, 'id'> {
    return {
        name: asString(
            body['name'], 'name',
        ),
        description: asString(
            body['description'],
            'description',
        ),
        is_locked: asBoolean(
            body['is_locked'], 'is_locked',
        ),
        is_auto_layout: asBoolean(
            body['is_auto_layout'],
            'is_auto_layout',
        ),
        is_auto_fit: asBoolean(
            body['is_auto_fit'],
            'is_auto_fit',
        ),
        lock_timeout: asNumber(
            body['lock_timeout'],
            'lock_timeout',
        ),
        graph: asJsonObjectField(
            body['graph'], 'graph',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
        updated_at: asString(
            body['updated_at'], 'updated_at',
        ),
    };
}

export function validateFlowVersionEntity(
    body: Record<string, unknown>,
): Omit<FlowVersionEntity, 'id'> {
    return {
        flow_id: asString(
            body['flow_id'], 'flow_id',
        ),
        name: asString(
            body['name'], 'name',
        ),
        description: asString(
            body['description'],
            'description',
        ),
        is_locked: asBoolean(
            body['is_locked'], 'is_locked',
        ),
        is_auto_layout: asBoolean(
            body['is_auto_layout'],
            'is_auto_layout',
        ),
        is_auto_fit: asBoolean(
            body['is_auto_fit'],
            'is_auto_fit',
        ),
        lock_timeout: asNumber(
            body['lock_timeout'],
            'lock_timeout',
        ),
        graph: asJsonObjectField(
            body['graph'], 'graph',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}

export function validateWorkOrderEntity(
    body: Record<string, unknown>,
): Omit<WorkOrderEntity, 'id'> {
    return {
        display_id: asString(
            body['display_id'], 'display_id',
        ),
        flow_graph: asJsonObjectField(
            body['flow_graph'], 'flow_graph',
        ),
        position: asNumber(
            body['position'], 'position',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}

export function validateFlowWorkOrderEntity(
    body: Record<string, unknown>,
): Omit<FlowWorkOrderEntity, 'id'> {
    return {
        flow_id: asString(
            body['flow_id'], 'flow_id',
        ),
        work_order_id: asString(
            body['work_order_id'],
            'work_order_id',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}

export function
validateWorkOrderTransitionEntity(
    body: Record<string, unknown>,
): Omit<WorkOrderTransitionEntity, 'id'> {
    return {
        work_order_id: asString(
            body['work_order_id'],
            'work_order_id',
        ),
        from_node_id: asString(
            body['from_node_id'],
            'from_node_id',
        ),
        to_node_id: asString(
            body['to_node_id'], 'to_node_id',
        ),
        user_id: asString(
            body['user_id'], 'user_id',
        ),
        values: asJsonObjectField(
            body['values'], 'values',
        ),
        transitioned_at: asString(
            body['transitioned_at'],
            'transitioned_at',
        ),
    };
}

export function validateWorkOrderClaimEntity(
    body: Record<string, unknown>,
): Omit<WorkOrderClaimEntity, 'id'> {
    return {
        work_order_id: asString(
            body['work_order_id'],
            'work_order_id',
        ),
        user_id: asString(
            body['user_id'], 'user_id',
        ),
        claimed_at: asString(
            body['claimed_at'], 'claimed_at',
        ),
    };
}

export function validateCompanyEntity(
    body: Record<string, unknown>,
): Omit<CompanyEntity, 'id'> {
    return {
        name: asString(
            body['name'], 'name',
        ),
        domain: asString(
            body['domain'], 'domain',
        ),
    };
}

export function validateOrganizationEntity(
    body: Record<string, unknown>,
): Omit<OrganizationEntity, 'id'> {
    return {
        plan: asString(
            body['plan'], 'plan',
        ),
        plan_status: asString(
            body['plan_status'], 'plan_status',
        ),
        next_billing: asString(
            body['next_billing'],
            'next_billing',
        ),
        seats: asNumber(
            body['seats'], 'seats',
        ),
        used_seats: asNumber(
            body['used_seats'], 'used_seats',
        ),
        projects_limit: asNumber(
            body['projects_limit'],
            'projects_limit',
        ),
        projects_current: asNumber(
            body['projects_current'],
            'projects_current',
        ),
        ideas_limit: asNumber(
            body['ideas_limit'], 'ideas_limit',
        ),
        ideas_current: asNumber(
            body['ideas_current'],
            'ideas_current',
        ),
        storage_limit: asNumber(
            body['storage_limit'],
            'storage_limit',
        ),
        storage_current: asNumber(
            body['storage_current'],
            'storage_current',
        ),
        ai_credits_limit: asNumber(
            body['ai_credits_limit'],
            'ai_credits_limit',
        ),
        ai_credits_current: asNumber(
            body['ai_credits_current'],
            'ai_credits_current',
        ),
        health_score: asNumber(
            body['health_score'],
            'health_score',
        ),
        health_status: asString(
            body['health_status'],
            'health_status',
        ),
        last_activity: asString(
            body['last_activity'],
            'last_activity',
        ),
        active_users: asNumber(
            body['active_users'],
            'active_users',
        ),
    };
}

export function validateIdeaSubmissionEntity(
    body: Record<string, unknown>,
): Omit<IdeaSubmissionEntity, 'id'> {
    return {
        idea_id: asString(
            body['idea_id'], 'idea_id',
        ),
        user_id: asString(
            body['user_id'], 'user_id',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}

export function validateActivityActorEntity(
    body: Record<string, unknown>,
): Omit<ActivityActorEntity, 'id'> {
    return {
        activity_id: asString(
            body['activity_id'], 'activity_id',
        ),
        user_id: asString(
            body['user_id'], 'user_id',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}

export function validateProjectFlowEntity(
    body: Record<string, unknown>,
): Omit<ProjectFlowEntity, 'id'> {
    return {
        project_id: asString(
            body['project_id'], 'project_id',
        ),
        flow_id: asString(
            body['flow_id'], 'flow_id',
        ),
        created_at: asString(
            body['created_at'], 'created_at',
        ),
    };
}
