# Per-Objective Project Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Replace the project's single
`estimated_impact` / `actual_impact` integer fields with a
per-objective scoring model — CEO-authored organizational
objectives, bipolar [-100, +100] sliders gating project
approval and completion, append-only event-log scoring with
revision history for objective definitions, and a reworked
dashboard with a bipolar arc gauge plus per-objective
aggregates.

**Architecture:** Five new tables in localStorage
(`objectives`, `objective_revisions`, `deprecated_objectives`,
`project_objective_baseline_scores`,
`project_objective_actual_scores`). Three new adapter
modules (`objectives.ts`, `project-scoring.ts`,
`project-publish.ts`). Eight new presenters. Project impact
is derived (never stored). Objective name/description live
in an event log; score rows reference only `objective_id`.
Validator-gated transitions for approval and completion
mirror the existing `validateFlowForCreation` pattern.

**Tech Stack:** Vanilla TypeScript ES2024 strict mode with
`noUncheckedIndexedAccess`. Zero runtime dependencies.
`node:test` runner via
`node --test --strip-types tests/*.test.ts`. SafeHtml from
presenters via tagged template literals (`html\`...\``).
`RequestContext` as the single I/O surface; localStorage
via `DbAdapter` interface. 78-char max line width on `.ts`,
`.html`, `.css` files.

**Specification:**
`docs/superpowers/specs/2026-05-14-objectives-design.md`.
This plan implements that spec verbatim. When the plan says
"per the spec," consult that file for the authoritative
shape.

**Reference paths in the repo:**

- `api/types.ts` — row types
- `api/db.ts` — `TABLE_NAMES` + `DbAdapter` interface
- `api/db-memory.ts` — in-memory adapter for tests
- `api/validators.ts` — `assert*` entity validators
- `api/mock-data.ts` — `populateMockData`
- `web-app/app/adapters/shared.ts` — `RequestContext` +
  `commit(tx)`
- `web-app/app/adapters/flow-publish.ts` — the *existing*
  `validateFlowForCreation` pattern to mirror
- `web-app/app/adapters/workers-union.ts` — the *existing*
  `workerName(map, id)` throw-on-absent pattern to mirror
- `web-app/app/presenters/gauge.ts` — the *existing*
  `GaugePresenter` to slot beside (not modify)
- `web-app/app/styles/components.css` — shared 3+-call-site
  CSS
- `web-app/app/styles/pages.css` — page-scoped CSS

---

## Phase 1 — Foundation

This phase lands the schema, types, validators, mock data,
and schema-version bootstrap. After this phase the suite of
existing tests must still pass; the new automated tests
written here exercise only entity validators and mock-data
seeding. Nothing is wired into pages yet.

### Task 1.1: Add new row types to `api/types.ts`

**Files:**
- Modify: `api/types.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/types-objectives.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type {
    Objective,
    ObjectiveRevision,
    DeprecatedObjective,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../api/types.ts';

test('Objective shape compiles', () => {
    const v: Objective = { id: 'o1', position: 0 };
    assert.equal(v.id, 'o1');
    assert.equal(v.position, 0);
});

test('ObjectiveRevision shape compiles', () => {
    const v: ObjectiveRevision = {
        objective_id: 'o1',
        name: 'Revenue Growth',
        description: 'Drive top-line growth',
        revised_at: '2026-05-14T00:00:00.000Z',
    };
    assert.equal(v.objective_id, 'o1');
});

test('DeprecatedObjective shape compiles', () => {
    const v: DeprecatedObjective = {
        objective_id: 'o1',
        deprecated_at: '2026-05-14T00:00:00.000Z',
    };
    assert.equal(v.objective_id, 'o1');
});

test('ProjectObjectiveBaselineScore shape compiles', () => {
    const v: ProjectObjectiveBaselineScore = {
        project_id: 'p1',
        objective_id: 'o1',
        score: 42,
        scored_at: '2026-05-14T00:00:00.000Z',
    };
    assert.equal(v.score, 42);
});

test('ProjectObjectiveActualScore shape compiles', () => {
    const v: ProjectObjectiveActualScore = {
        project_id: 'p1',
        objective_id: 'o1',
        score: -10,
        scored_at: '2026-05-14T00:00:00.000Z',
    };
    assert.equal(v.score, -10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/types-objectives.test.ts`

Expected: FAIL — the imports don't resolve because none of
the five interfaces exist in `api/types.ts` yet.

- [ ] **Step 3: Add the five new interfaces to `api/types.ts`**

Locate the section in `api/types.ts` that defines other row
types (search for `interface ProjectEntity`). Add **before**
that section:

```ts
export type ObjectiveId = string;

export interface Objective {
    id: ObjectiveId;
    position: number;
}

export interface ObjectiveRevision {
    objective_id: ObjectiveId;
    name: string;
    description: string;
    revised_at: string;
}

export interface DeprecatedObjective {
    objective_id: ObjectiveId;
    deprecated_at: string;
}

export interface ProjectObjectiveBaselineScore {
    project_id: ProjectId;
    objective_id: ObjectiveId;
    score: number;
    scored_at: string;
}

export interface ProjectObjectiveActualScore {
    project_id: ProjectId;
    objective_id: ObjectiveId;
    score: number;
    scored_at: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/types-objectives.test.ts`

Expected: PASS — all five interface shape tests pass.

- [ ] **Step 5: Commit**

```bash
git add api/types.ts tests/types-objectives.test.ts
git commit -m "add objective and per-objective score row types"
```

### Task 1.2: Remove `estimated_impact` / `actual_impact` from `ProjectEntity`

**Files:**
- Modify: `api/types.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/types-objectives.test.ts`:

```ts
import type { ProjectEntity } from '../api/types.ts';

test('ProjectEntity no longer carries impact fields', () => {
    type ImpactKey =
        Extract<keyof ProjectEntity,
            'estimated_impact' | 'actual_impact'>;
    const noImpact: [ImpactKey] extends [never]
        ? true
        : false = true;
    assert.equal(noImpact, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/types-objectives.test.ts`

Expected: FAIL — the type assertion resolves to `false`
because `estimated_impact` and `actual_impact` still exist.

- [ ] **Step 3: Remove the fields from `ProjectEntity`**

In `api/types.ts`, locate `interface ProjectEntity`.
DELETE the two lines:

```ts
estimated_impact: number;
actual_impact: number;
```

Leave every other field untouched.

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/types-objectives.test.ts`

Expected: PASS — `ImpactKey` resolves to `never`, the
conditional resolves to `true`.

- [ ] **Step 5: Commit**

```bash
git add api/types.ts tests/types-objectives.test.ts
git commit -m "remove estimated_impact and actual_impact from ProjectEntity"
```

### Task 1.3: Add new tables to `TABLE_NAMES`

**Files:**
- Modify: `api/db.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/db-table-names.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { TABLE_NAMES } from '../api/db.ts';

