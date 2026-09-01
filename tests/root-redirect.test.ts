import { assertMatch, assertStrictEquals } from '@std/assert';
import { readFileSync } from 'node:fs';
import { fromFileUrl } from '@std/path';

const src = readFileSync(
    fromFileUrl(
        new URL(
            '../web-app/app/root-redirect.ts',
            import.meta.url,
        ),
    ),
    'utf8',
);

Deno.test('apex hops via the destination helper', () => {
    assertMatch(src, /resolveApexLocation/);
    assertMatch(src, /probeRefreshSession/);
    assertStrictEquals(
        src.includes('auth/index.html'),
        false,
    );
    assertStrictEquals(
        src.includes('snapshots/index.html'),
        false,
    );
    assertStrictEquals(
        src.includes('getSchemaPresent'),
        false,
    );
});
