export interface LayoutInput {
    id: string;
    isStart: boolean;
    isComplete: boolean;
}

export interface EdgePair {
    fromId: string;
    toId: string;
}

export interface LayoutEdge extends EdgePair {
    labelWidth: number;
}

export interface LayoutContext {
    readonly nodes: readonly LayoutInput[];
    readonly edges: readonly LayoutEdge[];
    readonly canvasWidth: number;
    readonly canvasHeight: number;
}

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 64;
export const HORIZONTAL_GAP = 60;
export const VERTICAL_GAP = 180;
export const START_X = 0;
export const START_Y = 0;
export const LABEL_SAFETY_MARGIN = 16;

type Position = { x: number; y: number };
type Layers = readonly (readonly string[])[];

const MIN_LAYER_STEP =
    NODE_WIDTH + HORIZONTAL_GAP;
const SIBLING_STEP =
    Math.max(NODE_WIDTH, NODE_HEIGHT) + 100;
const CROSSING_SWEEP_COUNT = 12;
const MAX_ASPECT_STRETCH = 1.4;
const MIN_SNAKE_NODES = 4;

export function buildAdjacency(
    edges: readonly EdgePair[],
): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
        const list = adj.get(edge.fromId);
        if (list) {
            list.push(edge.toId);
        } else {
            adj.set(edge.fromId, [edge.toId]);
        }
    }
    return adj;
}

export function isReachable(
    sourceId: string,
    targetId: string,
    adj: Map<string, string[]>,
): boolean {
    const visited = new Set<string>();
    const stack: string[] = [sourceId];
    visited.add(sourceId);
    while (stack.length > 0) {
        const node = stack.pop()!;
        const neighbors = adj.get(node);
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (n === targetId) return true;
            if (visited.has(n)) continue;
            visited.add(n);
            stack.push(n);
        }
    }
    return false;
}

export function wouldBeCycle(
    fromId: string,
    toId: string,
    edges: readonly EdgePair[],
): boolean {
    const adj = buildAdjacency(edges);
    return isReachable(toId, fromId, adj);
}

export function computeLayout(
    context: LayoutContext,
): Map<string, Position> {
    const {
        nodes, edges,
        canvasWidth, canvasHeight,
    } = context;
    if (nodes.length === 0) {
        return new Map();
    }

    const startNode = nodes.find(n => n.isStart);
    if (!startNode) {
        throw new Error('Flow has no start node');
    }

    const { forwardEdges } = removeCycles(nodes, edges);

    const layers = assignLayers(nodes, forwardEdges);
    const ordered = reduceCrossings(layers, forwardEdges);
    const topo = ordered.flat();

    if (topo.length >= MIN_SNAKE_NODES) {
        const k = computeSnakeWrap(
            topo.length, canvasWidth, canvasHeight,
        );
        if (k > 0) {
            const sugiPos = assignCoordinates(
                ordered, forwardEdges,
            );
            const snakePos = computeTopoSnake(
                topo, k, forwardEdges, canvasHeight,
            );
            const canvasAspect =
                canvasWidth / canvasHeight;
            const mis = (a: number): number =>
                Math.max(a, canvasAspect)
                / Math.min(a, canvasAspect);
            if (mis(computeBboxAspect(snakePos))
                < mis(computeBboxAspect(sugiPos))) {
                return fitToCanvas(
                    snakePos,
                    canvasWidth, canvasHeight,
                    nodes,
                );
            }
            return fitToCanvas(
                sugiPos,
                canvasWidth, canvasHeight,
                nodes,
            );
        }
    }

    const natural = assignCoordinates(
        ordered, forwardEdges,
    );
    return fitToCanvas(
        natural, canvasWidth, canvasHeight,
        nodes,
    );
}

