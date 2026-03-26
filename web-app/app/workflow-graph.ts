import type { SafeHtml } from './safe-html';
import { trusted, html, escapeForHtml } from './safe-html';
import type {
    GraphNode, GraphEdge,
} from './adapters/workflows';
import {
    NODE_WIDTH, NODE_HEIGHT,
} from './workflow-layout';

const BLUE = '#4B6CA1';
const WARN = '#d97706';
const GREEN = '#16a34a';

function buildDefs(): string {
    return '<defs>'
        + '<pattern id="wf-grid"'
        + ' width="24" height="24"'
        + ' patternUnits='
        + '"userSpaceOnUse">'
        + '<circle cx="12" cy="12"'
        + ' r="0.7"'
        + ' fill="var('
        + '--color-muted-foreground,'
        + ' #5a6480)"/>'
        + '</pattern>'
        + '<marker id="wf-arrow"'
        + ' viewBox="0 0 10 10"'
        + ' refX="10" refY="5"'
        + ' markerWidth="8"'
        + ' markerHeight="8"'
        + ' orient="auto-start-reverse">'
        + `<path d="M 0 0 L 10 5 L 0 10 z"`
        + ` fill="${BLUE}"/>`
        + '</marker>'
        + '<marker id="wf-arrow-warn"'
        + ' viewBox="0 0 10 10"'
        + ' refX="10" refY="5"'
        + ' markerWidth="8"'
        + ' markerHeight="8"'
        + ' orient="auto-start-reverse">'
        + `<path d="M 0 0 L 10 5 L 0 10 z"`
        + ` fill="${WARN}"/>`
        + '</marker>'
        + '<marker id="wf-arrow-ok"'
        + ' viewBox="0 0 10 10"'
        + ' refX="10" refY="5"'
        + ' markerWidth="8"'
        + ' markerHeight="8"'
        + ' orient="auto-start-reverse">'
        + `<path d="M 0 0 L 10 5 L 0 10 z"`
        + ` fill="${GREEN}"/>`
        + '</marker>'
        + '<filter id="wf-glow"'
        + ' x="-20%" y="-20%"'
        + ' width="140%" height="140%">'
        + '<feDropShadow'
        + ' dx="0" dy="0" stdDeviation="4"'
        + ` flood-color="${BLUE}"`
        + ' flood-opacity="0.6"/>'
        + '</filter>'
        + '</defs>';
}

function buildGrid(
    w: number, h: number,
): string {
    return '<rect'
        + ` width="${w}"`
        + ` height="${h}"`
        + ' fill="var('
        + '--color-surface, #1a1f2e)"/>'
        + '<rect'
        + ` width="${w}"`
        + ` height="${h}"`
        + ' fill="url(#wf-grid)"/>';
}

function buildPort(
    cx: number,
    cy: number,
    color: string,
    label: string,
): string {
    return '<circle'
        + ` cx="${cx}"`
        + ` cy="${cy}"`
        + ' r="6"'
        + ` fill="${color}"`
        + ` data-port="${label}"/>`;
}

