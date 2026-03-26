import {
    $, $input, $select,
} from '../app/dom';
import {
    html, setHtml, trusted,
} from '../app/safe-html';
import type { SafeHtml } from '../app/safe-html';
import { showToast } from '../app/toast';
import {
    buildSkeleton,
    withLoadingState,
} from '../app/loading-states';
import { navigateTo } from '../app/core';
import {
    getWorkflowGraph,
    putWorkflow,
    putNode,
    putWfEdge,
    postNode,
    postEdge,
    postField,
    deleteNode,
    deleteEdge,
    deleteField,
} from '../app/adapters';
import type {
    GraphNode,
    GraphEdge,
    GraphField,
} from '../app/adapters/workflows';
import {
    buildGraphSvg,
} from '../app/workflow-graph';
import {
    computeLayout,
    NODE_WIDTH,
    NODE_HEIGHT,
    START_X,
    START_Y,
} from '../app/workflow-layout';
import {
    createInteractionState,
    bindInteractions,
    zoomIn,
    zoomOut,
    zoomToFit,
} from '../app/workflow-interactions';
import type {
    InteractionState,
} from '../app/workflow-interactions';

interface DesignerState {
    workflowId: string;
    workflowName: string;
    workflowDescription: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    interaction: InteractionState;
    hasUnsavedChanges: boolean;
}

const CANVAS_W = 1200;
const CANVAS_H = 800;

function buildToolbar(
    state: DesignerState,
): SafeHtml {
    const nodeCount = state.nodes.length;
    const edgeCount = state.edges.length;
    const stats = String(nodeCount)
        + ' state' + (nodeCount !== 1
            ? 's' : '')
        + ' \u00b7 '
        + String(edgeCount)
        + ' transition'
        + (edgeCount !== 1 ? 's' : '');
    const saveDisabled =
        state.hasUnsavedChanges
            ? '' : ' disabled';
    return html`<div
class="wf-toolbar">
<div class="wf-toolbar-group">
<button class="btn btn-primary btn-sm"
    data-action="add-state"
    >+ Add State</button>
</div>
<div class="wf-toolbar-group">
<button class="btn btn-ghost btn-sm"
    data-action="re-layout"
    >Re-layout</button>
<button class="btn btn-ghost btn-sm"
    data-action="zoom-in"
    >Zoom +</button>
<button class="btn btn-ghost btn-sm"
    data-action="zoom-out"
    >Zoom \u2212</button>
<button class="btn btn-ghost btn-sm"
    data-action="fit">Fit</button>
</div>
<div class="wf-toolbar-group">
<span class="text-muted text-sm"
    >${stats}</span>
</div>
<div class="wf-toolbar-group ml-auto">
<button
    class="btn btn-success btn-sm"
    data-action="save"${
    trusted(saveDisabled)
    }>Save</button>
</div>
</div>`;
}

function buildFieldBadge(
    fieldType: string,
): SafeHtml {
    return html`<span
class="badge badge-outline text-xs"
>${fieldType}</span>`;
}

function buildFieldRow(
    field: GraphField,
): SafeHtml {
    const req = field.isRequired
        ? html`<span class="text-xs"
            style="color:hsl(var(--error))"
            > *</span>`
        : html``;
    return html`<div
class="wf-field-row"
data-field-id="${field.id}">
${buildFieldBadge(field.fieldType)}
<span class="text-sm">${field.name}</span>
${req}
<button
    class="btn btn-ghost btn-xs ml-auto"
    data-action="delete-field"
    data-field-id="${field.id}"
    >&times;</button>
</div>`;
}

function buildFieldEditor(
    nodeId: string,
): SafeHtml {
    return html`<div
class="wf-field-editor"
data-node-id="${nodeId}">
<h4 class="text-sm font-semibold mb-2"
    >Add Field</h4>
<div class="mb-2">
<input type="text"
    class="input input-sm"
    id="new-field-name"
    placeholder="Field name" />
</div>
<div class="mb-2">
<select class="input input-sm"
    id="new-field-type">
<option value="text">text</option>
<option value="textarea">textarea</option>
<option value="number">number</option>
<option value="date">date</option>
<option value="select">select</option>
<option value="checkbox">checkbox</option>
<option value="file">file</option>
<option value="email">email</option>
<option value="url">url</option>
<option value="phone">phone</option>
<option value="currency">currency</option>
<option value="multi_select"
    >multi_select</option>
<option value="radio">radio</option>
<option value="image">image</option>
</select>
</div>
<div class="mb-2">
<label class="text-sm">
<input type="checkbox"
    id="new-field-required" />
Required</label>
</div>
<div class="mb-2">
<textarea
    class="input input-sm"
    id="new-field-options"
    placeholder="Options (one per line)"
    rows="2"></textarea>
</div>
<button class="btn btn-primary btn-xs"
    data-action="save-field"
    >Add</button>
</div>`;
}

