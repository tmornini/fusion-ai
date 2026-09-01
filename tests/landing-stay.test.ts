import { assertMatch, assertStrictEquals } from '@std/assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(
    fileURLToPath(
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
