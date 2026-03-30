import {
    GET, POST, PUT, DELETE,
} from '../../../api/api';
import type {
    WorkflowEntity,
    WfNodeEntity,
    WfEdgeEntity,
    WfFieldEntity,
    ProjectEntity,
    ProjectWorkflowEntity,
    WfWorkflowNodeEntity,
    WfNodeEdgeEntity,
    WfNodeFieldEntity,
} from '../../../api/types';
import {
    nowUtc,
    toBool,
    jsonArrayField,
} from '../../../api/types';
import { parseJson } from './helpers';

const DEFAULT_START_NAME = 'New';
const DEFAULT_COMPLETE_NAME = 'Complete';
const DEFAULT_START_X = 40;
const DEFAULT_START_Y = 30;
const DEFAULT_COMPLETE_X = 680;
const DEFAULT_COMPLETE_Y = 370;

export interface WorkflowListItem {
    id: string;
    name: string;
    description: string;
    nodeCount: number;
    edgeCount: number;
}

export interface WorkflowSummary
    extends WorkflowListItem {
    projectName: string | null;
}

export interface GraphField {
    id: string;
    name: string;
    fieldType: string;
    sortOrder: number;
    isRequired: boolean;
    options: string[];
}

export interface GraphNode {
    id: string;
    name: string;
    description: string;
    positionX: number;
    positionY: number;
    isStart: boolean;
    isComplete: boolean;
    fields: GraphField[];
}

export interface GraphEdge {
    id: string;
    name: string;
    description: string;
    fromNodeId: string;
    toNodeId: string;
}

