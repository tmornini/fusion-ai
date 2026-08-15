import { PAGE_REGISTRY } from './page-registry.ts';
import { createHttpFacade } from './adapters/http-facade.ts';
import { putClientFacade } from './adapters/facade-holder.ts';
import { putSessionToken } from './adapters/session-token.ts';
import { bootApp } from './app-boot.ts';
import {
    ANONYMOUS_ID,
} from '../../shared/access-token-decode.ts';
import { base64UrlEncode } from '../../shared/base64url.ts';

// Server-ZIP esbuild entry. Imports pages (via
// PAGE_REGISTRY loaders) and the fetch facade. The
// in-page API and IndexedDB backend stay off this
// graph.

function serverOrigin(): string {
    const origin = location.origin;
    return origin === 'null' ? '' : origin;
}

// Decode-only anonymous seed. The server client cannot
// mint; principalFromToken only reads the claims body.
function unsignedAnonymousToken(): string {
    const header = '{"alg":"none","typ":"JWT"}';
    const claims = JSON.stringify({
        sub: ANONYMOUS_ID,
        roles: [],
        name: 'Anonymous',
        aud: 'fusion-ai-web',
        iat: 0,
        nbf: 0,
        exp: 0,
        jti: 'anonymous-seed',
    });
    return base64UrlEncode(header)
        + '.'
        + base64UrlEncode(claims)
        + '.unsigned';
}

void PAGE_REGISTRY;

document.addEventListener(
    'DOMContentLoaded',
    async () => {
        putClientFacade(
            createHttpFacade(serverOrigin()),
        );
        putSessionToken(unsignedAnonymousToken());
        await bootApp({
            hasSchema: true,
            recoverMissingTable: false,
        });
    },
);