function buildNodePanel(
    node: GraphNode,
    outgoing: GraphEdge[],
): SafeHtml {
    const isSpecial =
        node.isStart || node.isComplete;
    const deleteBtn = isSpecial
        ? html``
        : html`<button
class="btn btn-destructive btn-sm mt-4"
data-action="delete-node"
>Delete State</button>`;
    const fieldRows = node.fields
        .map(buildFieldRow);
    return html`<div class="wf-props-panel">
<h3 class="text-sm font-semibold mb-3"
    >State Properties</h3>
<div class="mb-2">
<label class="text-xs text-muted"
    >Name</label>
<input type="text"
    class="input input-sm"
    id="prop-node-name"
    value="${node.name}" />
</div>
<div class="mb-2">
<label class="text-xs text-muted"
    >Description</label>
<input type="text"
    class="input input-sm"
    id="prop-node-desc"
    value="${node.description}" />
</div>
<div class="mb-3">
<label class="text-xs text-muted"
    >Fields</label>
${fieldRows}
<button
    class="btn btn-ghost btn-xs mt-1"
    data-action="add-field"
    >+ Add Field</button>
<div id="field-editor-slot"></div>
</div>
<div class="mb-3">
<label class="text-xs text-muted"
    >Outgoing Transitions</label>
${outgoing.length > 0
    ? outgoing.map(e => html`<div
class="text-sm text-muted"
>\u2192 ${e.name}</div>`)
    : html`<div class="text-sm text-muted"
        >None</div>`}
</div>
${deleteBtn}
</div>`;
}

function buildEdgePanel(
    edge: GraphEdge,
    fromNode: GraphNode | undefined,
    toNode: GraphNode | undefined,
): SafeHtml {
    const fromName = fromNode?.name ?? '\u2014';
    const toName = toNode?.name ?? '\u2014';
    return html`<div class="wf-props-panel">
<h3 class="text-sm font-semibold mb-3"
    >Transition Properties</h3>
<div class="mb-2">
<label class="text-xs text-muted"
    >Name</label>
<input type="text"
    class="input input-sm"
    id="prop-edge-name"
    value="${edge.name}" />
</div>
<div class="mb-2">
<label class="text-xs text-muted"
    >Description</label>
<input type="text"
    class="input input-sm"
    id="prop-edge-desc"
    value="${edge.description}" />
</div>
<div class="mb-2">
<label class="text-xs text-muted"
    >From</label>
<div class="text-sm">${fromName}</div>
</div>
<div class="mb-2">
<label class="text-xs text-muted"
    >To</label>
<div class="text-sm">${toName}</div>
</div>
<button
class="btn btn-destructive btn-sm mt-4"
data-action="delete-edge"
>Delete Transition</button>
</div>`;
}

function buildPropsPanel(
    state: DesignerState,
): SafeHtml {
    const { interaction } = state;
    const selNodeId =
        interaction.selectedNodeId;
    const selEdgeId =
        interaction.selectedEdgeId;

    if (selNodeId !== null) {
        const node = state.nodes.find(
            n => n.id === selNodeId,
        );
        if (!node) return html``;
        const outgoing = state.edges.filter(
            e => e.fromNodeId === selNodeId,
        );
        return buildNodePanel(
            node, outgoing,
        );
    }

    if (selEdgeId !== null) {
        const edge = state.edges.find(
            e => e.id === selEdgeId,
        );
        if (!edge) return html``;
        const fromNode = state.nodes.find(
            n => n.id === edge.fromNodeId,
        );
        const toNode = state.nodes.find(
            n => n.id === edge.toNodeId,
        );
        return buildEdgePanel(
            edge, fromNode, toNode,
        );
    }

    return html``;
}

