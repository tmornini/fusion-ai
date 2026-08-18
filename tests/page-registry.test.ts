import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_REGISTRY } from
    '../web-app/app/page-registry.ts';

test('PageEntry has no requiresSchema flag',
() => {
    for (const entry of Object.values(
        PAGE_REGISTRY,
    )) {
        assert.equal(
            'requiresSchema' in entry, false,
        );
    }
});
