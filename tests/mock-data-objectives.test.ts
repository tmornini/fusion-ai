import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { populateMockData } from '../api/mock-data.ts';
import {
    validateObjectiveEntity,
    validateObjectiveRevisionEntity,
} from '../api/validators.ts';

test('populateMockData seeds 5 objectives', async () => {
    const db = new MemoryDbAdapter();
    await populateMockData(db);
    const rows = await db.objectives.getAll();
    assert.equal(rows.length, 5);
    for (const r of rows) {
        const { id: _id, ...body } = r;
        validateObjectiveEntity(body);
    }
});

test('populateMockData seeds one revision per objective',
    async () => {
        const db = new MemoryDbAdapter();
        await populateMockData(db);
        const revs =
            await db.objectiveRevisions.getAll();
        assert.equal(revs.length, 5);
        for (const r of revs) {
            const { id: _id, ...body } = r;
            validateObjectiveRevisionEntity(body);
        }
        const objs = await db.objectives.getAll();
        const objIds = new Set(objs.map(o => o.id));
        const revObjIds = new Set(
            revs.map(r => r.objective_id),
        );
        assert.deepEqual(revObjIds, objIds);
    });

test('populateMockData seeds zero deprecated objectives',
    async () => {
        const db = new MemoryDbAdapter();
        await populateMockData(db);
        const rows =
            await db.deprecatedObjectives.getAll();
        assert.equal(rows.length, 0);
    });