function buildConnectPreview(
    state: DesignerState,
): string {
    const { interaction } = state;
    if (!interaction.isConnecting) return '';
    if (!interaction.connectFromNodeId) {
        return '';
    }
    const fromNode = state.nodes.find(
        n => n.id
            === interaction.connectFromNodeId,
    );
    if (!fromNode) return '';
    const startX =
        fromNode.positionX + NODE_WIDTH;
    const startY =
        fromNode.positionY
        + NODE_HEIGHT / 2;
    const endX = interaction.connectToX;
    const endY = interaction.connectToY;
    return '<line'
        + ' x1="' + String(startX) + '"'
        + ' y1="' + String(startY) + '"'
        + ' x2="' + String(endX) + '"'
        + ' y2="' + String(endY) + '"'
        + ' stroke="#4B6CA1"'
        + ' stroke-width="2"'
        + ' stroke-dasharray="6 3"'
        + ' opacity="0.6"/>';
}

function nodesForRender(
    state: DesignerState,
): GraphNode[] {
    const { interaction } = state;
    if (
        !interaction.isDragging
        || !interaction.dragNodeId
    ) {
        return state.nodes;
    }
    return state.nodes.map(n => {
        if (n.id !== interaction.dragNodeId) {
            return n;
        }
        return {
            ...n,
            positionX:
                interaction.dragCurrentX,
            positionY:
                interaction.dragCurrentY,
        };
    });
}

function buildCanvas(
    state: DesignerState,
): SafeHtml {
    const nodes = nodesForRender(state);
    const vb = state.interaction.viewBox;
    const svgHtml = buildGraphSvg(
        nodes,
        state.edges,
        vb.x,
        vb.y,
        vb.w,
        vb.h,
        state.interaction.selectedNodeId,
        state.interaction.selectedEdgeId,
    );
    const preview =
        buildConnectPreview(state);
    if (preview.length === 0) {
        return svgHtml;
    }
    const svgStr = svgHtml.toString();
    const closeTag = '</svg>';
    const idx = svgStr.lastIndexOf(
        closeTag,
    );
    if (idx === -1) return svgHtml;
    return trusted(
        svgStr.slice(0, idx)
        + preview
        + closeTag,
    );
}

function renderDesigner(
    container: HTMLElement,
    state: DesignerState,
): void {
    const toolbar = buildToolbar(state);
    const panel = buildPropsPanel(state);
    const canvas = buildCanvas(state);
    const content = html`<div
class="wf-designer">
<div class="wf-designer-header">
<h2 class="text-lg font-semibold"
    >${state.workflowName}</h2>
<p class="text-sm text-muted"
    >${state.workflowDescription}</p>
</div>
${toolbar}
${panel}
<div class="wf-canvas-wrap">${canvas}</div>
</div>`;
    setHtml(container, content);
    bindSvgInteractions(container, state);
    bindToolbarActions(container, state);
    bindPanelActions(container, state);
}

function bindSvgInteractions(
    container: HTMLElement,
    state: DesignerState,
): void {
    const svg = container.querySelector(
        'svg.wf-canvas',
    ) as SVGSVGElement | null;
    if (!svg) return;
    initDragPositions(state);
    bindInteractions(
        svg,
        state.interaction,
        () => renderDesigner(
            container, state,
        ),
        (nodeId, x, y) =>
            handleNodeDragEnd(
                container, state,
                nodeId, x, y,
            ),
        (fromId, toId) =>
            void handleEdgeCreated(
                container, state,
                fromId, toId,
            ),
    );
}

function initDragPositions(
    state: DesignerState,
): void {
    for (const node of state.nodes) {
        if (
            node.id
            === state.interaction
                .selectedNodeId
        ) {
            state.interaction.dragCurrentX =
                node.positionX;
            state.interaction.dragCurrentY =
                node.positionY;
            break;
        }
    }
}

function handleNodeDragEnd(
    container: HTMLElement,
    state: DesignerState,
    nodeId: string,
    x: number,
    y: number,
): void {
    const node = state.nodes.find(
        n => n.id === nodeId,
    );
    if (!node) return;
    node.positionX = x;
    node.positionY = y;
    state.hasUnsavedChanges = true;
    void putNode(nodeId, {
        position_x: x,
        position_y: y,
    });
    renderDesigner(container, state);
}

