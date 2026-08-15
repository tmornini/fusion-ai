import { test, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    createHttpFacade,
} from '../web-app/app/adapters/http-facade.ts';
import {
    setCookieSession,
} from '../web-app/app/adapters/session-credentials.ts';
import { putSessionToken } from
    '../web-app/app/adapters/session-token.ts';

afterEach(() => {
    setCookieSession(false);
});

async function withMockFetch(
    handler: typeof fetch,
    run: () => Promise<void>,
): Promise<void> {
    const original = globalThis.fetch;
    globalThis.fetch = handler;
    try {
        await run();
    } finally {
        globalThis.fetch = original;
    }
}

test('two concurrent 401s cause one refresh POST',
async () => {
    setCookieSession(true);
    putSessionToken('dead-access');
    let refreshPosts = 0;
    let nextAccess = 0;
    await withMockFetch(async (input, init) => {
        const url = String(input);
        if (url.endsWith('/authentication/token')) {
            refreshPosts += 1;
            nextAccess += 1;
            return new Response(
                JSON.stringify({
                    access_token: 'fresh-' + nextAccess,
                    token_type: 'Bearer',
                    expires_in: 900,
                }),
                { status: 200 },
            );
        }
        const token = new Headers(init?.headers)
            .get('Authorization');
        if (token === 'Bearer dead-access') {
            return new Response(
                JSON.stringify({ error: 'invalid_token' }),
                { status: 401 },
            );
        }
        return new Response('[]', { status: 200 });
    }, async () => {
        const facade = createHttpFacade(
            'http://example.test',
        );
        const [a, b] = await Promise.all([
            facade.GET('members', 'dead-access'),
            facade.GET('ideas', 'dead-access'),
        ]);
        assert.ok(Array.isArray(a));
        assert.ok(Array.isArray(b));
    });
    assert.equal(refreshPosts, 1);
});
