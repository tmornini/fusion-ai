import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routes } from '../api/routes.ts';
import {
    roomPathOf,
    svgOf,
    verbRoomHtml,
} from '../web-app/app/generate-api-documentation.ts';
import { offeredVerbs, uriOf } from
    '../api/route-surface.ts';

test('a known collection is drawn with /',
() => {
    const svg = svgOf(routes);
    assert.match(svg, /\/identities\//);
    assert.doesNotMatch(
        svg, /\/invitations\/sent/,
    );
});

test('filled GET circle hrefs the identities'
    + ' collection room', () => {
    const row = routes.find((r) =>
        uriOf(r) === '/identities/');
    assert.ok(row);
    assert.ok(offeredVerbs(row).includes('get'));
    assert.equal(
        roomPathOf('get', row.segments),
        'get/identities/index.html',
    );
});

test('two 401 links share statuses/401/',
() => {
    const html = verbRoomHtml(
        'get', '/identities/', ['401', '404'],
        'none',
    );
    assert.match(
        html, /href="..\/..\/statuses\/401\/"/,
    );
});
