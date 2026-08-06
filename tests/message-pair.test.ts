import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryDbAdapter } from '../api/db-memory.ts';
import { sha256Hex } from '../shared/digest.ts';
import {
    formWritePair,
    headPairIdAt,
    storedResponseFor,
    appendMessagePair,
} from '../api/message-pair.ts';

const INPUT = {
    method: 'PUT',
    pathname: '/ideas/42',
    routePattern: 'ideas/:id',
    routeSegments: ['ideas', ':id'],
    pathSegments: ['ideas', '42'],
    headerFields: [],
    body: { title: 'T', at: '2026-01-02T03:04:05.000111Z' },
    requesterIdentityId: 'current',
    requestAt: '2026-01-01T00:00:00.000000Z',
    organization: '1',
    responseStatus: 204,
    responseBody: undefined,
    headPairId: undefined,
} as const;

test('an org-owned pair stores at the org-nested prefix',
async () => {
    const pair = await formWritePair({ ...INPUT });
    assert.equal(
        pair.uriPrefix, '/organizations/1/ideas/',
    );
});

test('a global-plane pair keeps its flat prefix',
async () => {
    const pair = await formWritePair({
        ...INPUT,
        pathname: '/identities/ada/pii',
        routePattern: 'identities/:id/pii',
        routeSegments: ['identities', ':id', 'pii'],
        pathSegments: ['identities', 'ada', 'pii'],
        organization: '1',
    });
    assert.equal(
        pair.uriPrefix, '/identities/ada/pii/',
    );
});

test('flat record-attributes stores under type attributes',
async () => {
    // Task 8 alias window: wire path is flat; storage is
    // nested under the body's record_id type segment.
    const pair = await formWritePair({
        ...INPUT,
        pathname: '/record-attributes/ra1',
        routePattern: 'record-attributes/:id',
        routeSegments: ['record-attributes', ':id'],
        pathSegments: ['record-attributes', 'ra1'],
        body: {
            record_id: 'rec01CustProfRec0rdAB1',
            name: 'Contact Email',
            attribute_type: 'text',
            sort_order: 2,
            options: [],
            constraints: [],
        },
    });
    assert.equal(
        pair.uriPrefix,
        '/organizations/1/record-types/'
        + 'rec01CustProfRec0rdAB1/attributes/',
    );
});

test('wire records stores at the record-types prefix',
async () => {
    // Task 4 alias: flat first segment `records` rewrites
    // to storage name `record-types` before nesting.
    const pair = await formWritePair({
        ...INPUT,
        pathname: '/records/r1',
        routePattern: 'records/:id',
        routeSegments: ['records', ':id'],
        pathSegments: ['records', 'r1'],
    });
    assert.equal(
        pair.uriPrefix,
        '/organizations/1/record-types/',
    );
});

test('a formed pair binds request and response by one id',
async () => {
    const pair = await formWritePair({ ...INPUT });
    assert.equal(
        pair.uriPrefix, '/organizations/1/ideas/',
    );
    assert.equal(pair.uriId, '42');
    assert.equal(
        pair.requestHash,
        await sha256Hex(pair.requestMessage),
    );
    assert.equal(
        pair.responseHash,
        await sha256Hex(pair.responseMessage),
    );
    assert.equal(pair.supersedes, undefined);
});

test('the event at rides the body byte-exact; the arrival '
+ 'stamp passes through verbatim', async () => {
    const pair = await formWritePair({ ...INPUT });
    assert.ok(pair.requestMessage
        .includes('2026-01-02T03:04:05.000111Z'));
    assert.equal(pair.requestAt, INPUT.requestAt);
});

test('a supersedes fold changes the response hash',
async () => {
    const genesis = await formWritePair({ ...INPUT });
    const displaced = await formWritePair(
        { ...INPUT, headPairId: 'prior-pair' },
    );
    assert.equal(displaced.supersedes, 'prior-pair');
    assert.notEqual(
        genesis.responseHash, displaced.responseHash,
    );
});

test('append then head-read round-trips', async () => {
    const db = memoryDbAdapter();
    await db.postSchemaCreation();
    const pair = await formWritePair({ ...INPUT });
    await db.transaction(
        ['requests', 'responses'],
        (view) => appendMessagePair(view, pair),
    );
    assert.equal(
        await headPairIdAt(
            db, '/organizations/1/ideas/', '42',
        ),
        pair.id,
    );
    const stored =
        await storedResponseFor(db, pair.requestHash);
    assert.equal(stored?.id, pair.id);
    // Early request, late response: the request row keeps
    // the arrival stamp verbatim; the response row's `at`
    // (same column name) was minted at append time,
    // strictly after arrival.
    const request = await db.requests.getById(pair.id);
    assert.equal(request.at, INPUT.requestAt);
    assert.ok(request.at < stored!.at);
});

test('a same-hash re-append writes nothing', async () => {
    const db = memoryDbAdapter();
    await db.postSchemaCreation();
    const pair = await formWritePair({ ...INPUT });
    const replay = { ...pair, id: 'other-uuid' };
    await db.transaction(
        ['requests', 'responses'],
        async (view) => {
            await appendMessagePair(view, pair);
            await appendMessagePair(view, replay);
        },
    );
    assert.equal((await db.requests.getAll()).length, 1);
    assert.equal((await db.responses.getAll()).length, 1);
});
