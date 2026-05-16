import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    MemoryDbAdapter,
} from '../api/db-memory.ts';
import {
    createRequestContext,
    type RequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    getIdea,
    postIdeaConversion,
    postIdeaStateChange,
    putIdea,
} from '../web-app/app/adapters/ideas.ts';
import {
    compositeStateForIdea,
    getCurrentIdeaStateFromStates,
    ideaStateToStatusReadiness,
} from '../web-app/app/adapters/state-events.ts';
import { jsonArrayField, jsonObjectField }
    from '../api/types.ts';
import type {
    IdeaEntity,
    IdeaStatus,
    ReadinessLevel,
} from '../api/types.ts';

// Idea state lives in two columns today
// (status, readiness) and on the states log as one
// composite alphabet. Stage 8a's covenant: after
// every status/readiness mutation the column-derived
// composite agrees with the latest event on the log.
// Each scenario below mutates an idea, then asserts
// that agreement.

function buildHumanWorker(name: string) {
    return {
        first_name: name,
        last_name: 'Test',
        email: name.toLowerCase()
            + '@example.com',
        phone: '',
        title: 'product_manager' as const,
        status: 'active' as const,
        strengths: '[]' as never,
        team_dimensions: '{}' as never,
        bio: '',
        department: 'Product',
    };
}

function buildIdea(
    title: string,
    status: IdeaStatus,
    readiness: ReadinessLevel,
): Omit<IdeaEntity, 'id'> {
    return {
        title,
        position: 1,
        status,
        problem_statement: 'p',
        target_users: 't',
        proposed_solution: 's',
        expected_outcome: 'o',
        success_metrics: 'm',
        readiness,
        risks: jsonArrayField([]),
        assumptions: jsonArrayField([]),
        alignments: jsonArrayField([]),
    };
}

async function setupDb(): Promise<{
    db: MemoryDbAdapter;
    ctx: RequestContext;
}> {
    const db = new MemoryDbAdapter();
    await db.workers.put(
        'current', buildHumanWorker('Demo'),
    );
    const ctx = createRequestContext(db);
    return { db, ctx };
}

// RFC-3339 timestamps share millisecond resolution
// at Date.now(); pause guarantees ordering on fast
// machines.
async function pause(ms: number): Promise<void> {
    return new Promise(resolve =>
        setTimeout(resolve, ms),
    );
}

async function seedSubmission(
    db: MemoryDbAdapter,
    ideaId: string,
): Promise<void> {
    await db.ideaSubmissions.put(
        `sub-${ideaId}`,
        {
            idea_id: ideaId,
            worker_id: 'current',
            created_at: '2026-04-01T00:00:00Z',
        },
    );
}

async function assertParity(
    ctx: RequestContext,
    ideaId: string,
    label: string,
): Promise<void> {
    const { entity } = await getIdea(ctx, ideaId);
    const expected = compositeStateForIdea(
        entity.status, entity.readiness,
    );
    const actual =
        await getCurrentIdeaStateFromStates(
            ctx, ideaId,
        );
    assert.equal(
        actual, expected,
        `${label}: column composite "${expected}"`
        + ` must match log state "${actual}"`,
    );
}

test('compositeStateForIdea maps active to '
    + 'three readiness suffixes', () => {
    assert.equal(
        compositeStateForIdea(
            'active', 'incomplete',
        ),
        'active:incomplete',
    );
    assert.equal(
        compositeStateForIdea(
            'active', 'needs-info',
        ),
        'active:needs-info',
    );
    assert.equal(
        compositeStateForIdea(
            'active', 'ready',
        ),
        'active:ready',
    );
});

test('compositeStateForIdea collapses non-active '
    + 'to the status string', () => {
    for (
        const s of [
            'in-review', 'approved', 'promoted',
            'sent-back', 'archived', 'deleted',
        ] as const
    ) {
        assert.equal(
            compositeStateForIdea(s, 'ready'),
            s,
            `non-active status ${s} ignores readiness`,
        );
        assert.equal(
            compositeStateForIdea(s, 'incomplete'),
            s,
            `non-active status ${s} ignores readiness`,
        );
    }
});

test('ideaStateToStatusReadiness splits active '
    + 'composites', () => {
    assert.deepEqual(
        ideaStateToStatusReadiness(
            'active:incomplete',
        ),
        { status: 'active', readiness: 'incomplete' },
    );
    assert.deepEqual(
        ideaStateToStatusReadiness(
            'active:needs-info',
        ),
        { status: 'active', readiness: 'needs-info' },
    );
    assert.deepEqual(
        ideaStateToStatusReadiness('active:ready'),
        { status: 'active', readiness: 'ready' },
    );
});

