import { assertMatch, assertNotMatch, assertStrictEquals } from '@std/assert';
import { existsSync } from '@std/fs';
import { join } from '@std/path';
import {
    spawnSync,
    type SpawnSyncReturns,
} from 'node:child_process';

function pathWithDockerStub(stamp: string): string {
    const dir = Deno.makeTempDirSync({
        prefix: 'fusion-docker-stub-',
    });
    Deno.writeTextFileSync(
        join(dir, 'docker'),
        '#!/bin/bash\n'
        + `printf x >> "${stamp}"\n`
        + 'exit 99\n',
        { mode: 0o755 },
    );
    return `${dir}:${process.env['PATH'] ?? ''}`;
}

function runServe(
    args: string[],
    extraEnv: NodeJS.ProcessEnv = {},
): SpawnSyncReturns<string> & { stamp: string } {
    const stamp = join(
        Deno.makeTempDirSync({ prefix: 'fusion-stamp-' }),
        'called',
    );
    const result = spawnSync('./serve', args, {
        encoding: 'utf8',
        timeout: 4000,
        env: {
            PATH: pathWithDockerStub(stamp),
            HOME: process.env['HOME'] ?? '',
            TMPDIR: process.env['TMPDIR'] ?? '/tmp',
            POSTGRES_URL: '',
            JWT_HMAC_SIGNING_KEY: '',
            ...extraEnv,
        },
    });
    return Object.assign(result, { stamp });
}

Deno.test('serve with no args exits 1 with usage', () => {
    const result = runServe([]);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/serve/);
    assertStrictEquals(
        existsSync(result.stamp) &&
            Deno.readTextFileSync(result.stamp)
                .length > 0,
        false,
    );
});

Deno.test('serve missing port exits 1 with usage', () => {
    const result = runServe(['bundle/']);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/serve/);
});

Deno.test('serve dir without trailing slash exits 1',
() => {
    const result = runServe(['bundle', '8080']);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/serve/);
});

Deno.test('serve --help exits 0', () => {
    const result = runServe(['--help']);
    assertStrictEquals(result.status, 0);
    assertMatch(result.stdout, /Usage: \.\/serve/);
});

Deno.test('serve missing POSTGRES_URL exits 1', () => {
    const result = runServe(['bundle/', '8080']);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /POSTGRES_URL/);
});

Deno.test('serve missing JWT exits 1', () => {
    const result = runServe(['bundle/', '8080'], {
        POSTGRES_URL: 'postgres://fusion@127.0.0.1/x',
    });
    assertStrictEquals(result.status, 1);
    assertMatch(
        result.stderr,
        /JWT_HMAC_SIGNING_KEY/,
    );
});

Deno.test('serve does not invoke ./build', () => {
    const src = Deno.readTextFileSync('serve');
    assertNotMatch(src, /\.\/build/);
    assertMatch(src, /exec \.\/fusion-angle serve/);
    assertNotMatch(src, /DEFAULT_PORT/);
    assertNotMatch(src, /mktemp/);
});
