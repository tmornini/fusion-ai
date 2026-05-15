import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { createRequestContext } from
    '../web-app/app/adapters/shared.ts';
import {
    getBaselineScoresForProject,
    getActualScoresForProject,
    getProjectScoring,
} from '../web-app/app/adapters/project-scoring.ts';

test('getBaselineScoresForProject returns project rows',
    async () => {
        const db = new MemoryDbAdapter();
        await db.projectObjectiveBaselineScores.put(
            'p1:o1:t1',
            {
                project_id: 'p1', objective_id: 'o1',
                score: 50,
                scored_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.projectObjectiveBaselineScores.put(
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
        assert.equal(rows[0]!.score, 50);
    });

test('getActualScoresForProject returns project rows',
    async () => {
        const db = new MemoryDbAdapter();
        await db.projectObjectiveActualScores.put(
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
        assert.equal(rows[0]!.score, 33);
    });

test('getProjectScoring returns both lists',
    async () => {
        const db = new MemoryDbAdapter();
        await db.projectObjectiveBaselineScores.put(
            'p1:o1:t1',
            {
                project_id: 'p1', objective_id: 'o1',
                score: 50,
                scored_at: '2026-05-14T00:00:00.000Z',
            },
        );
        await db.projectObjectiveActualScores.put(
            'p1:o1:t2',
            {
                project_id: 'p1', objective_id: 'o1',
                score: 33,
                scored_at: '2026-05-15T00:00:00.000Z',
            },
        );
        const ctx = createRequestContext(db);
        const r = await getProjectScoring(ctx, 'p1');
        assert.equal(r.baseline.length, 1);
        assert.equal(r.actual.length, 1);
        assert.equal(r.baseline[0]!.score, 50);
        assert.equal(r.actual[0]!.score, 33);
    });