test('ideaStateToStatusReadiness returns null '
    + 'readiness for non-active statuses', () => {
    for (
        const s of [
            'in-review', 'approved', 'promoted',
            'sent-back', 'archived', 'deleted',
        ] as const
    ) {
        assert.deepEqual(
            ideaStateToStatusReadiness(s),
            { status: s, readiness: null },
        );
    }
});

test('ideaStateToStatusReadiness rejects an '
    + 'unknown composite state', () => {
    assert.throws(
        () => ideaStateToStatusReadiness(
            'active:bogus',
        ),
        /ReadinessLevel/,
    );
    assert.throws(
        () => ideaStateToStatusReadiness('bogus'),
        /IdeaStatus/,
    );
    // Bare 'active' is unreachable because
    // compositeStateForIdea never emits it.
    assert.throws(
        () => ideaStateToStatusReadiness('active'),
        /non-active/,
    );
});

test('postIdeaStateChange writes idea row and '
    + 'state event in one batch', async () => {
    const { db, ctx } = await setupDb();
    const ideaId = 'i1';
    await seedSubmission(db, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        buildIdea('First', 'active', 'incomplete'),
    );
    const events = await db.states.allFor(ideaId);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.state, 'active:incomplete');
    assert.equal(events[0]!.worker_id, 'current');
    await assertParity(ctx, ideaId, 'create');
});

test('idea parity across the full status '
    + 'transition arc', async () => {
    const { db, ctx } = await setupDb();
    const ideaId = 'i-arc';
    await seedSubmission(db, ideaId);

    // 1. Create with default state
    await postIdeaStateChange(
        ctx, ideaId,
        buildIdea('Arc', 'active', 'incomplete'),
    );
    await assertParity(ctx, ideaId, 'after create');
    await pause(2);

    // 2. Move readiness within active
    const r1 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r1.entity, readiness: 'needs-info' },
    );
    await assertParity(
        ctx, ideaId, 'after needs-info',
    );
    await pause(2);

    // 3. Bump readiness to ready
    const r2 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r2.entity, readiness: 'ready' },
    );
    await assertParity(
        ctx, ideaId, 'after ready',
    );
    await pause(2);

    // 4. Submit for review
    const r3 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r3.entity, status: 'in-review' },
    );
    await assertParity(
        ctx, ideaId, 'after in-review',
    );
    await pause(2);

    // 5. Send back to active
    const r4 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r4.entity, status: 'sent-back' },
    );
    await assertParity(
        ctx, ideaId, 'after sent-back',
    );
    await pause(2);

    // 6. Re-submit
    const r5 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r5.entity, status: 'in-review' },
    );
    await assertParity(
        ctx, ideaId, 'after re-submit',
    );
    await pause(2);

    // 7. Approve
    const r6 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r6.entity, status: 'approved' },
    );
    await assertParity(
        ctx, ideaId, 'after approved',
    );

    // Final log shape: every mutation produced one
    // event; the latest matches the column.
    const events = await db.states.allFor(ideaId);
    assert.equal(events.length, 7);
    assert.equal(
        events[events.length - 1]!.state,
        'approved',
    );
});

test('idea parity after archiving an active '
    + 'idea', async () => {
    const { db, ctx } = await setupDb();
    const ideaId = 'i-arch';
    await seedSubmission(db, ideaId);

    await postIdeaStateChange(
        ctx, ideaId,
        buildIdea('Arch', 'active', 'ready'),
    );
    await assertParity(
        ctx, ideaId, 'before archive',
    );
    await pause(2);

    const cur = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...cur.entity, status: 'archived' },
    );
    await assertParity(
        ctx, ideaId, 'after archive',
    );
    const latest =
        await getCurrentIdeaStateFromStates(
            ctx, ideaId,
        );
    assert.equal(latest, 'archived');
});

test('idea parity after archiving a previously '
    + 'approved idea', async () => {
    const { db, ctx } = await setupDb();
    const ideaId = 'i-app-arch';
    await seedSubmission(db, ideaId);

    await postIdeaStateChange(
        ctx, ideaId,
        buildIdea(
            'AppArch', 'active', 'ready',
        ),
    );
    await pause(2);
    const r1 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r1.entity, status: 'approved' },
    );
    await pause(2);
    const r2 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r2.entity, status: 'archived' },
    );
    await assertParity(
        ctx, ideaId, 'after approved then archived',
    );
});