function removeCycles(
    nodes: readonly LayoutInput[],
    edges: readonly LayoutEdge[],
): {
    forwardEdges: readonly LayoutEdge[];
    reversedIds: ReadonlySet<string>;
} {
    const validEdges = edges.filter(
        e => e.fromId !== e.toId,
    );

    const outAdj =
        new Map<string, string[]>();
    for (const n of nodes) {
        outAdj.set(n.id, []);
    }
    for (const e of validEdges) {
        outAdj.get(e.fromId)!.push(e.toId);
    }

    const backPairs = new Set<string>();
    const visited = new Set<string>();
    const onStack = new Set<string>();

    const dfs = (id: string): void => {
        visited.add(id);
        onStack.add(id);
        const neighbors =
            outAdj.get(id) ?? [];
        for (const n of neighbors) {
            if (onStack.has(n)) {
                backPairs.add(
                    id + ':' + n,
                );
            } else if (!visited.has(n)) {
                dfs(n);
            }
        }
        onStack.delete(id);
    };

    const startNode =
        nodes.find(n => n.isStart);
    if (startNode) {
        dfs(startNode.id);
    }
    for (const n of nodes) {
        if (!visited.has(n.id)) {
            dfs(n.id);
        }
    }

    const forwardEdges: LayoutEdge[] = [];
    const reversedIds = new Set<string>();
    for (const e of validEdges) {
        const key =
            e.fromId + ':' + e.toId;
        if (backPairs.has(key)) {
            forwardEdges.push({
                fromId: e.toId,
                toId: e.fromId,
                labelWidth: e.labelWidth,
            });
            reversedIds.add(
                e.fromId + '->' + e.toId,
            );
        } else {
            forwardEdges.push(e);
        }
    }

    return { forwardEdges, reversedIds };
}

function assignLayers(
    nodes: readonly LayoutInput[],
    forwardEdges: readonly LayoutEdge[],
): Layers {
    const preds = new Map<string, string[]>();
    const outAdj = new Map<string, string[]>();
    const inDeg = new Map<string, number>();
    for (const n of nodes) {
        preds.set(n.id, []);
        outAdj.set(n.id, []);
        inDeg.set(n.id, 0);
    }
    for (const e of forwardEdges) {
        const predsList = preds.get(e.toId);
        const outList = outAdj.get(e.fromId);
        if (!predsList || !outList) continue;
        predsList.push(e.fromId);
        outList.push(e.toId);
        inDeg.set(e.toId, inDeg.get(e.toId)! + 1);
    }

    const remInDeg = new Map(inDeg);
    const queue: string[] = [];
    for (const n of nodes) {
        if (remInDeg.get(n.id) === 0) {
            queue.push(n.id);
        }
    }

    const topo: string[] = [];
    while (queue.length > 0) {
        const id = queue.shift()!;
        topo.push(id);
        const outs = outAdj.get(id)!;
        for (const t of outs) {
            const rem = remInDeg.get(t)! - 1;
            remInDeg.set(t, rem);
            if (rem === 0) {
                queue.push(t);
            }
        }
    }

    const layerOf = new Map<string, number>();
    for (const id of topo) {
        const ps = preds.get(id)!;
        if (ps.length === 0) {
            layerOf.set(id, 0);
        } else {
            let maxPred = 0;
            for (const p of ps) {
                const pl = layerOf.get(p)!;
                if (pl > maxPred) maxPred = pl;
            }
            layerOf.set(id, maxPred + 1);
        }
    }

    for (const n of nodes) {
        if (!layerOf.has(n.id)) {
            layerOf.set(n.id, 0);
        }
    }

    let maxLayer = 0;
    for (const l of layerOf.values()) {
        if (l > maxLayer) maxLayer = l;
    }

    const layers: string[][] = [];
    for (let i = 0; i <= maxLayer; i++) {
        layers.push([]);
    }
    for (const [id, l] of layerOf) {
        layers[l]!.push(id);
    }

    return layers;
}

