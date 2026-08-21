import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { memoryDbAdapter } from
    '../api/db-memory.ts';
import { MESSAGE_TABLES } from '../api/db.ts';

const HASH = 'a'.repeat(64);
const VERSION = 'e'.repeat(64);
const OP = '0123456789ABCDEFGHIJKL';
const AT_REQ = '2026-01-01T00:00:00.000000Z';
const AT_RES = '2026-01-01T00:00:00.000001Z';
const COLL = '/organizations/1/ideas/';

test('pairs.put writes both halves; getById zips',
async () => {
    const db = memoryDbAdapter();
    await db.postSchemaCreation();
    await db.transaction(
        MESSAGE_TABLES,
        async (view) => {
            await view.pairs.put('pair-1', {
                uri_collection: COLL,
                uri_id: '42',
                requester_identity_id: 'current',
                method: 'PUT',
                request_at: AT_REQ,
                request_hash: HASH,
                request: 'REQ',
                response_at: AT_RES,
                version: VERSION,
                response: 'RES',
                operation_id: OP,
            });
        },
    );
    const pair = await db.pairs.getById('pair-1');
    assert.equal(pair.method, 'PUT');
    assert.equal(pair.request_at, AT_REQ);
    assert.equal(pair.response_at, AT_RES);
    assert.equal(pair.request, 'REQ');
    assert.equal(pair.response, 'RES');
    const requests = await db.requests.getAll();
    const responses = await db.responses.getAll();
    assert.equal(requests.length, 1);
    assert.equal(responses.length, 1);
    assert.equal(requests[0]!.at, AT_REQ);
    assert.equal(responses[0]!.at, AT_RES);
});

test('pairs.getAll skips an unmatched response',
async () => {
    const db = memoryDbAdapter();
    await db.postSchemaCreation();
    await db.responses.put('orphan', {
        uri_collection: COLL,
        uri_id: '1',
        at: AT_RES,
        version: VERSION,
        message: 'RES',
        operation_id: OP,
    });
    const pairs = await db.pairs.getAll();
    assert.equal(pairs.length, 0);
});

test('pairs.getAllWhere request_hash maps the hash',
async () => {
    const db = memoryDbAdapter();
    await db.postSchemaCreation();
    await db.transaction(
        MESSAGE_TABLES,
        async (view) => {
            await view.pairs.put('pair-1', {
                uri_collection: COLL,
                uri_id: '42',
                requester_identity_id: 'current',
                method: 'PUT',
                request_at: AT_REQ,
                request_hash: HASH,
                request: 'REQ',
                response_at: AT_RES,
                version: VERSION,
                response: 'RES',
                operation_id: OP,
            });
        },
    );
    const hits = await db.pairs.getAllWhere(
        'request_hash', HASH,
    );
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.id, 'pair-1');
});
