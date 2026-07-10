import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDbAdapter } from '../api/db-memory.ts';
import { postMockDataLoad } from '../api/mock-data.ts';
import {
    currentRolesForInOrganization,
} from '../api/authorization.ts';
import { verifyPassword } from '../shared/password-hash.ts';
import {
    deriveIdeas,
    deriveIdeaSubmissions,
} from '../api/derive-ideas.ts';
import { deriveProjects } from
    '../api/derive-projects.ts';
import {
    deriveBaselineScores,
    deriveActualScores,
} from '../api/derive-project-scores.ts';
import { deriveFlows } from '../api/derive-flows.ts';
import { buildIdeas } from '../api/mock-data/ideas.ts';
import { assignOrganization } from
    '../api/mock-data/seed-constants.ts';

const ORGANIZATION_ONE = '1';
const ORGANIZATION_TWO = '2';

async function seed() {
    const db = new MemoryDbAdapter();
    await db.postSchemaCreation();
    const creds = await postMockDataLoad(db);
    return { db, creds };
}

test('current is a member of exactly orgs 1 and 2',
async () => {
    const { db } = await seed();
    const organizations = (await db.memberships.getAll())
        .filter(m => m.identity_id === 'current')
        .map(m => m.organization_id)
        .sort();
    assert.deepEqual(organizations, ['1', '2']);
});

test('current holds admin in both orgs', async () => {
    const { db } = await seed();
    const grants = await db.roleGrants.getAll();
    assert.ok(
        currentRolesForInOrganization(grants, 'current', ORGANIZATION_ONE)
            .includes('admin'));
    assert.ok(
        currentRolesForInOrganization(grants, 'current', ORGANIZATION_TWO)
            .includes('admin'));
});

test('both organizations exist with distinct names',
async () => {
    const { db } = await seed();
    const organizations = await db.organizations.getAll();
    const one = organizations.find(o => o.id === ORGANIZATION_ONE);
    const two = organizations.find(o => o.id === ORGANIZATION_TWO);
    assert.ok(one, 'org 1 exists');
    assert.ok(two, 'org 2 exists');
    assert.notEqual(one.name, two.name);
});

test('each org owns at least one of every org-scoped'
    + ' entity', async () => {
    const { db } = await seed();
    // Phase Final Task 2: ideas + projects + flows derive
    // from the pair plane (row halves stripped).
    for (const organization of [
        ORGANIZATION_ONE, ORGANIZATION_TWO,
    ]) {
        const ideas = await deriveIdeas(db, organization);
        assert.ok(
            ideas.length >= 1,
            `org ${organization} owns no ideas`,
        );
        const projects = await deriveProjects(
            db, organization,
        );
        assert.ok(
            projects.length >= 1,
            `org ${organization} owns no projects`,
        );
        const flows = await deriveFlows(db, organization);
        assert.ok(
            flows.length >= 1,
            `org ${organization} owns no flows`,
        );
    }
    const tables = {
        records: await db.records.getAll(),
        objectives: await db.objectives.getAll(),
    };
    for (const organization of [
        ORGANIZATION_ONE, ORGANIZATION_TWO,
    ]) {
        for (const [name, rows] of Object.entries(tables)) {
            const owned = rows.filter(
                r => r.organization_id === organization);
            assert.ok(
                owned.length >= 1,
                `org ${organization} owns no ${name}`);
        }
    }
});

test('every work order belongs to org 1', async () => {
    const { db } = await seed();
    const wos = await db.workOrders.getAll();
    assert.ok(wos.length > 0, 'work orders exist');
    for (const wo of wos) {
        assert.equal(wo.organization_id, ORGANIZATION_ONE);
    }
});

test('every record attribute matches its parent record org',
async () => {
    const { db } = await seed();
    const recordOrganization = new Map(
        (await db.records.getAll())
            .map(r => [r.id, r.organization_id]));
    for (const attr of await db.recordAttributes.getAll()) {
        assert.equal(
            attr.organization_id,
            recordOrganization.get(attr.record_id),
            `attribute ${attr.id} org mismatch`);
    }
});

test('every non-admin seeded human is single-org',
async () => {
    const { db } = await seed();
    const byIdentity = new Map<string, Set<string>>();
    for (const m of await db.memberships.getAll()) {
        const set = byIdentity.get(m.identity_id)
            ?? new Set<string>();
        set.add(m.organization_id);
        byIdentity.set(m.identity_id, set);
    }
    const persons = (await db.identities.getAll())
        .filter(i => i.kind === 'person')
        .map(i => i.id);
    for (const id of persons) {
        if (id === 'current') continue;
        const organizations = byIdentity.get(id) ?? new Set();
        assert.ok(
            organizations.size <= 1,
            `non-admin ${id} spans multiple orgs`);
    }
});