function reduceCrossings(
    layers: Layers,
    forwardEdges: readonly LayoutEdge[],
): Layers {
    if (layers.length <= 1) {
        return layers.map(l => [...l]);
    }

    const layerOf = new Map<string, number>();
    layers.forEach((l, i) => {
        for (const id of l) {
            layerOf.set(id, i);
        }
    });

    const upN = new Map<string, string[]>();
    const downN = new Map<string, string[]>();
    for (const l of layers) {
        for (const id of l) {
            upN.set(id, []);
            downN.set(id, []);
        }
    }
    for (const e of forwardEdges) {
        const fl = layerOf.get(e.fromId);
        const tl = layerOf.get(e.toId);
        if (fl === undefined) continue;
        if (tl === undefined) continue;
        if (tl - fl !== 1) continue;
        downN.get(e.fromId)!.push(e.toId);
        upN.get(e.toId)!.push(e.fromId);
    }

    const barycenter = (
        ids: readonly string[],
        neighborPos: Map<string, number>,
        neighbors: Map<string, string[]>,
    ): string[] => {
        const withBary = ids.map((id, idx) => {
            const ns = neighbors.get(id)!;
            if (ns.length === 0) {
                return { id, bary: idx };
            }
            let sum = 0;
            for (const n of ns) {
                sum += neighborPos.get(n)!;
            }
            return { id, bary: sum / ns.length };
        });
        withBary.sort((a, b) => a.bary - b.bary);
        return withBary.map(b => b.id);
    };

    const sweepDown = (
        ord: readonly (readonly string[])[],
    ): string[][] => {
        const result: string[][] = ord.map(l => [...l]);
        for (let l = 1; l < result.length; l++) {
            const prev = result[l - 1]!;
            const prevPos = new Map<string, number>();
            prev.forEach((id, i) => {
                prevPos.set(id, i);
            });
            result[l] = barycenter(
                result[l]!,
                prevPos,
                upN,
            );
        }
        return result;
    };

    const sweepUp = (
        ord: readonly (readonly string[])[],
    ): string[][] => {
        const result: string[][] = ord.map(l => [...l]);
        for (
            let l = result.length - 2;
            l >= 0;
            l--
        ) {
            const next = result[l + 1]!;
            const nextPos = new Map<string, number>();
            next.forEach((id, i) => {
                nextPos.set(id, i);
            });
            result[l] = barycenter(
                result[l]!,
                nextPos,
                downN,
            );
        }
        return result;
    };

    const countCrossings = (
        ord: readonly (readonly string[])[],
    ): number => {
        let total = 0;
        for (let l = 0; l < ord.length - 1; l++) {
            const top = ord[l]!;
            const bot = ord[l + 1]!;
            const botPos = new Map<string, number>();
            bot.forEach((id, i) => {
                botPos.set(id, i);
            });
            const pairs: [number, number][] = [];
            top.forEach((t, ti) => {
                const ns = downN.get(t)!;
                for (const d of ns) {
                    const bi = botPos.get(d);
                    if (bi !== undefined) {
                        pairs.push([ti, bi]);
                    }
                }
            });
            for (let i = 0; i < pairs.length; i++) {
                for (
                    let j = i + 1;
                    j < pairs.length;
                    j++
                ) {
                    const p1 = pairs[i]!;
                    const p2 = pairs[j]!;
                    const t1 = p1[0];
                    const b1 = p1[1];
                    const t2 = p2[0];
                    const b2 = p2[1];
                    const crosses =
                        (t1 < t2 && b1 > b2)
                        || (t1 > t2 && b1 < b2);
                    if (crosses) total++;
                }
            }
        }
        return total;
    };

    let current: readonly (readonly string[])[] =
        layers.map(l => [...l]);
    let best: readonly (readonly string[])[] = current;
    let bestCount = countCrossings(current);

    for (let i = 0; i < CROSSING_SWEEP_COUNT; i++) {
        current = sweepDown(current);
        const dc = countCrossings(current);
        if (dc < bestCount) {
            bestCount = dc;
            best = current.map(l => [...l]);
        }
        current = sweepUp(current);
        const uc = countCrossings(current);
        if (uc < bestCount) {
            bestCount = uc;
            best = current.map(l => [...l]);
        }
        if (bestCount === 0) break;
    }

    return best;
}

