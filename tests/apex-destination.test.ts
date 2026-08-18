import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    APEX_SIGNED_IN,
    APEX_SIGNED_OUT,
    resolveApexLocation,
} from '../web-app/app/apex-destination.ts';

test('a live session hops to dashboard', async () => {
    assert.equal(
        await resolveApexLocation(async () => true),
        APEX_SIGNED_IN,
    );
    assert.equal(
        APEX_SIGNED_IN,
        'dashboard/index.html',
    );
});

test('a dead session hops to landing', async () => {
    assert.equal(
        await resolveApexLocation(async () => false),
        APEX_SIGNED_OUT,
    );
    assert.equal(
        APEX_SIGNED_OUT,
        'landing/index.html',
    );
});

test('a probe fault hops to landing', async () => {
    assert.equal(
        await resolveApexLocation(async () => {
            throw new Error('network');
        }),
        APEX_SIGNED_OUT,
    );
});
