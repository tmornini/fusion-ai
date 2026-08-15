import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    assertUtf8,
    hasSchemaMarker,
} from '../server/boot.ts';
import { connectPostgres } from
    '../api/postgres-client.ts';
import type { SqlClient } from
    '../api/postgres-client.ts';

// Unit pins stay Postgres-free. Live SHOW runs only
// when POSTGRES_URL is set (./test-postgres).

const POSTGRES_URL = process.env['POSTGRES_URL'];
const UTF8_REQUIRED =
    'Postgres server_encoding must be UTF8';

function fakeClient(
    rows: Record<string, unknown>[],
): {
    readonly sql: SqlClient;
    readonly texts: string[];
} {
    const texts: string[] = [];
    const sql: SqlClient = {
        query: <T>(
            strings: TemplateStringsArray,
            ..._values: unknown[]
        ) => {
            texts.push(strings.join(''));
            return Promise.resolve(rows as T[]);
        },
        begin: async (fn) => fn(sql),
        unsafe: async () => [],
        end: async () => {},
    };
    return { sql, texts };
}

test('assertUtf8 accepts UTF8', async () => {
    const fake = fakeClient([
        { server_encoding: 'UTF8' },
    ]);
    await assertUtf8(fake.sql);
    assert.match(
        fake.texts[0] ?? '',
        /SHOW server_encoding/,
    );
});

test('assertUtf8 rejects SQL_ASCII', async () => {
    const fake = fakeClient([
        { server_encoding: 'SQL_ASCII' },
    ]);
    await assert.rejects(
        () => assertUtf8(fake.sql),
        (error: unknown) =>
            error instanceof Error
            && error.message === UTF8_REQUIRED,
    );
});

test('assertUtf8 rejects a missing encoding row',
async () => {
    const fake = fakeClient([]);
    await assert.rejects(
        () => assertUtf8(fake.sql),
        (error: unknown) =>
            error instanceof Error
            && error.message === UTF8_REQUIRED,
    );
});

test('hasSchemaMarker is the marker row, not tables',
async () => {
    const empty = fakeClient([]);
    assert.equal(await hasSchemaMarker(empty.sql), false);
    const marked = fakeClient([{ only: true }]);
    assert.equal(
        await hasSchemaMarker(marked.sql),
        true,
    );
    assert.match(
        marked.texts[0] ?? '',
        /FROM schema_marker/,
    );
});

if (POSTGRES_URL === undefined || POSTGRES_URL === '') {
    test(
        'live SHOW skipped without POSTGRES_URL',
        { skip: 'POSTGRES_URL is unset' },
        () => {},
    );
} else {
    test('live SHOW server_encoding is UTF8',
    async () => {
        const sql = connectPostgres(POSTGRES_URL);
        try {
            await assertUtf8(sql);
        } finally {
            await sql.end();
        }
    });
}
