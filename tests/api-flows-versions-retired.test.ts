import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../api/api.ts';
import { memoryDbAdapter } from '../api/db-memory.ts';
import { organizationToken } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import {
    apiRequest, TEST_OPERATION_ID,
} from './http-fixtures.ts';

const BASE = 'http://localhost';

function req(
    method: string,
    path: string,
    token: string,
): Request {
    return apiRequest({
        method,
        path,
        token,
        operationId: TEST_OPERATION_ID,
    });
}

test('retired table-backed flow versions 404',
async () => {
    const db = memoryDbAdapter();
    await seedAdminSchema(db);
    const token = await organizationToken();
    const paths = [
        '/flows/flow-1/versions',
        '/flows/flow-1/versions/vid-1',
    ];
    const verbs = ['GET', 'POST', 'PUT', 'DELETE'];
    for (const path of paths) {
        for (const method of verbs) {
            const res = await handleRequest(
                db, req(method, path, token),
            );
            assert.equal(
                res.status, 404,
                method + ' ' + path,
            );
        }
    }
});
