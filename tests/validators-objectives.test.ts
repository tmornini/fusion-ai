import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    validateObjectiveEntity,
    validateObjectiveRevisionEntity,
    validateDeprecatedObjectiveEntity,
    validateBaselineScoreEntity,
    validateActualScoreEntity,
} from '../api/validators.ts';

test('validateObjectiveEntity accepts valid', () => {
    const v = validateObjectiveEntity({ position: 0 });
    assert.equal(v.position, 0);
});

test('validateObjectiveEntity rejects non-integer position',
    () => {
        assert.throws(
            () => validateObjectiveEntity({ position: 1.5 }),
        );
    });

test('validateObjectiveEntity rejects negative position',
    () => {
        assert.throws(
            () => validateObjectiveEntity({ position: -1 }),
        );
    });

test('validateObjectiveRevisionEntity accepts valid', () => {
    const v = validateObjectiveRevisionEntity({
        objective_id: 'o1',
        name: 'Revenue',
        description: 'Top line',
        revised_at: '2026-05-14T00:00:00.000Z',
    });
    assert.equal(v.name, 'Revenue');
});

test('validateObjectiveRevisionEntity rejects empty name',
    () => {
        assert.throws(
            () => validateObjectiveRevisionEntity({
                objective_id: 'o1',
                name: '',
                description: 'd',
                revised_at: '2026-05-14T00:00:00.000Z',
            }),
        );
    });

test('validateDeprecatedObjectiveEntity accepts valid', () => {
    const v = validateDeprecatedObjectiveEntity({
        objective_id: 'o1',
        deprecated_at: '2026-05-14T00:00:00.000Z',
    });
    assert.equal(v.objective_id, 'o1');
});

test('validateBaselineScoreEntity accepts 0', () => {
    const v = validateBaselineScoreEntity({
        project_id: 'p1',
        objective_id: 'o1',
        score: 0,
        scored_at: '2026-05-14T00:00:00.000Z',
    });
    assert.equal(v.score, 0);
});

test('validateBaselineScoreEntity accepts -100 and +100',
    () => {
        assert.equal(
            validateBaselineScoreEntity({
                project_id: 'p1', objective_id: 'o1',
                score: -100,
                scored_at: '2026-05-14T00:00:00.000Z',
            }).score,
            -100,
        );
        assert.equal(
            validateBaselineScoreEntity({
                project_id: 'p1', objective_id: 'o1',
                score: 100,
                scored_at: '2026-05-14T00:00:00.000Z',
            }).score,
            100,
        );
    });

test('validateBaselineScoreEntity rejects out-of-range',
    () => {
        assert.throws(() => validateBaselineScoreEntity({
            project_id: 'p1', objective_id: 'o1',
            score: 101,
            scored_at: '2026-05-14T00:00:00.000Z',
        }));
        assert.throws(() => validateBaselineScoreEntity({
            project_id: 'p1', objective_id: 'o1',
            score: -101,
            scored_at: '2026-05-14T00:00:00.000Z',
        }));
    });

test('validateBaselineScoreEntity rejects non-integer',
    () => {
        assert.throws(() => validateBaselineScoreEntity({
            project_id: 'p1', objective_id: 'o1',
            score: 12.5,
            scored_at: '2026-05-14T00:00:00.000Z',
        }));
    });

test('validateActualScoreEntity has same rules as baseline',
    () => {
        const v = validateActualScoreEntity({
            project_id: 'p1', objective_id: 'o1',
            score: -50,
            scored_at: '2026-05-14T00:00:00.000Z',
        });
        assert.equal(v.score, -50);
        assert.throws(() => validateActualScoreEntity({
            project_id: 'p1', objective_id: 'o1',
            score: 200,
            scored_at: '2026-05-14T00:00:00.000Z',
        }));
    });
