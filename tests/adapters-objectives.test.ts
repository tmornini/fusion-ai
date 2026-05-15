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
    getActiveObjectives,
    getCurrentObjectiveDefinition,
    getObjectiveDefinitionAt,
} from '../web-app/app/adapters/objectives.ts';

function ctxFor(db: MemoryDbAdapter) {
    return createRequestContext(db);
}

test('getObjective returns a single row', async () => {
    const db = new MemoryDbAdapter();
    await db.objectives.put('o1', { position: 0 });
    const ctx = ctxFor(db);
    const v = await getObjective(ctx, 'o1');
    assert.equal(v.id, 'o1');
    assert.equal(v.position, 0);
});

test('getObjectives returns all', async () => {
    const db = new MemoryDbAdapter();
    await db.objectives.put('o1', { position: 0 });
    await db.objectives.put('o2', { position: 1 });
    const ctx = ctxFor(db);
    const rows = await getObjectives(ctx);
    assert.equal(rows.length, 2);
});

test('getDeprecatedObjectiveIds returns a Set', async () => {
    const db = new MemoryDbAdapter();
    await db.deprecatedObjectives.put('o1', {
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
        await db.objectiveRevisions.put(
            'o1:2026-05-14T00:00:00.000Z',
            {
                objective_id: 'o1',
                name: 'Revenue',
                description: 'd',
                revised_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.objectiveRevisions.put(
            'o1:2026-05-15T00:00:00.000Z',
            {
                objective_id: 'o1',
                name: 'Revenue Growth',
                description: 'd2',
                revised_at: '2026-05-15T00:00:00.000Z',
            },
        );
        await db.objectiveRevisions.put(
            'o2:2026-05-14T00:00:00.000Z',
            {
                objective_id: 'o2',
                name: 'Cost',
                description: 'd',
                revised_at: '2026-05-14T00:00:00.000Z',
            },
        );
        const ctx = ctxFor(db);
        const revs = await getObjectiveRevisions(ctx, 'o1');
        assert.equal(revs.length, 2);
        for (const r of revs) {
            assert.equal(r.objective_id, 'o1');
        }
    });

test('getActiveObjectives filters deprecated',
    async () => {
        const db = new MemoryDbAdapter();
        await db.objectives.put('o1', { position: 0 });
        await db.objectives.put('o2', { position: 1 });
        await db.deprecatedObjectives.put('o2', {
            objective_id: 'o2',
            deprecated_at: '2026-05-14T00:00:00.000Z',
        });
        const ctx = ctxFor(db);
        const active = await getActiveObjectives(ctx);
        assert.equal(active.length, 1);
        assert.equal(active[0]!.id, 'o1');
    });

test('getCurrentObjectiveDefinition returns latest revision',
    async () => {
        const db = new MemoryDbAdapter();
        await db.objectiveRevisions.put(
            'o1:2026-05-14T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'Old',
                description: 'd1',
                revised_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.objectiveRevisions.put(
            'o1:2026-05-15T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'New',
                description: 'd2',
                revised_at: '2026-05-15T00:00:00.000Z',
            },
        );
        const ctx = ctxFor(db);
        const def = await getCurrentObjectiveDefinition(
            ctx, 'o1',
        );
        assert.equal(def.name, 'New');
        assert.equal(def.description, 'd2');
    });

test('getObjectiveDefinitionAt returns historical name',
    async () => {
        const db = new MemoryDbAdapter();
        await db.objectiveRevisions.put(
            'o1:2026-05-14T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'Old',
                description: 'd1',
                revised_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.objectiveRevisions.put(
            'o1:2026-05-15T00:00:00.000Z',
            {
                objective_id: 'o1', name: 'New',
                description: 'd2',
                revised_at: '2026-05-15T00:00:00.000Z',
            },
        );
        const ctx = ctxFor(db);
        const histDef = await getObjectiveDefinitionAt(
            ctx, 'o1', '2026-05-14T12:00:00.000Z',
        );
        assert.equal(histDef.name, 'Old');
    });