function assignCoordinates(
    orderedLayers: Layers,
    forwardEdges: readonly LayoutEdge[],
): Map<string, Position> {
    const positions = new Map<string, Position>();
    if (orderedLayers.length === 0) return positions;

    const layerOf = new Map<string, number>();
    orderedLayers.forEach((l, i) => {
        for (const id of l) {
            layerOf.set(id, i);
        }
    });

    const upN = new Map<string, string[]>();
    for (const l of orderedLayers) {
        for (const id of l) upN.set(id, []);
    }
    for (const e of forwardEdges) {
        const fl = layerOf.get(e.fromId);
        const tl = layerOf.get(e.toId);
        if (fl === undefined) continue;
        if (tl === undefined) continue;
        if (tl - fl !== 1) continue;
        upN.get(e.toId)!.push(e.fromId);
    }

    const ys = new Map<string, number>();

    const first = orderedLayers[0];
    if (first) {
        const n = first.length;
        const span = (n - 1) * SIBLING_STEP;
        first.forEach((id, i) => {
            ys.set(id, i * SIBLING_STEP - span / 2);
        });
    }

    for (let l = 1; l < orderedLayers.length; l++) {
        const layer = orderedLayers[l]!;
        const raw = layer.map(id => {
            const ps = upN.get(id)!;
            if (ps.length === 0) return 0;
            const vals = ps
                .map(p => ys.get(p)!)
                .sort((a, b) => a - b);
            const mid = Math.floor(vals.length / 2);
            if (vals.length % 2 === 1) {
                return vals[mid]!;
            }
            return (vals[mid - 1]! + vals[mid]!) / 2;
        });
        layer.forEach((id, i) => {
            ys.set(id, raw[i]!);
        });
        enforceSpacing(layer, ys);
    }

    const maxLabelByLayer = new Array<number>(
        orderedLayers.length,
    ).fill(0);
    for (const e of forwardEdges) {
        const fl = layerOf.get(e.fromId);
        if (fl === undefined) continue;
        if (fl >= orderedLayers.length) {
            continue;
        }
        const w = maxLabelByLayer[fl]!;
        if (e.labelWidth > w) {
            maxLabelByLayer[fl] =
                e.labelWidth;
        }
    }

    const xByLayer = new Array<number>(
        orderedLayers.length,
    );
    xByLayer[0] = 0;
    for (
        let l = 1;
        l < orderedLayers.length;
        l++
    ) {
        const labelW =
            maxLabelByLayer[l - 1]!;
        const needed = NODE_WIDTH
            + labelW
            + LABEL_SAFETY_MARGIN;
        const step = Math.max(
            MIN_LAYER_STEP, needed,
        );
        xByLayer[l] =
            xByLayer[l - 1]! + step;
    }

    orderedLayers.forEach((layer, l) => {
        const x = xByLayer[l]!;
        for (const id of layer) {
            positions.set(id, {
                x,
                y: ys.get(id)!,
            });
        }
    });

    return positions;
}

function enforceSpacing(
    layer: readonly string[],
    ys: Map<string, number>,
): void {
    for (let i = 1; i < layer.length; i++) {
        const prev = ys.get(layer[i - 1]!)!;
        const cur = ys.get(layer[i]!)!;
        if (cur - prev < SIBLING_STEP) {
            ys.set(layer[i]!, prev + SIBLING_STEP);
        }
    }
}

function fitToCanvas(
    positions: Map<string, Position>,
    canvasW: number,
    canvasH: number,
    nodes: readonly LayoutInput[],
): Map<string, Position> {
    if (positions.size === 0) return new Map();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of positions.values()) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    const natW = maxX - minX;
    const natH = maxY - minY;
    const posCx = (minX + maxX) / 2;
    const posCy = (minY + maxY) / 2;

    const graphLandscape =
        (natW + NODE_WIDTH) >= (natH + NODE_HEIGHT);
    const canvasLandscape = canvasW >= canvasH;
    const rotate =
        canvasW > 0
        && canvasH > 0
        && graphLandscape !== canvasLandscape;

    const rotW = rotate ? natH : natW;
    const rotH = rotate ? natW : natH;

    let scaleX = 1;
    let scaleY = 1;
    if (canvasW > 0 && canvasH > 0) {
        const tW = canvasW - NODE_WIDTH;
        const tH = canvasH - NODE_HEIGHT;
        let sX = Infinity;
        let sY = Infinity;
        if (rotW > 0 && tW > 0) sX = tW / rotW;
        if (rotH > 0 && tH > 0) sY = tH / rotH;
        if (
            isFinite(sX) && sX >= 1
            && isFinite(sY) && sY >= 1
        ) {
            const sSmall = Math.min(sX, sY);
            const sBig = Math.max(sX, sY);
            const capped = Math.min(
                sBig,
                sSmall * MAX_ASPECT_STRETCH,
            );
            scaleX = sX >= sY
                ? capped
                : sSmall;
            scaleY = sY > sX
                ? capped
                : sSmall;
        }
    }

    const halfW = NODE_WIDTH / 2;
    const halfH = NODE_HEIGHT / 2;

    const result = new Map<string, Position>();
    for (const [id, p] of positions) {
        const cx_p = p.x - posCx;
        const cy_p = p.y - posCy;
        const rx = rotate ? -cy_p : cx_p;
        const ry = rotate ? cx_p : cy_p;
        result.set(id, {
            x: rx * scaleX - halfW,
            y: ry * scaleY - halfH,
        });
    }

    const startId = nodes.find(
        n => n.isStart,
    )?.id;
    const endId = nodes.find(
        n => n.isComplete,
    )?.id;
    if (
        startId && endId
        && startId !== endId
    ) {
        const sp = result.get(startId);
        const ep = result.get(endId);
        if (sp && ep) {
            const flipX = sp.x > ep.x;
            const flipY = sp.y > ep.y;
            if (flipX || flipY) {
                let rMinX = Infinity;
                let rMaxX = -Infinity;
                let rMinY = Infinity;
                let rMaxY = -Infinity;
                for (
                    const rp
                    of result.values()
                ) {
                    if (rp.x < rMinX) {
                        rMinX = rp.x;
                    }
                    if (rp.x > rMaxX) {
                        rMaxX = rp.x;
                    }
                    if (rp.y < rMinY) {
                        rMinY = rp.y;
                    }
                    if (rp.y > rMaxY) {
                        rMaxY = rp.y;
                    }
                }
                for (
                    const [, rp] of result
                ) {
                    if (flipX) {
                        rp.x =
                            rMinX + rMaxX
                            - rp.x;
                    }
                    if (flipY) {
                        rp.y =
                            rMinY + rMaxY
                            - rp.y;
                    }
                }
            }
        }
    }

    return result;
}

