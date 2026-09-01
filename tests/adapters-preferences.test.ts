globalThis.localStorage = (() => {
    const store = new Map<string, string>();
    return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
            store.set(k, v);
        },
        removeItem: (k: string) => {
            store.delete(k);
        },
        clear: () => {
            store.clear();
        },
        key: () => null,
        get length() {
            return store.size;
        },
    };
})();

import {
    assert,
    assertEquals,
    assertStrictEquals,
    assertThrows,
} from '@std/assert';
import {
    getPreference,
    putPreference,
} from '../web-app/app/adapters/preferences.ts';
import { captureConsole } from './fixtures/console-capture.ts';

Deno.test(
    'getPreference returns null for an unset key',
    () => {
        assertStrictEquals(
            getPreference('never-written-key'),
            null,
        );
    },
);

Deno.test(
    'putPreference then getPreference round-trips'
    + ' the value',
    () => {
        putPreference('fusion-angle:demo', 'hello');
        assertStrictEquals(
            getPreference('fusion-angle:demo'),
            'hello',
        );
    },
);

Deno.test(
    'putPreference overwrites a prior value for'
    + ' the same key',
    () => {
        putPreference('fusion-angle:color', 'blue');
        putPreference('fusion-angle:color', 'green');
        assertStrictEquals(
            getPreference('fusion-angle:color'),
            'green',
        );
    },
);

Deno.test(
    'distinct keys hold independent values',
    () => {
        putPreference('fusion-angle:a', 'one');
        putPreference('fusion-angle:b', 'two');
        assertStrictEquals(getPreference('fusion-angle:a'), 'one');
        assertStrictEquals(getPreference('fusion-angle:b'), 'two');
    },
);

Deno.test(
    'putPreference accepts an empty string value',
    () => {
        putPreference('fusion-angle:empty', '');
        assertStrictEquals(
            getPreference('fusion-angle:empty'),
            '',
        );
    },
);

Deno.test(
    'putPreference rethrows non-quota storage'
    + ' errors',
    () => {
        const original = globalThis.localStorage;
        try {
            // @ts-expect-error — Node global stub
            globalThis.localStorage = {
                getItem: () => null,
                setItem: () => {
                    throw new Error('disk on fire');
                },
            };
            assertThrows(
                () => putPreference('k', 'v'),
                Error,
                'disk on fire',
            );
        } finally {
            globalThis.localStorage = original;
        }
    },
);

Deno.test(
    'putPreference returns false on a'
    + ' QuotaExceededError without throwing',
    async () => {
        const original = globalThis.localStorage;
        try {
            // @ts-expect-error — Node global stub
            globalThis.localStorage = {
                getItem: () => null,
                setItem: () => {
                    const err = new DOMException(
                        'over quota',
                        'QuotaExceededError',
                    );
                    throw err;
                },
            };
            const { result, calls } =
                await captureConsole(
                    'warn',
                    () => putPreference('k', 'v'),
                );
            assertStrictEquals(result, false);
            assert(
                calls.some(args => args.includes(
                    'preference write skipped'
                    + ' due to quota',
                )),
                'quota skip must warn, never'
                + ' pass silently',
            );
        } finally {
            globalThis.localStorage = original;
        }
    },
);

Deno.test(
    'putPreference returns true on success',
    () => {
        const original = globalThis.localStorage;
        try {
            const writes: Array<[string, string]>
                = [];
            // @ts-expect-error — Node global stub
            globalThis.localStorage = {
                getItem: () => null,
                setItem: (k: string, v: string) => {
                    writes.push([k, v]);
                },
            };
            assertStrictEquals(
                putPreference('k', 'v'),
                true,
            );
            assertEquals(writes, [['k', 'v']]);
        } finally {
            globalThis.localStorage = original;
        }
    },
);
