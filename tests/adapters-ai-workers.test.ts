import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    MemoryDbAdapter,
} from '../api/db-memory.ts';
import {
    createRequestContext,
} from '../web-app/app/adapters/shared.ts';
import {
    postAIWorkerStateChange,
} from '../web-app/app/adapters/ai-workers.ts';
import type {
    AIWorkerEntity,
} from '../api/types.ts';

function buildAIWorker(
    name: string,
): Omit<AIWorkerEntity, 'id'> {
    return {
        name,
        provider: 'Anthropic',
        description: '',
        auth_token: 'sk-test-PLACEHOLDER',
    };
}

async function seedCurrentWorker(
    db: MemoryDbAdapter,
): Promise<void> {
    await db.workers.put('current', {
        first_name: 'Demo',
        last_name: 'User',
        email: 'demo@example.com',
        title: 'Engineer',
        department: 'Product',
        strengths: '[]' as const,
        team_dimensions: '{}' as const,
        phone: '',
        bio: '',
    });
    await db.states.record(
        'st-current', 'current', 'active', 'system',
    );
}

test(
    'postAIWorkerStateChange records a state event'
    + ' without touching the AI worker row',
    async () => {
        const db = new MemoryDbAdapter();
        await db.createSchema();
        await seedCurrentWorker(db);
        await db.aiWorkers.put(
            'ai1', buildAIWorker('Claude'),
        );
        await db.states.record(
            'st-ai1', 'ai1', 'active', 'system',
        );
        const before =
            await db.aiWorkers.getById('ai1');
        const ctx = createRequestContext(db);

        await postAIWorkerStateChange(
            ctx, 'ai1', 'archived',
        );

        const after =
            await db.aiWorkers.getById('ai1');
        assert.deepEqual(after, before);
        const events = await db.states.allFor('ai1');
        assert.equal(events.length, 2);
        assert.equal(
            events.at(-1)?.state, 'archived',
        );
    },
);
