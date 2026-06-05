import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    credentialRevealPanel,
} from '../web-app/app/presenters/credential-reveal.ts';

test('renders every seeded identity username and password',
() => {
    const out = credentialRevealPanel({
        identities: [
            {
                identityId: 'current',
                username: 'demo@example.com',
                password: 'aB3xY7zQ9w',
            },
            {
                identityId: 'u2',
                username: 'sarah@example.com',
                password: 'kP9mN2rT4x',
            },
        ],
    }).toString();
    assert.match(out, /demo@example\.com/);
    assert.match(out, /aB3xY7zQ9w/);
    assert.match(out, /sarah@example\.com/);
    assert.match(out, /kP9mN2rT4x/);
    assert.match(out, /class="credential-reveal"/);
});

test('HTML-escapes a hostile password', () => {
    const out = credentialRevealPanel({
        identities: [{
            identityId: 'x',
            username: 'admin',
            password: '<img src=x onerror="alert(1)">',
        }],
    }).toString();
    // the raw injection must not survive; its escaped form must
    assert.equal(out.includes('<img src=x'), false);
    assert.match(out, /&lt;img src=x/);
    assert.match(out, /onerror=&quot;alert/);
});
