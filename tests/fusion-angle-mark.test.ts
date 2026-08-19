import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    existsSync,
    readFileSync,
} from 'node:fs';

test('mark.png is committed under assets', () => {
    assert.equal(
        existsSync('web-app/assets/mark.png'),
        true,
    );
});

test('iconLogo is the PNG mark, not the atom',
() => {
    const src = readFileSync(
        'web-app/app/icons.ts',
        'utf8',
    );
    assert.match(src, /mark\.png/);
    assert.match(src, /brand-mark/);
    assert.doesNotMatch(src, /logo-orbital/);
    assert.doesNotMatch(src, /logo-nucleus/);
});

test('sidebars use the PNG mark', () => {
    for (const path of [
        'web-app/app/component-sidebar.html',
        'web-app/app/component-mobile-sidebar.html',
    ] as const) {
        const src = readFileSync(path, 'utf8');
        assert.match(src, /mark\.png/);
        assert.match(src, /brand-mark/);
        assert.doesNotMatch(src, /logo-orbital/);
        assert.doesNotMatch(src, /logo-nucleus/);
    }
});

test('brand CSS inverts the mark in light theme',
() => {
    const src = readFileSync(
        'web-app/app/styles/components-brand.css',
        'utf8',
    );
    assert.match(src, /\.brand-mark/);
    assert.match(src, /invert\(1\)/);
    assert.doesNotMatch(src, /logo-orbital/);
    assert.doesNotMatch(src, /logo-nucleus/);
});

test('favicon.svg embeds the PNG and inverts in light',
() => {
    const src = readFileSync(
        'web-app/assets/favicon.svg',
        'utf8',
    );
    assert.match(src, /mark\.png/);
    assert.match(
        src,
        /prefers-color-scheme:\s*light/,
    );
    assert.match(src, /invert\(1\)/);
    assert.doesNotMatch(src, /logo-orbital/);
    assert.doesNotMatch(src, /orbital/);
    assert.doesNotMatch(src, /nucleus/);
});