test('every flow_records row joins same-org flow and'
    + ' record', async () => {
    const { db } = await seed();
    // Phase Final Task 2: flows from the pair plane.
    const flowOrganization = new Map<string, string>();
    for (const organization of [
        ORGANIZATION_ONE, ORGANIZATION_TWO,
    ]) {
        for (const f of await deriveFlows(db, organization)) {
            flowOrganization.set(f.id, organization);
        }
    }
    const recordOrganization = new Map(
        (await db.records.getAll())
            .map(r => [r.id, r.organization_id]));
    const bindings = await db.flowRecords.getAll();
    assert.ok(bindings.length > 0, 'bindings exist');
    for (const b of bindings) {
        assert.equal(
            flowOrganization.get(b.flow_id),
            recordOrganization.get(b.record_id),
            `binding ${b.id} crosses orgs`);
    }
});

test('every idea submission names a submitter in its'
    + " idea's org", async () => {
    const { db } = await seed();
    // Phase Final Task 2: derive ideas + submissions (row
    // halves stripped).
    const ideaOrganization = new Map(
        buildIdeas().map((idea, index) => [
            idea.id, assignOrganization(index),
        ]),
    );
    const memberOrganizations = new Map<string, Set<string>>();
    for (const m of await db.memberships.getAll()) {
        const set = memberOrganizations.get(m.identity_id)
            ?? new Set<string>();
        set.add(m.organization_id);
        memberOrganizations.set(m.identity_id, set);
    }
    const violations: string[] = [];
    for (const [ideaId, organization] of ideaOrganization) {
        const subs = await deriveIdeaSubmissions(
            db, organization, ideaId,
        );
        for (const s of subs) {
            const organizations =
                memberOrganizations.get(s.member_id)
                    ?? new Set<string>();
            if (!organizations.has(organization)) {
                violations.push(
                    s.id + ': ' + s.member_id
                    + ' not in idea org ' + organization);
            }
        }
    }
    assert.deepEqual(
        violations, [],
        'cross-org submitters: ' + violations.join('; '));
});

test('every project score names an author in its'
    + " project's org", async () => {
    const { db } = await seed();
    // Phase Final Task 2: projects + scores from pair plane.
    const projectOrganization = new Map<string, string>();
    const scores: {
        id: string;
        project_id: string;
        member_id: string;
    }[] = [];
    for (const organization of [
        ORGANIZATION_ONE, ORGANIZATION_TWO,
    ]) {
        const projects = await deriveProjects(
            db, organization,
        );
        for (const p of projects) {
            projectOrganization.set(p.id, organization);
            scores.push(
                ...await deriveBaselineScores(
                    db, organization, p.id,
                ),
                ...await deriveActualScores(
                    db, organization, p.id,
                ),
            );
        }
    }
    const memberOrganizations = new Map<string, Set<string>>();
    for (const m of await db.memberships.getAll()) {
        const set = memberOrganizations.get(m.identity_id)
            ?? new Set<string>();
        set.add(m.organization_id);
        memberOrganizations.set(m.identity_id, set);
    }
    assert.ok(scores.length > 0, 'scores exist');
    const violations: string[] = [];
    for (const s of scores) {
        const organization = projectOrganization.get(
            s.project_id,
        );
        const organizations = memberOrganizations.get(
            s.member_id,
        ) ?? new Set<string>();
        if (
            organization === undefined
            || !organizations.has(organization)
        ) {
            violations.push(
                s.id + ': ' + s.member_id
                + ' not in project org ' + organization);
        }
    }
    assert.deepEqual(
        violations, [],
        'cross-org score authors: ' + violations.join('; '));
});

test('every seeded human gets a verifiable password',
async () => {
    const { db, creds } = await seed();
    assert.ok(
        creds.identities.length >= 2,
        'multiple humans seeded');
    const credRows = await db.identityCredentials.getAll();
    for (const c of creds.identities) {
        const row = credRows.find(
            r => r.identity_id === c.identityId
                && r.kind === 'password');
        assert.ok(row, `no password row for ${c.identityId}`);
        assert.equal(
            await verifyPassword(c.password, row.secret),
            true);
        assert.match(c.username, /@/);
    }
});
