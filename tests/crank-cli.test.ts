import {
    assert,
    assertMatch,
    assertNotMatch,
    assertStrictEquals,
} from '@std/assert';
import {
    existsSync,
    mkdtempSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from '@std/path';
import {
    spawnSync,
    type SpawnSyncReturns,
} from 'node:child_process';

function pathWithDockerStub(stamp: string): string {
    const dir = mkdtempSync(
        join(tmpdir(), 'fusion-docker-stub-'),
    );
    writeFileSync(
        join(dir, 'docker'),
        '#!/bin/bash\n'
        + `printf x >> "${stamp}"\n`
        + 'exit 99\n',
        { mode: 0o755 },
    );
    return `${dir}:${process.env['PATH'] ?? ''}`;
}

function runCrank(
    args: string[],
): SpawnSyncReturns<string> & { stamp: string } {
    const stamp = join(
        mkdtempSync(join(tmpdir(), 'fusion-stamp-')),
        'called',
    );
    const result = spawnSync('./crank', args, {
        encoding: 'utf8',
        timeout: 4000,
        env: {
            PATH: pathWithDockerStub(stamp),
            HOME: process.env['HOME'] ?? '',
            TMPDIR: process.env['TMPDIR'] ?? '/tmp',
        },
    });
    return Object.assign(result, { stamp });
}

function dockerCalled(stamp: string): boolean {
    return existsSync(stamp)
        && readFileSync(stamp, 'utf8').length > 0;
}

Deno.test('crank with no args exits 1 with usage', () => {
    const result = runCrank([]);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/crank/);
    assertStrictEquals(dockerCalled(result.stamp), false);
});

Deno.test('crank missing port exits 1 with usage', () => {
    const result = runCrank(['--mock-data']);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/crank/);
    assertStrictEquals(dockerCalled(result.stamp), false);
});

Deno.test('crank missing mode exits 1 with usage', () => {
    const result = runCrank(['8080']);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/crank/);
    assertStrictEquals(dockerCalled(result.stamp), false);
});

Deno.test('crank two modes exits 1 with usage', () => {
    const result = runCrank([
        '--mock-data',
        '--bootstrap',
        '8080',
    ]);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/crank/);
    assertMatch(result.stderr, /exclusive/);
    assertStrictEquals(dockerCalled(result.stamp), false);
});

Deno.test('crank unknown flag exits 1 with usage', () => {
    const result = runCrank(['--bogus', '8080']);
    assertStrictEquals(result.status, 1);
    assertMatch(result.stderr, /Usage: \.\/crank/);
    assertStrictEquals(dockerCalled(result.stamp), false);
});

Deno.test('crank --help exits 0', () => {
    const result = runCrank(['--help']);
    assertStrictEquals(result.status, 0);
    assertMatch(result.stdout, /Usage: \.\/crank/);
    assertStrictEquals(dockerCalled(result.stamp), false);
});

Deno.test('crank source owns the local stack', () => {
    const src = readFileSync('crank', 'utf8');
    assertMatch(src, /\.\/validate/);
    assertMatch(
        src,
        /docker compose up -d --wait postgres/,
    );
    assertMatch(src, /\.\/test-postgres/);
    assertMatch(src, /\.\/build --no-zip/);
    assertMatch(
        src,
        /\.\/postgres-wipe --postgres local/,
    );
    assertMatch(
        src,
        /\.\/postgres-seed --postgres local/,
    );
    assertMatch(src, /\.\/serve /);
    assertNotMatch(
        src,
        /docker compose up -d --wait["\n]*$/,
    );
    assertNotMatch(src, /echo \$POSTGRES_URL/);
    assertNotMatch(
        src,
        /echo \$POSTGRES_PASSWORD/,
    );
    assertNotMatch(
        src,
        /echo \$JWT_HMAC_SIGNING_KEY/,
    );
    const trapAt = src.indexOf('trap ');
    const upAt = src.indexOf(
        'docker compose up -d --wait postgres',
    );
    assert(trapAt >= 0, 'trap missing');
    assert(upAt >= 0, 'compose up missing');
    assert(trapAt < upAt, 'trap after Docker');
});