async function handleEdgeCreated(
    container: HTMLElement,
    state: DesignerState,
    fromNodeId: string,
    toNodeId: string,
): Promise<void> {
    try {
        const edgeId = await postEdge(
            'Transition', fromNodeId, toNodeId,
        );
        state.edges.push({
            id: edgeId,
            name: 'Transition',
            description: '',
            fromNodeId,
            toNodeId,
        });
        state.hasUnsavedChanges = true;
        renderDesigner(container, state);
    } catch {
        showToast(
            'Failed to create transition',
            'error',
        );
    }
}

function bindToolbarActions(
    container: HTMLElement,
    state: DesignerState,
): void {
    const btns = container.querySelectorAll(
        '[data-action]',
    );
    for (const btn of btns) {
        const action = btn.getAttribute(
            'data-action',
        );
        if (!action) continue;
        if (action === 'add-state') {
            btn.addEventListener(
                'click',
                () => void handleAddState(
                    container, state,
                ),
            );
        }
        if (action === 're-layout') {
            btn.addEventListener(
                'click',
                () => handleRelayout(
                    container, state,
                ),
            );
        }
        if (action === 'zoom-in') {
            btn.addEventListener(
                'click',
                () => {
                    zoomIn(
                        state.interaction,
                    );
                    renderDesigner(
                        container, state,
                    );
                },
            );
        }
        if (action === 'zoom-out') {
            btn.addEventListener(
                'click',
                () => {
                    zoomOut(
                        state.interaction,
                    );
                    renderDesigner(
                        container, state,
                    );
                },
            );
        }
        if (action === 'fit') {
            btn.addEventListener(
                'click',
                () => {
                    const positions =
                        state.nodes.map(n => ({
                            x: n.positionX,
                            y: n.positionY,
                        }));
                    zoomToFit(
                        state.interaction,
                        positions,
                    );
                    renderDesigner(
                        container, state,
                    );
                },
            );
        }
        if (action === 'save') {
            btn.addEventListener(
                'click',
                () => void handleSave(
                    container, state,
                ),
            );
        }
    }
}

async function handleAddState(
    container: HTMLElement,
    state: DesignerState,
): Promise<void> {
    try {
        const x = START_X
            + (state.nodes.length - 1)
            * (NODE_WIDTH + 120);
        const y = START_Y + 100;
        const nodeId = await postNode(
            state.workflowId,
            'New State', x, y,
        );
        state.nodes.push({
            id: nodeId,
            name: 'New State',
            description: '',
            positionX: x,
            positionY: y,
            isStart: false,
            isComplete: false,
            fields: [],
        });
        state.hasUnsavedChanges = true;
        renderDesigner(container, state);
    } catch {
        showToast(
            'Failed to add state',
            'error',
        );
    }
}

function handleRelayout(
    container: HTMLElement,
    state: DesignerState,
): void {
    const layoutInputs = state.nodes.map(
        n => ({
            id: n.id,
            isStart: n.isStart,
            isComplete: n.isComplete,
        }),
    );
    const layoutEdges = state.edges.map(
        e => ({
            fromId: e.fromNodeId,
            toId: e.toNodeId,
        }),
    );
    const positions = computeLayout(
        layoutInputs, layoutEdges,
        CANVAS_W, CANVAS_H,
    );
    for (const node of state.nodes) {
        const pos = positions.get(node.id);
        if (!pos) continue;
        node.positionX = pos.x;
        node.positionY = pos.y;
    }
    state.hasUnsavedChanges = true;
    renderDesigner(container, state);
}

async function handleSave(
    container: HTMLElement,
    state: DesignerState,
): Promise<void> {
    try {
        await putWorkflow(
            state.workflowId,
            {
                name: state.workflowName,
                description:
                    state.workflowDescription,
            },
        );
        for (const node of state.nodes) {
            await putNode(node.id, {
                name: node.name,
                description: node.description,
                position_x: node.positionX,
                position_y: node.positionY,
            });
        }
        for (const edge of state.edges) {
            await putWfEdge(edge.id, {
                name: edge.name,
                description: edge.description,
            });
        }
        state.hasUnsavedChanges = false;
        showToast('Workflow saved', 'success');
        renderDesigner(container, state);
    } catch {
        showToast(
            'Failed to save workflow',
            'error',
        );
    }
}

