import { assertMatch, assertNotMatch, assertStrictEquals } from '@std/assert';
import {
    existsSync,
    readFileSync,
} from 'node:fs';

Deno.test('mark.png is committed under assets', () => {
    assertStrictEquals(
        existsSync('web-app/assets/mark.png'),
        true,
    );
});

Deno.test('iconLogo is the PNG mark, not the atom',
() => {
    const src = readFileSync(
        'web-app/app/icons.ts',
        'utf8',
    );
    assertMatch(src, /mark\.png/);
    assertMatch(src, /brand-mark/);
    assertNotMatch(src, /logo-orbital/);
    assertNotMatch(src, /logo-nucleus/);
});

Deno.test('sidebars use the PNG mark', () => {
    for (const path of [
        'web-app/app/component-sidebar.html',
        'web-app/app/component-mobile-sidebar.html',
    ] as const) {
        const src = readFileSync(path, 'utf8');
        assertMatch(src, /mark\.png/);
        assertMatch(src, /brand-mark/);
        assertNotMatch(src, /logo-orbital/);
        assertNotMatch(src, /logo-nucleus/);
    }
});

Deno.test('brand CSS inverts the mark in light theme',
() => {
    const src = readFileSync(
        'web-app/app/styles/components-brand.css',
        'utf8',
    );
    assertMatch(src, /\.brand-mark/);
    assertMatch(src, /invert\(1\)/);
    assertNotMatch(src, /logo-orbital/);
    assertNotMatch(src, /logo-nucleus/);
});

Deno.test('favicon.svg embeds the PNG and inverts in light',
() => {
    const src = readFileSync(
        'web-app/assets/favicon.svg',
        'utf8',
    );
    assertMatch(src, /mark\.png/);
    assertMatch(
        src,
        /prefers-color-scheme:\s*light/,
    );
    assertMatch(src, /invert\(1\)/);
    assertNotMatch(src, /logo-orbital/);
    assertNotMatch(src, /orbital/);
    assertNotMatch(src, /nucleus/);
});

Deno.test('build copies mark.png next to the favicons', () => {
    const src = readFileSync('build-lib', 'utf8');
    assertMatch(
        src,
        /cp web-app\/assets\/mark\.png/,
    );
});

Deno.test('server declares image/png for .png', () => {
    const src = readFileSync(
        'server/http-server.ts',
        'utf8',
    );
    assertMatch(src, /'\.png': 'image\/png'/);
});

Deno.test('auth branding does not invert the mark',
() => {
    const src = readFileSync(
        'web-app/app/styles/components-brand.css',
        'utf8',
    );
    assertMatch(
        src,
        /html:not\(\[data-theme="dark"\]\) \.auth-branding \.brand-mark/,
    );
    assertMatch(src, /filter:\s*none/);
});
