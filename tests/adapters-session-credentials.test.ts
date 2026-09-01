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

import { assertEquals, assertStrictEquals, assertThrows } from '@std/assert';
import {
    getSessionCredentials,
    putSessionCredentials,
    deleteSessionCredentials,
    SessionCredentialsCorruptError,
    setCookieSession,
} from '../web-app/app/adapters/session-credentials.ts';
import {
    getSessionToken,
    putSessionToken,
} from '../web-app/app/adapters/session-token.ts';
import { STORAGE_KEY_AUTHORIZATION } from
    '../web-app/app/storage-keys.ts';
import { devToken, organizationToken } from './token-fixtures.ts';

const KEY = STORAGE_KEY_AUTHORIZATION;

Deno.test('an unset credential reads as null (honest absence)',
() => {
    localStorage.clear();
    assertStrictEquals(getSessionCredentials(), null);
});

Deno.test('a stored credential round-trips by value', async () => {
    localStorage.clear();
    const creds = {
        accessToken: await devToken(),
        refreshToken: await organizationToken(),
    };
    putSessionCredentials(creds);
    assertEquals(getSessionCredentials(), creds);
});

Deno.test('a non-JSON blob reads as Corrupt, never null', () => {
    localStorage.clear();
    localStorage.setItem(KEY, 'not json at all');
    assertThrows(
        () => getSessionCredentials(),
        SessionCredentialsCorruptError);
});

Deno.test('a blob missing a field reads as Corrupt', async () => {
    localStorage.clear();
    localStorage.setItem(
        KEY, JSON.stringify({ access_token: await devToken() }));
    assertThrows(
        () => getSessionCredentials(),
        SessionCredentialsCorruptError);
});

Deno.test('a blob with an empty field reads as Corrupt',
async () => {
    localStorage.clear();
    localStorage.setItem(KEY, JSON.stringify({
        access_token: await devToken(),
        refresh_token: '',
    }));
    assertThrows(
        () => getSessionCredentials(),
        SessionCredentialsCorruptError);
});

Deno.test('a blob with an undecodable token reads as Corrupt',
async () => {
    localStorage.clear();
    localStorage.setItem(KEY, JSON.stringify({
        access_token: await devToken(),
        refresh_token: 'garbage',
    }));
    assertThrows(
        () => getSessionCredentials(),
        SessionCredentialsCorruptError);
});

Deno.test('a deleted credential reads as null again', async () => {
    localStorage.clear();
    putSessionCredentials({
        accessToken: await devToken(),
        refreshToken: await organizationToken(),
    });
    deleteSessionCredentials();
    assertStrictEquals(getSessionCredentials(), null);
});

Deno.test('deleting an absent credential is a no-op', () => {
    localStorage.clear();
    deleteSessionCredentials();
    assertStrictEquals(getSessionCredentials(), null);
});

Deno.test('a failed credential write propagates, not swallowed',
() => {
    localStorage.clear();
    const original = localStorage.setItem;
    localStorage.setItem = () => {
        throw new Error('disk full');
    };
    assertThrows(
        () => putSessionCredentials({
            accessToken: 'a', refreshToken: 'b',
        }),
        Error,
        'disk full',
    );
    localStorage.setItem = original;
});

Deno.test('cookie-session stores access in memory, not localStorage',
async () => {
    localStorage.clear();
    setCookieSession(true);
    try {
        const access = await devToken();
        putSessionCredentials({
            accessToken: access,
            refreshToken: await organizationToken(),
        });
        assertStrictEquals(
            localStorage.getItem(KEY), null);
        assertStrictEquals(getSessionCredentials(), null);
        assertStrictEquals(getSessionToken(), access);
        deleteSessionCredentials();
        assertThrows(() => getSessionToken());
    } finally {
        setCookieSession(false);
    }
});

Deno.test('cookie-session put does not write refresh_token',
async () => {
    localStorage.clear();
    putSessionToken(await devToken());
    setCookieSession(true);
    try {
        putSessionCredentials({
            accessToken: await organizationToken(),
            refreshToken: await devToken(),
        });
        assertStrictEquals(
            localStorage.getItem(KEY), null);
    } finally {
        setCookieSession(false);
    }
});
