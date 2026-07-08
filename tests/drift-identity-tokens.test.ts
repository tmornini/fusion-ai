import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { handleRequest, PUT } from '../api/api.ts';
import { EntityNotFoundError } from '../api/db.ts';
import type { DbAdapter } from '../api/db.ts';
import type { Id } from '../api/types.ts';
import { base64UrlDecode } from '../shared/base64url.ts';
import { hashPassword } from '../shared/password-hash.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { seedRootAdmin } from './root-admin-fixture.ts';
import {
    seedIdentityPii,
    seedIdentityCredential,
} from './identity-fixtures.ts';
import { DEV_TOKEN, devToken } from './token-fixtures.ts';
import { makeAssertionSigner } from './client-assertion-fixtures.ts';
import {
    deriveIdentityTokens,
    deriveIdentityToken,
    deriveIdentityTokenEventsForJti,
} from '../api/derive-identity-tokens.ts';

// The Phase 13 Task 6 drift gate: api/derive-identity-tokens.ts
// proven equal to the row-plane `identity_tokens` table (GET
// /identity-tokens' own read source from this task on) — and the
// by-jti fold (deriveIdentityTokenEventsForJti) proven equal to
// the row plane's own getAllWhere('jti', jti) — before the flips
// in api/routes.ts and api/authentication.ts are trusted to run
// in production. The 41-combo verb-gap file (tests/api-identity-
// spine-verb-gaps.test.ts) is untouched — GET stays admin-only;
// authorization is not this task's surface.
//
// COLLECTION-ORDER CAUTION (Step 0, adversarial byte-parity #1):
// the derivation sorts byIdAscending (== IndexedDB's own
// production getAll order), but the memory backend's own
// getAll/getAllWhere is INSERTION-ordered — every SET-equality
// leg below sorts BOTH sides (sortById) before comparing, the
// shipped role_grants drift idiom (tests/drift-identities.
// test.ts), never a raw-order equality.

const BASE = 'http://localhost';
const AT = '2026-01-01T00:00:00.000000Z';
const AT2 = '2026-01-01T00:00:01.000000Z';

function req(
    method: string,
    path: string,
    token: string,
    body?: unknown,
): Request {
    return new Request(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
}

function sortById<T extends { id: string }>(
    rows: readonly T[],
): T[] {
    return [...rows].sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

async function freshDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    return db;
}

function tokenGrant(
    db: DbAdapter, body: unknown,
): Promise<Response> {
    return handleRequest(db, new Request(
        `${BASE}/authentication/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        },
    ));
}

function authorize(
    db: DbAdapter, body: unknown,
): Promise<Response> {
    return handleRequest(db, new Request(
        `${BASE}/authentication/authorize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        },
    ));
}

// A signed JWT's `jti` claim, read WITHOUT verification — test
// bookkeeping only (which live jti a mint just handed back), never
// a trust decision; every route under test still verifies the
// token for real.
function jtiOf(token: string): string {
    const payload = token.split('.')[1]!;
    const claims =
        JSON.parse(base64UrlDecode(payload)) as { jti: string };
    return claims.jti;
}

// -- 1: collection + single-row parity, the by-jti shape per --
// -- jti, and the 404 body -----------------------------------------

test('collection + single-row parity vs the row plane, the'
+ ' by-jti shape per jti, and the 404 body', async () => {
    const db = await freshDb();
    await PUT(db, 'identity-tokens/tok-a1', {
        jti: 'jti-a1', identity_id: 'current',
        action: 'issued', chain_id: 'chain-a', at: AT,
    }, DEV_TOKEN);
    await PUT(db, 'identity-tokens/tok-a2', {
        jti: 'jti-a1', identity_id: 'current',
        action: 'rotated', chain_id: 'chain-a', at: AT2,
    }, DEV_TOKEN);
    await PUT(db, 'identity-tokens/tok-b1', {
        jti: 'jti-b1', identity_id: 'current',
        action: 'issued', chain_id: 'chain-b', at: AT,
    }, DEV_TOKEN);

    const derivedAll = sortById(await deriveIdentityTokens(db));
    const oldAll = sortById(await db.identityTokens.getAll());
    assert.deepEqual(derivedAll, oldAll);
    assert.equal(derivedAll.length, 3);

    for (const row of oldAll) {
        const one = await deriveIdentityToken(db, row.id);
        assert.deepEqual(one, row);
    }

    const missingId = 'no-such-token';
    const expectedMessage =
        'Not found: identity_tokens/' + missingId;
    await assert.rejects(
        () => deriveIdentityToken(db, missingId),
        (err: unknown) =>
            err instanceof EntityNotFoundError
            && err.message === expectedMessage,
    );
    await assert.rejects(
        () => db.identityTokens.getById(missingId),
        (err: unknown) =>
            err instanceof EntityNotFoundError
            && err.message === expectedMessage,
    );

    for (const jti of ['jti-a1', 'jti-b1']) {
        const derivedByJti = sortById(
            await deriveIdentityTokenEventsForJti(db, jti),
        );
        const oldByJti = sortById(
            await db.identityTokens.getAllWhere('jti', jti),
        );
        assert.deepEqual(derivedByJti, oldByJti);
    }
    assert.deepEqual(
        await deriveIdentityTokenEventsForJti(db, 'no-such-jti'),
        [],
    );
});

