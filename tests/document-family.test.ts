import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { UniqueConstraintError } from '../api/db.ts';
import type { DbAdapter } from '../api/db.ts';
import type { Id } from '../api/types.ts';
import { handleRequest } from '../api/api.ts';
import {
    formWritePair,
    appendMessagePair,
    IF_RESPONSE_ID_HEADER,
} from '../api/message-pair.ts';
import type { MessagePair } from '../api/message-pair.ts';
import {
    routes,
    WRITE_RESPONSE_SPECS,
    type WriteResponseSpec,
} from '../api/routes.ts';
import {
    PAIR_WIRED_ROUTE_PATTERNS,
    DOCUMENT_CLASS_ROUTE_PATTERNS,
} from '../api/message-pair.ts';
import {
    FAMILY_REGISTRY,
    type FamilyRegistration,
} from '../api/family-registry.ts';
import {
    documentFamilyWiring,
    documentEntityRoute,
    documentWriteResponseSpec,
    DOCUMENT_FAMILY_WIRINGS,
    type DocumentFamilyWiring,
} from '../api/document-family.ts';
import { deriveIdea } from '../api/derive-ideas.ts';
import { organizationToken } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';

const BASE = 'http://localhost';
const AT = '2026-01-01T00:00:00.000000Z';

function req(
    method: string,
    path: string,
    token: string,
    body?: unknown,
    headers?: Record<string, string>,
): Request {
    return new Request(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            ...headers,
        },
        ...(body === undefined
            ? {} : { body: JSON.stringify(body) }),
    });
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

// -- (a) documentWriteResponseSpec reproduces the ideas/
// projects successBody outputs byte-for-byte. --------------

test('documentWriteResponseSpec reproduces the ideas'
+ ' successBody byte-for-byte', () => {
    const wiring = documentFamilyWiring('ideas')!;
    const body = {
        title: 'T', position: 1, problem_statement: 'p',
        target_users: 't', proposed_solution: 's',
        expected_outcome: 'o', success_metrics: 'm',
        state: 'active', state_at: AT, state_event_id: 'ev-1',
    };
    const params = ['idea-1'];
    const legacy = WRITE_RESPONSE_SPECS['ideas/:id'] as
        WriteResponseSpec;
    const expected = legacy.successBody!(
        params, body, 'current', '1',
    );
    const actual = documentWriteResponseSpec(wiring)
        .successBody!(params, body, 'current', '1');
    assert.deepEqual(actual, expected);
});

test('documentWriteResponseSpec reproduces the projects'
+ ' successBody byte-for-byte', () => {
    const wiring = documentFamilyWiring('projects')!;
    const body = {
        title: 'T', description: 'd', progress: 5,
        start_date: '2026-01-01', target_end_date: '2026-02-01',
        estimated_cost: 100, actual_cost: 50, position: 1,
        state: 'submitted', state_at: AT, state_event_id: 'ev-1',
    };
    const params = ['project-1'];
    const legacy = WRITE_RESPONSE_SPECS['projects/:id'] as
        WriteResponseSpec;
    const expected = legacy.successBody!(
        params, body, 'current', '1',
    );
    const actual = documentWriteResponseSpec(wiring)
        .successBody!(params, body, 'current', '1');
    assert.deepEqual(actual, expected);
});

// -- (b) documentEntityRoute('simple') dispatches PUT to the
// wiring's documentOp and GET to the derived entity. --------

test('documentEntityRoute (simple arm) PUTs through the'
+ ' wiring documentOp and GETs the derived entity', async () => {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    const wiring = documentFamilyWiring('ideas')!;
    const route = documentEntityRoute(wiring);
    // Below-facade convention (postIdeaDocumentOp's own
    // comment): a raw, unfenced caller has no org-scoping
    // wrapper to stamp organization_id, so it embeds it in the
    // body directly, exactly as api/mock-data.ts's seed does.
    const body = {
        title: 'Generic', position: 1,
        problem_statement: 'p', target_users: 't',
        proposed_solution: 's', expected_outcome: 'o',
        success_metrics: 'm',
        state: 'active', state_at: AT, state_event_id: 'ev-1',
        organization_id: '1',
    };
    const pair = await formWritePair({
        method: 'PUT', pathname: '/ideas/idea-9',
        routePattern: 'ideas/:id',
        routeSegments: ['ideas', ':id'],
        pathSegments: ['ideas', 'idea-9'],
        headerFields: [], body, requesterIdentityId: 'current',
        requestAt: AT, organization: '1',
        responseStatus: 200, responseBody: undefined,
        headPairId: undefined,
    });
    const written = await route.put!(
        db, ['idea-9'], body, 'current', pair,
    );
    assert.equal(
        (written as { title: string }).title, 'Generic',
    );
    const got = await route.get!(db, ['idea-9'], 'current', '1');
    assert.deepEqual(got, await deriveIdea(db, '1', 'idea-9'));
});

// -- (c) the locked arm, against a SYNTHETIC registration. ---

