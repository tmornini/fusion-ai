import { assertMatch, assertStrictEquals } from '@std/assert';
import { join } from '@std/path';
import { execSync, spawnSync } from 'node:child_process';

function headSha(): string {
    return execSync('git rev-parse HEAD', {
        encoding: 'utf8',
    }).trim();
}

Deno.test('validate skips when the HEAD SHA already passed',
    () => {
    const stamp = join(
        Deno.makeTempDirSync({ prefix: 'validate-ok-' }),
        'validate-ok',
    );
    Deno.writeTextFileSync(stamp, `${headSha()}\n`);
    const result = spawnSync('./validate', [], {
        encoding: 'utf8',
        timeout: 4000,
        env: {
            ...process.env,
            VALIDATE_OK: stamp,
            VALIDATE_PORCELAIN: '',
        },
    });
    assertStrictEquals(result.status, 0);
    assertMatch(
        result.stdout,
        /already validated [0-9a-f]{40}/,
    );
});
