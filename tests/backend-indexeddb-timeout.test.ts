import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    IDB_OP_TIMEOUT_MS,
    withIdbTimeout,
} from '../api/backend-indexeddb.ts';

// withIdbTimeout is the shared race every IndexedDB open /
// delete / request / transaction promise rides. Memory and
// localStorage backends cannot hang, so the wrapper is unit-
// tested in isolation against synthetic promises.

test('IDB_OP_TIMEOUT_MS is a positive bound', () => {
    assert.equal(typeof IDB_OP_TIMEOUT_MS, 'number');
    assert.ok(IDB_OP_TIMEOUT_MS > 0);
});

test('withIdbTimeout resolves when the op settles first',
async () => {
    const value = await withIdbTimeout(
        Promise.resolve(42),
        'test op',
        50,
    );
    assert.equal(value, 42);
});

test('withIdbTimeout rejects when the op rejects first',
async () => {
    await assert.rejects(
        () => withIdbTimeout(
            Promise.reject(new Error('platform boom')),
            'test op',
            50,
        ),
        (err: unknown) =>
            err instanceof Error
            && err.message === 'platform boom',
    );
});

test('withIdbTimeout rejects a hung op after the bound',
async () => {
    // Never settles — the timer must win.
    const hung = new Promise<void>(() => {});
    const started = Date.now();
    await assert.rejects(
        () => withIdbTimeout(hung, 'hung op', 40),
        (err: unknown) =>
            err instanceof Error
            && /hung op timed out after 40ms/.test(
                err.message,
            ),
    );
    // Bound is approximate; require it did not wait forever
    // and waited at least most of the timeout.
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 30, `elapsed ${elapsed}`);
    assert.ok(elapsed < 500, `elapsed ${elapsed}`);
});

test('withIdbTimeout clears the timer on success',
async () => {
    // If the timer leaked, a late reject would surface as an
    // unhandledRejection. Pin that a fast resolve leaves no
    // pending timer noise within the timeout window.
    let unhandled = 0;
    const onUnhandled = (): void => {
        unhandled += 1;
    };
    process.on('unhandledRejection', onUnhandled);
    try {
        await withIdbTimeout(
            Promise.resolve('ok'),
            'fast op',
            30,
        );
        await new Promise((r) => setTimeout(r, 50));
        assert.equal(unhandled, 0);
    } finally {
        process.off('unhandledRejection', onUnhandled);
    }
});
