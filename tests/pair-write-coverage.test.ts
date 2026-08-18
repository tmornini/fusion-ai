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

// A write registration: a Route entry exposing put, post,
// patch, or delete. `route()` builds every entry (the
// `makeIdRoute()` factory that used to build some of them was
// retired once its last two live callers — members/:id,
// objectives/:id — were replaced with pair-appending bespoke
// routes), so this walks the table generically rather than
// caring how an entry was built. Task 10: patch joins the
// alphabet — intentional widen, not weakening.
function writtenPattern(entry: Route): string | undefined {
    if (
        entry.put === undefined
        && entry.post === undefined
        && entry.patch === undefined
        && entry.delete === undefined
    ) {
        return undefined;
    }
    return entry.segments.join('/');
}

// AUTHENTICATION_ROUTES (the dedicated grant arm) stay
// named-exempt and never reach the generic pair block.
// There is no snapshot plane to skip. Named, not
// inferred.
const NAMED_EXEMPT_ROUTE_PATTERNS:
    ReadonlySet<string> = new Set([
        ...AUTHENTICATION_ROUTES,
    ]);

test('every write-verb route is pair-wired or named exempt',
() => {
    const writeRoutePatterns = routes
        .map(writtenPattern)
        .filter(
            (pattern): pattern is string =>
                pattern !== undefined,
        );
    // A sanity floor: fails loudly if route parsing regresses
    // to near-zero (e.g. an import returns the wrong shape)
    // instead of silently passing on an empty list.
    assert.ok(writeRoutePatterns.length > 36);
    for (const pattern of writeRoutePatterns) {
        assert.ok(
            PAIR_WIRED_ROUTE_PATTERNS.has(pattern)
                || NAMED_EXEMPT_ROUTE_PATTERNS.has(pattern),
            'unwired, un-exempt write route: ' + pattern,
        );
    }
});

// Task 10: a synthetic patch-only route is a write for the
// walker. Without a PAIR_WIRED / named-exempt entry it would
// fail the completeness gate above — the alphabet grew, so
// the gate must see patch. Currently no live route carries
// patch; this pins the walker, not a table row.
test('patch-only synthetic is a write route the walker'
+ ' would require pair-wired', () => {
    const synthetic: Route = {
        segments: ['patch-only-synthetic', ':id'],
        // Cast: no live PatchHandler yet; the walker only
        // tests presence, never calls.
        patch: (async () => ({})) as Route['patch'],
    };
    const pattern = writtenPattern(synthetic);
    assert.equal(pattern, 'patch-only-synthetic/:id');
    assert.equal(
        PAIR_WIRED_ROUTE_PATTERNS.has(pattern!),
        false,
    );
    assert.equal(
        NAMED_EXEMPT_ROUTE_PATTERNS.has(pattern!),
        false,
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

// The invitations side channel never appears in the route
// table (api/api.ts dispatches it by literal path segments
// before matchRoute ever runs), so it cannot be caught by
// the enumeration test. Pin it by static source check.
// default-organization is now a table route and rides
// PAIR_WIRED_ROUTE_PATTERNS — test 1 covers it.
//
// STRUCTURAL LIMIT — for the next author who adds a side
// channel: this test can only assert what it already knows
// to list. A future write path dispatched the same way
// (matched by literal path segments in api.ts BEFORE
// matchRoute/routes[] ever runs — the /invitations/ shape)
// is invisible to test 1's enumeration BY CONSTRUCTION,
// and invisible here too unless someone hand-adds its
// module below. Even for the file already listed, this
// only checks that the SUBSTRING 'appendMessagePair' /
// 'formWritePair' appears somewhere in the file's text —
// not that EVERY write path inside that file reaches one.
// A new side channel is a REVIEW obligation, not a
// mechanical one.
test('the invitations side channel imports the'
+ ' pair-formation primitives', () => {
    const path = 'api/invitations-domain.ts';
    const text = sourceText(path);
    assert.ok(
        text.includes('appendMessagePair'),
        path + ' does not import appendMessagePair',
    );
    assert.ok(
        text.includes('formWritePair'),
        path + ' does not import formWritePair',
    );
});

test('api/api.ts awaits simulateLatency exactly 4 times', () => {
    const text = sourceText('api/api.ts');
    const hits = text.match(
        /await adapter\.simulateLatency\(\);/g,
    ) ?? [];
    assert.equal(hits.length, 4);
});
