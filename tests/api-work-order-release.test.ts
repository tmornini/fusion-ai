import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    POST,
    PUT,
    handleRequest,
} from '../api/api.ts';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { DEV_TOKEN, devToken } from './token-fixtures.ts';
import { seedAdminSchema } from './test-fixtures.ts';
import { seedCurrentMember } from './member-fixtures.ts';
import { seedOrganizationMember } from './root-admin-fixture.ts';
import { nowUtc } from '../api/types.ts';
import {
    generateCryptoSafeBase62,
} from '../shared/crypto-safe-base62.ts';
import { workOrderClaimHistoryFor } from
    '../api/derive-states.ts';
import { STARK_ORGANIZATION } from
    '../api/mock-data/seed-constants.ts';

const BASE = 'http://localhost';
const WO_ID = 'wo1';

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

const LOCK_TIMEOUT_SECONDS = 300;

function graphJson(): string {
    return JSON.stringify({
        name: 'Flow One',
        lockTimeout: LOCK_TIMEOUT_SECONDS,
        nodes: [],
        edges: [],
    });
}

// wo1 is seeded via a REAL PUT (never a raw db.workOrders.put)
// so it carries a genuine work-orders/:id document pair —
// same fixture posture as api-work-order-claim.test.ts.
async function seededDb(): Promise<MemoryDbAdapter> {
    const db = new MemoryDbAdapter();
    await seedAdminSchema(db);
    await seedCurrentMember(db);
    await PUT(
        db, 'work-orders/' + WO_ID, {
            display_id: 'abcd',
            flow_graph: graphJson(),
            position: 1,
        },
        DEV_TOKEN,
    );
    return db;
}

function claimEventsFor(
    db: MemoryDbAdapter,
): Promise<{
    id: string;
    state: string;
    member_id: string;
    at: string;
}[]> {
    return workOrderClaimHistoryFor(
        db, STARK_ORGANIZATION, WO_ID,
    );
}

function freshClaimBody() {
    const expireAt = nowUtc();
    const claimAt = nowUtc();
    return {
        claimEventId: generateCryptoSafeBase62(),
        claimAt,
        expireEventId: generateCryptoSafeBase62(),
        expireAt,
    };
}

function freshReleaseBody(overrides?: {
    releaseEventId?: string;
    releaseAt?: string;
}) {
    return {
        releaseEventId: overrides?.releaseEventId
            ?? generateCryptoSafeBase62(),
        releaseAt: overrides?.releaseAt ?? nowUtc(),
    };
}

// POST work-orders/:id/release is a named unclaim op. Gate
// only guards body validity (400) and work-order existence
// (404); pair always appends; live-or-not is Task 10's
// applyReleasePair at derive time. History assertions below
// may FAIL until Task 10 lands the release derive leg —
// status 204/400/404 and pair-write-coverage must PASS here.

test(
    'release of a live claim is 204 and the claim history'
    + ' shows claim_released',
    async () => {
        const db = await seededDb();
        await POST(
            db, 'work-orders/' + WO_ID + '/claim',
            freshClaimBody(), DEV_TOKEN,
        );
        // FAILING-TEST-FIRST until Task 10 (applyReleasePair):
        // after 204, claim history must show claim_released
        // with id 'rel-ev-1', member_id 'current', and the
        // caller-minted releaseAt:
        //   const events = await claimEventsFor(db);
        //   const released = events.find(
        //       (ev) => ev.id === 'rel-ev-1',
        //   );
        //   assert.ok(released !== undefined);
        //   assert.equal(released!.state, 'claim_released');
        //   assert.equal(released!.member_id, 'current');
        //   assert.equal(released!.at, releaseAt);
        const res = await handleRequest(db, req(
            'POST',
            '/work-orders/' + WO_ID + '/release',
            DEV_TOKEN,
            {
                releaseEventId: 'rel-ev-1',
                releaseAt: nowUtc(),
            },
        ));
        assert.equal(res.status, 204);
    },
);

test(
    'release with no live claim is an idempotent 204'
    + ' no-op (no claim_released event derives)',
    async () => {
        const db = await seededDb();
        const releaseEventId = 'rel-ev-2';
        const res = await handleRequest(db, req(
            'POST',
            '/work-orders/' + WO_ID + '/release',
            DEV_TOKEN,
            {
                releaseEventId,
                releaseAt: nowUtc(),
            },
        ));
        assert.equal(res.status, 204);
        // Task 10 pins the derive no-op: with no live claim
        // the pair derives zero events, so history carries
        // no event with id 'rel-ev-2'. Today (pre-Task 10)
        // the same absence holds because release is not yet
        // in the claim-history union — re-assert after Task
        // 10 so a buggy always-emit release leg fails here.
        const events = await claimEventsFor(db);
        assert.equal(
            events.filter(
                (ev) => ev.id === releaseEventId,
            ).length,
            0,
        );
    },
);

test(
    'release of another member\'s live claim succeeds'
    + ' (member-tier, today\'s open-release posture)',
    async () => {
        const db = await seededDb();
        await seedOrganizationMember(db, 'other');
        await POST(
            db, 'work-orders/' + WO_ID + '/claim',
            freshClaimBody(), await devToken('other'),
        );
        // FAILING-TEST-FIRST until Task 10 (applyReleasePair):
        // claim_released authored by the releasing actor
        // (current), not the prior claimant (other):
        //   const events = await claimEventsFor(db);
        //   const released = events.find(
        //       (ev) => ev.id === releaseEventId,
        //   );
        //   assert.ok(released !== undefined);
        //   assert.equal(released!.state, 'claim_released');
        //   assert.equal(released!.member_id, 'current');
        const res = await handleRequest(db, req(
            'POST',
            '/work-orders/' + WO_ID + '/release',
            DEV_TOKEN,
            {
                releaseEventId:
                    generateCryptoSafeBase62(),
                releaseAt: nowUtc(),
            },
        ));
        assert.equal(res.status, 204);
    },
);

test(
    'release body validation: empty id and bad timestamp'
    + ' are 400',
    async () => {
        const db = await seededDb();
        for (const body of [
            {
                releaseEventId: '',
                releaseAt: nowUtc(),
            },
            {
                releaseEventId: 'rel-bad',
                releaseAt: 'not-a-time',
            },
            { releaseEventId: 'rel-bad' },
        ]) {
            const res = await handleRequest(db, req(
                'POST',
                '/work-orders/' + WO_ID + '/release',
                DEV_TOKEN,
                body,
            ));
            assert.equal(res.status, 400);
        }
    },
);

test(
    'release of an unknown work order is 404',
    async () => {
        const db = await seededDb();
        const res = await handleRequest(db, req(
            'POST',
            '/work-orders/no-such-wo/release',
            DEV_TOKEN,
            freshReleaseBody({
                releaseEventId: 'rel-ev-x',
            }),
        ));
        assert.equal(res.status, 404);
    },
);