// The 'deleted' status is part of the IdeaStatus
// union and the composite alphabet, though no
// production UI writes it today. Once a state event
// of 'deleted' lands, the EntityStore filters the
// idea from getIdea — same behavior as ai-worker
// deletion. We assert parity at the wire-level
// against db.states directly because the post-delete
// row is hidden from the visible adapter surface.
test('idea parity after status=deleted',
    async () => {
        const { db, ctx } = await setupDb();
        const ideaId = 'i-del';
        await seedSubmission(db, ideaId);

        await postIdeaStateChange(
            ctx, ideaId,
            buildIdea(
                'Del', 'active', 'incomplete',
            ),
        );
        await pause(2);
        const cur = await getIdea(ctx, ideaId);
        await postIdeaStateChange(
            ctx, ideaId,
            { ...cur.entity, status: 'deleted' },
        );
        // getIdea now filters the row (Stage 7's
        // tombstone-via-state-event behavior).
        await assert.rejects(
            () => getIdea(ctx, ideaId),
            /not found|EntityNotFound/i,
        );
        // The state log records the deletion; the
        // composite agrees with the persisted column.
        const events = await db.states.allFor(ideaId);
        const latest = events[events.length - 1]!;
        assert.equal(latest.state, 'deleted');
        assert.equal(
            ideaStateToStatusReadiness(latest.state)
                .status,
            'deleted',
        );
    });

test('idea parity holds across conversion to '
    + 'project', async () => {
    const { db, ctx } = await setupDb();
    const ideaId = 'i-conv';
    await seedSubmission(db, ideaId);

    await postIdeaStateChange(
        ctx, ideaId,
        buildIdea('Conv', 'active', 'ready'),
    );
    await pause(2);
    const r1 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...r1.entity, status: 'approved' },
    );
    await pause(2);

    const approved = await getIdea(ctx, ideaId);
    await postIdeaConversion(
        ctx,
        ideaId,
        'p1',
        {
            title: 'Conv Project',
            description: 'd',
            status: 'submitted',
            progress: 0,
            start_date: '2026-05-15',
            target_end_date: '2026-06-15',
            estimated_duration: 0,
            actual_duration: 0,
            estimated_cost: 0,
            actual_cost: 0,
            position: 0,
            business_context: jsonObjectField({}),
            timeline_label: '',
        },
        { ...approved.entity, status: 'promoted' },
    );
    await assertParity(
        ctx, ideaId, 'after conversion',
    );
    const latest =
        await getCurrentIdeaStateFromStates(
            ctx, ideaId,
        );
    assert.equal(latest, 'promoted');
});

test('putIdea (edit save without status change) '
    + 'leaves prior composite intact', async () => {
    const { db, ctx } = await setupDb();
    const ideaId = 'i-edit';
    await seedSubmission(db, ideaId);

    await postIdeaStateChange(
        ctx, ideaId,
        buildIdea(
            'EditMe', 'active', 'incomplete',
        ),
    );
    await pause(2);

    // Simulate a pure edit save: re-PUT the row
    // with new copy but no status/readiness change.
    const cur = await getIdea(ctx, ideaId);
    await putIdea(
        ctx, ideaId,
        { ...cur.entity, title: 'Edited Title' },
    );
    const events = await db.states.allFor(ideaId);
    // Pure edit did NOT emit a new event.
    assert.equal(events.length, 1);
    await assertParity(
        ctx, ideaId, 'after pure edit',
    );
});

test('mixed sequence: create, edit, submit, send '
    + 'back, approve preserves parity', async () => {
    const { db, ctx } = await setupDb();
    const ideaId = 'i-mixed';
    await seedSubmission(db, ideaId);

    await postIdeaStateChange(
        ctx, ideaId,
        buildIdea(
            'Mixed', 'active', 'incomplete',
        ),
    );
    await assertParity(
        ctx, ideaId, 'after create',
    );
    await pause(2);

    // Pure edit — no event written, parity holds.
    const e1 = await getIdea(ctx, ideaId);
    await putIdea(
        ctx, ideaId,
        { ...e1.entity, title: 'Mixed v2' },
    );
    await assertParity(
        ctx, ideaId, 'after edit',
    );
    await pause(2);

    // Readiness bump
    const e2 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...e2.entity, readiness: 'ready' },
    );
    await assertParity(
        ctx, ideaId, 'after ready',
    );
    await pause(2);

    // Submit
    const e3 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...e3.entity, status: 'in-review' },
    );
    await assertParity(
        ctx, ideaId, 'after in-review',
    );
    await pause(2);

    // Send back
    const e4 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...e4.entity, status: 'sent-back' },
    );
    await assertParity(
        ctx, ideaId, 'after sent-back',
    );
    await pause(2);

    // Approve
    const e5 = await getIdea(ctx, ideaId);
    await postIdeaStateChange(
        ctx, ideaId,
        { ...e5.entity, status: 'approved' },
    );
    await assertParity(
        ctx, ideaId, 'after approved',
    );

    // Event count = state-changing mutations only;
    // the pure edit was not counted.
    const events = await db.states.allFor(ideaId);
    assert.equal(events.length, 5);
});
