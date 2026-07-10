import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
    LocalStorageDbAdapter,
} from '../api/db-localstorage.ts';
import {
    SNAPSHOT_SCHEMA_VERSION,
    SNAPSHOT_SCHEMA_VERSION_KEY,
} from '../api/db.ts';

const KEY_PREFIX = 'fusion-ai:';

function installShim(): Map<string, string> {
    const map = new Map<string, string>();
    (globalThis as unknown as {
        localStorage: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
            removeItem(key: string): void;
        };
    }).localStorage = {
        getItem(key) { return map.get(key) ?? null; },
        setItem(key, value) { map.set(key, value); },
        removeItem(key) { map.delete(key); },
    };
    return map;
}

// Phase Final Stage B: objectives retired — pin the
// localStorage write surface on organizations (surviving
// store with numeric seats + string fields).
const baseOrganization = {
    name: 'Test Org',
    domain: 'test.example',
    next_billing: '2026-01-01T00:00:00.000000Z',
    seats: 5,
    projects_limit: 10,
    ideas_limit: 20,
};

// Writes are plain JSON since the F-080 measurement
// retired compression; the gz1: decoder survives for
// READS of legacy payloads only (pinned below).
test(
    'organizations write stores raw JSON',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.organizations.put(
            'org-prefix-test', baseOrganization,
        );
        const stored = map.get(
            KEY_PREFIX + 'organizations',
        );
        assert.ok(stored, 'expected stored value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array, got '
            + stored.slice(0, 20),
        );
    },
);

test(
    'organizations round-trips through put → getById',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.organizations.put(
            'org-rt', baseOrganization,
        );
        const got = await adapter.organizations.getById(
            'org-rt',
        );
        assert.equal(got.id, 'org-rt');
        assert.equal(
            got.name,
            baseOrganization.name,
        );
    },
);

test(
    'numbers round-trip as numbers, not strings',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.organizations.put(
            'org-num', baseOrganization,
        );
        const got = await adapter.organizations.getById(
            'org-num',
        );
        assert.strictEqual(got.seats, 5);
        assert.strictEqual(typeof got.seats, 'number');
    },
);

test(
    'concurrent puts to same store do not race',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        const ids = Array.from(
            { length: 11 },
            (_, i) => `org-${i}`,
        );
        await Promise.all(
            ids.map(id => adapter.organizations.put(
                id, baseOrganization,
            )),
        );
        const all = await adapter.organizations.getAll();
        assert.equal(
            all.length, 11,
            'all 11 concurrent puts must persist',
        );
        const gotIds = new Set(all.map(u => u.id));
        for (const id of ids) {
            assert.ok(
                gotIds.has(id),
                'expected id ' + id + ' present',
            );
        }
    },
);

test(
    'states write stores raw JSON',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.states.put(
            'evt-prefix-test',
            {
                entity_id: 'wo-1',
                state: 'n-to',
                member_id: 'u-1',
                at:
                    '2026-01-01T00:00:00.000000Z',
            },
        );
        const stored = map.get(
            KEY_PREFIX + 'states',
        );
        assert.ok(stored, 'expected stored value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array, got '
            + stored.slice(0, 20),
        );
    },
);

test(
    'clients table is not compressed (raw JSON in storage)',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.clients.put('c1', {
            grant_types: '["password"]',
            redirect_uris: '[]',
            jwks: '{}',
            aud: 'fusion-ai',
            status: 'active',
        });
        const stored = map.get(KEY_PREFIX + 'clients');
        assert.ok(stored, 'expected stored clients value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array, got '
            + stored.slice(0, 20),
        );
    },
);

test(
    'snapshot export emits parsed objects, not gz1: blob',
    async () => {
        installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        await adapter.organizations.put(
            'org-export', baseOrganization,
        );
        const json = await adapter.getSnapshot();
        const parsed = JSON.parse(json);
        assert.ok(
            Array.isArray(parsed.organizations),
            'organizations should be an array in snapshot',
        );
        assert.equal(parsed.organizations.length, 1);
        assert.equal(
            parsed.organizations[0].id, 'org-export',
        );
    },
);

test(
    'snapshot import stores organizations raw',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        const snapshot = JSON.stringify({
            [SNAPSHOT_SCHEMA_VERSION_KEY]:
                SNAPSHOT_SCHEMA_VERSION,
            organizations: [
                { id: 'org-imp', ...baseOrganization },
            ],
        });
        await adapter.putSnapshot(snapshot);
        const stored = map.get(
            KEY_PREFIX + 'organizations',
        );
        assert.ok(stored, 'expected stored value');
        assert.ok(
            stored.startsWith('['),
            'expected raw JSON array after import, got '
            + (stored?.slice(0, 20) ?? ''),
        );
    },
);

test(
    'read tolerates gz1: payload on normally-uncompressed table',
    async () => {
        const map = installShim();
        const adapter = new LocalStorageDbAdapter();
        await adapter.postSchemaCreation();
        const organizationRow = {
            id: 'org-gz1',
            ...baseOrganization,
        };
        const rawJson = JSON.stringify([organizationRow]);
        const stream = new Blob([rawJson]).stream()
            .pipeThrough(new CompressionStream('gzip'));
        const buffer = await new Response(stream)
            .arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (const b of bytes) {
            binary += String.fromCharCode(b);
        }
        map.set(
            KEY_PREFIX + 'organizations',
            'gz1:' + btoa(binary),
        );
        const result = await adapter.organizations.getAll();
        assert.equal(result.length, 1);
        assert.equal(result[0]!.seats, 5);
    },
);
