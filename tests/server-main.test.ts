import {
    assertMatch, assertRejects, assertStrictEquals,
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

Deno.test('serve rejects any option', async () => {
    const err = await assertRejects(
        () => dispatch(SITE, ['serve', '--port', '80']),
    ) as Error;
    assertMatch(err.message, /no arguments/i);
});
