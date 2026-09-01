import { assertMatch, assertStrictEquals } from '@std/assert';
import { readFileSync } from 'node:fs';
import { fromFileUrl } from '@std/path';

const src = readFileSync(
    fromFileUrl(
        new URL(
            '../web-app/landing/index.ts',
            import.meta.url,
        ),
    ),
    'utf8',
);

Deno.test('landing does not shove to dashboard', () => {
    assertStrictEquals(
        src.includes('AUTO_REDIRECT_MS'),
        false,
    );
    assertStrictEquals(
        src.includes('dashboard/index.html'),
        false,
    );
    assertMatch(src, /auth\/index\.html/);
});
