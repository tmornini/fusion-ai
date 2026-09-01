import { assert, assertStrictEquals } from '@std/assert';

// logger.ts → preferences.ts calls
// localStorage, which does not exist in
// Node. Stub it before the first import so
// getConfiguredLevel() returns 'warn'.
// @ts-expect-error — Node global stub
globalThis.localStorage = {
    getItem: (_key: string) => null,
    setItem: () => {},
};

// Import after the stub is in place.
const { log } = await import(
    '../web-app/app/logger.ts'
);

// RFC-3339 zulu with fractional seconds
// (Date.toISOString form).
const TS_RE =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ── Helpers ──────────────────

/** Capture a single console method call as args. */
function capture(
    method: 'debug' | 'info' | 'warn' | 'error',
    fn: () => void,
): unknown[][] {
    const calls: unknown[][] = [];
    const original = console[method];
    console[method] = (
        ...args: unknown[]
    ) => {
        calls.push(args);
    };
    try {
        fn();
    } finally {
        console[method] = original;
    }
    return calls;
}

function fieldsOf(
    call: unknown[],
): Record<string, unknown> {
    const fields = call[1];
    assert(
        fields !== null
        && typeof fields === 'object'
        && !Array.isArray(fields),
        `Expected fields object, got: ${
            String(fields)
        }`,
    );
    return fields as Record<string, unknown>;
}

// ── Tests ────────────────────

Deno.test(
    'log.error emits RFC-3339 ts and level',
    () => {
        const calls = capture(
            'error',
            () => log.error(
                'something failed',
                'test-ctx',
            ),
        );
        assertStrictEquals(calls.length, 1);
        const call = calls[0]!;
        assertStrictEquals(
            call[0], 'something failed',
        );
        const fields = fieldsOf(call);
        assertStrictEquals(fields.level, 'error');
        assertStrictEquals(
            fields.context, 'test-ctx',
        );
        assert(
            typeof fields.ts === 'string'
            && TS_RE.test(fields.ts),
            `Expected RFC-3339 ts, got: ${
                String(fields.ts)
            }`,
        );
        assertStrictEquals(
            fields.requestId,
            undefined,
            'unbound log has no requestId',
        );
    },
);

Deno.test(
    'log.error without .with has no requestId',
    () => {
        const calls = capture(
            'error',
            () => log.error(
                'something failed',
                'test-ctx',
            ),
        );
        assertStrictEquals(calls.length, 1);
        const fields = fieldsOf(calls[0]!);
        assertStrictEquals(
            fields.requestId, undefined,
        );
        // No prose prefix either.
        assertStrictEquals(
            typeof calls[0]![0], 'string',
        );
        assert(
            !String(calls[0]![0]).includes(
                '[req:',
            ),
        );
    },
);

Deno.test(
    'log.with carries full requestId',
    () => {
        const fullId =
            'abcdefghijklmnopqrstug';
        const calls = capture(
            'error',
            () => log.with(fullId).error(
                'something failed',
                'test-ctx',
            ),
        );
        assertStrictEquals(calls.length, 1);
        const fields = fieldsOf(calls[0]!);
        assertStrictEquals(
            fields.requestId, fullId,
        );
        // Full id must NOT be truncated into
        // a prose [req:] tag.
        assert(
            !String(calls[0]![0]).includes(
                '[req:',
            ),
        );
    },
);

Deno.test(
    'log.with includes context and level fields',
    () => {
        const calls = capture(
            'error',
            () => log
                .with('abcdefghijklmnopqrstug')
                .error('msg', 'mymod'),
        );
        assertStrictEquals(calls.length, 1);
        assertStrictEquals(calls[0]![0], 'msg');
        const fields = fieldsOf(calls[0]!);
        assertStrictEquals(
            fields.context, 'mymod',
        );
        assertStrictEquals(
            fields.requestId,
            'abcdefghijklmnopqrstug',
        );
        assertStrictEquals(fields.level, 'error');
        assert(
            typeof fields.ts === 'string'
            && TS_RE.test(fields.ts),
        );
    },
);

Deno.test(
    'log.with works without context arg',
    () => {
        const calls = capture(
            'error',
            () => log
                .with('abcdefghijklmnopqrstug')
                .error('msg'),
        );
        assertStrictEquals(calls.length, 1);
        assertStrictEquals(calls[0]![0], 'msg');
        const fields = fieldsOf(calls[0]!);
        assertStrictEquals(
            fields.context, undefined,
        );
        assertStrictEquals(
            fields.requestId,
            'abcdefghijklmnopqrstug',
        );
    },
);

Deno.test(
    'plain object data merges into fields',
    () => {
        const err = new Error('boom');
        const calls = capture(
            'error',
            () => log.error(
                'page failed to init',
                'core',
                { page: 'dashboard' },
                err,
            ),
        );
        assertStrictEquals(calls.length, 1);
        const call = calls[0]!;
        assertStrictEquals(
            call[0], 'page failed to init',
        );
        const fields = fieldsOf(call);
        assertStrictEquals(
            fields.page, 'dashboard',
        );
        assertStrictEquals(fields.context, 'core');
        assertStrictEquals(call[2], err);
    },
);

Deno.test(
    'reserved field keys ignore extras',
    () => {
        const calls = capture(
            'error',
            () => log
                .with('abcdefghijklmnopqrstug')
                .error(
                    'spoof attempt',
                    'real-ctx',
                    {
                        ts: 'not-a-ts',
                        level: 'debug',
                        context: 'spoofed',
                        requestId: 'fake-id',
                        page: 'dashboard',
                    },
                ),
        );
        assertStrictEquals(calls.length, 1);
        const fields = fieldsOf(calls[0]!);
        assertStrictEquals(
            fields.level, 'error',
            'envelope level wins',
        );
        assertStrictEquals(
            fields.context, 'real-ctx',
            'envelope context wins',
        );
        assertStrictEquals(
            fields.requestId,
            'abcdefghijklmnopqrstug',
            'envelope requestId wins',
        );
        assert(
            typeof fields.ts === 'string'
            && TS_RE.test(fields.ts as string),
            `envelope ts wins, got: ${
                String(fields.ts)
            }`,
        );
        assertStrictEquals(
            fields.page, 'dashboard',
            'non-reserved extras still merge',
        );
    },
);

Deno.test(
    'Error data is not merged into fields',
    () => {
        const err = new Error('boom');
        const calls = capture(
            'error',
            () => log.error(
                'uncaught error',
                'core',
                err,
            ),
        );
        assertStrictEquals(calls.length, 1);
        const call = calls[0]!;
        const fields = fieldsOf(call);
        assertStrictEquals(call[2], err);
        // Error properties stay off the record.
        assertStrictEquals(
            fields.message, undefined,
        );
    },
);

Deno.test(
    'log.with respects configured level'
    + ' (debug skipped at warn)',
    () => {
        // Default level is 'warn' because
        // localStorage.getItem returns null.
        const calls = capture(
            'debug',
            () => log
                .with('abcdefghijklmnopqrstug')
                .debug('low-priority'),
        );
        assertStrictEquals(
            calls.length, 0,
            'debug should be suppressed'
            + ' at warn level',
        );
    },
);

Deno.test(
    'log.error respects configured level'
    + ' (debug skipped at warn)',
    () => {
        const calls = capture(
            'debug',
            () => log.debug('low-priority'),
        );
        assertStrictEquals(
            calls.length, 0,
            'debug should be suppressed'
            + ' at warn level',
        );
    },
);