function bindPanelActions(
    container: HTMLElement,
    state: DesignerState,
): void {
    bindNodePanelInputs(container, state);
    bindEdgePanelInputs(container, state);
    bindDeleteActions(container, state);
    bindFieldActions(container, state);
}

function bindNodePanelInputs(
    container: HTMLElement,
    state: DesignerState,
): void {
    const nameInput = $input(
        '#prop-node-name', container,
    );
    const descInput = $input(
        '#prop-node-desc', container,
    );
    if (!nameInput || !descInput) return;
    const nodeId =
        state.interaction.selectedNodeId;
    if (!nodeId) return;

    nameInput.addEventListener(
        'change',
        () => {
            const node = state.nodes.find(
                n => n.id === nodeId,
            );
            if (!node) return;
            node.name = nameInput.value;
            state.hasUnsavedChanges = true;
        },
    );

    descInput.addEventListener(
        'change',
        () => {
            const node = state.nodes.find(
                n => n.id === nodeId,
            );
            if (!node) return;
            node.description =
                descInput.value;
            state.hasUnsavedChanges = true;
        },
    );
}

function bindEdgePanelInputs(
    container: HTMLElement,
    state: DesignerState,
): void {
    const nameInput = $input(
        '#prop-edge-name', container,
    );
    const descInput = $input(
        '#prop-edge-desc', container,
    );
    if (!nameInput || !descInput) return;
    const edgeId =
        state.interaction.selectedEdgeId;
    if (!edgeId) return;

    nameInput.addEventListener(
        'change',
        () => {
            const edge = state.edges.find(
                e => e.id === edgeId,
            );
            if (!edge) return;
            edge.name = nameInput.value;
            state.hasUnsavedChanges = true;
        },
    );

    descInput.addEventListener(
        'change',
        () => {
            const edge = state.edges.find(
                e => e.id === edgeId,
            );
            if (!edge) return;
            edge.description =
                descInput.value;
            state.hasUnsavedChanges = true;
        },
    );
}

function bindDeleteActions(
    container: HTMLElement,
    state: DesignerState,
): void {
    const delNodeBtn = container
        .querySelector(
            '[data-action="delete-node"]',
        );
    if (delNodeBtn) {
        delNodeBtn.addEventListener(
            'click',
            () => void handleDeleteNode(
                container, state,
            ),
        );
    }

    const delEdgeBtn = container
        .querySelector(
            '[data-action="delete-edge"]',
        );
    if (delEdgeBtn) {
        delEdgeBtn.addEventListener(
            'click',
            () => void handleDeleteEdge(
                container, state,
            ),
        );
    }
}

async function handleDeleteNode(
    container: HTMLElement,
    state: DesignerState,
): Promise<void> {
    const nodeId =
        state.interaction.selectedNodeId;
    if (!nodeId) return;
    try {
        await deleteNode(
            nodeId, state.workflowId,
        );
        state.nodes = state.nodes.filter(
            n => n.id !== nodeId,
        );
        state.edges = state.edges.filter(
            e => e.fromNodeId !== nodeId
                && e.toNodeId !== nodeId,
        );
        state.interaction.selectedNodeId =
            null;
        state.hasUnsavedChanges = true;
        renderDesigner(container, state);
    } catch {
        showToast(
            'Failed to delete state',
            'error',
        );
    }
}

async function handleDeleteEdge(
    container: HTMLElement,
    state: DesignerState,
): Promise<void> {
    const edgeId =
        state.interaction.selectedEdgeId;
    if (!edgeId) return;
    try {
        await deleteEdge(edgeId);
        state.edges = state.edges.filter(
            e => e.id !== edgeId,
        );
        state.interaction.selectedEdgeId =
            null;
        state.hasUnsavedChanges = true;
        renderDesigner(container, state);
    } catch {
        showToast(
            'Failed to delete transition',
            'error',
        );
    }
}