export interface WorkflowGraph {
    id: string;
    name: string;
    description: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export async function getWorkflows(
): Promise<WorkflowSummary[]> {
    const [
        workflows, projectWorkflows,
        projects, workflowNodes,
        nodeEdges,
    ] = await Promise.all([
        GET<WorkflowEntity[]>(
            'workflows',
        ),
        GET<ProjectWorkflowEntity[]>(
            'project-workflows',
        ),
        GET<ProjectEntity[]>('projects'),
        GET<WfWorkflowNodeEntity[]>(
            'wf-workflow-nodes',
        ),
        GET<WfNodeEdgeEntity[]>(
            'wf-node-edges',
        ),
    ]);

    const projectMap = new Map(
        projects.map(p => [p.id, p.title]),
    );

    const projectByWorkflow = new Map<
        string, string | null
    >();
    for (const pw of projectWorkflows) {
        projectByWorkflow.set(
            pw.workflow_id,
            projectMap.get(
                pw.project_id,
            ) ?? null,
        );
    }

    const nodeIdsByWorkflow = new Map<
        string, Set<string>
    >();
    for (const wn of workflowNodes) {
        const existing =
            nodeIdsByWorkflow.get(
                wn.workflow_id,
            );
        if (existing) {
            existing.add(wn.node_id);
        } else {
            nodeIdsByWorkflow.set(
                wn.workflow_id,
                new Set([wn.node_id]),
            );
        }
    }

    const edgeCountByWorkflow = new Map<
        string, number
    >();
    for (const wf of workflows) {
        const nodeIds =
            nodeIdsByWorkflow.get(wf.id);
        if (!nodeIds) {
            edgeCountByWorkflow.set(
                wf.id, 0,
            );
            continue;
        }
        let count = 0;
        for (const ne of nodeEdges) {
            if (
                nodeIds.has(
                    ne.from_node_id,
                )
                || nodeIds.has(
                    ne.to_node_id,
                )
            ) {
                count++;
            }
        }
        edgeCountByWorkflow.set(
            wf.id, count,
        );
    }

    return workflows.map(wf => ({
        id: wf.id,
        name: wf.name,
        description: wf.description,
        projectName:
            projectByWorkflow.get(wf.id)
                ?? null,
        nodeCount:
            nodeIdsByWorkflow
                .get(wf.id)?.size ?? 0,
        edgeCount:
            edgeCountByWorkflow
                .get(wf.id) ?? 0,
    }));
}

export async function getWorkflowsByProject(
    projectId: string,
): Promise<WorkflowListItem[]> {
    const [
        projectWorkflows, workflows,
        workflowNodes, nodeEdges,
    ] = await Promise.all([
        GET<ProjectWorkflowEntity[]>(
            'project-workflows',
        ),
        GET<WorkflowEntity[]>(
            'workflows',
        ),
        GET<WfWorkflowNodeEntity[]>(
            'wf-workflow-nodes',
        ),
        GET<WfNodeEdgeEntity[]>(
            'wf-node-edges',
        ),
    ]);

    const workflowIds = new Set(
        projectWorkflows
            .filter(
                pw =>
                    pw.project_id
                        === projectId,
            )
            .map(pw => pw.workflow_id),
    );

    const workflowMap = new Map(
        workflows.map(w => [w.id, w]),
    );

    const nodeIdsByWorkflow = new Map<
        string, Set<string>
    >();
    for (const wn of workflowNodes) {
        if (!workflowIds.has(wn.workflow_id))
            continue;
        const existing =
            nodeIdsByWorkflow.get(
                wn.workflow_id,
            );
        if (existing) {
            existing.add(wn.node_id);
        } else {
            nodeIdsByWorkflow.set(
                wn.workflow_id,
                new Set([wn.node_id]),
            );
        }
    }

    const edgeCountByWorkflow = new Map<
        string, number
    >();
    for (const wfId of workflowIds) {
        const nodeIds =
            nodeIdsByWorkflow.get(wfId);
        if (!nodeIds) {
            edgeCountByWorkflow.set(wfId, 0);
            continue;
        }
        let count = 0;
        for (const ne of nodeEdges) {
            if (
                nodeIds.has(
                    ne.from_node_id,
                )
                || nodeIds.has(
                    ne.to_node_id,
                )
            ) {
                count++;
            }
        }
        edgeCountByWorkflow.set(
            wfId, count,
        );
    }

    const result: WorkflowListItem[] = [];
    for (const wfId of workflowIds) {
        const wf = workflowMap.get(wfId);
        if (!wf) continue;
        result.push({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            nodeCount:
                nodeIdsByWorkflow
                    .get(wfId)?.size ?? 0,
            edgeCount:
                edgeCountByWorkflow
                    .get(wfId) ?? 0,
        });
    }
    return result;
}

export async function getWorkflowGraph(
    workflowId: string,
): Promise<WorkflowGraph | null> {
    const workflow =
        await GET<WorkflowEntity | null>(
            `workflows/${workflowId}`,
        );
    if (!workflow) return null;

    const [
        allWorkflowNodes, allNodeEdges,
        allNodes, allEdges,
        allFields, allNodeFields,
    ] = await Promise.all([
        GET<WfWorkflowNodeEntity[]>(
            'wf-workflow-nodes',
        ),
        GET<WfNodeEdgeEntity[]>(
            'wf-node-edges',
        ),
        GET<WfNodeEntity[]>('wf-nodes'),
        GET<WfEdgeEntity[]>('wf-edges'),
        GET<WfFieldEntity[]>('wf-fields'),
        GET<WfNodeFieldEntity[]>(
            'wf-node-fields',
        ),
    ]);

    const nodeIds = new Set(
        allWorkflowNodes
            .filter(
                wn =>
                    wn.workflow_id
                        === workflowId,
            )
            .map(wn => wn.node_id),
    );

    const nodeMap = new Map(
        allNodes.map(n => [n.id, n]),
    );
    const edgeMap = new Map(
        allEdges.map(e => [e.id, e]),
    );
    const fieldMap = new Map(
        allFields.map(f => [f.id, f]),
    );

    const fieldsByNodeId = new Map<
        string, GraphField[]
    >();
    for (const nf of allNodeFields) {
        if (!nodeIds.has(nf.node_id))
            continue;
        const field =
            fieldMap.get(nf.field_id);
        if (!field) continue;
        const graphField: GraphField = {
            id: field.id,
            name: field.name,
            fieldType: field.field_type,
            sortOrder: field.sort_order,
            isRequired:
                toBool(field.is_required),
            options: parseJson<string[]>(
                field.options, [],
            ),
        };
        const existing =
            fieldsByNodeId.get(nf.node_id);
        if (existing) {
            existing.push(graphField);
        } else {
            fieldsByNodeId.set(
                nf.node_id,
                [graphField],
            );
        }
    }

    const nodes: GraphNode[] = [];
    for (const nodeId of nodeIds) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;
        const fields =
            fieldsByNodeId.get(nodeId) ?? [];
        fields.sort(
            (a, b) =>
                a.sortOrder - b.sortOrder,
        );
        nodes.push({
            id: node.id,
            name: node.name,
            description: node.description,
            positionX: node.position_x,
            positionY: node.position_y,
            isStart:
                toBool(node.is_start),
            isComplete:
                toBool(node.is_complete),
            fields,
        });
    }

