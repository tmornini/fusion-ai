import { assertMatch, assertNotStrictEquals } from '@std/assert';
import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from '@std/path';

Deno.test('browser project rejects process (TS2591)', () => {
    const dir = Deno.makeTempDirSync({ prefix: 'deno-fence-' });
    try {
        const leak = join(dir, 'leak.ts');
        writeFileSync(leak, 'process.exit(0);\n');
        const result = spawnSync(
            'deno',
            ['check', '--frozen', leak],
            { encoding: 'utf8', timeout: 60_000 },
        );
        const out = String(result.stdout)
            + String(result.stderr);
        assertNotStrictEquals(result.status, 0);
        assertMatch(out, /TS2591/);
        assertMatch(out, /Cannot find name 'process'/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
