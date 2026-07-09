import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { POST } from '../api/api.ts';
import { DEV_TOKEN } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { seedCurrentMember } from './member-fixtures.ts';
import { nowUtc } from '../api/types.ts';
import {
    deriveStateFieldValueReferrers,
    stateFieldValuesForStateEvent,
} from '../api/derive-state-field-values.ts';
import { STARK_ORGANIZATION } from
    '../api/mock-data/seed-constants.ts';

// Phase 14 Task 6's own drift suite, re-pinned Phase 15 Task 7:
// state_field_values truth is pair-plane derived. Leaf
// PUT/DELETE routes retired — live writes ride the transition
// fold only. Seed still forms leaf-address pairs via
// formSeedPair (WRITE_RESPONSE_SPECS survives); this suite
// pins the LIVE writer path vs the row plane.

function sortByIdAscending<T extends { id: string }>(
    rows: readonly T[],
): T[] {
    return [...rows].sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const LOCK_TIMEOUT_SECONDS = 300;

function graphJson(): string {
    return JSON.stringify({
        name: 'Flow One',
        lockTimeout: LOCK_TIMEOUT_SECONDS,
        nodes: [], edges: [],
    });
}

async function seededDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    await seedCurrentMember(db);
    await db.workOrders.put('wo1', {
        organization_id: '1', display_id: 'abcd',
        flow_graph: graphJson(), position: 1,
    });
    await db.recordAttributes.put('attr-1', {
        organization_id: '1', record_id: 'rec-1',
        name: 'Severity', attribute_type: 'text',
        sort_order: 0, options: '[]', constraints: '[]',
    });
    return db;
}

test('RESTRICT parity: deriveStateFieldValueReferrers'
+ ' deepEquals the row plane over a live transition fold',
async () => {
    const db = await seededDb();

    // A live transition folds ONE field-value row (fv-1) into
    // its OWN operation pair — no leaf pair of its own.
    await POST(
        db, 'work-orders/wo1/transition', {
            transitionEventId: 'te1',
            targetState: 'n-next',
            fieldValues: [{
                id: 'fv-1',
                fields: {
                    state_event_id: 'te1',
                    attribute_id: 'attr-1',
                    value: 'high',
                },
            }],
            release: null,
            transitionAt: nowUtc(),
        },
        DEV_TOKEN,
    );

    const derived =
        await deriveStateFieldValueReferrers(
            db, STARK_ORGANIZATION, ['attr-1'],
        );
    const old = await db.stateFieldValues
        .getAllWhere('attribute_id', 'attr-1');

    assert.deepEqual(
        sortByIdAscending([...(derived.get('attr-1') ?? [])]),
        sortByIdAscending(old),
    );
    assert.equal(old.length, 1);
    assert.equal(old[0]!.id, 'fv-1');
});

test('GET drift: stateFieldValuesForStateEvent deepEquals the'
+ ' row plane, both sides sorted, over a live transition fold',
async () => {
    const db = await seededDb();
    await POST(
        db, 'work-orders/wo1/transition', {
            transitionEventId: 'te1',
            targetState: 'n-next',
            fieldValues: [{
                id: 'fv-1',
                fields: {
                    state_event_id: 'te1',
                    attribute_id: 'attr-1',
                    value: 'high',
                },
            }],
            release: null,
            transitionAt: nowUtc(),
        },
        DEV_TOKEN,
    );

    const derived =
        await stateFieldValuesForStateEvent(
            db, STARK_ORGANIZATION, 'te1',
        );
    const old = await db.stateFieldValues
        .getAllWhere('state_event_id', 'te1');

    assert.deepEqual(
        sortByIdAscending(derived), sortByIdAscending(old));
    assert.equal(old.length, 1);
});