function computeSnakeWrap(
    nodeCount: number,
    _canvasW: number,
    canvasH: number,
): number {
    if (nodeCount < MIN_SNAKE_NODES) return 0;
    if (canvasH <= 0) return 0;

    const cellH = NODE_HEIGHT + VERTICAL_GAP;
    const targetH = canvasH - NODE_HEIGHT;
    if (targetH <= 0) return 0;
    const numRows = Math.max(
        2, Math.floor(targetH / cellH),
    );
    const k = Math.max(
        2,
        Math.min(
            Math.ceil(nodeCount / numRows),
            nodeCount - 1,
        ),
    );
    return k;
}

function computeBboxAspect(
    positions: ReadonlyMap<string, Position>,
): number {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of positions.values()) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    const w = maxX - minX + NODE_WIDTH;
    const h = maxY - minY + NODE_HEIGHT;
    if (h <= 0) return Infinity;
    return w / h;
}

function snakeColRow(
    i: number,
    k: number,
): { col: number; row: number } {
    const row = Math.floor(i / k);
    const rowEven = row % 2 === 0;
    const col = rowEven
        ? (i % k)
        : (k - 1 - (i % k));
    return { col, row };
}

function computeTopoSnake(
    topo: readonly string[],
    k: number,
    forwardEdges: readonly LayoutEdge[],
    canvasH: number,
): Map<string, Position> {
    const numRows = Math.ceil(topo.length / k);

    const edgeLabel = new Map<string, number>();
    for (const e of forwardEdges) {
        const key = e.fromId + '\0' + e.toId;
        const cur = edgeLabel.get(key) ?? 0;
        if (e.labelWidth > cur) {
            edgeLabel.set(key, e.labelWidth);
        }
    }

    const colGap = new Array<number>(
        Math.max(0, k - 1),
    ).fill(HORIZONTAL_GAP);
    for (let i = 0; i < topo.length - 1; i++) {
        const a = snakeColRow(i, k);
        const b = snakeColRow(i + 1, k);
        if (a.row !== b.row) continue;
        const g = Math.min(a.col, b.col);
        const fwd =
            topo[i]! + '\0' + topo[i + 1]!;
        const rev =
            topo[i + 1]! + '\0' + topo[i]!;
        const labelW = Math.max(
            edgeLabel.get(fwd) ?? 0,
            edgeLabel.get(rev) ?? 0,
        );
        const need = labelW + LABEL_SAFETY_MARGIN;
        if (need > colGap[g]!) colGap[g] = need;
    }

    const colX = new Array<number>(k);
    colX[0] = 0;
    for (let c = 1; c < k; c++) {
        const step = Math.max(
            MIN_LAYER_STEP,
            NODE_WIDTH + colGap[c - 1]!,
        );
        colX[c] = colX[c - 1]! + step;
    }

    const rowY = new Array<number>(numRows);
    rowY[0] = 0;
    if (numRows > 1) {
        const span = canvasH - NODE_HEIGHT;
        const step = span / (numRows - 1);
        for (let r = 1; r < numRows; r++) {
            rowY[r] = r * step;
        }
    }

    const positions = new Map<string, Position>();
    for (let i = 0; i < topo.length; i++) {
        const { col, row } = snakeColRow(i, k);
        positions.set(topo[i]!, {
            x: colX[col]!,
            y: rowY[row]!,
        });
    }

    return positions;
}
