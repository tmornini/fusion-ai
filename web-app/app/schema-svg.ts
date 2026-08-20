// Derive SCHEMA.svg from the schema of record:
// api/db.ts (DbStores + TABLE_NAMES + TABLE_INDEXES),
// api/types.ts (entity fields = columns), and
// api/schema-postgres.ts (PRIMARY KEY, CREATE INDEX,
// FOREIGN KEY). The schema is the source; this emits
// the picture. Run via ./generate-schema-svg [--check].
//
// Deterministic — no clocks, no randomness, stable
// ordering — so `--check` can gate staleness.

interface Column {
    name: string;
    type: string;
    fk: string | null;
    pk: boolean;
}

interface IndexRow {
    name: string;
    method: string;
    opclass: string | null;
    keysDisplay: string;
    columns: string[];
}

interface FkEdge {
    fromTable: string;
    fromCol: string;
    toTable: string;
    toCol: string;
}

interface Table {
    name: string;
    entity: string;
    columns: Column[];
    getWhere: Set<string>;
    indexes: IndexRow[];
}

const INDEX_FILL: Record<string, string> = {
    pk: 'hsl(217 45% 15%)',
    address: 'hsl(217 36% 46%)',
    collection: 'hsl(173 42% 32%)',
    replay: 'hsl(32 70% 42%)',
    version: 'hsl(270 35% 42%)',
    body: 'hsl(350 48% 44%)',
};

function indexFill(name: string): string {
    const fill = INDEX_FILL[name];
    if (fill === undefined) {
        throw new Error('unknown index color: ' + name);
    }
    return fill;
}

function matchParens(
    src: string, open: number,
): { inner: string; end: number } {
    if (src[open] !== '(') {
        throw new Error('expected ( at ' + open);
    }
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        const ch = src[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) {
                return {
                    inner: src.slice(open + 1, i),
                    end: i,
                };
            }
        }
    }
    throw new Error('unterminated ( at ' + open);
}

function splitTopLevel(
    src: string, sep: string,
): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === sep && depth === 0) {
            out.push(src.slice(start, i));
            start = i + sep.length;
        }
    }
    out.push(src.slice(start));
    return out;
}

// _id columns whose target table the name convention cannot
// reach: attribute_id points at record_attributes (the column name
// predates Records); state_event_id points at states;
// from_node_id / to_node_id point at flow_nodes (the from_/to_
// prefix hides the noun the convention would pluralize).
const FK_SPECIAL: Record<string, string> = {
    attribute_id: 'record_attributes',
    state_event_id: 'states',
    from_node_id: 'flow_nodes',
    to_node_id: 'flow_nodes',
};

// Branded id types that name their home table. A detail row whose
// own `id` carries one of these is a shared-primary-key reference
// to that parent (human_members.id: MemberId -> members).
const BRAND_TABLE: Record<string, string> = {
    MemberId: 'members',
    RecordId: 'records',
    RecordAttributeId: 'record_attributes',
    FlowRecordId: 'flow_records',
    ObjectiveId: 'objectives',
};

function sliceBlock(src: string, opener: string): string {
    const start = src.indexOf(opener);
    if (start < 0) throw new Error('not found: ' + opener);
    const from = src.indexOf('{', start);
    let depth = 0;
    for (let i = from; i < src.length; i++) {
        const ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return src.slice(from + 1, i);
        }
    }
    throw new Error('unterminated: ' + opener);
}

