import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { routes, type Route } from '../api/routes.ts';
import {
    PAIR_WIRED_ROUTE_PATTERNS,
    REPLAY_EXEMPT_ROUTE_PATTERNS,
} from '../api/message-pair.ts';
import {
    AUTHENTICATION_ROUTES,
    BOOTSTRAP_ROUTES,
} from '../api/request-auth.ts';

// The B4 discharge (Phase 1 exit checklist, Task 6a): every
// write-verb registration in the LIVE route table — parsed at
// runtime, never hand-read — must be pair-wired or named
// exempt. This is the mechanical completeness gate
// task-2a-report.md deferred to explicitly: "the Task 6 exit
// test will catch any gap mechanically."

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function sourceText(relativePath: string): string {
    return readFileSync(repoRoot + relativePath, 'utf8');
}

// A write registration: a Route entry exposing put, post, or
// delete. `route()` and `makeIdRoute()` both compile down to
// the same shape, so this walks the table generically — it
// does not care which factory built the entry.
function writtenPattern(entry: Route): string | undefined {
    if (
        entry.put === undefined
        && entry.post === undefined
        && entry.delete === undefined
    ) {
        return undefined;
    }
    return entry.segments.join('/');
}

// BOOTSTRAP_ROUTES (the auth-free dev-tier snapshot plane) and
// AUTHENTICATION_ROUTES (the dedicated grant arm) never reach
// the generic pair block — api/api.ts gates it on
// `!bearerExempt`, and both sets are bearerExempt. Named, not
// inferred.
const NAMED_EXEMPT_ROUTE_PATTERNS: ReadonlySet<string> = new Set([
    ...BOOTSTRAP_ROUTES,
    ...AUTHENTICATION_ROUTES,
]);

// Pre-existing GAPS, not exemptions — three write routes the
// Task 2a chunking round left "unnamed in this chunk's
// anchors" (task-2a-report.md), banking on this very test to
// surface them: `objectives/:id` PUT is LIVE
// (web-app's putObjectivePosition never reaches the ledger
// today); `members/:id` PUT and `flows/:id/versions/:vid`
// PUT/DELETE are registered but uncalled by any adapter. This
// is a closed, named list, not the exempt set above — closing
// one shrinks THIS list (see the pinning test below), and a
// silent addition here would itself need a matching edit to
// that pin. Tracked for a follow-up wiring task; flagged in
// the Task 6a report.
const KNOWN_UNWIRED_WRITE_ROUTE_PATTERNS: ReadonlySet<string> =
    new Set([
        'flows/:id/versions/:vid',
        'members/:id',
        'objectives/:id',
    ]);

test('every write-verb route is pair-wired, named exempt, or' +
' a tracked known gap', () => {
    const writeRoutePatterns = routes
        .map(writtenPattern)
        .filter(
            (pattern): pattern is string =>
                pattern !== undefined,
        );
    // A sanity floor: fails loudly if route parsing regresses
    // to near-zero (e.g. an import returns the wrong shape)
    // instead of silently passing on an empty list.
    assert.ok(writeRoutePatterns.length > 40);
    for (const pattern of writeRoutePatterns) {
        assert.ok(
            PAIR_WIRED_ROUTE_PATTERNS.has(pattern)
                || NAMED_EXEMPT_ROUTE_PATTERNS.has(pattern)
                || KNOWN_UNWIRED_WRITE_ROUTE_PATTERNS.has(
                    pattern,
                ),
            'unwired, un-exempt, untracked write route: '
                + pattern,
        );
    }
});

test('the known-gap set names exactly today\'s three routes —'
+ ' closing one is an edit here, never a silent shrink',
() => {
    assert.deepEqual(
        [...KNOWN_UNWIRED_WRITE_ROUTE_PATTERNS].sort(),
        [
            'flows/:id/versions/:vid',
            'members/:id',
            'objectives/:id',
        ],
    );
});

test('AUTHENTICATION_ROUTES ride the dedicated pair arm, so'
+ ' both are also replay-exempt', () => {
    for (const pattern of AUTHENTICATION_ROUTES) {
        assert.ok(
            REPLAY_EXEMPT_ROUTE_PATTERNS.has(pattern),
            pattern + ' rides the dedicated arm but is not'
                + ' replay-exempt',
        );
    }
});

// The invitations and default-organization side channels never
// appear in the route table above (api/api.ts dispatches them
// by literal path segments before matchRoute ever runs), so
// they cannot be caught by the enumeration test. Pin them by
// static source check instead. The e2e proof that pairs
// actually land for these routes already lives in
// tests/api-shadow-ledger-default-organization.test.ts and
// tests/api-shadow-ledger-memberships-invitations.test.ts —
// this test only pins that the wiring is present, not
// duplicating that behavioral coverage.
test('the invitations and default-organization side channels'
+ ' import the pair-formation primitives', () => {
    for (const path of [
        'api/invitations-domain.ts',
        'api/organization-requests.ts',
    ]) {
        const text = sourceText(path);
        assert.ok(
            text.includes('appendMessagePair'),
            path + ' does not import appendMessagePair',
        );
        assert.ok(
            text.includes('formWritePair'),
            path + ' does not import formWritePair',
        );
    }
});

test('api/api.ts awaits simulateLatency exactly 4 times', () => {
    const text = sourceText('api/api.ts');
    const hits = text.match(
        /await adapter\.simulateLatency\(\);/g,
    ) ?? [];
    assert.equal(hits.length, 4);
});