const TEST_FAMILY = 'locked-test-docs';
const TEST_PATTERN = TEST_FAMILY + '/:id';

// The synthetic family's decompose op stores NOTHING but the
// pair itself — the locked-arm gate machinery under test lives
// entirely in api.ts/message-pair.ts, upstream of this op, so
// the op only needs to prove appendMessagePair ran.
async function testDocumentOp(
    db: DbAdapter,
    id: Id,
    body: Record<string, unknown>,
    _actor: Id,
    pair?: MessagePair,
): Promise<unknown> {
    return db.transaction(
        ['requests', 'responses'],
        async (view) => {
            if (pair !== undefined) {
                await appendMessagePair(view, pair);
            }
            return { id, ...body };
        },
    );
}

function testEntityOf(
    document: { uriId: string; body: Record<string, unknown> },
    organization: Id,
): unknown {
    return {
        id: document.uriId,
        organization_id: organization,
        ...document.body,
    };
}

// Registers a synthetic 'locked' family for the duration of
// `fn`, through the SAME seams a real family task would use
// (FAMILY_REGISTRY, DOCUMENT_FAMILY_WIRINGS, the live route
// table, the pair-wiring sets, WRITE_RESPONSE_SPECS) — then
// unregisters everything, even if `fn` throws, so no test
// pollutes another. No live family is registered here through
// this task; this is the ONLY place the locked arm runs.
async function withSyntheticLockedFamily<T>(
    fn: () => Promise<T>,
): Promise<T> {
    const registration: FamilyRegistration = {
        family: TEST_FAMILY,
        organizationNested: true,
        concurrency: 'locked',
        createBodyIdField: 'id',
    };
    const mutableRegistry =
        FAMILY_REGISTRY as FamilyRegistration[];
    mutableRegistry.push(registration);
    const wiring: DocumentFamilyWiring = {
        family: TEST_FAMILY,
        validateDocument: (body) => body,
        documentOp: testDocumentOp,
        entityOf: testEntityOf,
    };
    DOCUMENT_FAMILY_WIRINGS[TEST_FAMILY] = wiring;
    const routeEntry = documentEntityRoute(wiring);
    routes.push(routeEntry);
    PAIR_WIRED_ROUTE_PATTERNS.add(TEST_PATTERN);
    DOCUMENT_CLASS_ROUTE_PATTERNS.add(TEST_PATTERN);
    const mutableSpecs = WRITE_RESPONSE_SPECS as
        Record<string, WriteResponseSpec>;
    mutableSpecs[TEST_PATTERN] =
        documentWriteResponseSpec(wiring);
    try {
        return await fn();
    } finally {
        const index = routes.indexOf(routeEntry);
        if (index >= 0) routes.splice(index, 1);
        PAIR_WIRED_ROUTE_PATTERNS.delete(TEST_PATTERN);
        DOCUMENT_CLASS_ROUTE_PATTERNS.delete(TEST_PATTERN);
        delete mutableSpecs[TEST_PATTERN];
        delete DOCUMENT_FAMILY_WIRINGS[TEST_FAMILY];
        const registryIndex =
            mutableRegistry.indexOf(registration);
        if (registryIndex >= 0) {
            mutableRegistry.splice(registryIndex, 1);
        }
    }
}

test('locked arm: genesis with neither header passes',
async () => {
    await withSyntheticLockedFamily(async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const res = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-1', token,
            { v: 'first' },
        ));
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('Follows'), null);
        assert.equal(res.headers.get('Supersedes'), null);
    });
});

test('locked arm: head present, If-Response-ID absent, 412s',
async () => {
    await withSyntheticLockedFamily(async () => {
        const db = await freshDb();
        const token = await organizationToken();
        await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-2', token,
            { v: 'first' },
        ));
        const res = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-2', token,
            { v: 'second' },
        ));
        assert.equal(res.status, 412);
    });
});

test('locked arm: a stale If-Response-ID echo 412s', async () => {
    await withSyntheticLockedFamily(async () => {
        const db = await freshDb();
        const token = await organizationToken();
        await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-3', token,
            { v: 'first' },
        ));
        const res = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-3', token,
            { v: 'second' }, { [IF_RESPONSE_ID_HEADER]: 'bogus' },
        ));
        assert.equal(res.status, 412);
    });
});

test('locked arm: a matching echo populates follows, not'
+ ' supersedes', async () => {
    await withSyntheticLockedFamily(async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const first = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-4', token,
            { v: 'first' },
        ));
        const firstId = first.headers.get('Response-ID')!;
        const second = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-4', token,
            { v: 'second' },
            { [IF_RESPONSE_ID_HEADER]: firstId },
        ));
        assert.equal(second.status, 200);
        assert.equal(second.headers.get('Follows'), firstId);
        assert.equal(second.headers.get('Supersedes'), null);
        const secondId = second.headers.get('Response-ID')!;
        const stored = (await db.responses.getAll())
            .find((row) => row.id === secondId);
        assert.equal(stored?.follows, firstId);
        assert.equal(stored?.supersedes, undefined);
    });
});