// -- 2: THE KEY-ORDER PROOF + the negative counter-example -----
// -- (Step 0) -------------------------------------------------------

test('KEY ORDER: the derived row is id-LAST, byte-identical to'
+ ' the stored row; an id-FIRST spread carries the SAME values'
+ ' but is NOT byte-identical (the negative counter-example)',
async () => {
    const db = await freshDb();
    await PUT(db, 'identity-tokens/tok-order', {
        jti: 'jti-order', identity_id: 'current',
        action: 'issued', chain_id: 'chain-order', at: AT,
    }, DEV_TOKEN);

    const row = await db.identityTokens.getById('tok-order');
    const derived = await deriveIdentityToken(db, 'tok-order');
    assert.deepEqual(derived, row);

    const expectedOrder = [
        'jti', 'identity_id', 'action', 'chain_id', 'at', 'id',
    ];
    assert.deepEqual(Object.keys(row), expectedOrder);
    assert.deepEqual(Object.keys(derived), expectedOrder);
    assert.equal(
        JSON.stringify(derived), JSON.stringify(row),
    );

    // The id-FIRST spread api/routes.ts's WRITE_RESPONSE_SPECS
    // ['identity-tokens/:id'].successBody literally forms for the
    // ledger's STORED RESPONSE message — same field VALUES
    // (deepEqual holds) but NOT the same bytes (JSON.stringify
    // preserves insertion order; `id` leads here instead of
    // trailing).
    const idFirst = {
        id: derived.id,
        jti: derived.jti,
        identity_id: derived.identity_id,
        action: derived.action,
        chain_id: derived.chain_id,
        at: derived.at,
    };
    assert.deepEqual(idFirst, derived);
    assert.notEqual(
        JSON.stringify(idFirst), JSON.stringify(derived),
    );
});

// -- 3: deriveIdentityTokenEventsForJti — pre-tx vs in-tx -------
// -- PARITY (the membershipExistsFor precedent, api/derive- -----
// -- memberships.ts's own leg-5 shape) -------------------------------

test('deriveIdentityTokenEventsForJti: byte-identical pre-tx'
+ ' (the plain adapter) vs in-tx (an open db.transaction view'
+ ' sharing rotateRefreshJti/revokeTokenChain\'s own table'
+ ' list) — the membershipExistsFor precedent', async () => {
    const db = await freshDb();
    await PUT(db, 'identity-tokens/tok-tx1', {
        jti: 'jti-tx', identity_id: 'current',
        action: 'issued', chain_id: 'chain-tx', at: AT,
    }, DEV_TOKEN);
    await PUT(db, 'identity-tokens/tok-tx2', {
        jti: 'jti-tx', identity_id: 'current',
        action: 'rotated', chain_id: 'chain-tx', at: AT2,
    }, DEV_TOKEN);

    const tokenTxTables =
        ['identity_tokens', 'requests', 'responses'];

    const preTx =
        await deriveIdentityTokenEventsForJti(db, 'jti-tx');
    const inTx = await db.transaction(
        tokenTxTables,
        (view) =>
            deriveIdentityTokenEventsForJti(view, 'jti-tx'),
    );
    assert.deepEqual(inTx, preTx);
    assert.equal(preTx.length, 2);

    const preTxMissing =
        await deriveIdentityTokenEventsForJti(db, 'ghost-jti');
    const inTxMissing = await db.transaction(
        tokenTxTables,
        (view) =>
            deriveIdentityTokenEventsForJti(view, 'ghost-jti'),
    );
    assert.deepEqual(inTxMissing, preTxMissing);
    assert.deepEqual(preTxMissing, []);
});

// -- 4: the LIVE-MINTED chain sweep — every grant type, rotate, --
// -- replay-revoke, explicit revoke, the org-exchange hop -------

const PASSWORD = 's3cret';
const PASSWORD_EMAIL = 'drift-tokens@example.com';

