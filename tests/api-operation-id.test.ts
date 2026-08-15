import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { handleRequest } from '../api/api.ts';
import { memoryDbAdapter } from '../api/db-memory.ts';
import { DEV_TOKEN } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import {
    apiRequest, TEST_OPERATION_ID,
} from './http-fixtures.ts';

const validIdea = {
    title: 'Op id pin',
    position: 1,
    problem_statement: 'p',
    target_users: 't',
    proposed_solution: 's',
    expected_outcome: 'o',
    success_metrics: 'm',
    state: 'active',
    state_at: '2026-01-01T00:00:00.000000Z',
    state_event_id: 'ev-opid',
};

test('public PUT without Operation-ID is 400',
async () => {
    const db = memoryDbAdapter();
    await seedAdminSchema(db);
    const res = await handleRequest(
        db,
        new Request('http://localhost/ideas/i1', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + DEV_TOKEN,
            },
            body: JSON.stringify(validIdea),
        }),
    );
    assert.equal(res.status, 400);
});

test('public PUT with a short Operation-ID is 400',
async () => {
    const db = memoryDbAdapter();
    await seedAdminSchema(db);
    const res = await handleRequest(
        db,
        apiRequest({
            method: 'PUT',
            path: '/ideas/i2',
            token: DEV_TOKEN,
            body: validIdea,
            operationId: 'too-short',
        }),
    );
    assert.equal(res.status, 400);
});

test('GET without Operation-ID is not 400',
async () => {
    const db = memoryDbAdapter();
    await seedAdminSchema(db);
    const res = await handleRequest(
        db,
        new Request('http://localhost/ideas', {
            headers: {
                Authorization: 'Bearer ' + DEV_TOKEN,
            },
        }),
    );
    assert.notEqual(res.status, 400);
});

test('public PUT with Operation-ID stores both columns',
async () => {
    const db = memoryDbAdapter();
    await seedAdminSchema(db);
    const res = await handleRequest(
        db,
        apiRequest({
            method: 'PUT',
            path: '/ideas/i3',
            token: DEV_TOKEN,
            body: validIdea,
            operationId: TEST_OPERATION_ID,
        }),
    );
    assert.equal(res.status, 200);
    assert.equal(
        res.headers.get('Operation-ID'),
        TEST_OPERATION_ID,
    );
    const rows = await db.requests.getAll();
    const written = rows.find((r) => r.uri_id === 'i3');
    assert.ok(written);
    assert.equal(written.method, 'PUT');
    assert.equal(written.operation_id, TEST_OPERATION_ID);
});