test('TABLE_NAMES includes the five new tables', () => {
    const expected = [
        'objectives',
        'objective_revisions',
        'deprecated_objectives',
        'project_objective_baseline_scores',
        'project_objective_actual_scores',
    ];
    for (const name of expected) {
        assert.ok(
            TABLE_NAMES.includes(name as never),
            `TABLE_NAMES missing ${name}`,
        );
    }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --strip-types tests/db-table-names.test.ts`

Expected: FAIL — at least one of the five new names is
missing.

- [ ] **Step 3: Add the five new names to `TABLE_NAMES`**

In `api/db.ts`, locate the `TABLE_NAMES` array. Add the
five new entries, preserving alphabetical-ish grouping:

```ts
export const TABLE_NAMES = [
    // ...existing entries...
    'objectives',
    'objective_revisions',
    'deprecated_objectives',
    'project_objective_baseline_scores',
    'project_objective_actual_scores',
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --strip-types tests/db-table-names.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/db.ts tests/db-table-names.test.ts
git commit -m "register five new tables for objectives and scoring"
```

### Task 1.4: Add five entity validators to `api/validators.ts`

**Files:**
- Modify: `api/validators.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/validators-objectives.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    assertObjective,
    assertObjectiveRevision,
    assertDeprecatedObjective,
    assertBaselineScore,
    assertActualScore,
} from '../api/validators.ts';

test('assertObjective accepts valid', () => {
    const v = assertObjective({ id: 'o1', position: 0 });
    assert.equal(v.id, 'o1');
});

test('assertObjective rejects missing id', () => {
    assert.throws(() => assertObjective({ position: 0 }));
});

test('assertObjective rejects non-integer position', () => {
    assert.throws(
        () => assertObjective({ id: 'o1', position: 1.5 }),
    );
});

test('assertObjectiveRevision accepts valid', () => {
    const v = assertObjectiveRevision({
        objective_id: 'o1',
        name: 'Revenue',
        description: 'Top line',
        revised_at: '2026-05-14T00:00:00.000Z',
    });
    assert.equal(v.name, 'Revenue');
});

test('assertObjectiveRevision rejects missing name', () => {
    assert.throws(
        () => assertObjectiveRevision({
            objective_id: 'o1',
            description: 'x',
            revised_at: '2026-05-14T00:00:00.000Z',
        }),
    );
});

test('assertObjectiveRevision rejects bad timestamp', () => {
    assert.throws(
        () => assertObjectiveRevision({
            objective_id: 'o1',
            name: 'Revenue',
            description: 'x',
            revised_at: 'yesterday',
        }),
    );
});

test('assertDeprecatedObjective accepts valid', () => {
    const v = assertDeprecatedObjective({
        objective_id: 'o1',
        deprecated_at: '2026-05-14T00:00:00.000Z',
    });
    assert.equal(v.objective_id, 'o1');
});

test('assertBaselineScore accepts 0', () => {
    const v = assertBaselineScore({
        project_id: 'p1',
        objective_id: 'o1',
        score: 0,
        scored_at: '2026-05-14T00:00:00.000Z',
    });
    assert.equal(v.score, 0);
});

test('assertBaselineScore accepts -100 and +100', () => {
    assert.equal(
        assertBaselineScore({
            project_id: 'p1', objective_id: 'o1',
            score: -100,
            scored_at: '2026-05-14T00:00:00.000Z',
        }).score,
        -100,
    );
    assert.equal(
        assertBaselineScore({
            project_id: 'p1', objective_id: 'o1',
            score: 100,
            scored_at: '2026-05-14T00:00:00.000Z',
        }).score,
        100,
    );
});

test('assertBaselineScore rejects out-of-range', () => {
    assert.throws(() => assertBaselineScore({
        project_id: 'p1', objective_id: 'o1',
        score: 101,
        scored_at: '2026-05-14T00:00:00.000Z',
    }));
    assert.throws(() => assertBaselineScore({
        project_id: 'p1', objective_id: 'o1',
        score: -101,
        scored_at: '2026-05-14T00:00:00.000Z',
    }));
});

test('assertBaselineScore rejects non-integer', () => {
    assert.throws(() => assertBaselineScore({
        project_id: 'p1', objective_id: 'o1',
        score: 12.5,
        scored_at: '2026-05-14T00:00:00.000Z',
    }));
});

test('assertActualScore has same rules as baseline', () => {
    const v = assertActualScore({
        project_id: 'p1', objective_id: 'o1',
        score: -50,
        scored_at: '2026-05-14T00:00:00.000Z',
    });
    assert.equal(v.score, -50);
    assert.throws(() => assertActualScore({
        project_id: 'p1', objective_id: 'o1',
        score: 200,
        scored_at: '2026-05-14T00:00:00.000Z',
    }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/validators-objectives.test.ts`

Expected: FAIL — none of the five validators exist yet.

- [ ] **Step 3: Add validators to `api/validators.ts`**

Look at existing `assertHumanWorkerEntity` /
`assertAIWorkerEntity` for the codebase's validator
pattern. Then add (after existing assert functions):

```ts
const RFC_3339_ZULU =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function assertNonEmptyString(v: unknown, name: string)
    : string {
    if (typeof v !== 'string' || v.length === 0) {
        throw new Error(`${name} must be non-empty string`);
    }
    return v;
}

function assertTimestamp(v: unknown, name: string): string {
    const s = assertNonEmptyString(v, name);
    if (!RFC_3339_ZULU.test(s)) {
        throw new Error(`${name} must be RFC-3339 zulu`);
    }
    return s;
}

function assertScoreValue(v: unknown): number {
    if (
        typeof v !== 'number'
        || !Number.isInteger(v)
        || v < -100
        || v > 100
    ) {
        throw new Error(
            'score must be integer in [-100, +100]',
        );
    }
    return v;
}

function assertNonNegativeInt(v: unknown, name: string)
    : number {
    if (
        typeof v !== 'number'
        || !Number.isInteger(v)
        || v < 0
    ) {
        throw new Error(`${name} must be non-negative int`);
    }
    return v;
}

export function assertObjective(v: unknown): Objective {
    if (v === null || typeof v !== 'object') {
        throw new Error('Objective must be an object');
    }
    const o = v as Record<string, unknown>;
    return {
        id: assertNonEmptyString(o.id, 'Objective.id'),
        position: assertNonNegativeInt(
            o.position,
            'Objective.position',
        ),
    };
}

export function assertObjectiveRevision(
    v: unknown,
): ObjectiveRevision {
    if (v === null || typeof v !== 'object') {
        throw new Error('ObjectiveRevision must be object');
    }
    const o = v as Record<string, unknown>;
    return {
        objective_id: assertNonEmptyString(
            o.objective_id, 'ObjectiveRevision.objective_id',
        ),
        name: assertNonEmptyString(
            o.name, 'ObjectiveRevision.name',
        ),
        description: assertNonEmptyString(
            o.description, 'ObjectiveRevision.description',
        ),
        revised_at: assertTimestamp(
            o.revised_at, 'ObjectiveRevision.revised_at',
        ),
    };
}

export function assertDeprecatedObjective(
    v: unknown,
): DeprecatedObjective {
    if (v === null || typeof v !== 'object') {
        throw new Error('DeprecatedObjective must be object');
    }
    const o = v as Record<string, unknown>;
    return {
        objective_id: assertNonEmptyString(
            o.objective_id,
            'DeprecatedObjective.objective_id',
        ),
        deprecated_at: assertTimestamp(
            o.deprecated_at,
            'DeprecatedObjective.deprecated_at',
        ),
    };
}

export function assertBaselineScore(
    v: unknown,
): ProjectObjectiveBaselineScore {
    if (v === null || typeof v !== 'object') {
        throw new Error('BaselineScore must be object');
    }
    const o = v as Record<string, unknown>;
    return {
        project_id: assertNonEmptyString(
            o.project_id, 'BaselineScore.project_id',
        ),
        objective_id: assertNonEmptyString(
            o.objective_id, 'BaselineScore.objective_id',
        ),
        score: assertScoreValue(o.score),
        scored_at: assertTimestamp(
            o.scored_at, 'BaselineScore.scored_at',
        ),
    };
}

export function assertActualScore(
    v: unknown,
): ProjectObjectiveActualScore {
    if (v === null || typeof v !== 'object') {
        throw new Error('ActualScore must be object');
    }
    const o = v as Record<string, unknown>;
    return {
        project_id: assertNonEmptyString(
            o.project_id, 'ActualScore.project_id',
        ),
        objective_id: assertNonEmptyString(
            o.objective_id, 'ActualScore.objective_id',
        ),
        score: assertScoreValue(o.score),
        scored_at: assertTimestamp(
            o.scored_at, 'ActualScore.scored_at',
        ),
    };
}
```

Also add the imports for the five row types at the top of
`api/validators.ts` if not already imported:

```ts
import type {
    Objective,
    ObjectiveRevision,
    DeprecatedObjective,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from './types.ts';
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/validators-objectives.test.ts`

Expected: PASS — all twelve test cases pass.

- [ ] **Step 5: Commit**

```bash
git add api/validators.ts tests/validators-objectives.test.ts
git commit -m "add validators for objective and score entities"
```

### Task 1.5: Drop obsolete fields from `assertProject`

**Files:**
- Modify: `api/validators.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/validators-objectives.test.ts`:

```ts
import { assertProjectEntity } from '../api/validators.ts';

test('assertProjectEntity ignores legacy impact fields',
    () => {
        const baseValid = {
            id: 'p1',
            title: 't',
            description: 'd',
            status: 'submitted',
            progress: 0,
            start_date: '2026-05-14T00:00:00.000Z',
            target_end_date: '2026-05-14T00:00:00.000Z',
            estimated_duration: 0,
            actual_duration: 0,
            estimated_cost: 0,
            actual_cost: 0,
            position: 0,
            business_context: {},
            timeline_label: 'q1',
        };
        const v = assertProjectEntity(baseValid);
        assert.equal(
            'estimated_impact' in (v as object),
            false,
        );
        assert.equal(
            'actual_impact' in (v as object),
            false,
        );
    });
```

(If the existing `assertProjectEntity` is named differently
in the codebase — e.g., `validateProjectEntity` — adapt the
import.)

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/validators-objectives.test.ts`

Expected: FAIL — current `assertProjectEntity` likely
throws because `estimated_impact` / `actual_impact` are
absent (it still requires them).

- [ ] **Step 3: Remove impact-field assertions from
`assertProjectEntity`**

In `api/validators.ts`, locate `assertProjectEntity` (or
its existing name). DELETE the two lines that copy
`estimated_impact` and `actual_impact` from input to
output (and any associated `assertNonNegativeInt` /
`assertInteger` calls for those two fields).

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/validators-objectives.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/validators.ts tests/validators-objectives.test.ts
git commit -m "drop legacy impact field validation from project entity"
```

### Task 1.6: Add `SCHEMA_VERSION` constant and bootstrap check

**Files:**
- Create: `api/schema-version.ts`
- Modify: `web-app/app/database-init.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schema-version.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { SCHEMA_VERSION } from '../api/schema-version.ts';

test('SCHEMA_VERSION is a positive integer', () => {
    assert.equal(typeof SCHEMA_VERSION, 'number');
    assert.ok(Number.isInteger(SCHEMA_VERSION));
    assert.ok(SCHEMA_VERSION >= 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --strip-types tests/schema-version.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `api/schema-version.ts`**

```ts
export const SCHEMA_VERSION = 2;
export const SCHEMA_VERSION_KEY = 'fusion-ai:schema_version';
```

(Pick `2` because there's an implicit `1` in the existing
schema before this change.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --strip-types tests/schema-version.test.ts`

Expected: PASS.

- [ ] **Step 5: Add bootstrap check to
`web-app/app/database-init.ts`**

Read the existing `database-init.ts` to learn the bootstrap
flow. Locate the function that runs at app startup (likely
`initDatabase()` or `bootstrap()`). At its **beginning**,
add:

```ts
import {
    SCHEMA_VERSION,
    SCHEMA_VERSION_KEY,
} from '../../api/schema-version.ts';
import { TABLE_NAMES } from '../../api/db.ts';

function checkSchemaVersion(): void {
    const stored = localStorage.getItem(SCHEMA_VERSION_KEY);
    const parsed = stored === null
        ? 0
        : Number.parseInt(stored, 10);
    if (parsed < SCHEMA_VERSION) {
        for (const table of TABLE_NAMES) {
            localStorage.removeItem(`fusion-ai:${table}`);
        }
        localStorage.removeItem('fusion-ai:deleted');
        localStorage.setItem(
            SCHEMA_VERSION_KEY,
            String(SCHEMA_VERSION),
        );
    }
}
```

Call `checkSchemaVersion()` at the top of the bootstrap
function (before mock-data population).

- [ ] **Step 6: Commit**

```bash
git add api/schema-version.ts web-app/app/database-init.ts tests/schema-version.test.ts
git commit -m "add schema version constant and wipe-on-mismatch bootstrap"
```

### Task 1.7: Seed objectives + revisions in `populateMockData`

**Files:**
- Modify: `api/mock-data.ts`

- [ ] **Step 1: Write the failing test**

Create or update `tests/mock-data-objectives.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { populateMockData } from '../api/mock-data.ts';
import { assertObjective } from '../api/validators.ts';
import { assertObjectiveRevision } from
    '../api/validators.ts';

test('populateMockData seeds 5 objectives', async () => {
    const db = new MemoryDbAdapter();
    await populateMockData(db);
    const rows = await db.getAll('objectives');
    assert.equal(rows.length, 5);
    for (const r of rows) assertObjective(r);
});

test('populateMockData seeds one revision per objective',
    async () => {
        const db = new MemoryDbAdapter();
        await populateMockData(db);
        const revs = await db.getAll('objective_revisions');
        assert.equal(revs.length, 5);
        for (const r of revs) assertObjectiveRevision(r);
        const objIds = new Set(
            (await db.getAll('objectives'))
                .map((o: any) => o.id),
        );
        const revObjIds = new Set(
            revs.map((r: any) => r.objective_id),
        );
        assert.deepEqual(revObjIds, objIds);
    });

test('populateMockData seeds zero deprecated objectives',
    async () => {
        const db = new MemoryDbAdapter();
        await populateMockData(db);
        const rows = await db.getAll('deprecated_objectives');
        assert.equal(rows.length, 0);
    });
```

(If `MemoryDbAdapter.getAll` is named differently — e.g.,
`list` — adapt the calls. Read `api/db-memory.ts` for the
exact surface.)

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/mock-data-objectives.test.ts`

Expected: FAIL — `populateMockData` does not yet seed
objectives.

- [ ] **Step 3: Add seeding logic to `populateMockData`**

In `api/mock-data.ts`, near where projects are populated,
add:

```ts
const OBJECTIVE_SEEDS: Array<{
    id: string;
    position: number;
    name: string;
    description: string;
}> = [
    { id: 'obj-revenue', position: 0,
      name: 'Revenue Growth',
      description: 'Drive sustainable top-line growth' },
    { id: 'obj-cost', position: 1,
      name: 'Cost Reduction',
      description: 'Minimize operational waste' },
    { id: 'obj-customer', position: 2,
      name: 'Customer Satisfaction',
      description: 'Improve user-perceived value' },
    { id: 'obj-team', position: 3,
      name: 'Team Wellbeing',
      description: 'Sustainable, energizing work' },
    { id: 'obj-ops', position: 4,
      name: 'Operational Efficiency',
      description: 'Reduce friction in delivery' },
];

const MOCK_SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';

for (const seed of OBJECTIVE_SEEDS) {
    await db.put('objectives', seed.id, {
        id: seed.id,
        position: seed.position,
    });
    await db.put(
        'objective_revisions',
        `${seed.id}:${MOCK_SEED_TIMESTAMP}`,
        {
            objective_id: seed.id,
            name: seed.name,
            description: seed.description,
            revised_at: MOCK_SEED_TIMESTAMP,
        },
    );
}
```

(If the DbAdapter uses different key conventions or method
names, adapt accordingly — read `api/db-memory.ts` for the
exact interface.)

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/mock-data-objectives.test.ts`

Expected: PASS — all three test cases pass.

- [ ] **Step 5: Commit**

```bash
git add api/mock-data.ts tests/mock-data-objectives.test.ts
git commit -m "seed 5 mock objectives with initial revisions"
```

### Task 1.8: Seed baseline + actual scores per project status

**Files:**
- Modify: `api/mock-data.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/mock-data-objectives.test.ts`:

```ts
test('approved projects have full baseline coverage',
    async () => {
        const db = new MemoryDbAdapter();
        await populateMockData(db);
        const projects = await db.getAll('projects');
        const approved = projects.filter(
            (p: any) => p.status === 'approved',
        );
        const objCount = (await db.getAll('objectives'))
            .length;
        for (const p of approved) {
            const baselines = (
                await db.getAll(
                    'project_objective_baseline_scores',
                )
            ).filter((b: any) => b.project_id === p.id);
            const pairs = new Set(
                baselines.map((b: any) => b.objective_id),
            );
            assert.equal(
                pairs.size,
                objCount,
                `project ${p.id} missing baseline coverage`,
            );
        }
    });

test('completed projects have at least one actual per pair',
    async () => {
        const db = new MemoryDbAdapter();
        await populateMockData(db);
        const projects = await db.getAll('projects');
        const completed = projects.filter(
            (p: any) => p.status === 'completed',
        );
        for (const p of completed) {
            const baselines = (
                await db.getAll(
                    'project_objective_baseline_scores',
                )
            ).filter((b: any) => b.project_id === p.id);
            const pairs = new Set(
                baselines.map((b: any) => b.objective_id),
            );
            const actuals = (
                await db.getAll(
                    'project_objective_actual_scores',
                )
            ).filter((a: any) => a.project_id === p.id);
            const actualPairs = new Set(
                actuals.map((a: any) => a.objective_id),
            );
            for (const pair of pairs) {
                assert.ok(
                    actualPairs.has(pair),
                    `project ${p.id} missing actual for ${pair}`,
                );
            }
        }
    });

test('submitted projects have zero scores', async () => {
    const db = new MemoryDbAdapter();
    await populateMockData(db);
    const projects = await db.getAll('projects');
    const submitted = projects.filter(
        (p: any) => p.status === 'submitted',
    );
    for (const p of submitted) {
        const baselines = (
            await db.getAll(
                'project_objective_baseline_scores',
            )
        ).filter((b: any) => b.project_id === p.id);
        assert.equal(baselines.length, 0);
    }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/mock-data-objectives.test.ts`

Expected: FAIL — `populateMockData` does not yet seed any
score rows.

- [ ] **Step 3: Add score-seeding logic**

In `api/mock-data.ts`, after the existing project loop, add:

```ts
const allProjects = await db.getAll('projects');
const seedTime = MOCK_SEED_TIMESTAMP;

function deterministicScore(
    seed: string,
    min: number,
    max: number,
): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const range = max - min + 1;
    const wrapped = ((hash % range) + range) % range;
    return min + wrapped;
}

for (const p of allProjects) {
    if (
        p.status === 'submitted'
        || p.status === 'declined'
        || p.status === 'deleted'
    ) {
        continue;
    }

    const baselineCoverage =
        p.status === 'approved'
        || p.status === 'completed'
        ? OBJECTIVE_SEEDS.length
        : Math.max(
            0,
            deterministicScore(
                p.id + ':coverage',
                0,
                OBJECTIVE_SEEDS.length - 1,
            ),
        );

    const baselineDuration =
        new Date(p.start_date).getTime();
    for (let i = 0; i < baselineCoverage; i++) {
        const obj = OBJECTIVE_SEEDS[i];
        const score = deterministicScore(
            `${p.id}:${obj.id}:baseline`,
            -100,
            100,
        );
        const scoredAt = new Date(
            baselineDuration + i * 1000,
        ).toISOString();
        await db.put(
            'project_objective_baseline_scores',
            `${p.id}:${obj.id}:${scoredAt}`,
            {
                project_id: p.id,
                objective_id: obj.id,
                score,
                scored_at: scoredAt,
            },
        );
    }

    if (p.status === 'approved' || p.status === 'completed') {
        const minActuals = p.status === 'completed' ? 1 : 0;
        const baseActualTime = baselineDuration + 86400000;
        for (let i = 0; i < OBJECTIVE_SEEDS.length; i++) {
            const obj = OBJECTIVE_SEEDS[i];
            const nActuals =
                minActuals
                + deterministicScore(
                    `${p.id}:${obj.id}:nactual`,
                    0,
                    2,
                );
            for (let k = 0; k < nActuals; k++) {
                const score = deterministicScore(
                    `${p.id}:${obj.id}:actual:${k}`,
                    -100,
                    100,
                );
                const scoredAt = new Date(
                    baseActualTime + (i * 10 + k) * 1000,
                ).toISOString();
                await db.put(
                    'project_objective_actual_scores',
                    `${p.id}:${obj.id}:${scoredAt}`,
                    {
                        project_id: p.id,
                        objective_id: obj.id,
                        score,
                        scored_at: scoredAt,
                    },
                );
            }
        }
    }
}
```

(If `db.put` takes different arguments, adapt. Read
`api/db-memory.ts` for the exact `put` signature.)

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/mock-data-objectives.test.ts`

Expected: PASS — all six test cases pass.

- [ ] **Step 5: Commit**

```bash
git add api/mock-data.ts tests/mock-data-objectives.test.ts
git commit -m "seed baseline and actual score events for mock projects"
```

---

## Phase 2 — Adapters (part 1: validation + objectives)

### Task 2.1: Create `adapters/validation.ts` with `ValidationResult<P>`

**Files:**
- Create: `web-app/app/adapters/validation.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/adapter-validation.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { ValidationResult } from
    '../web-app/app/adapters/validation.ts';

test('ValidationResult shape compiles', () => {
    type P = { kind: 'x'; id: string };
    const v: ValidationResult<P> = {
        ready: false,
        problems: [{ kind: 'x', id: '1' }],
    };
    assert.equal(v.ready, false);
    assert.equal(v.problems.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapter-validation.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the module**

```ts
// web-app/app/adapters/validation.ts

export type ValidationResult<P> = {
    ready: boolean;
    problems: P[];
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapter-validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/validation.ts tests/adapter-validation.test.ts
git commit -m "add ValidationResult generic for gate predicates"
```

### Task 2.2: `adapters/objectives.ts` — read primitives

**Files:**
- Create: `web-app/app/adapters/objectives.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/adapters-objectives.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { createRequestContext } from
    '../web-app/app/adapters/shared.ts';
import {
    getObjective,
    getObjectives,
    getDeprecatedObjectiveIds,
    getObjectiveRevisions,
} from '../web-app/app/adapters/objectives.ts';

function ctxFor(db) {
    return createRequestContext(db);
}

test('getObjective returns a single row', async () => {
    const db = new MemoryDbAdapter();
    await db.put('objectives', 'o1', { id: 'o1', position: 0 });
    const ctx = ctxFor(db);
    const v = await getObjective(ctx, 'o1');
    assert.equal(v.id, 'o1');
    assert.equal(v.position, 0);
});

test('getObjectives returns all', async () => {
    const db = new MemoryDbAdapter();
    await db.put('objectives', 'o1', { id: 'o1', position: 0 });
    await db.put('objectives', 'o2', { id: 'o2', position: 1 });
    const ctx = ctxFor(db);
    const rows = await getObjectives(ctx);
    assert.equal(rows.length, 2);
});

test('getDeprecatedObjectiveIds returns a Set', async () => {
    const db = new MemoryDbAdapter();
    await db.put('deprecated_objectives', 'o1', {
        objective_id: 'o1',
        deprecated_at: '2026-05-14T00:00:00.000Z',
    });
    const ctx = ctxFor(db);
    const ids = await getDeprecatedObjectiveIds(ctx);
    assert.ok(ids.has('o1'));
    assert.equal(ids.size, 1);
});

test('getObjectiveRevisions returns all for an objective',
    async () => {
        const db = new MemoryDbAdapter();
        await db.put(
            'objective_revisions',
            'o1:2026-05-14T00:00:00.000Z',
            {
                objective_id: 'o1',
                name: 'Revenue',
                description: 'd',
                revised_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.put(
            'objective_revisions',
            'o1:2026-05-15T00:00:00.000Z',
            {
                objective_id: 'o1',
                name: 'Revenue Growth',
                description: 'd2',
                revised_at: '2026-05-15T00:00:00.000Z',
            },
        );
        const ctx = ctxFor(db);
        const revs = await getObjectiveRevisions(ctx, 'o1');
        assert.equal(revs.length, 2);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-objectives.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the module**

Use the route conventions documented in `api/api.ts`. The
template-literal interpolations `objectives/<id>` and the
collection routes match the codebase pattern. Verify by
reading `api/api.ts` for the existing route shapes.

```ts
// web-app/app/adapters/objectives.ts

import type {
    Objective,
    ObjectiveId,
    ObjectiveRevision,
} from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    assertObjective,
    assertObjectiveRevision,
    assertDeprecatedObjective,
} from '../../../api/validators.ts';

export async function getObjective(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<Objective> {
    const raw = await ctx.GET(
        'objectives/' + id,
    );
    return assertObjective(raw);
}

export async function getObjectives(
    ctx: RequestContext,
): Promise<Objective[]> {
    const raws = await ctx.GET('objectives');
    return (raws as unknown[]).map(assertObjective);
}

export async function getDeprecatedObjectiveIds(
    ctx: RequestContext,
): Promise<Set<ObjectiveId>> {
    const raws = await ctx.GET('deprecated_objectives');
    const validated = (raws as unknown[])
        .map(assertDeprecatedObjective);
    return new Set(validated.map(v => v.objective_id));
}

export async function getObjectiveRevisions(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<ObjectiveRevision[]> {
    const raws = await ctx.GET(
        'objective_revisions?objective_id=' + id,
    );
    return (raws as unknown[]).map(assertObjectiveRevision);
}
```

(Adapt route strings to match the existing `api/api.ts`
routing scheme. The semantic is GET-one-row by id and
GET-collection optionally filtered.)

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-objectives.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/objectives.ts tests/adapters-objectives.test.ts
git commit -m "add objective read primitives"
```

### Task 2.3: `objectives.ts` — active retrieval + definition resolution

**Files:**
- Modify: `web-app/app/adapters/objectives.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/adapters-objectives.test.ts`:

```ts
import {
    postActiveObjectivesRetrieval,
    postCurrentObjectiveDefinition,
    postObjectiveDefinitionAtTime,
} from '../web-app/app/adapters/objectives.ts';

test('postActiveObjectivesRetrieval filters deprecated',
    async () => {
        const db = new MemoryDbAdapter();
        await db.put('objectives', 'o1', {
            id: 'o1', position: 0,
        });
        await db.put('objectives', 'o2', {
            id: 'o2', position: 1,
        });
        await db.put('deprecated_objectives', 'o2', {
            objective_id: 'o2',
            deprecated_at: '2026-05-14T00:00:00.000Z',
        });
        const ctx = ctxFor(db);
        const active = await postActiveObjectivesRetrieval(
            ctx,
        );
        assert.equal(active.length, 1);
        assert.equal(active[0].id, 'o1');
    });

test('postCurrentObjectiveDefinition returns latest revision',
    async () => {
        const db = new MemoryDbAdapter();
        await db.put(
            'objective_revisions',
            'o1:2026-05-14T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'Old',
                description: 'd1',
                revised_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.put(
            'objective_revisions',
            'o1:2026-05-15T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'New',
                description: 'd2',
                revised_at: '2026-05-15T00:00:00.000Z',
            },
        );
        const ctx = ctxFor(db);
        const def = await postCurrentObjectiveDefinition(
            ctx, 'o1',
        );
        assert.equal(def.name, 'New');
        assert.equal(def.description, 'd2');
    });

test('postObjectiveDefinitionAtTime returns historical name',
    async () => {
        const db = new MemoryDbAdapter();
        await db.put(
            'objective_revisions',
            'o1:2026-05-14T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'Old',
                description: 'd1',
                revised_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.put(
            'objective_revisions',
            'o1:2026-05-15T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'New',
                description: 'd2',
                revised_at: '2026-05-15T00:00:00.000Z',
            },
        );
        const ctx = ctxFor(db);
        const histDef = await postObjectiveDefinitionAtTime(
            ctx, 'o1', '2026-05-14T12:00:00.000Z',
        );
        assert.equal(histDef.name, 'Old');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-objectives.test.ts`

Expected: FAIL — the three new operations don't exist.

- [ ] **Step 3: Add operations to `objectives.ts`**

Append:

```ts
export async function postActiveObjectivesRetrieval(
    ctx: RequestContext,
): Promise<Objective[]> {
    const [all, deprecated] = await Promise.all([
        getObjectives(ctx),
        getDeprecatedObjectiveIds(ctx),
    ]);
    return all
        .filter(o => !deprecated.has(o.id))
        .sort((a, b) => a.position - b.position);
}

export async function postCurrentObjectiveDefinition(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<{ name: string; description: string }> {
    const revs = await getObjectiveRevisions(ctx, id);
    if (revs.length === 0) {
        throw new Error('no revisions for objective ' + id);
    }
    revs.sort((a, b) =>
        b.revised_at.localeCompare(a.revised_at),
    );
    const latest = revs[0];
    return {
        name: latest.name,
        description: latest.description,
    };
}

export async function postObjectiveDefinitionAtTime(
    ctx: RequestContext,
    id: ObjectiveId,
    atTime: string,
): Promise<{ name: string; description: string }> {
    const revs = await getObjectiveRevisions(ctx, id);
    const eligible = revs.filter(
        r => r.revised_at <= atTime,
    );
    if (eligible.length === 0) {
        throw new Error(
            'no revision of ' + id + ' at or before ' + atTime,
        );
    }
    eligible.sort((a, b) =>
        b.revised_at.localeCompare(a.revised_at),
    );
    const latest = eligible[0];
    return {
        name: latest.name,
        description: latest.description,
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-objectives.test.ts`

Expected: PASS — all three new test cases pass.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/objectives.ts tests/adapters-objectives.test.ts
git commit -m "add active retrieval and temporal definition resolution"
```

### Task 2.4: `objectives.ts` — write operations

**Files:**
- Modify: `web-app/app/adapters/objectives.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/adapters-objectives.test.ts`:

```ts
import {
    postObjectiveCreation,
    postObjectiveRevision,
    postObjectiveDeprecation,
    postObjectiveReactivation,
    postObjectiveReordering,
} from '../web-app/app/adapters/objectives.ts';

test('postObjectiveCreation writes objective + revision',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = ctxFor(db);
        await postObjectiveCreation(
            ctx, 'o1', 'Revenue', 'Top line', 0,
        );
        const o = await db.get('objectives', 'o1');
        assert.equal(o.id, 'o1');
        const revs = await db.getAll('objective_revisions');
        assert.equal(revs.length, 1);
        assert.equal(revs[0].name, 'Revenue');
    });

test('postObjectiveRevision appends a revision row',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = ctxFor(db);
        await postObjectiveCreation(
            ctx, 'o1', 'Revenue', 'd1', 0,
        );
        await postObjectiveRevision(
            ctx, 'o1', 'Revenue Growth', 'd2',
        );
        const revs = await db.getAll('objective_revisions');
        assert.equal(revs.length, 2);
    });

test('postObjectiveDeprecation tombstones an objective',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = ctxFor(db);
        await postObjectiveCreation(
            ctx, 'o1', 'Revenue', 'd', 0,
        );
        await postObjectiveDeprecation(ctx, 'o1');
        const tombstones = await db.getAll(
            'deprecated_objectives',
        );
        assert.equal(tombstones.length, 1);
        assert.equal(tombstones[0].objective_id, 'o1');
    });

test('postObjectiveReactivation removes tombstone', async () => {
    const db = new MemoryDbAdapter();
    const ctx = ctxFor(db);
    await postObjectiveCreation(ctx, 'o1', 'Rev', 'd', 0);
    await postObjectiveDeprecation(ctx, 'o1');
    await postObjectiveReactivation(ctx, 'o1');
    const tombstones = await db.getAll(
        'deprecated_objectives',
    );
    assert.equal(tombstones.length, 0);
});

test('postObjectiveReordering updates positions', async () => {
    const db = new MemoryDbAdapter();
    const ctx = ctxFor(db);
    await postObjectiveCreation(ctx, 'o1', 'A', 'd', 0);
    await postObjectiveCreation(ctx, 'o2', 'B', 'd', 1);
    await postObjectiveCreation(ctx, 'o3', 'C', 'd', 2);
    await postObjectiveReordering(ctx, ['o3', 'o1', 'o2']);
    const all = await db.getAll('objectives');
    const map = new Map(
        all.map(o => [o.id, o.position]),
    );
    assert.equal(map.get('o3'), 0);
    assert.equal(map.get('o1'), 1);
    assert.equal(map.get('o2'), 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-objectives.test.ts`

Expected: FAIL — five new operations are missing.

- [ ] **Step 3: Add write operations**

Append to `web-app/app/adapters/objectives.ts`. Use string
concatenation to build resource URLs (the codebase uses
this pattern in adapters that call ctx.GET / ctx.PUT —
verify by reading `adapters/flow-publish.ts`). The
`notifyChannels` field on the commit transaction handles
post-commit notifications.

```ts
function nowZulu(): string {
    return new Date().toISOString();
}

export async function postObjectiveCreation(
    ctx: RequestContext,
    id: ObjectiveId,
    name: string,
    description: string,
    position: number,
): Promise<void> {
    const revisedAt = nowZulu();
    await ctx.commit({
        ops: [
            {
                method: 'put',
                resource: 'objectives/' + id,
                body: { id, position },
            },
            {
                method: 'put',
                resource:
                    'objective_revisions/'
                    + id + ':' + revisedAt,
                body: {
                    objective_id: id,
                    name,
                    description,
                    revised_at: revisedAt,
                },
            },
        ],
        notifyChannels: ['objectiveChanges'],
    });
}

export async function postObjectiveRevision(
    ctx: RequestContext,
    id: ObjectiveId,
    name: string,
    description: string,
): Promise<void> {
    const revisedAt = nowZulu();
    await ctx.commit({
        ops: [{
            method: 'put',
            resource:
                'objective_revisions/'
                + id + ':' + revisedAt,
            body: {
                objective_id: id,
                name,
                description,
                revised_at: revisedAt,
            },
        }],
        notifyChannels: ['objectiveChanges'],
    });
}

export async function postObjectiveDeprecation(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<void> {
    await ctx.commit({
        ops: [{
            method: 'put',
            resource: 'deprecated_objectives/' + id,
            body: {
                objective_id: id,
                deprecated_at: nowZulu(),
            },
        }],
        notifyChannels: ['objectiveChanges'],
    });
}

export async function postObjectiveReactivation(
    ctx: RequestContext,
    id: ObjectiveId,
): Promise<void> {
    await ctx.commit({
        ops: [{
            method: 'delete',
            resource: 'deprecated_objectives/' + id,
        }],
        notifyChannels: ['objectiveChanges'],
    });
}

export async function postObjectiveReordering(
    ctx: RequestContext,
    idsInOrder: ObjectiveId[],
): Promise<void> {
    const ops = idsInOrder.map((id, i) => ({
        method: 'put' as const,
        resource: 'objectives/' + id,
        body: { id, position: i },
    }));
    await ctx.commit({
        ops,
        notifyChannels: ['objectiveChanges'],
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-objectives.test.ts`

Expected: PASS — five new test cases pass.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/objectives.ts tests/adapters-objectives.test.ts
git commit -m "add objective write operations"
```

---

## Phase 2 — Adapters (part 2: scoring + publish)

### Task 2.5: `adapters/project-scoring.ts` — read primitives

**Files:**
- Create: `web-app/app/adapters/project-scoring.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/adapters-project-scoring.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { createRequestContext } from
    '../web-app/app/adapters/shared.ts';
import {
    getBaselineScoresForProject,
    getActualScoresForProject,
} from '../web-app/app/adapters/project-scoring.ts';

test('getBaselineScoresForProject returns project rows',
    async () => {
        const db = new MemoryDbAdapter();
        await db.put(
            'project_objective_baseline_scores',
            'p1:o1:t1',
            {
                project_id: 'p1', objective_id: 'o1',
                score: 50,
                scored_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.put(
            'project_objective_baseline_scores',
            'p2:o1:t1',
            {
                project_id: 'p2', objective_id: 'o1',
                score: -20,
                scored_at: '2026-05-14T00:00:00.000Z',
            },
        );
        const ctx = createRequestContext(db);
        const rows = await getBaselineScoresForProject(
            ctx, 'p1',
        );
        assert.equal(rows.length, 1);
        assert.equal(rows[0].score, 50);
    });

test('getActualScoresForProject returns project rows',
    async () => {
        const db = new MemoryDbAdapter();
        await db.put(
            'project_objective_actual_scores',
            'p1:o1:t1',
            {
                project_id: 'p1', objective_id: 'o1',
                score: 33,
                scored_at: '2026-05-14T00:00:00.000Z',
            },
        );
        const ctx = createRequestContext(db);
        const rows = await getActualScoresForProject(
            ctx, 'p1',
        );
        assert.equal(rows.length, 1);
        assert.equal(rows[0].score, 33);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the module with primitives**

```ts
// web-app/app/adapters/project-scoring.ts

import type {
    ProjectId,
    ObjectiveId,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import {
    assertBaselineScore,
    assertActualScore,
} from '../../../api/validators.ts';

export async function getBaselineScoresForProject(
    ctx: RequestContext,
    projectId: ProjectId,
): Promise<ProjectObjectiveBaselineScore[]> {
    const raws = await ctx.GET(
        'project_objective_baseline_scores'
        + '?project_id=' + projectId,
    );
    return (raws as unknown[]).map(assertBaselineScore);
}

export async function getActualScoresForProject(
    ctx: RequestContext,
    projectId: ProjectId,
): Promise<ProjectObjectiveActualScore[]> {
    const raws = await ctx.GET(
        'project_objective_actual_scores'
        + '?project_id=' + projectId,
    );
    return (raws as unknown[]).map(assertActualScore);
}
```

(Verify route-with-query-param convention against
`api/api.ts`. The semantic is "GET all rows for this
project.")

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/project-scoring.ts tests/adapters-project-scoring.test.ts
git commit -m "add per-project score read primitives"
```

### Task 2.6: `project-scoring.ts` — `postProjectScoringRetrieval`

**Files:**
- Modify: `web-app/app/adapters/project-scoring.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/adapters-project-scoring.test.ts`:

```ts
import { postProjectScoringRetrieval } from
    '../web-app/app/adapters/project-scoring.ts';

test('postProjectScoringRetrieval returns both lists',
    async () => {
        const db = new MemoryDbAdapter();
        await db.put(
            'project_objective_baseline_scores',
            'p1:o1:t1',
            {
                project_id: 'p1', objective_id: 'o1',
                score: 50,
                scored_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.put(
            'project_objective_actual_scores',
            'p1:o1:t2',
            {
                project_id: 'p1', objective_id: 'o1',
                score: 33,
                scored_at: '2026-05-15T00:00:00.000Z',
            },
        );
        const ctx = createRequestContext(db);
        const r = await postProjectScoringRetrieval(
            ctx, 'p1',
        );
        assert.equal(r.baseline.length, 1);
        assert.equal(r.actual.length, 1);
        assert.equal(r.baseline[0].score, 50);
        assert.equal(r.actual[0].score, 33);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: FAIL — function does not exist.

- [ ] **Step 3: Add the function**

```ts
export async function postProjectScoringRetrieval(
    ctx: RequestContext,
    projectId: ProjectId,
): Promise<{
    baseline: ProjectObjectiveBaselineScore[];
    actual: ProjectObjectiveActualScore[];
}> {
    const [baseline, actual] = await Promise.all([
        getBaselineScoresForProject(ctx, projectId),
        getActualScoresForProject(ctx, projectId),
    ]);
    return { baseline, actual };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/project-scoring.ts tests/adapters-project-scoring.test.ts
git commit -m "bundle baseline and actual fetch into one operation"
```

### Task 2.7: `project-scoring.ts` — aggregates

**Files:**
- Modify: `web-app/app/adapters/project-scoring.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/adapters-project-scoring.test.ts`:

```ts
import {
    postPortfolioImpactSummary,
    postObjectiveAggregates,
    postProjectsScoreColumn,
} from '../web-app/app/adapters/project-scoring.ts';

async function seedTwoApprovedProjects(db) {
    await db.put('projects', 'p1', {
        id: 'p1', status: 'approved', title: 't1',
        description: 'd', progress: 0,
        start_date: '2026-05-14T00:00:00.000Z',
        target_end_date: '2026-05-14T00:00:00.000Z',
        estimated_duration: 0, actual_duration: 0,
        estimated_cost: 0, actual_cost: 0,
        position: 0, business_context: {},
        timeline_label: 'q1',
    });
    await db.put('projects', 'p2', {
        id: 'p2', status: 'approved', title: 't2',
        description: 'd', progress: 0,
        start_date: '2026-05-14T00:00:00.000Z',
        target_end_date: '2026-05-14T00:00:00.000Z',
        estimated_duration: 0, actual_duration: 0,
        estimated_cost: 0, actual_cost: 0,
        position: 1, business_context: {},
        timeline_label: 'q1',
    });
    await db.put('objectives', 'o1', {
        id: 'o1', position: 0,
    });
    await db.put(
        'objective_revisions', 'o1:t0',
        {
            objective_id: 'o1', name: 'O', description: 'd',
            revised_at: '2026-05-14T00:00:00.000Z',
        },
    );
    await db.put(
        'project_objective_baseline_scores',
        'p1:o1:t1',
        {
            project_id: 'p1', objective_id: 'o1', score: 60,
            scored_at: '2026-05-14T00:00:00.000Z',
        },
    );
    await db.put(
        'project_objective_baseline_scores',
        'p2:o1:t1',
        {
            project_id: 'p2', objective_id: 'o1', score: -20,
            scored_at: '2026-05-14T00:00:00.000Z',
        },
    );
}

test('postPortfolioImpactSummary averages project averages',
    async () => {
        const db = new MemoryDbAdapter();
        await seedTwoApprovedProjects(db);
        const ctx = createRequestContext(db);
        const r = await postPortfolioImpactSummary(ctx);
        assert.equal(r.projectCount, 2);
        assert.equal(r.baselineMean, 20); // (60 + -20) / 2
    });

test('postObjectiveAggregates returns per-objective rows',
    async () => {
        const db = new MemoryDbAdapter();
        await seedTwoApprovedProjects(db);
        const ctx = createRequestContext(db);
        const rows = await postObjectiveAggregates(ctx);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].objectiveId, 'o1');
        assert.equal(rows[0].baselineMean, 20);
        assert.equal(rows[0].projectsBaselineScored, 2);
    });

test('postProjectsScoreColumn returns per-project rollup',
    async () => {
        const db = new MemoryDbAdapter();
        await seedTwoApprovedProjects(db);
        const ctx = createRequestContext(db);
        const rows = await postProjectsScoreColumn(ctx);
        const byId = new Map(
            rows.map(r => [r.projectId, r]),
        );
        assert.equal(byId.get('p1').baselineAvg, 60);
        assert.equal(byId.get('p2').baselineAvg, -20);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: FAIL — three new aggregates don't exist.

- [ ] **Step 3: Add aggregate operations**

The implementation does argmax-per-pair on the event log
then averages. Pseudocode:

```ts
import { postActiveObjectivesRetrieval, getDeprecatedObjectiveIds }
    from './objectives.ts';

function latestPerPair(rows) {
    const map = new Map();
    for (const r of rows) {
        const key = r.project_id + ':' + r.objective_id;
        const prev = map.get(key);
        if (!prev || r.scored_at > prev.scored_at) {
            map.set(key, r);
        }
    }
    return Array.from(map.values());
}

function meanOrUndefined(xs) {
    if (xs.length === 0) return undefined;
    const sum = xs.reduce((a, b) => a + b, 0);
    return Math.round(sum / xs.length);
}

export async function postPortfolioImpactSummary(
    ctx: RequestContext,
): Promise<{
    baselineMean: number | undefined;
    actualMean: number | undefined;
    projectCount: number;
    actualCount: number;
}> {
    const projectsRaw = await ctx.GET('projects');
    const approved = (projectsRaw as any[])
        .filter(p => p.status === 'approved');

    const baselineMeansPerProject: number[] = [];
    const actualMeansPerProject: number[] = [];

    for (const p of approved) {
        const { baseline, actual } =
            await postProjectScoringRetrieval(ctx, p.id);
        const latestB = latestPerPair(baseline);
        if (latestB.length > 0) {
            const m = meanOrUndefined(
                latestB.map(r => r.score),
            );
            if (m !== undefined) {
                baselineMeansPerProject.push(m);
            }
        }
        const latestA = latestPerPair(actual);
        const baselinedObjs = new Set(
            latestB.map(r => r.objective_id),
        );
        const actualedObjs = new Set(
            latestA.map(r => r.objective_id),
        );
        const fullyActualed = latestB.every(b =>
            actualedObjs.has(b.objective_id),
        );
        if (fullyActualed && latestB.length > 0) {
            const aMap = new Map(
                latestA.map(a => [a.objective_id, a.score]),
            );
            const xs = latestB.map(
                b => aMap.get(b.objective_id),
            ).filter((x): x is number => typeof x === 'number');
            const am = meanOrUndefined(xs);
            if (am !== undefined) {
                actualMeansPerProject.push(am);
            }
        }
    }

    return {
        baselineMean: meanOrUndefined(
            baselineMeansPerProject,
        ),
        actualMean: meanOrUndefined(
            actualMeansPerProject,
        ),
        projectCount: baselineMeansPerProject.length,
        actualCount: actualMeansPerProject.length,
    };
}

export async function postObjectiveAggregates(
    ctx: RequestContext,
): Promise<Array<{
    objectiveId: ObjectiveId;
    baselineMean: number | undefined;
    latestActualMean: number | undefined;
    projectsBaselineScored: number;
    projectsActualScored: number;
}>> {
    const [activeObjs, projectsRaw] = await Promise.all([
        postActiveObjectivesRetrieval(ctx),
        ctx.GET('projects'),
    ]);
    const approved = (projectsRaw as any[])
        .filter(p => p.status === 'approved');

    const result = [];
    for (const obj of activeObjs) {
        const baselineScores: number[] = [];
        const actualScores: number[] = [];

        for (const p of approved) {
            const { baseline, actual } =
                await postProjectScoringRetrieval(ctx, p.id);
            const latestB = latestPerPair(baseline);
            const latestA = latestPerPair(actual);
            const bForObj = latestB.find(
                r => r.objective_id === obj.id,
            );
            if (bForObj) {
                baselineScores.push(bForObj.score);
            }
            const aForObj = latestA.find(
                r => r.objective_id === obj.id,
            );
            if (aForObj) {
                actualScores.push(aForObj.score);
            }
        }

        result.push({
            objectiveId: obj.id,
            baselineMean: meanOrUndefined(baselineScores),
            latestActualMean: meanOrUndefined(actualScores),
            projectsBaselineScored: baselineScores.length,
            projectsActualScored: actualScores.length,
        });
    }
    return result;
}

export async function postProjectsScoreColumn(
    ctx: RequestContext,
): Promise<Array<{
    projectId: ProjectId;
    baselineAvg: number | undefined;
    latestActualAvg: number | undefined;
    baselineCount: number;
    totalActiveObjectives: number;
}>> {
    const [activeObjs, projectsRaw] = await Promise.all([
        postActiveObjectivesRetrieval(ctx),
        ctx.GET('projects'),
    ]);
    const totalActive = activeObjs.length;

    const out = [];
    for (const p of (projectsRaw as any[])) {
        const { baseline, actual } =
            await postProjectScoringRetrieval(ctx, p.id);
        const latestB = latestPerPair(baseline);
        const latestA = latestPerPair(actual);
        out.push({
            projectId: p.id,
            baselineAvg: meanOrUndefined(
                latestB.map(b => b.score),
            ),
            latestActualAvg: meanOrUndefined(
                latestA.map(a => a.score),
            ),
            baselineCount: latestB.length,
            totalActiveObjectives: totalActive,
        });
    }
    return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/project-scoring.ts tests/adapters-project-scoring.test.ts
git commit -m "add scoring aggregate operations"
```

### Task 2.8: `project-scoring.ts` — write operations

**Files:**
- Modify: `web-app/app/adapters/project-scoring.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/adapters-project-scoring.test.ts`:

```ts
import {
    postProjectBaselineScoring,
    postProjectActualMeasurement,
} from '../web-app/app/adapters/project-scoring.ts';

test('postProjectBaselineScoring appends event rows',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createRequestContext(db);
        await postProjectBaselineScoring(ctx, 'p1', [
            { objectiveId: 'o1', score: 50 },
            { objectiveId: 'o2', score: -30 },
        ]);
        const rows = await db.getAll(
            'project_objective_baseline_scores',
        );
        assert.equal(rows.length, 2);
    });

test('postProjectActualMeasurement appends actual rows',
    async () => {
        const db = new MemoryDbAdapter();
        const ctx = createRequestContext(db);
        await postProjectActualMeasurement(ctx, 'p1', [
            { objectiveId: 'o1', score: 33 },
        ]);
        const rows = await db.getAll(
            'project_objective_actual_scores',
        );
        assert.equal(rows.length, 1);
        assert.equal(rows[0].score, 33);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: FAIL — write operations don't exist.

- [ ] **Step 3: Add the write operations**

```ts
export async function postProjectBaselineScoring(
    ctx: RequestContext,
    projectId: ProjectId,
    scores: Array<{
        objectiveId: ObjectiveId;
        score: number;
    }>,
): Promise<void> {
    const scoredAt = new Date().toISOString();
    const ops = scores.map(s => ({
        method: 'put' as const,
        resource:
            'project_objective_baseline_scores/'
            + projectId + ':' + s.objectiveId
            + ':' + scoredAt,
        body: {
            project_id: projectId,
            objective_id: s.objectiveId,
            score: s.score,
            scored_at: scoredAt,
        },
    }));
    await ctx.commit({
        ops,
        notifyChannels: ['scoreChanges'],
    });
}

export async function postProjectActualMeasurement(
    ctx: RequestContext,
    projectId: ProjectId,
    scores: Array<{
        objectiveId: ObjectiveId;
        score: number;
    }>,
): Promise<void> {
    const scoredAt = new Date().toISOString();
    const ops = scores.map(s => ({
        method: 'put' as const,
        resource:
            'project_objective_actual_scores/'
            + projectId + ':' + s.objectiveId
            + ':' + scoredAt,
        body: {
            project_id: projectId,
            objective_id: s.objectiveId,
            score: s.score,
            scored_at: scoredAt,
        },
    }));
    await ctx.commit({
        ops,
        notifyChannels: ['scoreChanges'],
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-project-scoring.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/project-scoring.ts tests/adapters-project-scoring.test.ts
git commit -m "add project scoring write operations"
```

### Task 2.9: `adapters/project-publish.ts` — validators + transitions

**Files:**
- Create: `web-app/app/adapters/project-publish.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/adapters-project-publish.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { createRequestContext } from
    '../web-app/app/adapters/shared.ts';
import {
    validateProjectForApproval,
    validateProjectForCompletion,
    postProjectApproval,
    postProjectCompletion,
} from '../web-app/app/adapters/project-publish.ts';

const SAMPLE_PROJECT = {
    id: 'p1', status: 'under-review', title: 't',
    description: 'd', progress: 0,
    start_date: '2026-05-14T00:00:00.000Z',
    target_end_date: '2026-05-14T00:00:00.000Z',
    estimated_duration: 0, actual_duration: 0,
    estimated_cost: 0, actual_cost: 0,
    position: 0, business_context: {},
    timeline_label: 'q1',
};

test('validator: not ready when objectives unscored',
    () => {
        const r = validateProjectForApproval(
            SAMPLE_PROJECT,
            [{ id: 'o1', position: 0 },
             { id: 'o2', position: 1 }],
            [],
        );
        assert.equal(r.ready, false);
        assert.equal(r.problems.length, 2);
    });

test('validator: ready when all scored', () => {
    const r = validateProjectForApproval(
        SAMPLE_PROJECT,
        [{ id: 'o1', position: 0 }],
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
    );
    assert.equal(r.ready, true);
    assert.equal(r.problems.length, 0);
});

test('completion validator: not ready when actuals missing',
    () => {
        const r = validateProjectForCompletion(
            { ...SAMPLE_PROJECT, status: 'approved' },
            [{ project_id: 'p1', objective_id: 'o1',
               score: 50,
               scored_at: '2026-05-14T00:00:00.000Z' }],
            [],
        );
        assert.equal(r.ready, false);
        assert.equal(r.problems[0].kind, 'actual_unscored');
    });

test('postProjectApproval flips status', async () => {
    const db = new MemoryDbAdapter();
    await db.put('projects', 'p1',
        { ...SAMPLE_PROJECT });
    await db.put('objectives', 'o1',
        { id: 'o1', position: 0 });
    await db.put(
        'project_objective_baseline_scores',
        'p1:o1:t1',
        { project_id: 'p1', objective_id: 'o1', score: 50,
          scored_at: '2026-05-14T00:00:00.000Z' },
    );
    const ctx = createRequestContext(db);
    await postProjectApproval(ctx, 'p1');
    const p = await db.get('projects', 'p1');
    assert.equal(p.status, 'approved');
});

test('postProjectApproval throws when not ready', async () => {
    const db = new MemoryDbAdapter();
    await db.put('projects', 'p1',
        { ...SAMPLE_PROJECT });
    await db.put('objectives', 'o1',
        { id: 'o1', position: 0 });
    const ctx = createRequestContext(db);
    await assert.rejects(
        () => postProjectApproval(ctx, 'p1'),
        /not ready|unscored/i,
    );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapters-project-publish.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the module**

```ts
// web-app/app/adapters/project-publish.ts

import type {
    ProjectEntity,
    ProjectId,
    Objective,
    ObjectiveId,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../../../api/types.ts';
import type { RequestContext } from './shared.ts';
import type { ValidationResult } from './validation.ts';
import { postActiveObjectivesRetrieval } from
    './objectives.ts';
import { postProjectScoringRetrieval } from
    './project-scoring.ts';

export type ProjectProblem =
    | { kind: 'baseline_unscored';
        objectiveId: ObjectiveId }
    | { kind: 'actual_unscored';
        objectiveId: ObjectiveId };

function latestPerObjective(
    rows: Array<{ objective_id: ObjectiveId;
                  scored_at: string }>,
): Set<ObjectiveId> {
    const map = new Map<ObjectiveId, string>();
    for (const r of rows) {
        const prev = map.get(r.objective_id);
        if (!prev || r.scored_at > prev) {
            map.set(r.objective_id, r.scored_at);
        }
    }
    return new Set(map.keys());
}

export function validateProjectForApproval(
    project: ProjectEntity,
    activeObjectives: Objective[],
    baselineScores: ProjectObjectiveBaselineScore[],
): ValidationResult<ProjectProblem> {
    const scored = latestPerObjective(baselineScores);
    const problems: ProjectProblem[] = [];
    for (const obj of activeObjectives) {
        if (!scored.has(obj.id)) {
            problems.push({
                kind: 'baseline_unscored',
                objectiveId: obj.id,
            });
        }
    }
    return { ready: problems.length === 0, problems };
}

export function validateProjectForCompletion(
    project: ProjectEntity,
    baselineScores: ProjectObjectiveBaselineScore[],
    actualScores: ProjectObjectiveActualScore[],
): ValidationResult<ProjectProblem> {
    const baselined = latestPerObjective(baselineScores);
    const actualed = latestPerObjective(actualScores);
    const problems: ProjectProblem[] = [];
    for (const objId of baselined) {
        if (!actualed.has(objId)) {
            problems.push({
                kind: 'actual_unscored',
                objectiveId: objId,
            });
        }
    }
    return { ready: problems.length === 0, problems };
}

export class ProjectNotReadyError extends Error {
    constructor(
        public problems: ProjectProblem[],
    ) {
        super('project not ready: '
            + problems.map(p => p.kind).join(', '));
    }
}

export async function postProjectApproval(
    ctx: RequestContext,
    projectId: ProjectId,
): Promise<void> {
    const projectRaw = await ctx.GET(
        'projects/' + projectId,
    );
    const project = projectRaw as ProjectEntity;
    const [active, scoring] = await Promise.all([
        postActiveObjectivesRetrieval(ctx),
        postProjectScoringRetrieval(ctx, projectId),
    ]);
    const v = validateProjectForApproval(
        project, active, scoring.baseline,
    );
    if (!v.ready) throw new ProjectNotReadyError(v.problems);
    await ctx.commit({
        ops: [{
            method: 'put',
            resource: 'projects/' + projectId,
            body: { ...project, status: 'approved' },
        }],
        notifyChannels: ['projectChanges'],
    });
}

export async function postProjectCompletion(
    ctx: RequestContext,
    projectId: ProjectId,
): Promise<void> {
    const projectRaw = await ctx.GET(
        'projects/' + projectId,
    );
    const project = projectRaw as ProjectEntity;
    const scoring = await postProjectScoringRetrieval(
        ctx, projectId,
    );
    const v = validateProjectForCompletion(
        project, scoring.baseline, scoring.actual,
    );
    if (!v.ready) throw new ProjectNotReadyError(v.problems);
    await ctx.commit({
        ops: [{
            method: 'put',
            resource: 'projects/' + projectId,
            body: { ...project, status: 'completed' },
        }],
        notifyChannels: ['projectChanges'],
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapters-project-publish.test.ts`

Expected: PASS — all five test cases pass.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/project-publish.ts tests/adapters-project-publish.test.ts
git commit -m "add project approval and completion gates"
```

### Task 2.10: Add notification channels

**Files:**
- Modify: the existing notifications/channels module (search
  for `projectChanges` to find it — likely
  `web-app/app/state.ts` or `web-app/app/changes.ts` or
  similar)

- [ ] **Step 1: Locate the existing channels file**

Run:
`grep -r "export const projectChanges" web-app/`

Note the file path — call it `<CHANNELS_FILE>`.

- [ ] **Step 2: Write the failing test**

Create `tests/channels-new.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    objectiveChanges,
    scoreChanges,
} from '<CHANNELS_FILE>';

test('objectiveChanges is a pub-sub channel', () => {
    let fired = false;
    const unsub = objectiveChanges.subscribe(() => {
        fired = true;
    });
    objectiveChanges.notify();
    assert.equal(fired, true);
    unsub();
});

test('scoreChanges is a pub-sub channel', () => {
    let fired = false;
    const unsub = scoreChanges.subscribe(() => {
        fired = true;
    });
    scoreChanges.notify();
    assert.equal(fired, true);
    unsub();
});
```

(Replace `<CHANNELS_FILE>` with the actual path.)

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test --strip-types tests/channels-new.test.ts`

Expected: FAIL — imports don't resolve.

- [ ] **Step 4: Add the channels**

Look at the existing `projectChanges` export and add two
new ones using the same shape. Example:

```ts
export const objectiveChanges = createChannel();
export const scoreChanges = createChannel();
```

(Adapt to whatever pattern the existing channels use —
constructor call, factory function, plain object, etc.)

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test --strip-types tests/channels-new.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add <CHANNELS_FILE> tests/channels-new.test.ts
git commit -m "add objectiveChanges and scoreChanges notification channels"
```

### Task 2.11: Project domain class — derived score methods

**Files:**
- Modify: `web-app/app/adapters/projects.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/project-domain.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { Project } from '../web-app/app/adapters/projects.ts';

function makeProject(overrides = {}) {
    return new Project({
        id: 'p1', status: 'approved', title: 't',
        description: 'd', progress: 0,
        start_date: '2026-05-14T00:00:00.000Z',
        target_end_date: '2026-05-14T00:00:00.000Z',
        estimated_duration: 0, actual_duration: 0,
        estimated_cost: 0, actual_cost: 0,
        position: 0, business_context: {},
        timeline_label: 'q1',
        ...overrides,
    });
}

const T1 = '2026-05-14T00:00:00.000Z';
const T2 = '2026-05-15T00:00:00.000Z';

test('isBaselineScored true when every active obj has row',
    () => {
        const p = makeProject();
        const ok = p.isBaselineScored(
            [{ id: 'o1', position: 0 }],
            [{ project_id: 'p1', objective_id: 'o1',
               score: 50, scored_at: T1 }],
        );
        assert.equal(ok, true);
    });

test('isBaselineScored false when missing one', () => {
    const p = makeProject();
    const ok = p.isBaselineScored(
        [{ id: 'o1', position: 0 },
         { id: 'o2', position: 1 }],
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50, scored_at: T1 }],
    );
    assert.equal(ok, false);
});

test('estimatedImpactScore averages latest baselines', () => {
    const p = makeProject();
    const score = p.estimatedImpactScore([
        { project_id: 'p1', objective_id: 'o1',
          score: 50, scored_at: T1 },
        { project_id: 'p1', objective_id: 'o1',
          score: 60, scored_at: T2 },
        { project_id: 'p1', objective_id: 'o2',
          score: -20, scored_at: T1 },
    ]);
    assert.equal(score, 20); // (60 + -20) / 2
});

test('estimatedImpactScore throws when no rows', () => {
    const p = makeProject();
    assert.throws(() => p.estimatedImpactScore([]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/project-domain.test.ts`

Expected: FAIL — methods don't exist (or `Project` may not
be exported in this exact shape).

- [ ] **Step 3: Add derived methods to the `Project` class**

In `web-app/app/adapters/projects.ts`, locate or define
the `Project` domain class. ADD these methods (and the
imports for the types from `api/types.ts`):

```ts
function latestPerPair(rows) {
    const map = new Map();
    for (const r of rows) {
        const key = r.project_id + ':' + r.objective_id;
        const prev = map.get(key);
        if (!prev || r.scored_at > prev.scored_at) {
            map.set(key, r);
        }
    }
    return Array.from(map.values());
}

// inside class Project { ... }

isBaselineScored(
    activeObjectives: Objective[],
    latestBaselines: ProjectObjectiveBaselineScore[],
): boolean {
    const scored = new Set(
        latestPerPair(latestBaselines)
            .map(r => r.objective_id),
    );
    return activeObjectives.every(o => scored.has(o.id));
}

isFullyActualScored(
    latestBaselines: ProjectObjectiveBaselineScore[],
    latestActuals: ProjectObjectiveActualScore[],
): boolean {
    const baselined = new Set(
        latestPerPair(latestBaselines)
            .map(r => r.objective_id),
    );
    const actualed = new Set(
        latestPerPair(latestActuals)
            .map(r => r.objective_id),
    );
    for (const id of baselined) {
        if (!actualed.has(id)) return false;
    }
    return true;
}

estimatedImpactScore(
    latestBaselines: ProjectObjectiveBaselineScore[],
): number {
    const latest = latestPerPair(latestBaselines);
    if (latest.length === 0) {
        throw new Error(
            'project ' + this.id
            + ' has no baseline scores',
        );
    }
    const sum = latest.reduce(
        (a, b) => a + b.score, 0,
    );
    return Math.round(sum / latest.length);
}

currentActualImpactScore(
    latestBaselines: ProjectObjectiveBaselineScore[],
    latestActuals: ProjectObjectiveActualScore[],
): number {
    if (!this.isFullyActualScored(
        latestBaselines, latestActuals,
    )) {
        throw new Error(
            'project ' + this.id
            + ' not fully actual-scored',
        );
    }
    const baselined = latestPerPair(latestBaselines);
    const actualMap = new Map(
        latestPerPair(latestActuals)
            .map(r => [r.objective_id, r.score]),
    );
    const xs = baselined.map(
        b => actualMap.get(b.objective_id),
    ).filter((x): x is number => typeof x === 'number');
    const sum = xs.reduce((a, b) => a + b, 0);
    return Math.round(sum / xs.length);
}
```

Also REMOVE the old methods `impactBaseline()` and
`impactCurrent()` if they exist on this class.

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/project-domain.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/adapters/projects.ts tests/project-domain.test.ts
git commit -m "add derived score methods to Project domain class"
```

### Task 2.12: Remove old Impact gauge from dashboard adapter

**Files:**
- Modify: `web-app/app/adapters/dashboard.ts`

- [ ] **Step 1: Locate the impact gauge entry**

Read `web-app/app/adapters/dashboard.ts`. Find the section
that defines the third gauge entry (the one with theme
`'amber'` per the exploration findings).

- [ ] **Step 2: Write the failing test**

Update or create `tests/adapter-dashboard.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { createRequestContext } from
    '../web-app/app/adapters/shared.ts';
import { getDashboardGauges } from
    '../web-app/app/adapters/dashboard.ts';

test('getDashboardGauges returns exactly two gauges', async () => {
    const db = new MemoryDbAdapter();
    const ctx = createRequestContext(db);
    const gauges = await getDashboardGauges(ctx);
    assert.equal(gauges.length, 2);
    const titles = gauges.map(g => g.title.toLowerCase());
    assert.ok(titles.some(t => t.includes('time')));
    assert.ok(titles.some(t => t.includes('cost')));
    assert.ok(
        !titles.some(t => t.includes('impact')),
        'old impact gauge still present',
    );
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:
`node --test --strip-types tests/adapter-dashboard.test.ts`

Expected: FAIL — three gauges still returned, including
"Impact."

- [ ] **Step 4: Remove the impact gauge entry**

Delete the entry from `getDashboardGauges` (the one that
builds an impact gauge from
`sumEstimatedImpact` / `sumActualImpact`). Also remove any
imports it pulls that are now unused.

- [ ] **Step 5: Run test to verify it passes**

Run:
`node --test --strip-types tests/adapter-dashboard.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web-app/app/adapters/dashboard.ts tests/adapter-dashboard.test.ts
git commit -m "remove old impact gauge from dashboard adapter"
```

---

## Phase 3 — Presenters (part 1: Org box + action bar + modals)

Presenters are immutable view objects. Constructor takes the
full data shape; public methods return `SafeHtml`. Never
touch the DOM; never fetch. Read existing presenters
(`presenters/idea.ts`, `presenters/project-detail.ts`,
`presenters/workbox-detail.ts`) for the codebase voice
before starting.

### Task 3.1: `OrganizationObjectivesPresenter`

**Files:**
- Create: `web-app/app/presenters/organization-objectives.ts`

- [ ] **Step 1: Write the failing test**

Create
`tests/presenter-organization-objectives.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { OrganizationObjectivesPresenter } from
    '../web-app/app/presenters/organization-objectives.ts';

const activeObjs = [
    { id: 'o1', position: 0 },
    { id: 'o2', position: 1 },
];
const deprecatedObjs = [
    { id: 'o3', position: 99 },
];
const defs = new Map([
    ['o1', { name: 'Revenue Growth', description: 'd1' }],
    ['o2', { name: 'Cost Reduction', description: 'd2' }],
    ['o3', { name: 'Old Quarterly', description: 'd3' }],
]);
const deprecatedAt = new Map([
    ['o3', '2026-03-15T00:00:00.000Z'],
]);

test('renders active section with each active objective',
    () => {
        const p = new OrganizationObjectivesPresenter(
            activeObjs, deprecatedObjs, defs, deprecatedAt,
        );
        const html = p.buildBox().toString();
        assert.ok(html.includes('Revenue Growth'));
        assert.ok(html.includes('Cost Reduction'));
        assert.ok(html.includes('data-objective-id="o1"'));
        assert.ok(html.includes('data-objective-id="o2"'));
    });

test('renders deprecated section under active', () => {
    const p = new OrganizationObjectivesPresenter(
        activeObjs, deprecatedObjs, defs, deprecatedAt,
    );
    const html = p.buildBox().toString();
    assert.ok(html.includes('Old Quarterly'));
    assert.ok(html.includes('Deprecated'));
});

test('renders add-objective affordance', () => {
    const p = new OrganizationObjectivesPresenter(
        activeObjs, deprecatedObjs, defs, deprecatedAt,
    );
    const html = p.buildBox().toString();
    assert.ok(html.includes('data-action="add-objective"'));
});

test('empty state when no objectives', () => {
    const p = new OrganizationObjectivesPresenter(
        [], [], new Map(), new Map(),
    );
    const html = p.buildBox().toString();
    assert.ok(html.toLowerCase().includes('no objectives'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-organization-objectives.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the presenter**

```ts
// web-app/app/presenters/organization-objectives.ts

import { html, SafeHtml } from '../safe-html.ts';
import type {
    Objective,
    ObjectiveId,
} from '../../../api/types.ts';
import { iconPencil, iconTrash, iconPlus }
    from '../icons.ts';

interface Definition {
    name: string;
    description: string;
}

export class OrganizationObjectivesPresenter {
    constructor(
        private readonly active: Objective[],
        private readonly deprecated: Objective[],
        private readonly defs: Map<ObjectiveId, Definition>,
        private readonly deprecatedAt:
            Map<ObjectiveId, string>,
    ) {}

    buildBox(): SafeHtml {
        return html`
            <section class="org-objectives-box">
                ${this.#buildHeader()}
                ${this.#buildActiveList()}
                ${this.#buildDeprecatedList()}
            </section>
        `;
    }

    #buildHeader(): SafeHtml {
        return html`
            <header class="org-objectives-header">
                <h3>Objectives</h3>
                <button
                    type="button"
                    data-action="add-objective"
                    class="btn btn-primary">
                    ${iconPlus(16, '')} Add objective
                </button>
            </header>
        `;
    }

    #buildActiveList(): SafeHtml {
        if (this.active.length === 0
            && this.deprecated.length === 0) {
            return html`
                <p class="empty-state">
                    No objectives yet. Add one to get started.
                </p>
            `;
        }
        return html`
            <ul class="objective-list">
                ${this.active.map(o => this.#row(o, false))}
            </ul>
        `;
    }

    #buildDeprecatedList(): SafeHtml {
        if (this.deprecated.length === 0) return html``;
        return html`
            <h4 class="objective-list-divider">
                Deprecated
            </h4>
            <ul class="objective-list">
                ${this.deprecated.map(
                    o => this.#row(o, true),
                )}
            </ul>
        `;
    }

    #row(o: Objective, isDeprecated: boolean): SafeHtml {
        const def = this.defs.get(o.id);
        const name = def ? def.name : '(unknown)';
        const desc = def ? def.description : '';
        const date = this.deprecatedAt.get(o.id);
        return html`
            <li class="objective-list-item"
                data-objective-id="${o.id}"
                data-deprecated="${isDeprecated}">
                <span class="drag-handle"
                    aria-label="Drag to reorder">⋮⋮</span>
                <div class="objective-text">
                    <strong>${name}</strong>
                    <span class="objective-desc">
                        ${desc}
                    </span>
                    ${isDeprecated && date
                        ? html`<span class="meta">
                            Deprecated ${date.slice(0, 10)}
                          </span>`
                        : html``}
                </div>
                <div class="objective-actions">
                    ${isDeprecated
                        ? html`<button
                            data-action="reactivate"
                            data-objective-id="${o.id}">
                            Reactivate
                          </button>`
                        : html`
                            <button
                                data-action="edit"
                                data-objective-id="${o.id}">
                                ${iconPencil(14, '')} Edit
                            </button>
                            <button
                                data-action="deprecate"
                                data-objective-id="${o.id}">
                                ${iconTrash(14, '')}
                                Deprecate
                            </button>
                        `}
                </div>
            </li>
        `;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-organization-objectives.test.ts`

Expected: PASS — all four test cases pass.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/organization-objectives.ts tests/presenter-organization-objectives.test.ts
git commit -m "add OrganizationObjectivesPresenter"
```

### Task 3.2: `ProjectActionBarPresenter`

**Files:**
- Create: `web-app/app/presenters/project-action-bar.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-project-action-bar.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ProjectActionBarPresenter } from
    '../web-app/app/presenters/project-action-bar.ts';

const baseProject = {
    id: 'p1', status: 'under-review', title: 't',
    description: 'd', progress: 0,
    start_date: '2026-05-14T00:00:00.000Z',
    target_end_date: '2026-05-14T00:00:00.000Z',
    estimated_duration: 0, actual_duration: 0,
    estimated_cost: 0, actual_cost: 0,
    position: 0, business_context: {},
    timeline_label: 'q1',
};

test('under-review with no scores: Score enabled, ' +
    'Approve disabled', () => {
        const p = new ProjectActionBarPresenter(
            baseProject,
            [{ id: 'o1', position: 0 }],
            [],
            [],
        );
        const html = p.buildBar().toString();
        assert.ok(html.includes('data-action="score"'));
        assert.ok(
            html.includes(
                'data-action="approve" disabled',
            ),
        );
    });

test('under-review with full scoring: Approve enabled',
    () => {
        const p = new ProjectActionBarPresenter(
            baseProject,
            [{ id: 'o1', position: 0 }],
            [{ project_id: 'p1', objective_id: 'o1',
               score: 50,
               scored_at: '2026-05-14T00:00:00.000Z' }],
            [],
        );
        const html = p.buildBar().toString();
        const approveDisabled = html.includes(
            'data-action="approve" disabled',
        );
        assert.equal(approveDisabled, false);
    });

test('approved project: Log measurement and Complete shown',
    () => {
        const p = new ProjectActionBarPresenter(
            { ...baseProject, status: 'approved' },
            [{ id: 'o1', position: 0 }],
            [{ project_id: 'p1', objective_id: 'o1',
               score: 50,
               scored_at: '2026-05-14T00:00:00.000Z' }],
            [],
        );
        const html = p.buildBar().toString();
        assert.ok(html.includes(
            'data-action="log-measurement"',
        ));
        assert.ok(html.includes(
            'data-action="complete"',
        ));
    });

test('approved with full actuals: Complete enabled', () => {
    const p = new ProjectActionBarPresenter(
        { ...baseProject, status: 'approved' },
        [{ id: 'o1', position: 0 }],
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [{ project_id: 'p1', objective_id: 'o1',
           score: 40,
           scored_at: '2026-05-15T00:00:00.000Z' }],
    );
    const html = p.buildBar().toString();
    const completeDisabled = html.includes(
        'data-action="complete" disabled',
    );
    assert.equal(completeDisabled, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-project-action-bar.test.ts`

Expected: FAIL.

- [ ] **Step 3: Create the presenter**

```ts
// web-app/app/presenters/project-action-bar.ts

import { html, SafeHtml } from '../safe-html.ts';
import type {
    ProjectEntity,
    Objective,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../../../api/types.ts';
import {
    validateProjectForApproval,
    validateProjectForCompletion,
} from '../adapters/project-publish.ts';

export class ProjectActionBarPresenter {
    constructor(
        private readonly project: ProjectEntity,
        private readonly activeObjectives: Objective[],
        private readonly latestBaselines:
            ProjectObjectiveBaselineScore[],
        private readonly latestActuals:
            ProjectObjectiveActualScore[],
    ) {}

    buildBar(): SafeHtml {
        const status = this.project.status;
        const isReview = status === 'submitted'
            || status === 'under-review'
            || status === 'sent-back';
        const approvalCheck = validateProjectForApproval(
            this.project,
            this.activeObjectives,
            this.latestBaselines,
        );
        const completionCheck = validateProjectForCompletion(
            this.project,
            this.latestBaselines,
            this.latestActuals,
        );

        return html`
            <div class="action-bar"
                data-project-id="${this.project.id}">
                ${isReview
                    ? this.#reviewActions(approvalCheck)
                    : html``}
                ${status === 'approved'
                    ? this.#approvedActions(completionCheck)
                    : html``}
                ${status === 'approved'
                    || status === 'completed'
                    ? html`<button
                        data-action="view-history">
                        View history
                      </button>`
                    : html``}
            </div>
        `;
    }

    #reviewActions(check): SafeHtml {
        const tooltip = check.ready
            ? ''
            : check.problems.length + ' objectives unscored';
        return html`
            <button data-action="score">
                Score
            </button>
            <button data-action="approve"
                ${check.ready ? '' : 'disabled'}
                title="${tooltip}">
                Approve
            </button>
            <button data-action="decline">Decline</button>
            <button data-action="send-back">Send back</button>
        `;
    }

    #approvedActions(check): SafeHtml {
        const tooltip = check.ready
            ? ''
            : check.problems.length
                + ' objectives lack actual measurements';
        return html`
            <button data-action="log-measurement">
                Log measurement
            </button>
            <button data-action="complete"
                ${check.ready ? '' : 'disabled'}
                title="${tooltip}">
                Complete
            </button>
        `;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-project-action-bar.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/project-action-bar.ts tests/presenter-project-action-bar.test.ts
git commit -m "add ProjectActionBarPresenter"
```

### Task 3.3: `ScoreModalPresenter`

**Files:**
- Create: `web-app/app/presenters/score-modal.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-score-modal.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ScoreModalPresenter } from
    '../web-app/app/presenters/score-modal.ts';

const project = {
    id: 'p1', status: 'under-review', title: 'Q1',
    description: 'd', progress: 0,
    start_date: '2026-05-14T00:00:00.000Z',
    target_end_date: '2026-05-14T00:00:00.000Z',
    estimated_duration: 0, actual_duration: 0,
    estimated_cost: 0, actual_cost: 0,
    position: 0, business_context: {},
    timeline_label: 'q1',
};

const activeObjs = [
    { id: 'o1', position: 0 },
    { id: 'o2', position: 1 },
];
const defs = new Map([
    ['o1', { name: 'Revenue', description: 'd1' }],
    ['o2', { name: 'Cost', description: 'd2' }],
]);

test('renders one slider per objective', () => {
    const p = new ScoreModalPresenter(
        project, activeObjs, defs, [],
    );
    const html = p.buildBody().toString();
    const sliderCount = (
        html.match(/type="range"/g) || []
    ).length;
    assert.equal(sliderCount, 2);
});

test('slider pre-fills from latest baseline', () => {
    const p = new ScoreModalPresenter(
        project, activeObjs, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
    );
    const html = p.buildBody().toString();
    assert.ok(html.includes(
        'data-objective-id="o1"'
    ));
    assert.ok(html.includes('value="50"'));
});

test('unset slider gets Score required hint', () => {
    const p = new ScoreModalPresenter(
        project, activeObjs, defs, [],
    );
    const html = p.buildBody().toString();
    assert.ok(html.toLowerCase()
        .includes('score required'));
});

test('slider range is [-100, +100] step 1', () => {
    const p = new ScoreModalPresenter(
        project, activeObjs, defs, [],
    );
    const html = p.buildBody().toString();
    assert.ok(html.includes('min="-100"'));
    assert.ok(html.includes('max="100"'));
    assert.ok(html.includes('step="1"'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-score-modal.test.ts`

Expected: FAIL.

- [ ] **Step 3: Create the presenter**

```ts
// web-app/app/presenters/score-modal.ts

import { html, SafeHtml } from '../safe-html.ts';
import type {
    ProjectEntity,
    Objective,
    ObjectiveId,
    ProjectObjectiveBaselineScore,
} from '../../../api/types.ts';

interface Definition {
    name: string;
    description: string;
}

export class ScoreModalPresenter {
    constructor(
        private readonly project: ProjectEntity,
        private readonly activeObjectives: Objective[],
        private readonly defs: Map<ObjectiveId, Definition>,
        private readonly latestBaselines:
            ProjectObjectiveBaselineScore[],
    ) {}

    buildBody(): SafeHtml {
        const baselineMap = this.#latestBaselineMap();
        return html`
            <div class="score-modal-body">
                <h3>Score baselines: ${this.project.title}</h3>
                <p class="modal-subtitle">
                    Drag each slider to score this project
                    against the objective. Range: −100 to +100.
                </p>
                ${this.activeObjectives.map(o =>
                    this.#sliderRow(o, baselineMap.get(o.id)))
                }
                <div class="modal-actions">
                    <button data-action="cancel">Cancel</button>
                    <button data-action="save-baselines"
                        class="btn-primary">
                        Save baselines
                    </button>
                </div>
            </div>
        `;
    }

    #latestBaselineMap(): Map<ObjectiveId, number> {
        const map = new Map<ObjectiveId,
            { score: number; scored_at: string }>();
        for (const b of this.latestBaselines) {
            const prev = map.get(b.objective_id);
            if (!prev || b.scored_at > prev.scored_at) {
                map.set(b.objective_id, b);
            }
        }
        const scores = new Map<ObjectiveId, number>();
        for (const [k, v] of map) scores.set(k, v.score);
        return scores;
    }

    #sliderRow(
        obj: Objective,
        preFill: number | undefined,
    ): SafeHtml {
        const def = this.defs.get(obj.id);
        const name = def ? def.name : '(unknown)';
        const desc = def ? def.description : '';
        const isUnset = preFill === undefined;
        const value = preFill ?? 0;
        return html`
            <div class="score-slider-row"
                data-objective-id="${obj.id}"
                data-unset="${isUnset}"
                data-initial-value="${value}">
                <label class="score-slider-label">
                    <strong>${name}</strong>
                    <span class="score-slider-desc">
                        ${desc}
                    </span>
                </label>
                <input type="range" min="-100" max="100"
                    step="1" value="${value}"
                    data-objective-id="${obj.id}"
                    class="score-slider${
                        isUnset ? ' unset' : ''
                    }">
                <span class="score-value">
                    ${isUnset ? '—' : value}
                </span>
                ${isUnset
                    ? html`<span class="score-hint">
                        Score required
                      </span>`
                    : html``}
            </div>
        `;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-score-modal.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/score-modal.ts tests/presenter-score-modal.test.ts
git commit -m "add ScoreModalPresenter"
```

### Task 3.4: `MeasurementModalPresenter`

**Files:**
- Create: `web-app/app/presenters/measurement-modal.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-measurement-modal.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MeasurementModalPresenter } from
    '../web-app/app/presenters/measurement-modal.ts';

const project = {
    id: 'p1', status: 'approved', title: 'Q1',
    description: 'd', progress: 0,
    start_date: '2026-05-14T00:00:00.000Z',
    target_end_date: '2026-05-14T00:00:00.000Z',
    estimated_duration: 0, actual_duration: 0,
    estimated_cost: 0, actual_cost: 0,
    position: 0, business_context: {},
    timeline_label: 'q1',
};

const defs = new Map([
    ['o1', { name: 'Revenue', description: 'd1' }],
]);

test('renders one slider per baseline-scored objective',
    () => {
        const p = new MeasurementModalPresenter(
            project, defs,
            [{ project_id: 'p1', objective_id: 'o1',
               score: 50,
               scored_at: '2026-05-14T00:00:00.000Z' }],
            [],
        );
        const html = p.buildBody().toString();
        const n = (html.match(/type="range"/g) || []).length;
        assert.equal(n, 1);
    });

test('pre-fills with latest actual when present', () => {
    const p = new MeasurementModalPresenter(
        project, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [{ project_id: 'p1', objective_id: 'o1',
           score: 35,
           scored_at: '2026-05-15T00:00:00.000Z' }],
    );
    const html = p.buildBody().toString();
    assert.ok(html.includes('value="35"'));
});

test('pre-fills with baseline when no actuals yet', () => {
    const p = new MeasurementModalPresenter(
        project, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [],
    );
    const html = p.buildBody().toString();
    assert.ok(html.includes('value="50"'));
});

test('caption shows baseline reference', () => {
    const p = new MeasurementModalPresenter(
        project, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [],
    );
    const html = p.buildBody().toString();
    assert.ok(html.includes('Baseline'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-measurement-modal.test.ts`

Expected: FAIL.

- [ ] **Step 3: Create the presenter**

```ts
// web-app/app/presenters/measurement-modal.ts

import { html, SafeHtml } from '../safe-html.ts';
import type {
    ProjectEntity,
    ObjectiveId,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../../../api/types.ts';

interface Definition {
    name: string;
    description: string;
}

interface RowData {
    objectiveId: ObjectiveId;
    name: string;
    description: string;
    baselineScore: number;
    latestActualScore: number | undefined;
    latestActualAt: string | undefined;
    preFillValue: number;
}

export class MeasurementModalPresenter {
    constructor(
        private readonly project: ProjectEntity,
        private readonly defs: Map<ObjectiveId, Definition>,
        private readonly latestBaselines:
            ProjectObjectiveBaselineScore[],
        private readonly latestActuals:
            ProjectObjectiveActualScore[],
    ) {}

    buildBody(): SafeHtml {
        const rows = this.#buildRows();
        return html`
            <div class="measurement-modal-body">
                <h3>Log measurement: ${this.project.title}</h3>
                <p class="modal-subtitle">
                    Record current actual scores. Untouched
                    sliders are not recorded.
                </p>
                ${rows.map(r => this.#row(r))}
                <div class="modal-actions">
                    <button data-action="cancel">Cancel</button>
                    <button data-action="save-measurement"
                        class="btn-primary">
                        Save measurement
                    </button>
                </div>
            </div>
        `;
    }

    #buildRows(): RowData[] {
        const latestBaselineMap =
            this.#latestPerPair(this.latestBaselines);
        const latestActualMap =
            this.#latestPerPair(this.latestActuals);
        const rows: RowData[] = [];
        for (const [objId, b] of latestBaselineMap) {
            const a = latestActualMap.get(objId);
            const def = this.defs.get(objId);
            rows.push({
                objectiveId: objId,
                name: def ? def.name : '(unknown)',
                description: def ? def.description : '',
                baselineScore: b.score,
                latestActualScore: a ? a.score : undefined,
                latestActualAt: a ? a.scored_at : undefined,
                preFillValue: a ? a.score : b.score,
            });
        }
        return rows;
    }

    #latestPerPair<T extends { objective_id: ObjectiveId;
        score: number; scored_at: string }>(
        rows: T[],
    ): Map<ObjectiveId, T> {
        const map = new Map<ObjectiveId, T>();
        for (const r of rows) {
            const prev = map.get(r.objective_id);
            if (!prev || r.scored_at > prev.scored_at) {
                map.set(r.objective_id, r);
            }
        }
        return map;
    }

    #row(r: RowData): SafeHtml {
        const actualText = r.latestActualScore !== undefined
            ? r.latestActualScore + ' ('
                + (r.latestActualAt
                    ? r.latestActualAt.slice(0, 10)
                    : '')
                + ')'
            : 'none yet';
        return html`
            <div class="measurement-slider-row"
                data-objective-id="${r.objectiveId}"
                data-initial-value="${r.preFillValue}">
                <label>
                    <strong>${r.name}</strong>
                    <span class="meta">${r.description}</span>
                </label>
                <input type="range" min="-100" max="100"
                    step="1" value="${r.preFillValue}"
                    data-objective-id="${r.objectiveId}">
                <span class="measurement-value">
                    ${r.preFillValue}
                </span>
                <small class="measurement-caption">
                    Baseline: ${r.baselineScore} ·
                    Last actual: ${actualText}
                </small>
            </div>
        `;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-measurement-modal.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/measurement-modal.ts tests/presenter-measurement-modal.test.ts
git commit -m "add MeasurementModalPresenter"
```

---

## Phase 3 — Presenters (part 2: project view + history + dashboard cards)

### Task 3.5: `ProjectObjectivesPresenter`

**Files:**
- Create: `web-app/app/presenters/project-objectives.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-project-objectives.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ProjectObjectivesPresenter } from
    '../web-app/app/presenters/project-objectives.ts';

const activeObjs = [
    { id: 'o1', position: 0 },
    { id: 'o2', position: 1 },
];
const defs = new Map([
    ['o1', { name: 'Revenue', description: 'd1' }],
    ['o2', { name: 'Cost', description: 'd2' }],
]);

test('renders one row per baseline-scored objective', () => {
    const p = new ProjectObjectivesPresenter(
        activeObjs, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [],
    );
    const html = p.buildSection().toString();
    assert.ok(html.includes('Revenue'));
    assert.ok(html.includes('+50'));
});

test('shows "no measurements yet" when no actuals', () => {
    const p = new ProjectObjectivesPresenter(
        activeObjs, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [],
    );
    const html = p.buildSection().toString();
    assert.ok(html.toLowerCase()
        .includes('no measurements yet'));
});

test('shows latest actual with sign', () => {
    const p = new ProjectObjectivesPresenter(
        activeObjs, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [{ project_id: 'p1', objective_id: 'o1',
           score: -10,
           scored_at: '2026-05-15T00:00:00.000Z' }],
    );
    const html = p.buildSection().toString();
    assert.ok(html.includes('−10') || html.includes('-10'));
});

test('renders View history button', () => {
    const p = new ProjectObjectivesPresenter(
        activeObjs, defs,
        [{ project_id: 'p1', objective_id: 'o1',
           score: 50,
           scored_at: '2026-05-14T00:00:00.000Z' }],
        [],
    );
    const html = p.buildSection().toString();
    assert.ok(html.includes(
        'data-action="view-history"',
    ));
});

test('empty section when no baselines scored', () => {
    const p = new ProjectObjectivesPresenter(
        activeObjs, defs, [], [],
    );
    const html = p.buildSection().toString();
    assert.ok(html.toLowerCase()
        .includes('not yet scored'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-project-objectives.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the presenter**

```ts
// web-app/app/presenters/project-objectives.ts

import { html, SafeHtml } from '../safe-html.ts';
import type {
    Objective,
    ObjectiveId,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../../../api/types.ts';

interface Definition {
    name: string;
    description: string;
}

function formatSigned(n: number): string {
    if (n > 0) return '+' + n;
    if (n < 0) return '−' + Math.abs(n);
    return '0';
}

function latestPerPair<T extends {
    objective_id: ObjectiveId;
    scored_at: string;
}>(rows: T[]): Map<ObjectiveId, T> {
    const map = new Map<ObjectiveId, T>();
    for (const r of rows) {
        const prev = map.get(r.objective_id);
        if (!prev || r.scored_at > prev.scored_at) {
            map.set(r.objective_id, r);
        }
    }
    return map;
}

function toneForScore(n: number): string {
    if (n > 0) return 'positive';
    if (n < 0) return 'negative';
    return 'neutral';
}

export class ProjectObjectivesPresenter {
    constructor(
        private readonly activeObjectives: Objective[],
        private readonly defs: Map<ObjectiveId, Definition>,
        private readonly latestBaselines:
            ProjectObjectiveBaselineScore[],
        private readonly latestActuals:
            ProjectObjectiveActualScore[],
    ) {}

    buildSection(): SafeHtml {
        const baseMap = latestPerPair(this.latestBaselines);
        const actualMap = latestPerPair(this.latestActuals);

        if (baseMap.size === 0) {
            return html`
                <section class="project-objectives-section">
                    <header>
                        <h3>Objectives</h3>
                    </header>
                    <p class="empty-state">
                        Project not yet scored.
                    </p>
                </section>
            `;
        }

        return html`
            <section class="project-objectives-section">
                <header>
                    <h3>Objectives</h3>
                    <button data-action="view-history">
                        View history
                    </button>
                </header>
                <ul class="project-objectives-list">
                    ${this.activeObjectives.map(o => {
                        const b = baseMap.get(o.id);
                        if (!b) return html``;
                        return this.#row(
                            o, b.score,
                            actualMap.get(o.id),
                        );
                    })}
                </ul>
            </section>
        `;
    }

    #row(
        obj: Objective,
        baselineScore: number,
        actual: ProjectObjectiveActualScore | undefined,
    ): SafeHtml {
        const def = this.defs.get(obj.id);
        const name = def ? def.name : '(unknown)';
        return html`
            <li class="score-row"
                data-objective-id="${obj.id}">
                <span class="score-row-label">${name}</span>
                <span class="bipolar-bar"
                    data-tone="${toneForScore(baselineScore)}"
                    style="--baseline:${baselineScore};
                           --actual:${actual
                               ? actual.score
                               : 'none'}">
                </span>
                <strong class="score-row-baseline"
                    data-tone="${toneForScore(baselineScore)}">
                    ${formatSigned(baselineScore)}
                </strong>
                <strong class="score-row-actual"
                    data-tone="${actual
                        ? toneForScore(actual.score)
                        : 'neutral'}">
                    ${actual
                        ? formatSigned(actual.score)
                        : 'no measurements yet'}
                </strong>
            </li>
        `;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-project-objectives.test.ts`

Expected: PASS — all five test cases pass.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/project-objectives.ts tests/presenter-project-objectives.test.ts
git commit -m "add ProjectObjectivesPresenter"
```

### Task 3.6: `ProjectScoreHistoryPresenter`

**Files:**
- Create: `web-app/app/presenters/project-score-history.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-project-score-history.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ProjectScoreHistoryPresenter } from
    '../web-app/app/presenters/project-score-history.ts';

const baselines = [
    { project_id: 'p1', objective_id: 'o1',
      score: 50, scored_at: '2026-03-01T14:23:00.000Z' },
    { project_id: 'p1', objective_id: 'o1',
      score: 40, scored_at: '2026-03-05T09:10:00.000Z' },
];
const actuals = [
    { project_id: 'p1', objective_id: 'o1',
      score: 45, scored_at: '2026-04-01T16:45:00.000Z' },
];
const revisions = [
    { objective_id: 'o1', name: 'Increase Revenue',
      description: 'd1',
      revised_at: '2026-02-01T00:00:00.000Z' },
    { objective_id: 'o1', name: 'Drive Growth',
      description: 'd2',
      revised_at: '2026-03-18T11:02:00.000Z' },
];
const deprecations = [];

function resolver(objId: string, atTime: string) {
    const eligible = revisions
        .filter(r => r.revised_at <= atTime);
    if (eligible.length === 0) return undefined;
    eligible.sort((a, b) =>
        b.revised_at.localeCompare(a.revised_at));
    return {
        name: eligible[0].name,
        description: eligible[0].description,
    };
}

test('merges all four streams chronologically', () => {
    const p = new ProjectScoreHistoryPresenter(
        baselines, actuals, revisions, deprecations,
        resolver,
    );
    const html = p.buildBody().toString();
    const positions = [
        html.indexOf('2026-02-01'),
        html.indexOf('2026-03-01'),
        html.indexOf('2026-03-05'),
        html.indexOf('2026-03-18'),
        html.indexOf('2026-04-01'),
    ];
    for (let i = 1; i < positions.length; i++) {
        assert.ok(positions[i] > positions[i - 1],
            'events out of order at index ' + i);
    }
});

test('resolves historical objective name at each event',
    () => {
        const p = new ProjectScoreHistoryPresenter(
            baselines, actuals, revisions, deprecations,
            resolver,
        );
        const html = p.buildBody().toString();
        const marchOnePos = html.indexOf('2026-03-01');
        const aprilOnePos = html.indexOf('2026-04-01');
        const incrRevPos = html.indexOf('Increase Revenue');
        const driveGrowthPos = html.indexOf('Drive Growth');
        assert.ok(incrRevPos > marchOnePos
            && incrRevPos < aprilOnePos,
            'March score should render under "Increase Revenue"');
        assert.ok(driveGrowthPos > aprilOnePos,
            'April score should render under "Drive Growth"');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-project-score-history.test.ts`

Expected: FAIL.

- [ ] **Step 3: Create the presenter**

```ts
// web-app/app/presenters/project-score-history.ts

import { html, SafeHtml } from '../safe-html.ts';
import type {
    ObjectiveId,
    ObjectiveRevision,
    DeprecatedObjective,
    ProjectObjectiveBaselineScore,
    ProjectObjectiveActualScore,
} from '../../../api/types.ts';

export type DefinitionResolver = (
    objectiveId: ObjectiveId,
    atTime: string,
) => { name: string; description: string } | undefined;

type Event =
    | { kind: 'baseline'; at: string;
        objectiveId: ObjectiveId; score: number }
    | { kind: 'actual'; at: string;
        objectiveId: ObjectiveId; score: number }
    | { kind: 'revision'; at: string;
        objectiveId: ObjectiveId; name: string }
    | { kind: 'deprecation'; at: string;
        objectiveId: ObjectiveId };

function formatSigned(n: number): string {
    if (n > 0) return '+' + n;
    if (n < 0) return '−' + Math.abs(n);
    return '0';
}

export class ProjectScoreHistoryPresenter {
    constructor(
        private readonly baselines:
            ProjectObjectiveBaselineScore[],
        private readonly actuals:
            ProjectObjectiveActualScore[],
        private readonly revisions: ObjectiveRevision[],
        private readonly deprecations: DeprecatedObjective[],
        private readonly resolver: DefinitionResolver,
    ) {}

    buildBody(): SafeHtml {
        const events = this.#mergedEvents();
        return html`
            <div class="score-history-body">
                <h3>Scoring history</h3>
                <table class="score-history-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Event</th>
                            <th>Objective</th>
                            <th>Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(e => this.#row(e))}
                    </tbody>
                </table>
            </div>
        `;
    }

    #mergedEvents(): Event[] {
        const events: Event[] = [];
        for (const b of this.baselines) {
            events.push({
                kind: 'baseline',
                at: b.scored_at,
                objectiveId: b.objective_id,
                score: b.score,
            });
        }
        for (const a of this.actuals) {
            events.push({
                kind: 'actual',
                at: a.scored_at,
                objectiveId: a.objective_id,
                score: a.score,
            });
        }
        for (const r of this.revisions) {
            events.push({
                kind: 'revision',
                at: r.revised_at,
                objectiveId: r.objective_id,
                name: r.name,
            });
        }
        for (const d of this.deprecations) {
            events.push({
                kind: 'deprecation',
                at: d.deprecated_at,
                objectiveId: d.objective_id,
            });
        }
        events.sort((a, b) => a.at.localeCompare(b.at));
        return events;
    }

    #row(e: Event): SafeHtml {
        const def = this.resolver(e.objectiveId, e.at);
        const name = def ? def.name : '(unknown)';
        const dateLabel = e.at.slice(0, 16).replace('T', ' ');
        switch (e.kind) {
            case 'baseline':
                return html`<tr>
                    <td>${dateLabel}</td>
                    <td>Baseline scored</td>
                    <td>${name}</td>
                    <td>${formatSigned(e.score)}</td>
                </tr>`;
            case 'actual':
                return html`<tr>
                    <td>${dateLabel}</td>
                    <td>Actual measured</td>
                    <td>${name}</td>
                    <td>${formatSigned(e.score)}</td>
                </tr>`;
            case 'revision':
                return html`<tr>
                    <td>${dateLabel}</td>
                    <td>Objective revised</td>
                    <td>${name}</td>
                    <td>renamed/edited</td>
                </tr>`;
            case 'deprecation':
                return html`<tr>
                    <td>${dateLabel}</td>
                    <td>Objective deprecated</td>
                    <td>${name}</td>
                    <td>—</td>
                </tr>`;
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-project-score-history.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/project-score-history.ts tests/presenter-project-score-history.test.ts
git commit -m "add ProjectScoreHistoryPresenter"
```

### Task 3.7: `PortfolioImpactPresenter`

**Files:**
- Create: `web-app/app/presenters/portfolio-impact.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-portfolio-impact.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { PortfolioImpactPresenter } from
    '../web-app/app/presenters/portfolio-impact.ts';

test('renders both arc segments when both means present',
    () => {
        const p = new PortfolioImpactPresenter({
            baselineMean: 19,
            actualMean: 12,
            projectCount: 5,
            actualCount: 3,
        });
        const html = p.render().toString();
        assert.ok(html.includes('+19'));
        assert.ok(html.includes('+12'));
        assert.ok(html.includes('portfolio-impact-arc-outer'));
        assert.ok(html.includes('portfolio-impact-arc-inner'));
    });

test('renders no value arcs when both means undefined',
    () => {
        const p = new PortfolioImpactPresenter({
            baselineMean: undefined,
            actualMean: undefined,
            projectCount: 0,
            actualCount: 0,
        });
        const html = p.render().toString();
        assert.ok(!html.includes(
            'class="portfolio-impact-arc-outer"',
        ));
        assert.ok(html.includes('—'));
    });

test('positive baseline → data-tone="positive"', () => {
    const p = new PortfolioImpactPresenter({
        baselineMean: 30, actualMean: 20,
        projectCount: 1, actualCount: 1,
    });
    const html = p.render().toString();
    assert.ok(html.includes('data-tone="positive"'));
});

test('negative baseline → data-tone="negative"', () => {
    const p = new PortfolioImpactPresenter({
        baselineMean: -30, actualMean: -20,
        projectCount: 1, actualCount: 1,
    });
    const html = p.render().toString();
    assert.ok(html.includes('data-tone="negative"'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-portfolio-impact.test.ts`

Expected: FAIL.

- [ ] **Step 3: Create the presenter**

The math: angle from TDC = (V/100) · 90°. SVG center at
(90, 85), radii 65 outer / 45 inner. Positive sweeps right
with sweep-flag 1; negative sweeps left with sweep-flag 0.

```ts
// web-app/app/presenters/portfolio-impact.ts

import { html, SafeHtml } from '../safe-html.ts';
import { iconZap } from '../icons.ts';

interface Summary {
    baselineMean: number | undefined;
    actualMean: number | undefined;
    projectCount: number;
    actualCount: number;
}

const CENTER_X = 90;
const CENTER_Y = 85;
const OUTER_R = 65;
const INNER_R = 45;
const DEG_TO_RAD = Math.PI / 180;

function arcEndpoint(
    value: number,
    radius: number,
): { x: number; y: number; sweep: 0 | 1 } {
    const sign = value >= 0 ? 1 : -1;
    const alphaDeg = (Math.abs(value) / 100) * 90;
    const svgAngleDeg = 270 + sign * alphaDeg;
    const rad = svgAngleDeg * DEG_TO_RAD;
    return {
        x: CENTER_X + radius * Math.cos(rad),
        y: CENTER_Y + radius * Math.sin(rad),
        sweep: sign > 0 ? 1 : 0,
    };
}

function toneForValue(v: number | undefined): string {
    if (v === undefined) return 'neutral';
    if (v > 0) return 'positive';
    if (v < 0) return 'negative';
    return 'neutral';
}

function formatSigned(v: number | undefined): string {
    if (v === undefined) return '—';
    if (v > 0) return '+' + v;
    if (v < 0) return '−' + Math.abs(v);
    return '0';
}

export class PortfolioImpactPresenter {
    constructor(private readonly s: Summary) {}

    render(): SafeHtml {
        const tone = toneForValue(this.s.baselineMean);
        return html`
            <section class="portfolio-impact-card"
                data-tone="${tone}">
                <header class="portfolio-impact-header">
                    <div class="icon-box" data-tone="${tone}">
                        ${iconZap(20, '')}
                    </div>
                    <h3>Portfolio Impact</h3>
                </header>
                ${this.#renderSvg()}
                ${this.#renderLegend()}
            </section>
        `;
    }

    #renderSvg(): SafeHtml {
        const tdcX = CENTER_X;
        const outerTdcY = CENTER_Y - OUTER_R;
        const innerTdcY = CENTER_Y - INNER_R;

        const baselineArc = this.s.baselineMean !== undefined
            ? this.#arcPath(
                this.s.baselineMean, OUTER_R,
                tdcX, outerTdcY,
            )
            : '';
        const actualArc = this.s.actualMean !== undefined
            ? this.#arcPath(
                this.s.actualMean, INNER_R,
                tdcX, innerTdcY,
            )
            : '';
        const baselineTone = toneForValue(this.s.baselineMean);
        const actualTone = toneForValue(this.s.actualMean);

        return html`
            <svg viewBox="0 0 180 95" width="180" height="95"
                class="portfolio-impact-svg">
                <path
                    d="M 25 85 A 65 65 0 0 1 155 85"
                    class="portfolio-impact-bg-outer"
                    fill="none" stroke-linecap="round"/>
                <path
                    d="M 45 85 A 45 45 0 0 1 135 85"
                    class="portfolio-impact-bg-inner"
                    fill="none" stroke-linecap="round"/>
                <line x1="90" y1="14" x2="90" y2="24"
                    class="portfolio-impact-tdc"/>
                ${baselineArc
                    ? html`<path d="${baselineArc}"
                        class="portfolio-impact-arc-outer"
                        data-tone="${baselineTone}"
                        fill="none" stroke-linecap="round"/>`
                    : html``}
                ${actualArc
                    ? html`<path d="${actualArc}"
                        class="portfolio-impact-arc-inner"
                        data-tone="${actualTone}"
                        fill="none" stroke-linecap="round"/>`
                    : html``}
            </svg>
        `;
    }

    #arcPath(
        value: number,
        radius: number,
        tdcX: number,
        tdcY: number,
    ): string {
        const ep = arcEndpoint(value, radius);
        return 'M ' + tdcX + ' ' + tdcY
            + ' A ' + radius + ' ' + radius
            + ' 0 0 ' + ep.sweep
            + ' ' + ep.x.toFixed(2)
            + ' ' + ep.y.toFixed(2);
    }

    #renderLegend(): SafeHtml {
        return html`
            <div class="portfolio-impact-legend">
                <div class="legend-cell">
                    <div class="legend-dot"
                        data-tone="${toneForValue(
                            this.s.actualMean,
                        )}"></div>
                    <span>Actual</span>
                    <strong>${formatSigned(
                        this.s.actualMean,
                    )}</strong>
                </div>
                <div class="legend-cell">
                    <div class="legend-dot"
                        data-tone="${toneForValue(
                            this.s.baselineMean,
                        )}"></div>
                    <span>Baseline</span>
                    <strong>${formatSigned(
                        this.s.baselineMean,
                    )}</strong>
                </div>
            </div>
        `;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-portfolio-impact.test.ts`

Expected: PASS — all four test cases pass.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/portfolio-impact.ts tests/presenter-portfolio-impact.test.ts
git commit -m "add PortfolioImpactPresenter (bipolar arc gauge)"
```

### Task 3.8: `DashboardObjectiveAggregatesPresenter`

**Files:**
- Create: `web-app/app/presenters/dashboard-objective-aggregates.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-dashboard-objective-aggregates.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { DashboardObjectiveAggregatesPresenter } from
    '../web-app/app/presenters/dashboard-objective-aggregates.ts';

const activeObjs = [
    { id: 'o1', position: 0 },
    { id: 'o2', position: 1 },
];
const defs = new Map([
    ['o1', { name: 'Revenue Growth', description: 'd1' }],
    ['o2', { name: 'Cost Reduction', description: 'd2' }],
]);
const aggregates = [
    { objectiveId: 'o1',
      baselineMean: 32, latestActualMean: 25,
      projectsBaselineScored: 12, projectsActualScored: 8 },
    { objectiveId: 'o2',
      baselineMean: undefined, latestActualMean: undefined,
      projectsBaselineScored: 0, projectsActualScored: 0 },
];

test('renders one row per active objective', () => {
    const p = new DashboardObjectiveAggregatesPresenter(
        activeObjs, defs, aggregates,
    );
    const html = p.render().toString();
    assert.ok(html.includes('Revenue Growth'));
    assert.ok(html.includes('Cost Reduction'));
});

test('row with contributors shows means and counts', () => {
    const p = new DashboardObjectiveAggregatesPresenter(
        activeObjs, defs, aggregates,
    );
    const html = p.render().toString();
    assert.ok(html.includes('+32'));
    assert.ok(html.includes('+25'));
    assert.ok(html.includes('12 projects'));
});

test('zero-contributor row renders dimmed', () => {
    const p = new DashboardObjectiveAggregatesPresenter(
        activeObjs, defs, aggregates,
    );
    const html = p.render().toString();
    assert.ok(html.includes('0 projects'));
    assert.ok(html.includes('data-empty="true"'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-dashboard-objective-aggregates.test.ts`

Expected: FAIL.

- [ ] **Step 3: Create the presenter**

```ts
// web-app/app/presenters/dashboard-objective-aggregates.ts

import { html, SafeHtml } from '../safe-html.ts';
import type {
    Objective,
    ObjectiveId,
} from '../../../api/types.ts';

interface Definition {
    name: string;
    description: string;
}

interface Aggregate {
    objectiveId: ObjectiveId;
    baselineMean: number | undefined;
    latestActualMean: number | undefined;
    projectsBaselineScored: number;
    projectsActualScored: number;
}

function toneForValue(v: number | undefined): string {
    if (v === undefined) return 'neutral';
    if (v > 0) return 'positive';
    if (v < 0) return 'negative';
    return 'neutral';
}

function formatSigned(v: number | undefined): string {
    if (v === undefined) return '—';
    if (v > 0) return '+' + v;
    if (v < 0) return '−' + Math.abs(v);
    return '0';
}

export class DashboardObjectiveAggregatesPresenter {
    constructor(
        private readonly activeObjectives: Objective[],
        private readonly defs: Map<ObjectiveId, Definition>,
        private readonly aggregates: Aggregate[],
    ) {}

    render(): SafeHtml {
        const aggMap = new Map(
            this.aggregates.map(a => [a.objectiveId, a]),
        );
        return html`
            <section class="objective-aggregates-card">
                <header>
                    <h3>Active project impact by objective</h3>
                </header>
                <ul class="objective-aggregates-rows">
                    ${this.activeObjectives.map(o =>
                        this.#row(o, aggMap.get(o.id)))
                    }
                </ul>
            </section>
        `;
    }

    #row(o: Objective, agg: Aggregate | undefined): SafeHtml {
        const def = this.defs.get(o.id);
        const name = def ? def.name : '(unknown)';
        const empty = !agg
            || agg.projectsBaselineScored === 0;
        const baseline = agg
            ? agg.baselineMean : undefined;
        const actual = agg
            ? agg.latestActualMean : undefined;
        return html`
            <li class="score-row"
                data-objective-id="${o.id}"
                data-empty="${empty}">
                <span class="score-row-label">${name}</span>
                <span class="bipolar-bar"
                    data-tone="${toneForValue(baseline)}"
                    style="--baseline:${baseline ?? 'none'};
                           --actual:${actual ?? 'none'}">
                </span>
                <strong class="score-row-baseline"
                    data-tone="${toneForValue(baseline)}">
                    ${formatSigned(baseline)}
                </strong>
                <strong class="score-row-actual"
                    data-tone="${toneForValue(actual)}">
                    ${formatSigned(actual)}
                </strong>
                <span class="score-row-count">
                    ${agg
                        ? agg.projectsBaselineScored
                        : 0} projects
                </span>
            </li>
        `;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-dashboard-objective-aggregates.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/dashboard-objective-aggregates.ts tests/presenter-dashboard-objective-aggregates.test.ts
git commit -m "add DashboardObjectiveAggregatesPresenter"
```

### Task 3.9: Remove inline impact display from existing presenters

**Files:**
- Modify: `web-app/app/presenters/project.ts`
- Modify: `web-app/app/presenters/project-detail.ts`

- [ ] **Step 1: Write the failing test**

Append to (or create) `tests/presenter-project-impact-removed.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

test('project.ts no longer references impact pts', () => {
    const src = readFileSync(
        'web-app/app/presenters/project.ts', 'utf8',
    );
    assert.ok(!src.includes('impactBaseline'));
    assert.ok(!src.includes('impactCurrent'));
    assert.ok(!src.toLowerCase().includes(' pts'));
});

test('project-detail.ts no longer references impact metric',
    () => {
        const src = readFileSync(
            'web-app/app/presenters/project-detail.ts',
            'utf8',
        );
        assert.ok(!src.includes('impactBaseline'));
        assert.ok(!src.includes('impactCurrent'));
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-project-impact-removed.test.ts`

Expected: FAIL — current files still reference the old
impact identifiers.

- [ ] **Step 3: Remove the impact code paths**

In `presenters/project.ts`: delete the line(s) that emit
the "impact: X / Y pts" treatment in the list card.

In `presenters/project-detail.ts`: delete the Impact
MetricArgs block (around lines 618–627 per exploration)
from both `ProjectDetailPresenter` and
`ProjectDetailEditPresenter`. Remove the now-orphan
`view.impactBaseline()` / `view.impactCurrent()` calls.

If the metric grid loops over an array of MetricArgs,
remove the impact entry; if it's hard-coded, delete the
two `buildMetricCell` calls for impact.

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-project-impact-removed.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/project.ts web-app/app/presenters/project-detail.ts tests/presenter-project-impact-removed.test.ts
git commit -m "remove inline impact display from project presenters"
```

### Task 3.10: Update `presenters/index.ts` barrel

**Files:**
- Modify: `web-app/app/presenters/index.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/presenter-barrel.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as P from '../web-app/app/presenters/index.ts';

test('barrel exports all new presenters', () => {
    const expected = [
        'OrganizationObjectivesPresenter',
        'ProjectActionBarPresenter',
        'ScoreModalPresenter',
        'MeasurementModalPresenter',
        'ProjectObjectivesPresenter',
        'ProjectScoreHistoryPresenter',
        'PortfolioImpactPresenter',
        'DashboardObjectiveAggregatesPresenter',
    ];
    for (const name of expected) {
        assert.ok(
            name in P,
            'barrel missing export: ' + name,
        );
    }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-barrel.test.ts`

Expected: FAIL — none of the eight new exports are present.

- [ ] **Step 3: Add the exports**

Append to `web-app/app/presenters/index.ts`:

```ts
export { OrganizationObjectivesPresenter }
    from './organization-objectives.ts';
export { ProjectActionBarPresenter }
    from './project-action-bar.ts';
export { ScoreModalPresenter }
    from './score-modal.ts';
export { MeasurementModalPresenter }
    from './measurement-modal.ts';
export { ProjectObjectivesPresenter }
    from './project-objectives.ts';
export { ProjectScoreHistoryPresenter }
    from './project-score-history.ts';
export { PortfolioImpactPresenter }
    from './portfolio-impact.ts';
export { DashboardObjectiveAggregatesPresenter }
    from './dashboard-objective-aggregates.ts';
```

- [ ] **Step 4: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-barrel.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web-app/app/presenters/index.ts tests/presenter-barrel.test.ts
git commit -m "export new presenters from barrel"
```

---

## Phase 4 — CSS

All colors via `data-tone` attribute + design tokens. Never
raw hex. Three new shared classes go in `components.css`
(reused in 3+ sites per Commandment IX); single-site
classes go in `pages.css`.

### Task 4.1: Shared bipolar-bar + score-row + objective-list-item

**Files:**
- Modify: `web-app/app/styles/components.css`

- [ ] **Step 1: Pick a unique anchor**

Open `web-app/app/styles/components.css`. Pick the last line
of an existing component section as your insertion anchor.
Call it `<ANCHOR>`.

- [ ] **Step 2: Add the three classes after `<ANCHOR>`**

```css
/* Bipolar bar — zero-centered, used by ProjectObjectives,
   DashboardObjectiveAggregates, and history previews */
.bipolar-bar {
    --bar-width: 240px;
    --bar-height: 18px;
    position: relative;
    width: var(--bar-width);
    height: var(--bar-height);
    background: hsl(var(--muted) / 0.10);
    border-radius: 3px;
}

.bipolar-bar::before {
    /* TDC center marker */
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: hsl(var(--foreground) / 0.35);
    transform: translateX(-0.5px);
}

.bipolar-bar::after {
    /* Baseline area — width scales with abs(--baseline) */
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    background: hsl(var(--tone-current));
    opacity: 0.55;
    width: calc(
        abs(var(--baseline)) / 100 * (var(--bar-width) / 2)
    );
}

.bipolar-bar[data-tone='positive']::after {
    --tone-current: var(--success);
    left: 50%;
    border-radius: 0 3px 3px 0;
}

.bipolar-bar[data-tone='negative']::after {
    --tone-current: var(--destructive);
    right: 50%;
    border-radius: 3px 0 0 3px;
}

.bipolar-bar[data-tone='neutral']::after {
    display: none;
}

/* Actual tick (when --actual is a number) */
.bipolar-bar[style*='--actual:']:not([style*='--actual:none'])
    > .bipolar-actual-tick {
    /* the tick is rendered as a child element */
}

/* Score row — used by ProjectObjectives and
   DashboardObjectiveAggregates */
.score-row {
    display: grid;
    grid-template-columns:
        140px var(--bar-width) 50px 50px auto;
    align-items: center;
    gap: 0.8em;
    padding: 0.4em 0;
}

.score-row[data-empty='true'] {
    opacity: 0.55;
}

.score-row-label {
    text-align: right;
    font-size: 0.92em;
}

.score-row-baseline[data-tone='positive'],
.score-row-actual[data-tone='positive'] {
    color: hsl(var(--success));
}

.score-row-baseline[data-tone='negative'],
.score-row-actual[data-tone='negative'] {
    color: hsl(var(--destructive));
}

.score-row-count {
    opacity: 0.6;
    font-size: 0.85em;
}

/* Objective list item — used by Organization Objectives box */
.objective-list-item {
    display: flex;
    align-items: flex-start;
    gap: 0.8em;
    padding: 0.6em;
    border-radius: 6px;
    background: hsl(var(--muted) / 0.05);
    margin-bottom: 0.4em;
}

.objective-list-item .drag-handle {
    cursor: grab;
    opacity: 0.5;
    user-select: none;
}

.objective-list-item[data-deprecated='true'] {
    opacity: 0.7;
}

.objective-list-item[data-deprecated='true']
    .objective-text strong {
    text-decoration: line-through;
}

.objective-text {
    flex: 1;
}

.objective-desc {
    display: block;
    opacity: 0.7;
    font-size: 0.9em;
}

.objective-actions {
    display: flex;
    gap: 0.4em;
}
```

(If `var(--success)` / `var(--destructive)` aren't the
codebase's existing token names, substitute the correct
ones — grep for tokens in `web-app/app/styles/tokens.css`
or equivalent.)

- [ ] **Step 3: Manual verification**

Open `localhost:8080/projects/detail.html?id=<any-id>` in a
browser after a `./serve 8080` run. Confirm:
- The bipolar-bar widget renders with red on the left half,
  green on the right half, centered at 0.
- A row with `data-tone="positive"` shows a green-tinted
  bar extending right of center.
- A row with `data-tone="negative"` shows a red-tinted bar
  extending left of center.

(This is visual; no automated test. Confirm visually before
committing.)

- [ ] **Step 4: Commit**

```bash
git add web-app/app/styles/components.css
git commit -m "add bipolar-bar, score-row, objective-list-item shared classes"
```

### Task 4.2: Portfolio Impact gauge + Score modal styles

**Files:**
- Modify: `web-app/app/styles/pages.css`

- [ ] **Step 1: Pick a unique anchor**

Open `web-app/app/styles/pages.css`. Find a clear section
break (e.g., an existing comment like `/* ===== dashboard
===== */`) for the insertion anchor.

- [ ] **Step 2: Add the styles**

```css
/* ===== Portfolio Impact gauge ===== */

.portfolio-impact-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.2em 1em;
}

.portfolio-impact-header {
    display: flex;
    align-items: center;
    gap: 0.6em;
    align-self: flex-start;
    margin-bottom: 0.8em;
}

.portfolio-impact-header .icon-box {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.portfolio-impact-header .icon-box[data-tone='positive'] {
    background: hsl(var(--success) / 0.12);
    color: hsl(var(--success));
}

.portfolio-impact-header .icon-box[data-tone='negative'] {
    background: hsl(var(--destructive) / 0.12);
    color: hsl(var(--destructive));
}

.portfolio-impact-header .icon-box[data-tone='neutral'] {
    background: hsl(var(--muted) / 0.10);
    opacity: 0.6;
}

.portfolio-impact-svg .portfolio-impact-bg-outer,
.portfolio-impact-svg .portfolio-impact-bg-inner {
    stroke: hsl(var(--foreground) / 0.10);
    stroke-width: 14;
}

.portfolio-impact-svg .portfolio-impact-tdc {
    stroke: hsl(var(--foreground) / 0.55);
    stroke-width: 1.5;
}

.portfolio-impact-arc-outer,
.portfolio-impact-arc-inner {
    stroke-width: 14;
}

.portfolio-impact-arc-outer[data-tone='positive'],
.portfolio-impact-arc-inner[data-tone='positive'] {
    stroke: hsl(var(--success));
}

.portfolio-impact-arc-outer[data-tone='negative'],
.portfolio-impact-arc-inner[data-tone='negative'] {
    stroke: hsl(var(--destructive));
}

.portfolio-impact-legend {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8em;
    margin-top: 0.6em;
    text-align: center;
    width: 100%;
}

.legend-dot[data-tone='positive'] {
    background: hsl(var(--success));
}

.legend-dot[data-tone='negative'] {
    background: hsl(var(--destructive));
}

.legend-dot[data-tone='neutral'] {
    background: hsl(var(--muted));
}

/* ===== Score / Measurement modal ===== */

.score-modal-body,
.measurement-modal-body {
    padding: 1.2em;
    min-width: 480px;
}

.score-slider-row,
.measurement-slider-row {
    display: grid;
    grid-template-columns: 200px 1fr 60px;
    align-items: center;
    gap: 0.6em;
    padding: 0.6em 0;
    border-bottom: 1px solid hsl(var(--border));
}

.score-slider-row:last-of-type,
.measurement-slider-row:last-of-type {
    border-bottom: none;
}

.score-slider-label strong {
    display: block;
}

.score-slider-desc,
.measurement-caption {
    display: block;
    font-size: 0.85em;
    opacity: 0.7;
}

.score-slider {
    width: 100%;
}

.score-slider.unset {
    opacity: 0.4;
}

.score-hint {
    grid-column: 1 / -1;
    font-size: 0.85em;
    color: hsl(var(--warning));
    margin-top: 0.2em;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6em;
    margin-top: 1em;
}

/* ===== Org Objectives box ===== */

.org-objectives-box {
    padding: 1em;
}

.org-objectives-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8em;
}

.objective-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.objective-list-divider {
    margin: 1em 0 0.4em;
    font-size: 0.85em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
}

/* ===== Project history modal ===== */

.score-history-table {
    width: 100%;
    border-collapse: collapse;
}

.score-history-table th,
.score-history-table td {
    text-align: left;
    padding: 0.4em 0.6em;
    border-bottom: 1px solid hsl(var(--border));
}
```

- [ ] **Step 3: Manual visual verification**

After `./serve 8080`:
- Open the dashboard; confirm the Portfolio Impact card
  renders with the bipolar arc + legend.
- Open a project's detail page; confirm the Score modal
  styles look correct when opened.
- Open the Organization page; confirm the Objectives box
  renders with rows.

- [ ] **Step 4: Commit**

```bash
git add web-app/app/styles/pages.css
git commit -m "add Portfolio Impact gauge and modal styles"
```

---

## Phase 5 — Page modules

This phase wires everything together. Pages fetch via
adapters, instantiate presenters, render into DOM, and
subscribe to notification channels.

### Task 5.1: Wire the Organization Objectives box

**Files:**
- Modify: `web-app/organization/index.html`
- Modify: `web-app/organization/index.ts`

- [ ] **Step 1: Update the HTML**

Add to `organization/index.html` (after the existing
overview/usage/admin card placeholders):

```html
<div id="objectives-box"></div>

<!-- Add Objective dialog -->
<div id="add-objective-backdrop"
    class="dialog-backdrop hidden"></div>
<div id="add-objective-dialog"
    class="dialog hidden" aria-hidden="true">
    <h3>Add objective</h3>
    <label>Name<input id="add-obj-name" type="text"></label>
    <label>Description<textarea
        id="add-obj-description"></textarea></label>
    <div class="dialog-actions">
        <button data-action="cancel-add-objective">
            Cancel
        </button>
        <button data-action="confirm-add-objective"
            class="btn-primary">Add</button>
    </div>
</div>

<!-- Edit Objective dialog -->
<div id="edit-objective-backdrop"
    class="dialog-backdrop hidden"></div>
<div id="edit-objective-dialog"
    class="dialog hidden" aria-hidden="true">
    <h3>Edit objective</h3>
    <input id="edit-obj-id" type="hidden">
    <label>Name<input id="edit-obj-name" type="text"></label>
    <label>Description<textarea
        id="edit-obj-description"></textarea></label>
    <div class="dialog-actions">
        <button data-action="cancel-edit-objective">
            Cancel
        </button>
        <button data-action="confirm-edit-objective"
            class="btn-primary">Save</button>
    </div>
</div>
```

- [ ] **Step 2: Update `organization/index.ts`**

Add to the top of the file:

```ts
import {
    postActiveObjectivesRetrieval,
    getObjectives,
    getDeprecatedObjectiveIds,
    postCurrentObjectiveDefinition,
    postObjectiveCreation,
    postObjectiveRevision,
    postObjectiveDeprecation,
    postObjectiveReactivation,
    postObjectiveReordering,
} from '../app/adapters/objectives.ts';
import { OrganizationObjectivesPresenter }
    from '../app/presenters';
import { objectiveChanges } from '../app/changes.ts';
import { openDialog, closeDialog } from '../app/core';
import { $, setHtml } from '../app/dom';
```

Add to `init()`:

```ts
async function renderObjectives(): Promise<void> {
    const ctx = createRequestContext();
    const [active, allObjs, deprecatedIds] =
        await Promise.all([
            postActiveObjectivesRetrieval(ctx),
            getObjectives(ctx),
            getDeprecatedObjectiveIds(ctx),
        ]);
    const deprecated = allObjs.filter(
        o => deprecatedIds.has(o.id),
    );
    const defs = new Map();
    for (const o of [...active, ...deprecated]) {
        defs.set(o.id,
            await postCurrentObjectiveDefinition(ctx, o.id));
    }
    const deprecatedAt = new Map();
    // (optional: fetch deprecated_at via additional GET)
    const presenter = new OrganizationObjectivesPresenter(
        active, deprecated, defs, deprecatedAt,
    );
    setHtml($('#objectives-box'), presenter.buildBox());
}

objectiveChanges.subscribe(renderObjectives);
await renderObjectives();

// Click delegation for dialog opens, edit, deprecate, etc.
$('#objectives-box').addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const action = target
        .closest('[data-action]')
        ?.getAttribute('data-action');
    const objectiveId = target
        .closest('[data-objective-id]')
        ?.getAttribute('data-objective-id');
    const ctx = createRequestContext();
    if (action === 'add-objective') {
        openDialog('add-objective');
    } else if (action === 'edit' && objectiveId) {
        const def = await postCurrentObjectiveDefinition(
            ctx, objectiveId);
        ($('#edit-obj-id') as HTMLInputElement).value =
            objectiveId;
        ($('#edit-obj-name') as HTMLInputElement).value =
            def.name;
        ($('#edit-obj-description')
            as HTMLTextAreaElement).value = def.description;
        openDialog('edit-objective');
    } else if (action === 'deprecate' && objectiveId) {
        if (confirm('Deprecate this objective?')) {
            await postObjectiveDeprecation(
                ctx, objectiveId);
        }
    } else if (action === 'reactivate' && objectiveId) {
        await postObjectiveReactivation(ctx, objectiveId);
    }
});

// Add-Objective dialog wiring
$('[data-action="cancel-add-objective"]')
    .addEventListener('click',
        () => closeDialog('add-objective'));
$('[data-action="confirm-add-objective"]')
    .addEventListener('click', async () => {
        const name = ($('#add-obj-name')
            as HTMLInputElement).value;
        const desc = ($('#add-obj-description')
            as HTMLTextAreaElement).value;
        const ctx = createRequestContext();
        const objs = await getObjectives(ctx);
        const newId = crypto.randomUUID();
        await postObjectiveCreation(
            ctx, newId, name, desc, objs.length);
        closeDialog('add-objective');
    });

// Edit-Objective dialog wiring
$('[data-action="cancel-edit-objective"]')
    .addEventListener('click',
        () => closeDialog('edit-objective'));
$('[data-action="confirm-edit-objective"]')
    .addEventListener('click', async () => {
        const id = ($('#edit-obj-id')
            as HTMLInputElement).value;
        const name = ($('#edit-obj-name')
            as HTMLInputElement).value;
        const desc = ($('#edit-obj-description')
            as HTMLTextAreaElement).value;
        const ctx = createRequestContext();
        await postObjectiveRevision(ctx, id, name, desc);
        closeDialog('edit-objective');
    });
```

(Adapt to the codebase's actual conventions for
`createRequestContext` import, `$` dom helper, etc. Read
`organization/index.ts` first for the existing voice.)

- [ ] **Step 3: Manual verification**

After `./serve 8080`:
- Open `organization/index.html`
- Confirm 5 seeded objectives appear in the new box
- Click `+ Add objective`; add one; confirm it appears in
  the list
- Click `Edit` on an objective; change the name; confirm
  the list updates and the historical project history
  (open any project's history modal later) still shows
  the OLD name for events that predate the edit
- Click `Deprecate`; confirm the objective moves to the
  deprecated section
- Click `Reactivate`; confirm it moves back

- [ ] **Step 4: Commit**

```bash
git add web-app/organization/index.html web-app/organization/index.ts
git commit -m "wire organization Objectives box"
```

### Task 5.2: Wire the project-detail action bar and modals

**Files:**
- Modify: `web-app/projects/detail.html`
- Modify: `web-app/projects/detail.ts`

- [ ] **Step 1: Update the HTML**

Add to `projects/detail.html`:

```html
<div id="project-action-bar"></div>
<div id="project-objectives-section"></div>

<!-- Score modal -->
<div id="score-backdrop"
    class="dialog-backdrop hidden"></div>
<div id="score-dialog"
    class="dialog hidden" aria-hidden="true">
    <div id="score-modal-body"></div>
</div>

<!-- Log measurement modal -->
<div id="measurement-backdrop"
    class="dialog-backdrop hidden"></div>
<div id="measurement-dialog"
    class="dialog hidden" aria-hidden="true">
    <div id="measurement-modal-body"></div>
</div>

<!-- Approve confirmation -->
<div id="approve-backdrop"
    class="dialog-backdrop hidden"></div>
<div id="approve-dialog"
    class="dialog hidden" aria-hidden="true">
    <h3>Confirm approval</h3>
    <p id="approve-message"></p>
    <div class="dialog-actions">
        <button data-action="cancel-approve">Cancel</button>
        <button data-action="confirm-approve"
            class="btn-primary">Approve</button>
    </div>
</div>

<!-- Complete confirmation -->
<div id="complete-backdrop"
    class="dialog-backdrop hidden"></div>
<div id="complete-dialog"
    class="dialog hidden" aria-hidden="true">
    <h3>Confirm completion</h3>
    <p id="complete-message"></p>
    <div class="dialog-actions">
        <button data-action="cancel-complete">Cancel</button>
        <button data-action="confirm-complete"
            class="btn-primary">Complete</button>
    </div>
</div>

<!-- Score history modal -->
<div id="history-backdrop"
    class="dialog-backdrop hidden"></div>
<div id="history-dialog"
    class="dialog hidden" aria-hidden="true">
    <div id="history-modal-body"></div>
</div>
```

- [ ] **Step 2: Update `projects/detail.ts`**

Add imports:

```ts
import {
    postProjectScoringRetrieval,
    postProjectBaselineScoring,
    postProjectActualMeasurement,
} from '../app/adapters/project-scoring.ts';
import {
    postProjectApproval,
    postProjectCompletion,
} from '../app/adapters/project-publish.ts';
import {
    postActiveObjectivesRetrieval,
    postCurrentObjectiveDefinition,
    getDeprecatedObjectiveIds,
    getObjectives,
    getObjectiveRevisions,
} from '../app/adapters/objectives.ts';
import {
    ProjectActionBarPresenter,
    ProjectObjectivesPresenter,
    ScoreModalPresenter,
    MeasurementModalPresenter,
    ProjectScoreHistoryPresenter,
} from '../app/presenters';
import {
    objectiveChanges,
    scoreChanges,
    projectChanges,
} from '../app/changes.ts';
```

Add the orchestration function and click delegation. Code
sample for the main render and a few handler examples:

```ts
async function renderActionBarAndObjectives(): Promise<void> {
    const ctx = createRequestContext();
    const projectId = getProjectIdFromUrl();
    const [project, active, scoring] = await Promise.all([
        ctx.GET('projects/' + projectId),
        postActiveObjectivesRetrieval(ctx),
        postProjectScoringRetrieval(ctx, projectId),
    ]);
    const defs = new Map();
    for (const o of active) {
        defs.set(o.id,
            await postCurrentObjectiveDefinition(ctx, o.id));
    }
    const latestBaselines = latestPerPair(scoring.baseline);
    const latestActuals = latestPerPair(scoring.actual);

    const actionBar = new ProjectActionBarPresenter(
        project, active, latestBaselines, latestActuals);
    setHtml($('#project-action-bar'), actionBar.buildBar());

    const objSection = new ProjectObjectivesPresenter(
        active, defs, latestBaselines, latestActuals);
    setHtml($('#project-objectives-section'),
        objSection.buildSection());
}

scoreChanges.subscribe(renderActionBarAndObjectives);
objectiveChanges.subscribe(renderActionBarAndObjectives);
projectChanges.subscribe(renderActionBarAndObjectives);

await renderActionBarAndObjectives();

// Click delegation
$('#project-action-bar').addEventListener('click',
    async (e) => {
        const action = (e.target as HTMLElement)
            .closest('[data-action]')
            ?.getAttribute('data-action');
        const ctx = createRequestContext();
        const projectId = getProjectIdFromUrl();
        if (action === 'score') {
            await openScoreModal(ctx, projectId);
        } else if (action === 'approve') {
            openApproveConfirmation(projectId);
        } else if (action === 'log-measurement') {
            await openMeasurementModal(ctx, projectId);
        } else if (action === 'complete') {
            openCompleteConfirmation(projectId);
        } else if (action === 'view-history') {
            await openHistoryModal(ctx, projectId);
        }
    });

async function openScoreModal(
    ctx: RequestContext, projectId: string,
): Promise<void> {
    const project = await ctx.GET('projects/' + projectId);
    const active = await postActiveObjectivesRetrieval(ctx);
    const scoring = await postProjectScoringRetrieval(
        ctx, projectId);
    const defs = new Map();
    for (const o of active) {
        defs.set(o.id,
            await postCurrentObjectiveDefinition(ctx, o.id));
    }
    const presenter = new ScoreModalPresenter(
        project, active, defs, scoring.baseline);
    setHtml($('#score-modal-body'), presenter.buildBody());
    openDialog('score');
}

// Save baselines — collect moved sliders only
$('#score-dialog').addEventListener('click', async (e) => {
    const action = (e.target as HTMLElement)
        .closest('[data-action]')
        ?.getAttribute('data-action');
    if (action === 'cancel') {
        closeDialog('score');
    } else if (action === 'save-baselines') {
        const ctx = createRequestContext();
        const projectId = getProjectIdFromUrl();
        const moved: { objectiveId: string;
            score: number }[] = [];
        const rows = document.querySelectorAll(
            '#score-modal-body .score-slider-row');
        rows.forEach(row => {
            const initial = Number(row
                .getAttribute('data-initial-value'));
            const unset = row.getAttribute('data-unset')
                === 'true';
            const objectiveId = row
                .getAttribute('data-objective-id')!;
            const slider = row.querySelector(
                'input[type="range"]') as HTMLInputElement;
            const value = Number(slider.value);
            const touched = (slider as any)
                .dataset.touched === 'true';
            if (value !== initial || (unset && touched)) {
                moved.push({ objectiveId, score: value });
            }
        });
        if (moved.length > 0) {
            await postProjectBaselineScoring(
                ctx, projectId, moved);
        }
        closeDialog('score');
    }
});

// Mark slider touched on input
document.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches(
        '#score-modal-body input[type="range"]')) {
        (t as any).dataset.touched = 'true';
    }
});

// Measurement modal — opens with sliders pre-filled from
// latest actual (or baseline if none).
async function openMeasurementModal(
    ctx: RequestContext, projectId: string,
): Promise<void> {
    const project = await ctx.GET('projects/' + projectId);
    const scoring = await postProjectScoringRetrieval(
        ctx, projectId);
    const defs = new Map();
    const baselineObjIds = new Set(
        latestPerPair(scoring.baseline)
            .map(b => b.objective_id));
    for (const objId of baselineObjIds) {
        defs.set(objId,
            await postCurrentObjectiveDefinition(
                ctx, objId));
    }
    const presenter = new MeasurementModalPresenter(
        project, defs, scoring.baseline, scoring.actual);
    setHtml($('#measurement-modal-body'),
        presenter.buildBody());
    openDialog('measurement');
}

// Save measurement — collect moved sliders only
$('#measurement-dialog').addEventListener('click',
    async (e) => {
        const action = (e.target as HTMLElement)
            .closest('[data-action]')
            ?.getAttribute('data-action');
        if (action === 'cancel') {
            closeDialog('measurement');
        } else if (action === 'save-measurement') {
            const ctx = createRequestContext();
            const projectId = getProjectIdFromUrl();
            const moved: { objectiveId: string;
                score: number }[] = [];
            const rows = document.querySelectorAll(
                '#measurement-modal-body '
                + '.measurement-slider-row');
            rows.forEach(row => {
                const initial = Number(row
                    .getAttribute('data-initial-value'));
                const objectiveId = row
                    .getAttribute('data-objective-id')!;
                const slider = row.querySelector(
                    'input[type="range"]')
                    as HTMLInputElement;
                const value = Number(slider.value);
                if (value !== initial) {
                    moved.push({
                        objectiveId, score: value,
                    });
                }
            });
            if (moved.length > 0) {
                await postProjectActualMeasurement(
                    ctx, projectId, moved);
            }
            closeDialog('measurement');
        }
    });

// Approve confirmation
function openApproveConfirmation(projectId: string): void {
    ($('#approve-message') as HTMLElement).textContent =
        'Approve this project? This action records the '
        + 'baseline scores as final and marks the project '
        + 'as approved.';
    openDialog('approve');
}

$('#approve-dialog').addEventListener('click', async (e) => {
    const action = (e.target as HTMLElement)
        .closest('[data-action]')
        ?.getAttribute('data-action');
    if (action === 'cancel-approve') {
        closeDialog('approve');
    } else if (action === 'confirm-approve') {
        const ctx = createRequestContext();
        const projectId = getProjectIdFromUrl();
        try {
            await postProjectApproval(ctx, projectId);
            closeDialog('approve');
        } catch (err) {
            // Validator threw — show problems
            console.error(err);
            closeDialog('approve');
        }
    }
});

// Complete confirmation
function openCompleteConfirmation(projectId: string): void {
    ($('#complete-message') as HTMLElement).textContent =
        'Mark this project as completed? Every '
        + 'baseline-scored objective must have at least '
        + 'one actual measurement.';
    openDialog('complete');
}

$('#complete-dialog').addEventListener('click',
    async (e) => {
        const action = (e.target as HTMLElement)
            .closest('[data-action]')
            ?.getAttribute('data-action');
        if (action === 'cancel-complete') {
            closeDialog('complete');
        } else if (action === 'confirm-complete') {
            const ctx = createRequestContext();
            const projectId = getProjectIdFromUrl();
            try {
                await postProjectCompletion(
                    ctx, projectId);
                closeDialog('complete');
            } catch (err) {
                console.error(err);
                closeDialog('complete');
            }
        }
    });

// History modal
async function openHistoryModal(
    ctx: RequestContext, projectId: string,
): Promise<void> {
    const scoring = await postProjectScoringRetrieval(
        ctx, projectId);
    const baselineObjIds = new Set(
        scoring.baseline.map(b => b.objective_id));
    for (const a of scoring.actual) {
        baselineObjIds.add(a.objective_id);
    }
    const revisions: ObjectiveRevision[] = [];
    const deprecations: DeprecatedObjective[] = [];
    for (const objId of baselineObjIds) {
        const revs = await getObjectiveRevisions(
            ctx, objId);
        revisions.push(...revs);
        const deprecatedIds =
            await getDeprecatedObjectiveIds(ctx);
        if (deprecatedIds.has(objId)) {
            // Fetch the tombstone row to get deprecated_at
            const t = await ctx.GET(
                'deprecated_objectives/' + objId);
            deprecations.push(t as DeprecatedObjective);
        }
    }
    // Build a closure-style resolver from the fetched revs
    const revsByObj = new Map<string, ObjectiveRevision[]>();
    for (const r of revisions) {
        const arr = revsByObj.get(r.objective_id) ?? [];
        arr.push(r);
        revsByObj.set(r.objective_id, arr);
    }
    const resolver = (objId: string, atTime: string) => {
        const arr = revsByObj.get(objId) ?? [];
        const eligible = arr.filter(
            r => r.revised_at <= atTime);
        if (eligible.length === 0) return undefined;
        eligible.sort((a, b) =>
            b.revised_at.localeCompare(a.revised_at));
        return {
            name: eligible[0].name,
            description: eligible[0].description,
        };
    };
    const presenter = new ProjectScoreHistoryPresenter(
        scoring.baseline, scoring.actual,
        revisions, deprecations, resolver);
    setHtml($('#history-modal-body'),
        presenter.buildBody());
    openDialog('history');
}

// History modal close (no save action)
$('#history-backdrop').addEventListener('click',
    () => closeDialog('history'));
```

- [ ] **Step 3: Manual verification**

After `./serve 8080`:
- Open a `submitted` project's detail page; transition
  status to `under-review` via the existing edit form.
- Click `Score`; confirm modal opens with sliders for all
  active objectives.
- Drag a few sliders; click `Save baselines`; confirm the
  modal closes and the read-only Objectives section now
  shows scored objectives.
- Click `Approve`; confirm the confirmation dialog opens.
- Confirm; project status flips to `approved`.
- Click `Log measurement`; adjust sliders; save; confirm
  the history modal shows the new event.
- Click `Complete`; confirm gated behavior matches the
  validator.

- [ ] **Step 4: Commit**

```bash
git add web-app/projects/detail.html web-app/projects/detail.ts
git commit -m "wire project-detail action bar, modals, and history"
```

### Task 5.3: Wire the projects-list new column

**Files:**
- Modify: `web-app/projects/index.ts`
- Modify: the projects-list presenter (likely
  `web-app/app/presenters/projects-list.ts` or wherever the
  list cells live)

- [ ] **Step 1: Identify the list presenter**

Run:
`grep -l "buildList\\|projects.map" web-app/app/presenters/`

Note the path — call it `<LIST_PRESENTER>`.

- [ ] **Step 2: Write a failing test**

Create `tests/presenter-projects-list-column.test.ts`:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
// Replace the import path with <LIST_PRESENTER>
import { ProjectsListPresenter } from
    '../web-app/app/presenters/projects-list.ts';

test('projected impact column renders for each project',
    () => {
        const projects = [
            { id: 'p1', status: 'under-review', title: 't',
              /* ...minimum required fields... */ },
        ];
        const scoreMap = new Map([
            ['p1', {
                baselineAvg: 47,
                latestActualAvg: undefined,
                baselineCount: 3,
                totalActiveObjectives: 3,
            }],
        ]);
        const p = new ProjectsListPresenter(
            projects, scoreMap);
        const html = p.render().toString();
        assert.ok(html.includes('+47'));
        assert.ok(html.includes('data-sort-key="47"'));
    });
```

- [ ] **Step 3: Run test to verify it fails**

Run:
`node --test --strip-types tests/presenter-projects-list-column.test.ts`

Expected: FAIL — the list presenter doesn't accept a
scoreMap yet.

- [ ] **Step 4: Add the column to the list presenter**

In `<LIST_PRESENTER>`, accept a second constructor arg —
the score map. In the row markup, add a cell:

```ts
function formatSigned(v: number | undefined): string {
    if (v === undefined) return '—';
    if (v > 0) return '+' + v;
    if (v < 0) return '−' + Math.abs(v);
    return '0';
}

// In the row markup:
const score = scoreMap.get(project.id);
const projected = score?.baselineAvg;
const tone = projected === undefined
    ? 'neutral'
    : projected > 0 ? 'positive'
    : projected < 0 ? 'negative' : 'neutral';
const sortKey = projected ?? -9999;
const cell = html`
    <td class="projected-impact-cell"
        data-sort-key="${sortKey}">
        <strong data-tone="${tone}">
            ${formatSigned(projected)}
        </strong>
        ${score
            ? html`<span class="meta">${
                score.baselineCount}/${
                score.totalActiveObjectives}</span>`
            : html``}
    </td>
`;
```

- [ ] **Step 5: Update `web-app/projects/index.ts`**

```ts
import { postProjectsScoreColumn } from
    '../app/adapters/project-scoring.ts';
import { scoreChanges, objectiveChanges } from
    '../app/changes.ts';

async function renderList(): Promise<void> {
    const ctx = createRequestContext();
    const [projects, scoreColumn] = await Promise.all([
        ctx.GET('projects'),
        postProjectsScoreColumn(ctx),
    ]);
    const scoreMap = new Map(
        scoreColumn.map(s => [s.projectId, s]),
    );
    const presenter = new ProjectsListPresenter(
        projects, scoreMap);
    setHtml($('#project-list'), presenter.render());
}

scoreChanges.subscribe(renderList);
objectiveChanges.subscribe(renderList);
projectChanges.subscribe(renderList);

await renderList();
```

- [ ] **Step 6: Run test to verify it passes**

Run:
`node --test --strip-types tests/presenter-projects-list-column.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web-app/projects/index.ts web-app/app/presenters/projects-list.ts tests/presenter-projects-list-column.test.ts
git commit -m "add Projected Impact column to projects list"
```

### Task 5.4: Wire the dashboard

**Files:**
- Modify: `web-app/dashboard/index.html`
- Modify: `web-app/dashboard/index.ts`

- [ ] **Step 1: Update the HTML**

Add to `dashboard/index.html`:

```html
<div id="portfolio-impact-card"></div>
<div id="objective-aggregates-card"></div>
```

- [ ] **Step 2: Update `dashboard/index.ts`**

```ts
import {
    postPortfolioImpactSummary,
    postObjectiveAggregates,
} from '../app/adapters/project-scoring.ts';
import {
    postActiveObjectivesRetrieval,
    postCurrentObjectiveDefinition,
} from '../app/adapters/objectives.ts';
import {
    PortfolioImpactPresenter,
    DashboardObjectiveAggregatesPresenter,
} from '../app/presenters';
import {
    scoreChanges,
    objectiveChanges,
    projectChanges,
} from '../app/changes.ts';

async function renderImpactSurfaces(): Promise<void> {
    const ctx = createRequestContext();
    const [summary, active, aggregates] = await Promise.all([
        postPortfolioImpactSummary(ctx),
        postActiveObjectivesRetrieval(ctx),
        postObjectiveAggregates(ctx),
    ]);
    const defs = new Map();
    for (const o of active) {
        defs.set(o.id,
            await postCurrentObjectiveDefinition(ctx, o.id));
    }

    setHtml($('#portfolio-impact-card'),
        new PortfolioImpactPresenter(summary).render());
    setHtml($('#objective-aggregates-card'),
        new DashboardObjectiveAggregatesPresenter(
            active, defs, aggregates).render());
}

scoreChanges.subscribe(renderImpactSurfaces);
objectiveChanges.subscribe(renderImpactSurfaces);
projectChanges.subscribe(renderImpactSurfaces);

await renderImpactSurfaces();
```

- [ ] **Step 3: Manual verification**

After `./serve 8080`:
- Open `dashboard/index.html`
- Confirm the Portfolio Impact card renders next to the
  existing Time and Cost gauges
- Confirm the per-objective aggregates card renders below
- Edit an approved project's scores via the project-detail
  Log measurement modal; verify the dashboard updates in
  near-real-time (via `scoreChanges` channel)

- [ ] **Step 4: Commit**

```bash
git add web-app/dashboard/index.html web-app/dashboard/index.ts
git commit -m "wire dashboard Portfolio Impact and aggregates cards"
```

---

## Phase 6 — Manual TEST-PLAN.md additions

### Task 6.1: Add Section K to `TEST-PLAN.md`

**Files:**
- Modify: `TEST-PLAN.md`

- [ ] **Step 1: Pick a unique anchor**

Open `TEST-PLAN.md`. Find the end of the current last
section (likely Section J — Teardown). Add Section K
**before** the Teardown section if J is teardown; else
**at the end** of the file.

- [ ] **Step 2: Add Section K**

```markdown
## K. Objectives & Scoring

Owner agents: Agent-G (K1–K8), Agent-E (K9–K23 + K30),
Agent-CH (K27–K29). Mutation domain delta:

- Agent-G adds: `objectives`, `objective_revisions`,
  `deprecated_objectives`
- Agent-E adds: `project_objective_baseline_scores`,
  `project_objective_actual_scores`
- Agent-CH stays read-only

### K1–K8 — Organization Objectives box (Agent-G)

**K1.** Open Organization page; confirm Objectives box
renders below the existing Overview/Usage/Admin cards with
5 seeded active objectives in position order. PASS if all
5 names display.

**K2.** Click `+ Add objective`; confirm modal opens. Enter
name "Test Objective" and description "Test desc"; click
Add. PASS if the new objective appears at the bottom of the
active list.

**K3.** Click `Edit` on an active objective; confirm modal
opens pre-filled. Change the name; click Save. PASS if the
list re-renders with the new name.

**K4.** Click `Deprecate` on an active objective; confirm
dialog opens. Confirm. PASS if the objective moves from
active to the Deprecated sub-section, with strikethrough.

**K5.** Click `Reactivate` on a deprecated objective; PASS
if it returns to the active list.

**K6.** Drag an objective to a new position. PASS if the
new position persists across a page reload.

**K7.** Open an existing project's history modal (created
in K30). PASS if events that predate a K3 edit display the
OLD name, not the new one (temporal name resolution).

**K8.** Empty state: in a separate tab, wipe via Snapshots
page; reload Organization page **before** mock data loads.
PASS if "No objectives yet. Add one to get started." renders.
(Restore via mock data afterward.)

### K9–K18 — Project detail action bar + Score + Approve (Agent-E)

**K9.** Open a `submitted` project; confirm action bar shows
the existing buttons (no Score yet — until status is
under-review).

**K10.** Transition status to `under-review` via the edit
form. PASS if `Score` button appears in the action bar.

**K11.** Click `Approve`; PASS if disabled with tooltip
"N objectives unscored" (matching the count of active
objectives).

**K12.** Click `Score`; PASS if modal opens with one slider
per active objective, all rendering visibly unset with
"Score required" hint.

**K13.** Drag two of the sliders to non-zero values; click
Save baselines. PASS if modal closes and the read-only
Objectives section on the page shows two baseline-scored
rows; Approve button **still** disabled because remaining
objectives unscored.

**K14.** Reopen Score modal; PASS if previously-set sliders
are pre-filled with their values; un-set sliders remain
visibly unset.

**K15.** Drag remaining sliders; save. PASS if Approve
button enables.

**K16.** Click Approve; confirm dialog opens. Confirm. PASS
if project status flips to `approved` and the action bar
re-renders with `Log measurement` / `Complete` / `View
history` buttons.

**K17.** Verify negative-score path: open a different
under-review project; in Score modal, drag one slider to
the far left (-100). Save. PASS if the project history
modal (open via View history later, once approved) shows
the negative score in red.

**K18.** Verify "no-payload" save: open Score modal on a
fully-scored project; don't move any slider; click Save
baselines. PASS if no new event rows are written (verify
via console: `localStorage.getItem(
'fusion-ai:project_objective_baseline_scores')` count
unchanged).

### K19–K23 — Log measurement + Complete (Agent-E)

**K19.** Open an `approved` project; click `Log measurement`;
PASS if modal opens with sliders pre-filled with baseline
values (no prior actuals) and a caption "Baseline: X · Last
actual: none yet."

**K20.** Drag one slider; click Save measurement. PASS if
the modal closes and the read-only Objectives section's
actual column updates for that objective.

**K21.** Click Log measurement again; PASS if the moved
slider now pre-fills with its latest actual value, caption
shows "Last actual: ... (date)."

**K22.** Click Complete on an approved project that lacks
actuals for some objectives; PASS if button is disabled
with tooltip listing missing objectives.

**K23.** Log measurements for every objective; click
Complete; confirm. PASS if status flips to `completed`.

### K24–K26 — Projects list Projected Impact column (Agent-E)

**K24.** Open Projects list; PASS if new column "Projected
Impact" renders for each row. Pre-approval projects with
no scores show "—"; scored projects show signed value.

**K25.** Sort by Projected Impact descending; PASS if rows
re-order accordingly (most-positive first).

**K26.** Filter to `under-review` status + sort by Projected
Impact descending; PASS if the result is the "review queue
ranked by impact" workflow we designed.

### K27–K29 — Dashboard Portfolio Impact + Aggregates (Agent-CH)

**K27.** Open dashboard; PASS if four cards render: Time,
Cost, Portfolio Impact (new bipolar arc), Aggregate
Objectives box (new full-width row below).

**K28.** Inspect the Portfolio Impact gauge. PASS if:
- The arc has muted background visible at all values
- For a net-positive portfolio, value arcs sweep right and
  use green tones
- For a net-negative portfolio, value arcs sweep left and
  use red tones
- The "actual" tick is visually distinct from the baseline
  area (thinner / different opacity)

**K29.** From another tab, log a measurement on an approved
project. PASS if the dashboard cards update within ~1
second (StorageEvent + scoreChanges propagation).

### K30 — Project history modal (Agent-E)

**K30.** Open an approved project's View history modal.
PASS if:
- Events render in chronological order
- Each row shows date, event kind, objective name (as it
  was at the event's moment), and detail
- After an objective rename (K3), historical events still
  display the OLD name; events after the rename show the
  NEW name
- Baseline revisions appear as their own event rows (not
  collapsed)
```

- [ ] **Step 3: Commit**

```bash
git add TEST-PLAN.md
git commit -m "add Section K (Objectives & Scoring) to TEST-PLAN"
```

---

## Phase 7 — Final verification

### Task 7.1: Run the full automated suite

- [ ] **Step 1: Validate**

Run: `./validate`

Expected: type-check passes; **all ~800 automated tests
pass**; lint passes (78-char line width on all touched
`.ts`, `.html`, `.css` files).

If any failure: fix root cause, do NOT loosen the test.
Re-run.

- [ ] **Step 2: Build**

Run: `./build --no-zip /tmp/build-objectives`

Expected: build completes; bundle output in
`/tmp/build-objectives`. No build-time TypeScript errors.

- [ ] **Step 3: Serve and smoke-test**

Run: `TMPDIR=/tmp/claude ./serve 8080`

Open `http://localhost:8080/landing/index.html`. Sign in.
Run the golden-path smoke test from the spec
(docs/superpowers/specs/2026-05-14-objectives-design.md
section "Verification" item 4) end to end.

- [ ] **Step 4: Confirm** the file manifest matches the spec

Run:
`git diff --stat origin/master..HEAD`

Compare against the spec's File Manifest section. Every
file listed there should appear in the diff stat (modified
or new). If a file in the manifest doesn't appear in the
diff, that file's task was missed — go back and complete
it.

- [ ] **Step 5: Final commit (if any clean-up changes)**

```bash
git status
# If anything is dirty, address it:
# - whitespace, unused imports, stale TODO comments
git add -p
git commit -m "polish: ..."
```

---

## Self-review

After completing the plan above, run through this checklist
before declaring done:

**1. Spec coverage:** Walk each section of
`docs/superpowers/specs/2026-05-14-objectives-design.md`
and confirm there's at least one task that implements it.

| Spec section | Plan task(s) |
|---|---|
| Schema — 5 new tables | 1.3 |
| Schema — row types | 1.1 |
| Schema — ProjectEntity changes | 1.2 |
| Schema — derived Project methods | 2.11 |
| Validators — entity validators | 1.4 |
| Validators — assertProject delta | 1.5 |
| Validators — ValidationResult<P> | 2.1 |
| Validators — three sibling validators | 2.9 |
| Adapter — objectives.ts | 2.2, 2.3, 2.4 |
| Adapter — project-scoring.ts | 2.5–2.8 |
| Adapter — project-publish.ts | 2.9 |
| Adapter — projects.ts updates | 2.11 |
| Adapter — dashboard.ts updates | 2.12 |
| Adapter — notification channels | 2.10 |
| Presenters — 8 new | 3.1–3.8 |
| Presenters — existing updates | 3.9 |
| Presenters — barrel | 3.10 |
| CSS — components.css | 4.1 |
| CSS — pages.css | 4.2 |
| Page — organization | 5.1 |
| Page — projects/detail | 5.2 |
| Page — projects/index list column | 5.3 |
| Page — dashboard | 5.4 |
| Mock data | 1.7, 1.8 |
| Migration — SCHEMA_VERSION + bootstrap | 1.6 |
| TEST-PLAN.md additions | 6.1 |
| Verification | 7.1 |

If any spec requirement has no task, ADD the task before
declaring done.

**2. Placeholder scan:** Search the plan for "TODO",
"TBD", "fill in", "similar to", "implement later", "add
appropriate". Should find zero matches except (1) inside
this paragraph and (2) inside the "Out of scope" section
of the spec (which is intentional). If found, replace with
actual content.

**3. Type consistency:** Confirm the same method/function
name renders identically across the tasks where it appears:
- `postProjectScoringRetrieval` (Tasks 2.6, 2.9, 5.2)
- `postProjectBaselineScoring` (Tasks 2.8, 5.2)
- `postProjectActualMeasurement` (Tasks 2.8, 5.2)
- `validateProjectForApproval` (Tasks 2.9, 3.2)
- `validateProjectForCompletion` (Tasks 2.9, 3.2)
- `postActiveObjectivesRetrieval` (Tasks 2.3, 2.9, 5.1,
  5.2, 5.4)
- `postCurrentObjectiveDefinition` (Tasks 2.3, 5.1, 5.2,
  5.4)
- `postObjectiveDefinitionAtTime` (Task 2.3 + used by
  history modal in 5.2)
- `objectiveChanges` / `scoreChanges` / `projectChanges`
  (subscribed in Tasks 5.1–5.4)
- `Project.estimatedImpactScore` etc. (defined 2.11,
  consumed by presenters in 3.x — but presenters take
  pre-fetched score arrays, so the consumption pattern is
  the static helpers `latestPerPair` + `formatSigned`
  defined inside each presenter for locality)

No name drift detected.

**4. Test-failure / passing direction:** Every Step 2
("Run to verify it fails") names a specific failure mode.
Every Step 4 ("Run to verify it passes") names PASS.

---

## Done

When every task above is `- [x]` checked off and the
self-review passes, this plan is complete. The work is then
ready for either:

- A user-driven `./validate && ./build` cycle producing a
  shippable ZIP, OR
- The manual TEST-PLAN.md Phase 1–5 protocol run, with
  Section K cases exercised on top of the existing
  protocol.

Neither is part of this plan itself.