    const edges: GraphEdge[] = [];
    for (const ne of allNodeEdges) {
        if (
            !nodeIds.has(ne.from_node_id)
            && !nodeIds.has(ne.to_node_id)
        ) continue;
        const edge =
            edgeMap.get(ne.wf_edge_id);
        if (!edge) continue;
        edges.push({
            id: edge.id,
            name: edge.name,
            description: edge.description,
            fromNodeId: ne.from_node_id,
            toNodeId: ne.to_node_id,
        });
    }

    return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes,
        edges,
    };
}

export async function postWorkflow(
    projectId: string,
    name: string,
    description: string,
): Promise<string> {
    const workflowId =
        crypto.randomUUID();
    const startNodeId =
        crypto.randomUUID();
    const completeNodeId =
        crypto.randomUUID();
    const now = nowUtc();

    await POST<void>('workflows', {
        id: workflowId,
        name,
        description,
        created_at: now,
        updated_at: now,
    });

    await Promise.all([
        POST<void>('wf-nodes', {
            id: startNodeId,
            name: DEFAULT_START_NAME,
            description: '',
            position_x: DEFAULT_START_X,
            position_y: DEFAULT_START_Y,
            is_start: 1,
            is_complete: 0,
            created_at: now,
        }),
        POST<void>('wf-nodes', {
            id: completeNodeId,
            name: DEFAULT_COMPLETE_NAME,
            description: '',
            position_x: DEFAULT_COMPLETE_X,
            position_y: DEFAULT_COMPLETE_Y,
            is_start: 0,
            is_complete: 1,
            created_at: now,
        }),
    ]);

    await Promise.all([
        POST<void>('project-workflows', {
            id: crypto.randomUUID(),
            project_id: projectId,
            workflow_id: workflowId,
            created_at: now,
        }),
        POST<void>('wf-workflow-nodes', {
            id: crypto.randomUUID(),
            workflow_id: workflowId,
            node_id: startNodeId,
            created_at: now,
        }),
        POST<void>('wf-workflow-nodes', {
            id: crypto.randomUUID(),
            workflow_id: workflowId,
            node_id: completeNodeId,
            created_at: now,
        }),
    ]);

    return workflowId;
}

export async function postNode(
    workflowId: string,
    name: string,
    positionX: number,
    positionY: number,
): Promise<string> {
    const nodeId = crypto.randomUUID();
    const now = nowUtc();

    await POST<void>('wf-nodes', {
        id: nodeId,
        name,
        description: '',
        position_x: positionX,
        position_y: positionY,
        is_start: 0,
        is_complete: 0,
        created_at: now,
    });

    await POST<void>(
        'wf-workflow-nodes',
        {
            id: crypto.randomUUID(),
            workflow_id: workflowId,
            node_id: nodeId,
            created_at: now,
        },
    );

    return nodeId;
}

export async function postEdge(
    name: string,
    fromNodeId: string,
    toNodeId: string,
): Promise<string> {
    const edgeId = crypto.randomUUID();
    const now = nowUtc();

    await POST<void>('wf-edges', {
        id: edgeId,
        name,
        description: '',
        created_at: now,
    });

    await POST<void>('wf-node-edges', {
        id: crypto.randomUUID(),
        wf_edge_id: edgeId,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        created_at: now,
    });

    return edgeId;
}