function buildNode(
    node: GraphNode,
    isSelected: boolean,
): SafeHtml {
    const { positionX, positionY } = node;
    const halfH = NODE_HEIGHT / 2;
    const halfW = NODE_WIDTH / 2;

    let borderColor = BLUE;
    let strokeW = 2;
    if (node.isStart || node.isComplete) {
        borderColor = GREEN;
        strokeW = node.isComplete ? 3 : 2.5;
    }

    const filterAttr = isSelected
        ? ' filter="url(#wf-glow)"'
        : '';

    let inner = '';

    inner += '<rect'
        + ` width="${NODE_WIDTH}"`
        + ` height="${NODE_HEIGHT}"`
        + ' rx="10"'
        + ' fill="var('
        + '--color-card-bg, #232940)"'
        + ` stroke="${borderColor}"`
        + ` stroke-width="${strokeW}"/>`;

    if (node.isComplete) {
        inner += '<rect'
            + ` x="4" y="4"`
            + ` width="${NODE_WIDTH - 8}"`
            + ` height="${NODE_HEIGHT - 8}"`
            + ' rx="7"'
            + ' fill="none"'
            + ` stroke="${GREEN}"`
            + ' stroke-width="1.5"/>';
    }

    const meta = node.isStart
        ? 'Start state'
        : node.isComplete
            ? 'End state'
            : String(node.fields.length)
                + ' field'
                + (node.fields.length !== 1
                    ? 's' : '');

    const nameEsc = escapeForHtml(node.name);
    inner += '<text'
        + ` x="${halfW}"`
        + ' y="22"'
        + ' text-anchor="middle"'
        + ' font-size="14"'
        + ' font-weight="600"'
        + ' fill="var('
        + '--color-foreground, #e0e4ef)">'
        + nameEsc + '</text>';

    inner += '<text'
        + ` x="${halfW}"`
        + ' y="40"'
        + ' text-anchor="middle"'
        + ' font-size="11"'
        + ' fill="var('
        + '--color-muted-foreground,'
        + ' #5a6480)">'
        + escapeForHtml(meta)
        + '</text>';

    inner += buildPort(
        0, halfH, borderColor, 'left',
    );
    inner += buildPort(
        NODE_WIDTH, halfH,
        borderColor, 'right',
    );

    if (!node.isStart && !node.isComplete) {
        inner += buildPort(
            halfW, NODE_HEIGHT,
            borderColor, 'bottom',
        );
    }

    return trusted(
        '<g'
        + ` data-node-id="${node.id}"`
        + ' transform="translate('
        + String(positionX)
        + ', '
        + String(positionY)
        + ')"'
        + filterAttr
        + ' style="cursor:pointer">'
        + inner
        + '</g>',
    );
}

function buildEdge(
    edge: GraphEdge,
    fromNode: GraphNode,
    toNode: GraphNode,
    isSelected: boolean,
): SafeHtml {
    const startX =
        fromNode.positionX + NODE_WIDTH;
    const startY =
        fromNode.positionY + NODE_HEIGHT / 2;
    const endX = toNode.positionX;
    const endY =
        toNode.positionY + NODE_HEIGHT / 2;

    const isCycle =
        toNode.positionX
            <= fromNode.positionX;

    let pathD: string;
    let color: string;
    let markerUrl: string;
    let dashAttr: string;

    if (isCycle) {
        const botFromX =
            fromNode.positionX
            + NODE_WIDTH / 2;
        const botFromY =
            fromNode.positionY
            + NODE_HEIGHT;
        const leftToX = toNode.positionX;
        const leftToY =
            toNode.positionY
            + NODE_HEIGHT / 2;
        const dropY =
            Math.max(botFromY, leftToY)
            + 60;
        pathD = 'M '
            + String(botFromX) + ' '
            + String(botFromY)
            + ' C '
            + String(botFromX) + ' '
            + String(dropY) + ', '
            + String(leftToX - 40) + ' '
            + String(dropY) + ', '
            + String(leftToX) + ' '
            + String(leftToY);
        color = WARN;
        markerUrl =
            'url(#wf-arrow-warn)';
        dashAttr =
            ' stroke-dasharray="6 3"';
    } else {
        const dx = endX - startX;
        const cpOffset = Math.abs(dx) * 0.4;
        pathD = 'M '
            + String(startX) + ' '
            + String(startY)
            + ' C '
            + String(startX + cpOffset) + ' '
            + String(startY) + ', '
            + String(endX - cpOffset) + ' '
            + String(endY) + ', '
            + String(endX) + ' '
            + String(endY);
        color = BLUE;
        markerUrl = 'url(#wf-arrow)';
        dashAttr = '';
    }

    const sw = isSelected ? 3 : 2;
    const opacity = isSelected
        ? ' opacity="1"' : '';

    const hitPath = '<path'
        + ` d="${pathD}"`
        + ' fill="none"'
        + ' stroke="transparent"'
        + ' stroke-width="12"'
        + ' style="cursor:pointer"/>';

    const visPath = '<path'
        + ` d="${pathD}"`
        + ' fill="none"'
        + ` stroke="${color}"`
        + ` stroke-width="${sw}"`
        + dashAttr
        + opacity
        + ` marker-end="${markerUrl}"`;
    const visClose = ' style='
        + '"cursor:pointer"'
        + '/>';

    const midX = computeMidpoint(
        pathD,
    );
    const midY = computeMidpointY(
        pathD,
    );
    const labelEsc =
        escapeForHtml(edge.name);
    const labelLen = edge.name.length;
    const labelW =
        Math.max(labelLen * 7 + 12, 36);
    const labelH = 20;

    const labelBg = '<rect'
        + ` x="${midX - labelW / 2}"`
        + ` y="${midY - labelH / 2}"`
        + ` width="${labelW}"`
        + ` height="${labelH}"`
        + ' rx="4"'
        + ' fill="var('
        + '--color-card-bg, #232940)"'
        + ` stroke="${color}"`
        + ' stroke-width="1"'
        + ' opacity="0.9"/>';

    const labelText = '<text'
        + ` x="${midX}"`
        + ` y="${midY + 4}"`
        + ' text-anchor="middle"'
        + ' font-size="11"'
        + ' fill="var('
        + '--color-foreground,'
        + ' #e0e4ef)">'
        + labelEsc
        + '</text>';

    return trusted(
        '<g'
        + ` data-edge-id="${edge.id}"`
        + '>'
        + hitPath
        + visPath + visClose
        + labelBg
        + labelText
        + '</g>',
    );
}