// Builds a rich, live-minted identity_tokens ledger exercising
// every writer this task's flip must see: password -> code ->
// exchange (chain 1's root), a refresh grant (chain 1's first
// rotation), a raw rotation op (chain 1's second rotation), a
// replay of chain 1's now-retired first-rotation jti (revokes the
// WHOLE chain: 3 distinct jtis), a client_credentials grant
// (chain 2's root) followed by an explicit revocation, a DIRECT
// token-exchange self-delegation grant (chain 3's root, a real
// /authentication/token request), and the org-exchange facade hop
// (chain 4's root, no AUTH pair). Returns the db plus every jti
// so callers needn't re-derive them.
async function richLedgerDb(): Promise<{
    readonly db: MemoryDbAdapter;
    readonly chain1: { root: Id; refreshed: Id; live: Id };
    readonly chain2Root: Id;
}> {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    await seedRootAdmin(db);
    await seedIdentityPii(db, 'current', {
        name: 'Drift Tokens', email: PASSWORD_EMAIL,
        phone: '', bio: '',
    });
    await seedIdentityCredential(
        db, 'current', 'cred-drift-tokens', {
            identity_id: 'current', kind: 'password',
            status: 'set', secret: await hashPassword(PASSWORD),
            at: AT,
        },
    );

    // -- chain 1 root: password -> authorization_code -> token --
    const authorizeRes = await authorize(db, {
        method: 'password', username: PASSWORD_EMAIL,
        password: PASSWORD, client_id: 'web',
    });
    assert.equal(authorizeRes.status, 200);
    const { code } = await authorizeRes.json() as { code: string };
    const chain1Grant = await tokenGrant(db, {
        grant_type: 'authorization_code', code,
    });
    assert.equal(chain1Grant.status, 200);
    const chain1GrantBody =
        await chain1Grant.json() as { refresh_token: string };
    const chain1Root = jtiOf(chain1GrantBody.refresh_token);

    // -- refresh grant: rotates chain 1's root --
    const chain1Refresh = await tokenGrant(db, {
        grant_type: 'refresh',
        refresh_token: chain1GrantBody.refresh_token,
    });
    assert.equal(chain1Refresh.status, 200);
    const chain1RefreshBody =
        await chain1Refresh.json() as { refresh_token: string };
    const chain1Refreshed = jtiOf(chain1RefreshBody.refresh_token);

    // -- raw rotation op: a second, distinct rotation --
    const chain1RotateRes = await handleRequest(db, req(
        'POST',
        `/identity-tokens/${chain1Refreshed}/rotation`,
        DEV_TOKEN, {},
    ));
    assert.equal(chain1RotateRes.status, 200);
    const { jti: chain1Live } =
        await chain1RotateRes.json() as { jti: string };

    // -- replay-revoke: chain1Refreshed is now retired; presenting
    // it again is reuse — the WHOLE chain (root, refreshed, live:
    // 3 distinct jtis) revokes --
    const replayRes = await handleRequest(db, req(
        'POST',
        `/identity-tokens/${chain1Refreshed}/rotation`,
        DEV_TOKEN, {},
    ));
    assert.equal(replayRes.status, 409);

    // -- chain 2 root: client_credentials, explicitly revoked --
    const signer = await makeAssertionSigner('ES256');
    const now = Math.floor(Date.now() / 1000);
    const assertion = await signer.sign({
        iss: 'svc-drift-tokens', sub: 'svc-drift-tokens',
        aud: 'fusion-ai-web', exp: now + 300, iat: now,
        jti: 'assert-drift-tokens-1',
    });
    await db.clients.put('svc-drift-tokens', {
        grant_types: 'client_credentials', redirect_uris: '',
        jwks: signer.jwks, aud: 'fusion-ai-web',
        status: 'active',
    });
    const chain2Grant = await tokenGrant(db, {
        grant_type: 'client_credentials',
        client_id: 'svc-drift-tokens',
        client_assertion: assertion,
    });
    assert.equal(chain2Grant.status, 200);
    const chain2GrantBody =
        await chain2Grant.json() as { refresh_token: string };
    const chain2Root = jtiOf(chain2GrantBody.refresh_token);
    const chain2RevokeRes = await handleRequest(db, req(
        'POST', `/identity-tokens/${chain2Root}/revocation`,
        DEV_TOKEN, {},
    ));
    assert.equal(chain2RevokeRes.status, 204);

    // -- chain 3 root: a DIRECT token-exchange self-delegation
    // grant — a real /authentication/token request, distinct
    // from the internal org-exchange hop below --
    const selfToken = await devToken('current');
    const chain3Grant = await tokenGrant(db, {
        grant_type: 'token-exchange',
        subject_token: selfToken, actor_token: selfToken,
    });
    assert.equal(chain3Grant.status, 200);

    // -- chain 4 root: the org-exchange facade hop — a flat token
    // internally exchanges itself for an org-scoped session,
    // minting its OWN chain root (no AUTH pair) --
    const flatToken = await devToken('current');
    const hopRes = await handleRequest(db, new Request(
        `${BASE}/organizations/1/identity-tokens`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + flatToken },
        },
    ));
    assert.equal(hopRes.status, 200);

    return {
        db,
        chain1: {
            root: chain1Root, refreshed: chain1Refreshed,
            live: chain1Live,
        },
        chain2Root,
    };
}