export async function postField(
    nodeId: string,
    name: string,
    fieldType: string,
    sortOrder: number,
    isRequired: boolean,
    options: string[],
): Promise<string> {
    const fieldId = crypto.randomUUID();
    const now = nowUtc();

    await POST<void>('wf-fields', {
        id: fieldId,
        name,
        field_type: fieldType,
        sort_order: sortOrder,
        is_required: isRequired ? 1 : 0,
        options: jsonArrayField(options),
        created_at: now,
    });

    await POST<void>('wf-node-fields', {
        id: crypto.randomUUID(),
        node_id: nodeId,
        field_id: fieldId,
        created_at: now,
    });

    return fieldId;
}

export async function putWorkflow(
    id: string,
    fields: {
        name?: string;
        description?: string;
    },
): Promise<void> {
    await PUT(`workflows/${id}`, {
        ...fields,
        updated_at: nowUtc(),
    });
}

export async function putNode(
    id: string,
    fields: {
        name?: string;
        description?: string;
        position_x?: number;
        position_y?: number;
    },
): Promise<void> {
    await PUT(`wf-nodes/${id}`, fields);
}

export async function putWfEdge(
    id: string,
    fields: {
        name?: string;
        description?: string;
    },
): Promise<void> {
    await PUT(`wf-edges/${id}`, fields);
}

export async function putField(
    id: string,
    fields: {
        name?: string;
        field_type?: string;
        sort_order?: number;
        is_required?: boolean;
        options?: string[];
    },
): Promise<void> {
    const body: Record<string, unknown> =
        {};
    if (fields.name !== undefined)
        body.name = fields.name;
    if (fields.field_type !== undefined)
        body.field_type = fields.field_type;
    if (fields.sort_order !== undefined)
        body.sort_order = fields.sort_order;
    if (fields.is_required !== undefined)
        body.is_required =
            fields.is_required ? 1 : 0;
    if (fields.options !== undefined)
        body.options =
            jsonArrayField(fields.options);
    await PUT(`wf-fields/${id}`, body);
}

export async function deleteNode(
    nodeId: string,
    workflowId: string,
): Promise<void> {
    const [nodeEdges, workflowNodes] =
        await Promise.all([
            GET<WfNodeEdgeEntity[]>(
                'wf-node-edges',
            ),
            GET<WfWorkflowNodeEntity[]>(
                'wf-workflow-nodes',
            ),
        ]);

    const affectedEdges = nodeEdges.filter(
        ne =>
            ne.from_node_id === nodeId
            || ne.to_node_id === nodeId,
    );

    const workflowNodeLink =
        workflowNodes.find(
            wn =>
                wn.workflow_id
                    === workflowId
                && wn.node_id === nodeId,
        );

    const deletePromises: Promise<void>[] =
        [];

    for (const ne of affectedEdges) {
        deletePromises.push(
            DELETE(
                `wf-node-edges/${ne.id}`,
            ),
        );
        deletePromises.push(
            DELETE(
                `wf-edges/${ne.wf_edge_id}`,
            ),
        );
    }

    if (workflowNodeLink) {
        deletePromises.push(
            DELETE(
                'wf-workflow-nodes/'
                + workflowNodeLink.id,
            ),
        );
    }

    deletePromises.push(
        DELETE(`wf-nodes/${nodeId}`),
    );

    await Promise.all(deletePromises);
}

export async function deleteEdge(
    edgeId: string,
): Promise<void> {
    const nodeEdges =
        await GET<WfNodeEdgeEntity[]>(
            'wf-node-edges',
        );

    const link = nodeEdges.find(
        ne => ne.wf_edge_id === edgeId,
    );

    const deletePromises: Promise<void>[] =
        [DELETE(`wf-edges/${edgeId}`)];

    if (link) {
        deletePromises.push(
            DELETE(
                `wf-node-edges/${link.id}`,
            ),
        );
    }

    await Promise.all(deletePromises);
}

export async function deleteField(
    fieldId: string,
    nodeId: string,
): Promise<void> {
    const nodeFields =
        await GET<WfNodeFieldEntity[]>(
            'wf-node-fields',
        );

    const link = nodeFields.find(
        nf =>
            nf.field_id === fieldId
            && nf.node_id === nodeId,
    );

    const deletePromises: Promise<void>[] =
        [DELETE(`wf-fields/${fieldId}`)];

    if (link) {
        deletePromises.push(
            DELETE(
                `wf-node-fields/${link.id}`,
            ),
        );
    }

    await Promise.all(deletePromises);
}
