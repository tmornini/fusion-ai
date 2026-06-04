import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    latestActionForJti,
    chainIdForJti,
    jtisInChain,
    isTokenRevoked,
} from '../api/identity-tokens.ts';

const ev = (
    jti: string, action: string,
    chain: string, parent: string, at: string,
) => ({
    id: jti + '@' + at, jti, identity_id: 'current',
    action, chain_id: chain, parent_jti: parent, at,
});

const T1 = '2026-01-01T00:00:00.000Z';
const T2 = '2026-02-01T00:00:00.000Z';

test('latestActionForJti returns the latest per jti', () => {
    const rows = [
        ev('a', 'issued', 'c1', '', T1),
        ev('a', 'rotated', 'c1', '', T2),
    ];
    assert.equal(latestActionForJti(rows, 'a'), 'rotated');
    assert.equal(latestActionForJti(rows, 'unknown'), null);
});

test('a same-instant revoke beats an issue', () => {
    const rows = [
        ev('a', 'issued', 'c1', '', T1),
        ev('a', 'revoked', 'c1', '', T1),   // appended later
    ];
    assert.equal(latestActionForJti(rows, 'a'), 'revoked');
});

test('chainIdForJti and jtisInChain group a lineage', () => {
    const rows = [
        ev('a', 'issued', 'c1', '', T1),
        ev('a', 'rotated', 'c1', '', T2),
        ev('b', 'issued', 'c1', 'a', T2),
    ];
    assert.equal(chainIdForJti(rows, 'b'), 'c1');
    assert.equal(chainIdForJti(rows, 'z'), null);
    assert.deepEqual(jtisInChain(rows, 'c1').sort(), ['a', 'b']);
});

test('isTokenRevoked denies only a revoked jti', () => {
    const rows = [
        ev('a', 'issued', 'c1', '', T1),
        ev('b', 'revoked', 'c2', '', T1),
    ];
    assert.equal(isTokenRevoked(rows, 'a'), false);   // live
    assert.equal(isTokenRevoked(rows, 'b'), true);    // revoked
    assert.equal(isTokenRevoked(rows, 'unknown'), false);
});