function computeMidpoint(
    pathD: string,
): number {
    const parts = pathD.split(/[,\s]+/);
    const coords = parts
        .map(Number)
        .filter(n => !isNaN(n));
    if (coords.length < 8) {
        return (coords[0] ?? 0);
    }
    const p0x = coords[0]!;
    const cp1x = coords[2]!;
    const cp2x = coords[4]!;
    const p1x = coords[6]!;
    const t = 0.5;
    const u = 1 - t;
    return u * u * u * p0x
        + 3 * u * u * t * cp1x
        + 3 * u * t * t * cp2x
        + t * t * t * p1x;
}

function computeMidpointY(
    pathD: string,
): number {
    const parts = pathD.split(/[,\s]+/);
    const coords = parts
        .map(Number)
        .filter(n => !isNaN(n));
    if (coords.length < 8) {
        return (coords[1] ?? 0);
    }
    const p0y = coords[1]!;
    const cp1y = coords[3]!;
    const cp2y = coords[5]!;
    const p1y = coords[7]!;
    const t = 0.5;
    const u = 1 - t;
    return u * u * u * p0y
        + 3 * u * u * t * cp1y
        + 3 * u * t * t * cp2y
        + t * t * t * p1y;
}

export function buildGraphSvg(
    nodes: GraphNode[],
    edges: GraphEdge[],
    viewBoxX: number,
    viewBoxY: number,
    viewBoxW: number,
    viewBoxH: number,
    selectedNodeId: string | null,
    selectedEdgeId: string | null,
): SafeHtml {
    const nodeMap = new Map(
        nodes.map(n => [n.id, n]),
    );

    let edgeMarkup = '';
    for (const edge of edges) {
        const fromNode =
            nodeMap.get(edge.fromNodeId);
        const toNode =
            nodeMap.get(edge.toNodeId);
        if (!fromNode || !toNode) continue;
        const isSelected =
            edge.id === selectedEdgeId;
        edgeMarkup +=
            buildEdge(
                edge,
                fromNode,
                toNode,
                isSelected,
            ).toString();
    }

    let nodeMarkup = '';
    for (const node of nodes) {
        const isSelected =
            node.id === selectedNodeId;
        nodeMarkup +=
            buildNode(
                node, isSelected,
            ).toString();
    }

    const vb = String(viewBoxX)
        + ' ' + String(viewBoxY)
        + ' ' + String(viewBoxW)
        + ' ' + String(viewBoxH);

    return trusted(
        '<svg'
        + ' xmlns='
        + '"http://www.w3.org/2000/svg"'
        + ' class="wf-canvas"'
        + ` viewBox="${vb}"`
        + ' width="100%"'
        + ' height="100%"'
        + ' style="display:block">'
        + buildDefs()
        + buildGrid(viewBoxW, viewBoxH)
        + edgeMarkup
        + nodeMarkup
        + '</svg>',
    );
}
