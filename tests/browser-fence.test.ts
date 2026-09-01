import { assertMatch, assertNotStrictEquals } from '@std/assert';
import { join } from '@std/path';

Deno.test('browser project rejects process (TS2591)',
async () => {
    const dir = Deno.makeTempDirSync({ prefix: 'deno-fence-' });
    try {
        const leak = join(dir, 'leak.ts');
        Deno.writeTextFileSync(leak, 'process.exit(0);\n');
        // signal only bounds the async output() — the sync
        // outputSync() ignores it and blocks regardless.
        const result = await new Deno.Command('deno', {
            args: ['check', '--frozen', leak],
            signal: AbortSignal.timeout(60_000),
        }).output();
        const decoder = new TextDecoder();
        const out = decoder.decode(result.stdout)
            + decoder.decode(result.stderr);
        assertNotStrictEquals(result.code, 0);
        assertMatch(out, /TS2591/);
        assertMatch(out, /Cannot find name 'process'/);
    } finally {
        Deno.removeSync(dir, { recursive: true });
    }
});
