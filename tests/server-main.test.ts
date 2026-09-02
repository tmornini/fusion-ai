import {
    assertMatch, assertStrictEquals,
} from '@std/assert';
import { USAGE, dispatch } from '../server/main.ts';

const SITE = new URL('file:///nowhere/site/');

Deno.test('usage names the three verbs', () => {
    assertMatch(USAGE, /serve/);
    assertMatch(USAGE, /seed/);
    assertMatch(USAGE, /wipe/);
});

Deno.test('no verb is exit 2', async () => {
    assertStrictEquals(await dispatch(SITE, []), 2);
});

Deno.test('an unknown verb is exit 2', async () => {
    assertStrictEquals(await dispatch(SITE, ['migrate']), 2);
});

// A boot fault is recorded and exits 1; it no longer
// rejects out of dispatch. Swap Deno.stderr's writeSync
// for one body to read the record back — the writer is
// the sink boot.ts holds, so no fixture can stand in.
async function stderrText(
    body: () => Promise<number>,
): Promise<{ code: number; text: string }> {
    const original = Deno.stderr.writeSync;
    const chunks: string[] = [];
    const install = (writeSync: unknown) => {
        Object.defineProperty(Deno.stderr, 'writeSync', {
            value: writeSync,
            configurable: true,
            writable: true,
        });
    };
    install((bytes: Uint8Array) => {
        chunks.push(new TextDecoder().decode(bytes));
        return bytes.length;
    });
    try {
        return { code: await body(), text: chunks.join('') };
    } finally {
        install(original);
    }
}

Deno.test('serve refuses any option with exit 1',
async () => {
    const result = await stderrText(
        () => dispatch(SITE, ['serve', '--port', '80']),
    );
    assertStrictEquals(result.code, 1);
    assertMatch(result.text, /no arguments/i);
});
