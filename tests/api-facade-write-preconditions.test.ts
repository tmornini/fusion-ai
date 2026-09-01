import { assert, assertEquals, assertStrictEquals } from '@std/assert';
// `test`, not `Deno.test`, on purpose: this file's last test
// mocks setTimeout via node:test's `t.mock.timers`. Deno's
// native TestContext has no fake-timer facility, and adding
// one is Task 48-50's territory (the brief's own "no timers"
// scope line), so that ONE test stays on the node:test
// compat shim as a deliberate exception -- verified to run
// correctly side by side with Deno.test in this same file
// (both funnel through Deno's own test runner).
import { test } from 'node:test';
import {
    memoryDbAdapter,
    type MemoryDbAdapter,
} from '../api/db-memory.ts';
import { GET, GETWithEtag, PUT } from '../api/api.ts';
import { jitteredBackoff } from
    '../web-app/app/adapters/shared.ts';
import { organizationToken } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import {
    generateIdentifier,
    isIdentifier,
} from '../shared/identifier.ts';

// Facade plumbing that carries the C6 retry loop's If-Match
// echo (web-app/app/adapters/flow-mutations.ts). Ideas/:id is
// simple-class (If-Match is inert there); the pin is that PUT
// hoists the header into the stored request message.

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = memoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

function ideaFields(title: string) {
    return {
        title,
        position: 1,
        problem_statement: 'p',
        target_users: 't',
        proposed_solution: 's',
        expected_outcome: 'o',
        success_metrics: 'm',
    };
}

function ideaPutBody(_ideaId: string, title: string) {
    return {
        ...ideaFields(title),
        state: 'active',
    };
}

Deno.test('PUT threads an arbitrary header field into the stored'
+ ' request message (a simple-class family never keys'
+ ' behavior off it — only the message carries it)',
async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const ideaId = generateIdentifier();
    await PUT(
        db, 'organizations/AjdvjuECVZEgZoFajaIEkg/ideas/'
            + ideaId,
        ideaPutBody(ideaId, 'Headers'), token,
        [['if-match', '"probe-value-123"']],
    );
    const stored = (await db.messagePairs.getAll())
        .find(r => r.uri_id === ideaId);
    assert(stored, 'a request row was stored');
    assert(
        stored!.request.includes('probe-value-123'),
        'the header value must reach the stored request'
        + ' message',
    );
});

Deno.test('PUT with no headerFields behaves exactly as before —'
+ ' the parameter is purely additive', async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const ideaId = generateIdentifier();
    const written = await PUT<{ id: string; title: string }>(
        db, 'organizations/AjdvjuECVZEgZoFajaIEkg/ideas/'
            + ideaId,
        ideaPutBody(ideaId, 'No Headers'), token,
    );
    assertStrictEquals(written.title, 'No Headers');
});

Deno.test('GETWithEtag returns the parsed body and the'
+ ' head pair id as ETag (streamed organizations/:id/ideas/:id)',
async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const ideaId = generateIdentifier();
    await PUT(
        db, 'organizations/AjdvjuECVZEgZoFajaIEkg/ideas/'
            + ideaId,
        ideaPutBody(ideaId, 'Plain'), token,
    );
    const { body, etag } =
        await GETWithEtag<{
            id: string; title: string;
        }>(db, 'organizations/AjdvjuECVZEgZoFajaIEkg/ideas/'
            + ideaId, token);
    assertStrictEquals(body.title, 'Plain');
    assert(etag !== undefined && isIdentifier(etag));
});

Deno.test('GETWithEtag and GET agree on the body for the'
+ ' same resource (delegation, not a divergent read path)',
async () => {
    const db = await freshDb();
    const token = await organizationToken();
    const ideaId = generateIdentifier();
    await PUT(
        db, 'organizations/AjdvjuECVZEgZoFajaIEkg/ideas/'
            + ideaId,
        ideaPutBody(ideaId, 'Agree'), token,
    );
    const viaGet = await GET<{ id: string; title: string }>(
        db, 'organizations/AjdvjuECVZEgZoFajaIEkg/ideas/'
            + ideaId, token,
    );
    const { body: viaGetWithEtag } =
        await GETWithEtag<{
            id: string; title: string;
        }>(db, 'organizations/AjdvjuECVZEgZoFajaIEkg/ideas/'
            + ideaId, token);
    assertEquals(viaGetWithEtag, viaGet);
});

test('jitteredBackoff waits base*2^(attempt-1) plus jitter'
+ ' (the C6 retry loop\'s pacing primitive)',
async (t) => {
    // BACKOFF_BASE_MS is 100; random fixed at 0 → delay
    // equals the base with no jitter added.
    t.mock.timers.enable({ apis: ['setTimeout'] });
    t.mock.method(Math, 'random', () => 0);

    let resolved = false;
    const p = jitteredBackoff(2).then(() => {
        resolved = true;
    });
    // attempt 2 → base = 100 * 2^(2-1) = 200
    t.mock.timers.tick(199);
    await Promise.resolve();
    assertStrictEquals(
        resolved, false,
        'must not resolve before the backoff delay',
    );
    t.mock.timers.tick(1);
    await p;
    assertStrictEquals(resolved, true);
});