function bindFieldActions(
    container: HTMLElement,
    state: DesignerState,
): void {
    const addFieldBtn = container
        .querySelector(
            '[data-action="add-field"]',
        );
    if (addFieldBtn) {
        addFieldBtn.addEventListener(
            'click',
            () => showFieldEditor(
                container, state,
            ),
        );
    }

    const delFieldBtns = container
        .querySelectorAll(
            '[data-action="delete-field"]',
        );
    for (const btn of delFieldBtns) {
        const fieldId = btn.getAttribute(
            'data-field-id',
        );
        if (!fieldId) continue;
        btn.addEventListener(
            'click',
            () => void handleDeleteField(
                container, state, fieldId,
            ),
        );
    }
}

function showFieldEditor(
    container: HTMLElement,
    state: DesignerState,
): void {
    const nodeId =
        state.interaction.selectedNodeId;
    if (!nodeId) return;
    const slot = $(
        '#field-editor-slot', container,
    );
    if (!slot) return;
    setHtml(slot, buildFieldEditor(nodeId));
    const saveBtn = slot.querySelector(
        '[data-action="save-field"]',
    );
    if (saveBtn) {
        saveBtn.addEventListener(
            'click',
            () => void handleSaveField(
                container, state,
            ),
        );
    }
}

async function handleSaveField(
    container: HTMLElement,
    state: DesignerState,
): Promise<void> {
    const nodeId =
        state.interaction.selectedNodeId;
    if (!nodeId) return;
    const nameEl = $input(
        '#new-field-name', container,
    );
    const typeEl = $select(
        '#new-field-type', container,
    );
    const reqEl = $input(
        '#new-field-required', container,
    );
    const optEl = container
        .querySelector<HTMLTextAreaElement>(
            '#new-field-options',
        );
    if (!nameEl || !typeEl) return;
    const fieldName = nameEl.value.trim();
    if (fieldName.length === 0) {
        showToast(
            'Field name is required',
            'error',
        );
        return;
    }
    const fieldType = typeEl.value;
    const isRequired = reqEl?.checked ?? false;
    const optionsText =
        optEl?.value.trim() ?? '';
    const options = optionsText.length > 0
        ? optionsText.split('\n').map(
            s => s.trim(),
        ).filter(s => s.length > 0)
        : [];
    const node = state.nodes.find(
        n => n.id === nodeId,
    );
    if (!node) return;
    const sortOrder = node.fields.length;
    try {
        const fieldId = await postField(
            nodeId, fieldName, fieldType,
            sortOrder, isRequired, options,
        );
        node.fields.push({
            id: fieldId,
            name: fieldName,
            fieldType,
            sortOrder,
            isRequired,
            options,
        });
        state.hasUnsavedChanges = true;
        renderDesigner(container, state);
    } catch {
        showToast(
            'Failed to add field',
            'error',
        );
    }
}

async function handleDeleteField(
    container: HTMLElement,
    state: DesignerState,
    fieldId: string,
): Promise<void> {
    const nodeId =
        state.interaction.selectedNodeId;
    if (!nodeId) return;
    try {
        await deleteField(fieldId, nodeId);
        const node = state.nodes.find(
            n => n.id === nodeId,
        );
        if (node) {
            node.fields = node.fields.filter(
                f => f.id !== fieldId,
            );
        }
        state.hasUnsavedChanges = true;
        renderDesigner(container, state);
    } catch {
        showToast(
            'Failed to delete field',
            'error',
        );
    }
}

export async function init(
    params?: Record<string, string>,
): Promise<void> {
    const workflowId =
        params?.workflowId ?? '';
    if (workflowId.length === 0) {
        navigateTo('flow');
        return;
    }
    const container = $(
        '#workflow-designer', document,
    );
    if (!container) return;

    const graph = await withLoadingState(
        container,
        buildSkeleton('detail', 1),
        () => getWorkflowGraph(workflowId),
    );
    if (!graph) return;

    const interaction =
        createInteractionState(
            CANVAS_W, CANVAS_H,
        );

    const state: DesignerState = {
        workflowId,
        workflowName: graph.name,
        workflowDescription:
            graph.description,
        nodes: graph.nodes,
        edges: graph.edges,
        interaction,
        hasUnsavedChanges: false,
    };

    const positions = state.nodes.map(
        n => ({
            x: n.positionX,
            y: n.positionY,
        }),
    );
    zoomToFit(interaction, positions);
    renderDesigner(container, state);
}