test('locked arm: byte-identical resend replays the stored'
+ ' response, headers un-re-minted (fast-path-first ordering)',
async () => {
    await withSyntheticLockedFamily(async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const first = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-5', token,
            { v: 'first' },
        ));
        const firstId = first.headers.get('Response-ID')!;
        const editRequest = req(
            'PUT', '/' + TEST_FAMILY + '/doc-5', token,
            { v: 'second' },
            { [IF_RESPONSE_ID_HEADER]: firstId },
        );
        const edit = await handleRequest(db, editRequest.clone());
        assert.equal(edit.status, 200);
        const editDate = edit.headers.get('Date');
        // A byte-identical resend of the edit: its echo (firstId)
        // is now STALE against the new head (the edit's own id),
        // yet it must replay — never 412 — because the fast path
        // runs BEFORE the four-outcome table.
        const resend = await handleRequest(db, editRequest.clone());
        assert.equal(resend.status, 200);
        assert.equal(resend.headers.get('Date'), editDate);
        assert.equal(
            resend.headers.get('Response-ID'),
            edit.headers.get('Response-ID'),
        );
        assert.equal((await db.requests.getAll()).length, 2);
    });
});

test('locked arm: a fresh-keyed replay echoing a superseded'
+ ' head 412s', async () => {
    await withSyntheticLockedFamily(async () => {
        const db = await freshDb();
        const token = await organizationToken();
        const genesis = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-6', token,
            { v: 'first' },
        ));
        const genesisId = genesis.headers.get('Response-ID')!;
        await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-6', token,
            { v: 'second' },
            { [IF_RESPONSE_ID_HEADER]: genesisId },
        ));
        // A DIFFERENT (fresh) address has no head of its own;
        // echoing doc-6's now-superseded genesis id is neither
        // "absent" nor "matches MY head" — 412.
        const res = await handleRequest(db, req(
            'PUT', '/' + TEST_FAMILY + '/doc-7', token,
            { v: 'first' },
            { [IF_RESPONSE_ID_HEADER]: genesisId },
        ));
        assert.equal(res.status, 412);
    });
});

test('locked arm: two writers racing the SAME echo — the'
+ ' second aborts via the unique follows index', async () => {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    const genesis = await formWritePair({
        method: 'PUT', pathname: '/' + TEST_PATTERN,
        routePattern: TEST_PATTERN,
        routeSegments: [TEST_FAMILY, ':id'],
        pathSegments: [TEST_FAMILY, 'race'],
        headerFields: [], body: { v: 'genesis' },
        requesterIdentityId: 'current', requestAt: AT,
        organization: '1', responseStatus: 200,
        responseBody: undefined, headPairId: undefined,
    });
    await db.transaction(
        ['requests', 'responses'],
        (view) => appendMessagePair(view, genesis),
    );
    // Two writers both observed the SAME head (genesis.id)
    // before either committed — the race the pre-check alone
    // cannot close; the UNIQUE index on responses.follows is
    // the platform primitive that closes it.
    const writerA = await formWritePair({
        method: 'PUT', pathname: '/' + TEST_PATTERN,
        routePattern: TEST_PATTERN,
        routeSegments: [TEST_FAMILY, ':id'],
        pathSegments: [TEST_FAMILY, 'race'],
        headerFields: [], body: { v: 'a' },
        requesterIdentityId: 'current', requestAt: AT,
        organization: '1', responseStatus: 200,
        responseBody: undefined, headPairId: undefined,
        follows: genesis.id,
    });
    const writerB = await formWritePair({
        method: 'PUT', pathname: '/' + TEST_PATTERN,
        routePattern: TEST_PATTERN,
        routeSegments: [TEST_FAMILY, ':id'],
        pathSegments: [TEST_FAMILY, 'race'],
        headerFields: [], body: { v: 'b' },
        requesterIdentityId: 'current', requestAt: AT,
        organization: '1', responseStatus: 200,
        responseBody: undefined, headPairId: undefined,
        follows: genesis.id,
    });
    await db.transaction(
        ['requests', 'responses'],
        (view) => appendMessagePair(view, writerA),
    );
    await assert.rejects(
        db.transaction(
            ['requests', 'responses'],
            (view) => appendMessagePair(view, writerB),
        ),
        UniqueConstraintError,
    );
});

test('withSyntheticLockedFamily leaves no residue behind',
() => {
    assert.equal(documentFamilyWiring(TEST_FAMILY), undefined);
    assert.equal(
        PAIR_WIRED_ROUTE_PATTERNS.has(TEST_PATTERN), false,
    );
    assert.equal(
        DOCUMENT_CLASS_ROUTE_PATTERNS.has(TEST_PATTERN), false,
    );
    assert.equal(WRITE_RESPONSE_SPECS[TEST_PATTERN], undefined);
    assert.equal(
        FAMILY_REGISTRY.find(
            (entry) => entry.family === TEST_FAMILY,
        ),
        undefined,
    );
});