function camelToSnake(s: string): string {
    return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function parseTableNames(src: string): string[] {
    const at = src.indexOf('TABLE_NAMES = [');
    const arr = src.slice(at, src.indexOf(']', at));
    const names: string[] = [];
    const re = /'([a-z_]+)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(arr)) !== null) names.push(m[1]!);
    return names;
}

function parseStores(
    src: string,
): { table: string; entity: string }[] {
    const flat = sliceBlock(
        src, 'export interface DbStores {',
    ).replace(/\s+/g, ' ');
    const out: { table: string; entity: string }[] = [];
    const reStore = new RegExp(
        '(\\w+)\\s*:\\s*'
        + '(?:EntityStore|SingletonStore)\\s*<\\s*(\\w+)\\s*>',
        'g',
    );
    let m: RegExpExecArray | null;
    while ((m = reStore.exec(flat)) !== null) {
        out.push({ table: camelToSnake(m[1]!), entity: m[2]! });
    }
    const reState = /(\w+)\s*:\s*StateStore\b/g;
    while ((m = reState.exec(flat)) !== null) {
        out.push({
            table: camelToSnake(m[1]!),
            entity: 'StateEntity',
        });
    }
    return out;
}

function parseFields(
    src: string, entity: string,
): { name: string; type: string }[] {
    const body = sliceBlock(
        src, 'export interface ' + entity + ' {',
    );
    const fields: { name: string; type: string }[] = [];
    for (const raw of body.split('\n')) {
        const line = raw.trim();
        if (line === '' || line.startsWith('//')) continue;
        const m = line.match(/^(\w+)\??\s*:\s*([^;]+);/);
        if (m) fields.push({ name: m[1]!, type: m[2]!.trim() });
    }
    return fields;
}

function displayType(type: string): string {
    if (/Id$/.test(type)) return 'id';
    if (type === 'string') return 'text';
    if (type === 'number') return 'num';
    if (type === 'boolean') return 'bool';
    if (/^Json/.test(type)) return 'json';
    return type;
}

function fkTarget(
    col: string, type: string, table: string,
    tables: Set<string>,
): string | null {
    if (col === 'id') {
        const t = BRAND_TABLE[type];
        return t && t !== table ? t : null;
    }
    if (!col.endsWith('_id')) return null;
    const special = FK_SPECIAL[col];
    if (special) return special;
    const target = col.slice(0, -3) + 's';
    return tables.has(target) ? target : null;
}

function parseTableIndexes(
    src: string,
): Map<string, string[]> {
    const opener = 'export const TABLE_INDEXES';
    if (src.indexOf(opener) < 0) {
        throw new Error('not found: TABLE_INDEXES');
    }
    const body = sliceBlock(src, opener);
    const out = new Map<string, string[]>();
    const tableRe = /(\w+)\s*:\s*\[/g;
    let m: RegExpExecArray | null;
    while ((m = tableRe.exec(body)) !== null) {
        const open = body.indexOf('[', m.index);
        let depth = 0;
        let close = -1;
        for (let i = open; i < body.length; i++) {
            if (body[i] === '[') depth++;
            else if (body[i] === ']') {
                depth--;
                if (depth === 0) {
                    close = i;
                    break;
                }
            }
        }
        if (close < 0) {
            throw new Error(
                'unterminated TABLE_INDEXES list: '
                + m[1],
            );
        }
        const list = body.slice(open + 1, close);
        const cols: string[] = [];
        const itemRe = new RegExp(
            "\\{\\s*column:\\s*'([a-z_]+)'\\s*,"
            + "\\s*unique:\\s*true\\s*\\}"
            + "|'([a-z_]+)'",
            'g',
        );
        let sm: RegExpExecArray | null;
        while ((sm = itemRe.exec(list)) !== null) {
            cols.push((sm[1] || sm[2])!);
        }
        out.set(m[1]!, cols);
        tableRe.lastIndex = close;
    }
    return out;
}

function parseCreateTableBodies(
    src: string,
): Map<string, string> {
    const out = new Map<string, string>();
    const re =
        /CREATE TABLE IF NOT EXISTS (\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
        const open = m.index + m[0].length - 1;
        const { inner, end } = matchParens(src, open);
        out.set(m[1]!, inner);
        re.lastIndex = end + 1;
    }
    return out;
}

function parsePrimaryKeyColumns(body: string): string[] {
    const tableLevel = body.match(
        /(?:CONSTRAINT\s+\w+\s+)?PRIMARY KEY\s*\(([^)]+)\)/,
    );
    if (tableLevel) {
        return tableLevel[1]!.split(',').map((s) =>
            s.trim().replace(/"/g, ''));
    }
    const cols: string[] = [];
    const lineRe = new RegExp(
        '^\\s+("?[A-Za-z_][A-Za-z0-9_]*"?)\\s+'
        + '[^\\n]*PRIMARY KEY',
        'gm',
    );
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(body)) !== null) {
        cols.push(m[1]!.replace(/"/g, ''));
    }
    return cols;
}

function depth0Tokens(item: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    let inTok = false;
    for (let i = 0; i <= item.length; i++) {
        const ch = item[i] ?? ' ';
        const ws = ch === ' ' || ch === '\n'
            || ch === '\t';
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth === 0 && ws) {
            if (inTok) {
                out.push(item.slice(start, i).trim());
                inTok = false;
            }
        } else if (!inTok && !ws) {
            start = i;
            inTok = true;
        }
    }
    return out.filter((t) => t !== '');
}

interface ParsedIndex {
    table: string;
    rawName: string;
    name: string;
    method: string;
    opclass: string | null;
    keysDisplay: string;
    keyIdents: string[];
}

function parseCreateIndexes(src: string): ParsedIndex[] {
    const declared = [
        ...src.matchAll(/CREATE (?:UNIQUE )?INDEX\b/g),
    ].length;
    const out: ParsedIndex[] = [];
    const headRe = new RegExp(
        'CREATE (UNIQUE )?INDEX IF NOT EXISTS '
            + '(\\w+)\\s+ON\\s+(\\w+)',
        'g',
    );
    let m: RegExpExecArray | null;
    while ((m = headRe.exec(src)) !== null) {
        const unique = Boolean(m[1]);
        const rawName = m[2]!;
        const table = m[3]!;
        let i = m.index + m[0].length;
        const ws = (n: number): number => {
            while (
                src[n] === ' ' || src[n] === '\n'
                || src[n] === '\t'
            ) n++;
            return n;
        };
        i = ws(i);
        let method = 'btree';
        const using = /^USING\s+(\w+)/i.exec(
            src.slice(i),
        );
        if (using) {
            method = using[1]!.toLowerCase();
            i = ws(i + using[0].length);
        }
        if (src[i] !== '(') {
            throw new Error(
                'expected key list for index '
                + rawName,
            );
        }
        const { inner, end } = matchParens(src, i);
        const items = splitTopLevel(inner, ',')
            .map((s) => s.trim())
            .filter((s) => s !== '');
        const displays: string[] = [];
        let opclass: string | null = null;
        const idents: string[] = [];
        const identRe = /[A-Za-z_][A-Za-z0-9_]*/g;
        for (const item of items) {
            const toks = depth0Tokens(item);
            let expr = item;
            if (toks.length >= 2) {
                opclass = toks[toks.length - 1]!;
                expr = toks.slice(0, -1).join(' ');
            }
            displays.push(expr);
            identRe.lastIndex = 0;
            let im: RegExpExecArray | null;
            while (
                (im = identRe.exec(expr)) !== null
            ) {
                idents.push(im[0]);
            }
        }
        if (unique) method = 'unique ' + method;
        const prefix = table + '_';
        if (!rawName.startsWith(prefix)) {
            throw new Error(
                'index name missing table prefix: '
                + rawName,
            );
        }
        const name = rawName.slice(prefix.length);
        if (name === '') {
            throw new Error(
                'index name is only table prefix: '
                + rawName,
            );
        }
        out.push({
            table,
            rawName,
            name,
            method,
            opclass,
            keysDisplay: displays.join(', '),
            keyIdents: idents,
        });
        headRe.lastIndex = end + 1;
    }
    if (out.length !== declared) {
        throw new Error(
            'CREATE INDEX parse count '
            + out.length + ' != ' + declared,
        );
    }
    return out;
}

function parseForeignKeys(
    bodies: Map<string, string>,
): FkEdge[] {
    const edges: FkEdge[] = [];
    const re = new RegExp(
        'FOREIGN KEY\\s*\\(([^)]+)\\)\\s*'
        + 'REFERENCES\\s+(\\w+)\\s*\\(([^)]+)\\)',
        'g',
    );
    for (const [fromTable, body] of bodies) {
        let m: RegExpExecArray | null;
        const local = new RegExp(re.source, 'g');
        while ((m = local.exec(body)) !== null) {
            const fromCols = m[1]!.split(',').map(
                (s) => s.trim(),
            );
            const toTable = m[2]!;
            const toCols = m[3]!.split(',').map(
                (s) => s.trim(),
            );
            if (fromCols.length !== toCols.length) {
                throw new Error(
                    'FK column count mismatch on '
                    + fromTable,
                );
            }
            for (let i = 0; i < fromCols.length; i++) {
                edges.push({
                    fromTable,
                    fromCol: fromCols[i]!,
                    toTable,
                    toCol: toCols[i]!,
                });
            }
        }
    }
    return edges;
}

// Rank each table by its longest foreign-key chain: roots (no
// outgoing FK) sit at rank 0, their referrers at rank 1, and so
// on. Relaxation is capped at one pass per table so any cycle
// resolves to a finite, deterministic rank rather than looping.
function computeRanks(tables: Table[]): Map<string, number> {
    const refs = new Map<string, string[]>();
    for (const t of tables) {
        const out = t.columns
            .filter((c) => c.fk && c.fk !== t.name)
            .map((c) => c.fk!);
        refs.set(t.name, [...new Set(out)]);
    }
    const rank = new Map<string, number>();
    for (const t of tables) rank.set(t.name, 0);
    for (let i = 0; i < tables.length; i++) {
        let changed = false;
        for (const t of tables) {
            let best = 0;
            for (const r of refs.get(t.name)!) {
                best = Math.max(best, (rank.get(r) ?? 0) + 1);
            }
            if (best > rank.get(t.name)!) {
                rank.set(t.name, best);
                changed = true;
            }
        }
        if (!changed) break;
    }
    return rank;
}

const BOX_W = 208;
const HEADER_H = 26;
const ROW_H = 18;
const TEXT_INSET_X = 10;
const HEADER_BASELINE_Y = 18;
const ROW_BASELINE_Y = 13;
const COL_GAP = 96;
const ROW_GAP = 30;
const PAD = 40;
const MAX_PER_COL = 6;

function boxHeight(t: Table): number {
    return HEADER_H + t.columns.length * ROW_H;
}

interface Placed {
    table: Table;
    x: number;
    y: number;
    h: number;
}

function layout(tables: Table[]): {
    placed: Map<string, Placed>;
    width: number;
    height: number;
} {
    const rank = computeRanks(tables);
    const byRank = new Map<number, Table[]>();
    for (const t of tables) {
        const r = rank.get(t.name)!;
        const list = byRank.get(r);
        if (list) {
            list.push(t);
        } else {
            byRank.set(r, [t]);
        }
    }
    for (const list of byRank.values()) {
        list.sort((a, b) => (a.name < b.name ? -1 : 1));
    }
    const ranks = [...byRank.keys()].sort((a, b) => a - b);
    const placed = new Map<string, Placed>();
    let bottom = 0;
    let vcol = 0;
    // A whole rank can hold many tables; wrap each into stacks of
    // at most MAX_PER_COL so the diagram stays a balanced
    // landscape while columns still read left-to-right by FK depth.
    for (const r of ranks) {
        const list = byRank.get(r)!;
        for (let i = 0; i < list.length; i += MAX_PER_COL) {
            const x = PAD + vcol * (BOX_W + COL_GAP);
            let y = PAD;
            for (const t of list.slice(i, i + MAX_PER_COL)) {
                const h = boxHeight(t);
                placed.set(t.name, { table: t, x, y, h });
                y += h + ROW_GAP;
            }
            bottom = Math.max(bottom, y - ROW_GAP);
            vcol++;
        }
    }
    const width =
        PAD * 2 + vcol * BOX_W + (vcol - 1) * COL_GAP;
    return { placed, width, height: bottom + PAD };
}

function esc(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderBox(p: Placed, parts: string[]): void {
    const { table: t, x, y, h } = p;
    parts.push(
        `  <g class="table">`,
        `    <rect class="box" x="${x}" y="${y}" `
        + `width="${BOX_W}" height="${h}" rx="6" />`,
        `    <rect class="head" x="${x}" y="${y}" `
        + `width="${BOX_W}" height="${HEADER_H}" rx="6" />`,
        `    <text class="thead" x="${x + TEXT_INSET_X}" `
        + `y="${y + HEADER_BASELINE_Y}">${esc(t.name)}</text>`,
    );
    t.columns.forEach((c, i) => {
        const cy = y + HEADER_H + i * ROW_H
            + ROW_BASELINE_Y;
        const cls = c.pk ? 'pk' : c.fk ? 'fk' : 'col';
        parts.push(
            `    <text class="${cls}" x="${x + TEXT_INSET_X}" `
            + `y="${cy}">${esc(c.name)}</text>`,
            `    <text class="type" x="${x
            + BOX_W - TEXT_INSET_X}" `
            + `y="${cy}">${esc(c.type)}</text>`,
        );
    });
    parts.push(`  </g>`);
}

function renderEdge(
    from: Placed, to: Placed, parts: string[],
): void {
    const fc = from.y + from.h / 2;
    const tc = to.y + to.h / 2;
    let sx: number;
    let tx: number;
    let dir: number;
    if (to.x < from.x) {
        sx = from.x;
        tx = to.x + BOX_W;
        dir = -1;
    } else if (to.x > from.x) {
        sx = from.x + BOX_W;
        tx = to.x;
        dir = 1;
    } else {
        sx = from.x + BOX_W;
        tx = to.x + BOX_W;
        dir = 1;
    }
    const k = COL_GAP * 0.6 * dir;
    parts.push(
        `  <path class="edge" d="M ${sx} ${fc} `
        + `C ${sx + k} ${fc}, ${tx - k} ${tc}, `
        + `${tx} ${tc}" />`,
    );
}

const STYLE = [
    '    <style>',
    '      text { font-family: ui-sans-serif, system-ui,',
    "        'Segoe UI', Helvetica, Arial, sans-serif; }",
    '      .box { fill: hsl(0 0% 100%);',
    '        stroke: hsl(217 30% 88%); stroke-width: 1; }',
    '      .head { fill: hsl(217 36% 46%); }',
    '      .thead { fill: hsl(0 0% 100%); font-size: 12px;',
    '        font-weight: 700; }',
    '      .col, .pk, .fk, .type { font-size: 11px; }',
    '      .col { fill: hsl(217 45% 15%); }',
    '      .pk { fill: hsl(217 45% 15%); font-weight: 700; }',
    '      .fk { fill: hsl(217 38% 38%);',
    '        font-style: italic; }',
    '      .type { fill: hsl(217 12% 55%);',
    '        text-anchor: end; }',
    '      .edge { fill: none; stroke: hsl(217 34% 60%);',
    '        stroke-width: 1.5; }',
    '    </style>',
];

export type SchemaSvgSources = {
    typesSrc: string;
    dbSrc: string;
    schemaSrc: string;
};

function buildModel(
    typesSrc: string,
    dbSrc: string,
    schemaSrc: string,
): { tables: Table[]; fkEdges: FkEdge[] } {
    const tableNames = parseTableNames(dbSrc);
    const tableSet = new Set(tableNames);
    const stores = parseStores(dbSrc);

    const parsed = new Set(stores.map((s) => s.table));
    for (const t of tableNames) {
        if (!parsed.has(t)) {
            throw new Error(
                'no store parsed for table: ' + t,
            );
        }
    }
    if (parsed.size !== tableNames.length) {
        throw new Error('store/table count mismatch');
    }

    const getWhere = parseTableIndexes(dbSrc);
    const tableBodies = parseCreateTableBodies(
        schemaSrc,
    );
    const physical = parseCreateIndexes(schemaSrc);
    for (const idx of physical) {
        if (!tableSet.has(idx.table)) {
            throw new Error(
                'index on unknown table: '
                + idx.rawName,
            );
        }
        indexFill(idx.name);
    }
    indexFill('pk');

    const fkEdges = parseForeignKeys(tableBodies)
        .filter((e) =>
            tableSet.has(e.fromTable)
            && tableSet.has(e.toTable));

    const tables = stores.map((s) => {
        const fields = parseFields(typesSrc, s.entity);
        const colNames = new Set(
            fields.map((f) => f.name),
        );
        const pkCols = parsePrimaryKeyColumns(
            tableBodies.get(s.table) ?? '',
        );
        if (pkCols.length === 0) {
            throw new Error(
                'no PRIMARY KEY for table: ' + s.table,
            );
        }
        const pk: IndexRow = {
            name: 'pk',
            method: 'btree',
            opclass: null,
            keysDisplay: pkCols.join(', '),
            columns: pkCols,
        };
        const indexes: IndexRow[] = [
            pk,
            ...physical
                .filter((idx) => idx.table === s.table)
                .map((idx) => ({
                    name: idx.name,
                    method: idx.method,
                    opclass: idx.opclass,
                    keysDisplay: idx.keysDisplay,
                    columns: idx.keyIdents.filter(
                        (id) => colNames.has(id),
                    ),
                })),
        ];
        return {
            name: s.table,
            entity: s.entity,
            columns: fields.map((f) => ({
                name: f.name,
                type: displayType(f.type),
                fk: fkTarget(
                    f.name, f.type, s.table, tableSet,
                ),
                pk: f.name === 'id',
            })),
            getWhere: new Set(
                getWhere.get(s.table) ?? [],
            ),
            indexes,
        };
    });
    return { tables, fkEdges };
}

function render(
    typesSrc: string,
    dbSrc: string,
    schemaSrc: string,
): string {
    const { tables, fkEdges } = buildModel(
        typesSrc, dbSrc, schemaSrc,
    );
    void fkEdges;
    // drawing comes in Task 3 / Task 4
    const { placed, width, height } = layout(tables);
    const parts: string[] = [];
    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" `
        + `viewBox="0 0 ${width} ${height}" `
        + `width="${width}" height="${height}">`,
        '  <defs>',
        ...STYLE,
        '  </defs>',
        `  <rect x="0" y="0" width="${width}" `
        + `height="${height}" fill="hsl(217 30% 97%)" />`,
    );
    for (const t of tables) {
        for (const c of t.columns) {
            if (!c.fk || c.fk === t.name) continue;
            const to = placed.get(c.fk);
            if (to) {
                renderEdge(
                    placed.get(t.name)!, to, parts,
                );
            }
        }
    }
    for (const t of tables) {
        renderBox(placed.get(t.name)!, parts);
    }
    parts.push('</svg>', '');
    return parts.join('\n');
}

export function renderSchemaSvg(
    src: SchemaSvgSources,
): string {
    return render(
        src.typesSrc, src.dbSrc, src.schemaSrc,
    );
}