test('the live-minted chain sweep: derived collection parity +'
+ ' the by-jti shape for EVERY jti the sweep minted (6 distinct'
+ ' jtis across 4 chains, 12 rows total)', async () => {
    const { db, chain1, chain2Root } = await richLedgerDb();

    const derivedAll = sortById(await deriveIdentityTokens(db));
    const oldAll = sortById(await db.identityTokens.getAll());
    assert.deepEqual(derivedAll, oldAll);
    // chain 1: 1 (root issued) + 2 (first rotation) + 2 (second
    // rotation) + 3 (replay-revoke, one per distinct jti) = 8;
    // chain 2: 1 (root issued) + 1 (explicit revoke) = 2;
    // chain 3 + chain 4: 1 root each = 2. Total 12.
    assert.equal(derivedAll.length, 12);

    const allJtis = [...new Set(oldAll.map((row) => row.jti))];
    assert.equal(allJtis.length, 6);
    for (const known of [
        chain1.root, chain1.refreshed, chain1.live, chain2Root,
    ]) {
        assert.ok(allJtis.includes(known));
    }
    for (const jti of allJtis) {
        const derivedByJti = sortById(
            await deriveIdentityTokenEventsForJti(db, jti),
        );
        const oldByJti = sortById(
            await db.identityTokens.getAllWhere('jti', jti),
        );
        assert.deepEqual(derivedByJti, oldByJti);
    }

    // chain 1's WHOLE lineage ends revoked (the replay branch);
    // chain 2's single jti ends revoked (the explicit branch).
    for (const jti of [chain1.root, chain1.refreshed, chain1.live]) {
        const events = await deriveIdentityTokenEventsForJti(
            db, jti,
        );
        assert.ok(events.some((e) => e.action === 'revoked'));
    }
    const chain2Events =
        await deriveIdentityTokenEventsForJti(db, chain2Root);
    assert.ok(chain2Events.some((e) => e.action === 'revoked'));
});

// -- 5: GET wire byte-parity — the ACTUAL flipped route, not the --
// -- derivation directly: id-LAST key order, byIdAscending -------
// -- collection order (== IndexedDB's production getAll order), --
// -- and the 404 body -----------------------------------------------

test('GET /identity-tokens + /:id are wire byte-identical to'
+ ' the row plane through the ACTUAL flipped route: id-LAST key'
+ ' order, byIdAscending collection order, and the 404 body',
async () => {
    const db = await freshDb();
    // Inserted in NON-lex order (w3, then w1, then w2) so the
    // memory backend's own insertion-ordered getAll and the
    // derivation's byIdAscending order genuinely diverge — a test
    // that inserted in lex order already would pass by ACCIDENT
    // of insertion order, never by the property it claims to
    // prove (the COLLECTION-ORDER CAUTION, Step 0).
    await PUT(db, 'identity-tokens/tok-w3', {
        jti: 'jti-w3', identity_id: 'current',
        action: 'issued', chain_id: 'chain-w3', at: AT,
    }, DEV_TOKEN);
    await PUT(db, 'identity-tokens/tok-w1', {
        jti: 'jti-w1', identity_id: 'current',
        action: 'issued', chain_id: 'chain-w', at: AT,
    }, DEV_TOKEN);
    await PUT(db, 'identity-tokens/tok-w2', {
        jti: 'jti-w1', identity_id: 'current',
        action: 'rotated', chain_id: 'chain-w', at: AT2,
    }, DEV_TOKEN);

    // The row plane's OWN natural order, re-sorted id-lex (as
    // production IndexedDB's getAll already is) is the expected
    // wire text — proving the flipped route's actual HTTP
    // response bytes, not merely the derivation function's return
    // value, match what the row plane would have served.
    const oldRowsSorted = sortById(await db.identityTokens.getAll());
    const collectionRes = await handleRequest(
        db, req('GET', '/identity-tokens', DEV_TOKEN),
    );
    assert.equal(collectionRes.status, 200);
    assert.equal(
        await collectionRes.text(), JSON.stringify(oldRowsSorted),
    );

    for (const row of oldRowsSorted) {
        const singleRes = await handleRequest(db, req(
            'GET', '/identity-tokens/' + row.id, DEV_TOKEN,
        ));
        assert.equal(singleRes.status, 200);
        assert.equal(
            await singleRes.text(), JSON.stringify(row),
        );
    }

    const missingRes = await handleRequest(db, req(
        'GET', '/identity-tokens/no-such-token', DEV_TOKEN,
    ));
    assert.equal(missingRes.status, 404);
    const missingBody =
        await missingRes.json() as { error: string };
    assert.equal(
        missingBody.error,
        'Not found: identity_tokens/no-such-token',
    );
});
