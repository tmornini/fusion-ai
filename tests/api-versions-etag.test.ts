import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routes, matchRoute } from
    '../api/routes.ts';
import { pathSegmentsOf } from
    '../api/path-segments.ts';

function match(path: string) {
    return matchRoute(
        routes, pathSegmentsOf(path),
    );
}

test('idea versions list requires a slash',
() => {
    assert.ok(match(
        '/organizations/1/ideas/i1/versions/',
    ));
    assert.equal(
        match(
            '/organizations/1/ideas/i1/versions',
        ),
        null,
    );
});

test('idea snapshot is :etag not :version',
() => {
    const row = match(
        '/organizations/1/ideas/i1/versions/e1',
    );
    assert.ok(row);
    assert.equal(
        row.route.segments.at(-1),
        ':etag',
    );
});

test('work-order per-item history stays /history',
() => {
    assert.ok(match(
        '/organizations/1/work-orders/w1/history',
    ));
    assert.equal(
        match(
            '/organizations/1/work-orders/w1'
                + '/versions/',
        ),
        null,
    );
});

test('registered families offer versions/ and :etag',
() => {
    const lists = [
        '/identities/abc/versions/',
        '/ai-agents/a1/versions/',
        '/organizations/1/members/m1/versions/',
        '/organizations/1/invitations/i1/versions/',
        '/identities/abc/invitations/i1/versions/',
        '/organizations/1/versions/',
        '/organizations/1/ideas/i1/versions/',
        '/organizations/1/projects/p1/versions/',
        '/organizations/1/objectives/o1/versions/',
        '/organizations/1/record-types/r1/versions/',
        '/organizations/1/flows/f1/versions/',
    ];
    const snapshots = [
        '/identities/abc/versions/e1',
        '/ai-agents/a1/versions/e1',
        '/organizations/1/members/m1/versions/e1',
        '/organizations/1/invitations/i1/versions/e1',
        '/identities/abc/invitations/i1/versions/e1',
        '/organizations/1/versions/e1',
        '/organizations/1/ideas/i1/versions/e1',
        '/organizations/1/projects/p1/versions/e1',
        '/organizations/1/objectives/o1/versions/e1',
        '/organizations/1/record-types/r1/versions/e1',
        '/organizations/1/flows/f1/versions/e1',
    ];
    for (const path of lists) {
        const row = match(path);
        assert.ok(row, path);
        assert.equal(row.route.segments.at(-1), '');
    }
    for (const path of snapshots) {
        const row = match(path);
        assert.ok(row, path);
        assert.equal(
            row.route.segments.at(-1), ':etag', path,
        );
    }
});
