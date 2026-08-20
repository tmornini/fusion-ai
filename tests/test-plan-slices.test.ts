import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryDbAdapter } from
    '../api/db-memory.ts';
import { postTestPlanSlices } from
    '../api/test-plan-slices.ts';
import { deriveOrganizations } from
    '../api/derive-organizations.ts';
import { deriveIdeas } from
    '../api/derive-ideas.ts';
import { deriveIdentityPii } from
    '../api/derive-identity-spine.ts';
import { testHashPassword } from
    './mock-seed.ts';
import { SYSTEM_MEMBER_ID } from
    '../api/types.ts';

const PARALLEL = [
    'AA', 'B', 'C', 'D', 'E', 'F', 'F2',
    'FS', 'G', 'H', 'I', 'K', 'R', 'SV',
] as const;

async function seeded() {
    const db = memoryDbAdapter();
    const reveal = await postTestPlanSlices(
        db, { hashPassword: testHashPassword },
    );
    return { db, reveal };
}

test('slices stamp schema last and reveal 14',
async () => {
    const { db, reveal } = await seeded();
    assert.equal(await db.hasSchema(), true);
    assert.equal(reveal.length, 14);
    assert.deepEqual(
        reveal.map((row) => row.section),
        [...PARALLEL],
    );
});

test('AA is bootstrap current + org 1',
async () => {
    const { db, reveal } = await seeded();
    const aa = reveal.find(
        (row) => row.section === 'AA',
    );
    assert.ok(aa);
    assert.equal(aa.organizationId, '1');
    assert.equal(
        aa.adminUsername, 'demo@example.com',
    );
    const pii = await deriveIdentityPii(
        db, 'current',
    );
    assert.equal(pii.name, 'Tony Stark');
    const organizations = await deriveOrganizations(db);
    const stark = organizations.find(
        (o) => o.id === '1',
    );
    assert.ok(stark);
    assert.equal(stark.name, 'Stark Industries');
    assert.equal(stark.domain, 'acmecorp.com');
});

test('fourteen organization ids are disjoint',
async () => {
    const { reveal } = await seeded();
    const ids = reveal.map(
        (row) => row.organizationId,
    );
    assert.equal(new Set(ids).size, 14);
});

test('non-AA admin emails are unique',
async () => {
    const { reveal } = await seeded();
    const emails = reveal.map(
        (row) => row.adminUsername,
    );
    assert.equal(new Set(emails).size, 14);
    for (const row of reveal) {
        if (row.section === 'AA') continue;
        assert.equal(
            row.adminUsername,
            row.section.toLowerCase()
                + '-admin@test-plan.example',
        );
        assert.equal(
            row.organizationId,
            row.section.toLowerCase() + '-org',
        );
    }
});

test('AA and thin slices seed no ideas',
async () => {
    const { db, reveal } = await seeded();
    for (const section of [
        'AA', 'F2', 'H', 'I',
    ] as const) {
        const row = reveal.find(
            (s) => s.section === section,
        );
        assert.ok(row);
        const ideas = await deriveIdeas(
            db, row.organizationId,
        );
        assert.equal(
            ideas.length, 0, section,
        );
    }
});

test('system identity exists once',
async () => {
    const { db } = await seeded();
    const requests = await db.requests.getAll();
    const system = requests.filter((r) =>
        r.uri_collection === '/identities/'
        && r.uri_id === SYSTEM_MEMBER_ID,
    );
    assert.equal(system.length, 1);
});
