import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    STORAGE_KEY_THEME,
    STORAGE_KEY_SIDEBAR,
} from '../web-app/app/storage-keys.ts';
import {
    initState,
    computeTheme,
} from '../web-app/app/state.ts';

// The static import above is itself the purity assertion:
// state.ts must not throw on import — it touches neither
// localStorage nor window at module load, so the initial
// state is plain domain defaults. initState() hydrates the
// persisted preferences at boot; computeTheme() is the
// observable that proves the theme was hydrated from storage.
test(
    'initState hydrates the persisted theme preference',
    () => {
        const g =
            globalThis as Record<string, unknown>;
        g.localStorage = {
            getItem: (k: string) => {
                if (k === STORAGE_KEY_THEME) {
                    return 'dark';
                }
                if (k === STORAGE_KEY_SIDEBAR) {
                    return 'true';
                }
                return null;
            },
        };
        g.window = {
            matchMedia: () => ({ matches: true }),
        };
        try {
            initState();
            assert.equal(computeTheme(), 'dark');
        } finally {
            delete g.localStorage;
            delete g.window;
        }
    },
);
