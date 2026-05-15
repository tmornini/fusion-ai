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
