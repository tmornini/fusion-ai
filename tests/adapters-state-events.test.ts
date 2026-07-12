import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { memoryDbAdapter } from '../api/db-memory.ts';
import {
    createRequestContext,
} from '../web-app/app/adapters/shared.ts';
import { devToken } from './token-fixtures.ts';
import {
    getRecordStateDetails,
    getMemberStateDetails,
} from '../web-app/app/adapters/state-events.ts';
import {
    seedAIMember,
    seedHumanMember,
} from './member-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import type {
    IdeaEntity, RecordEntity,
} from '../api/types.ts';

function ideaBody(title: string): Omit<IdeaEntity, 'id'> {
    return {
        organization_id: '1',
        title,
        position: 1,
        problem_statement: 'p',
        target_users: 't',
        proposed_solution: 's',
        expected_outcome: 'o',
        success_metrics: 'm',
    };
}

function recordBody(
    name: string,
): Omit<
    RecordEntity,
    'id' | 'state' | 'state_at' | 'state_event_id'
> {
    return {
        organization_id: '1',
        name,
        description: 'd',
        position: 1,
    };
}

// The states log is shared across entity types and the
// alphabets overlap, so each remaining get*StateDetails
// must discriminate by entity identity, not by state
// value. Lifecycle writes ride document trios. Bare
// getIdeaStates/getProjectStates retired — consumers
// read the GET row trio; cross-family exclusion is free.

test('getRecordStateDetails excludes a same-valued idea',
    async () => {
        const db = memoryDbAdapter();
        await seedAdminSchema(db);
        const ctx = createRequestContext(db, await devToken());
        const { organization_id: _organizationId, ...r1Fields } =
            recordBody('R');
        await ctx.PUT('records/r1', {
            ...r1Fields,
            state: 'active',
            state_at: '2026-01-01T00:00:00.000000Z',
            state_event_id: 'ev-r1',
        });
        const { organization_id: _ideaOrganizationId, ...i1Fields } =
            ideaBody('I');
        await ctx.PUT('ideas/i1', {
            ...i1Fields,
            state: 'archived',
            state_at: '2026-01-01T00:00:01.000000Z',
            state_event_id: 'ev-i1',
        });
        const states = await getRecordStateDetails(ctx);
        assert.equal(states.get('r1')?.state, 'active');
        assert.ok(
            !states.has('i1'),
            'idea must not leak into record states',
        );
    });

test('getMemberStateDetails spans kinds and excludes an idea',
    async () => {
        const db = memoryDbAdapter();
        await seedAdminSchema(db);
        await seedHumanMember(db, 'wh', 'Human');
        await seedAIMember(db, 'wa', 'Ai');
        const ctx = createRequestContext(db, await devToken());
        const { organization_id: _ideaOrganizationId, ...i1Fields } =
            ideaBody('I');
        await ctx.PUT('ideas/i1', {
            ...i1Fields,
            state: 'active',
            state_at: '2026-01-01T00:00:00.000000Z',
            state_event_id: 'ev-i1',
        });
        const states = await getMemberStateDetails(ctx);
        assert.equal(states.get('wh')?.state, 'active');
        assert.equal(states.get('wa')?.state, 'active');
        assert.ok(
            !states.has('i1'),
            'idea must not leak into member states',
        );
    });
