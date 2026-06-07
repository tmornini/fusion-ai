import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPageAbort } from '../web-app/app/page-lifecycle.ts';

test('createPageAbort pairs a controller with its signal', () => {
    const { pageAbort, signal } = createPageAbort();
    assert.equal(signal, pageAbort.signal);
    assert.equal(signal.aborted, false);
    pageAbort.abort();
    assert.equal(signal.aborted, true);
});
