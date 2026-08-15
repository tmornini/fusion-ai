// Fail-fast boot prefix. Listen and seed flags land
// in Phase D. MissingTableError is the browser
// recovery path and is not used here.

import type { SqlClient } from
    '../api/postgres-client.ts';

export async function assertUtf8(
    sql: SqlClient,
): Promise<void> {
    const rows = await sql.query<{
        server_encoding: string;
    }>`
        SHOW server_encoding
    `;
    if (rows[0]?.server_encoding !== 'UTF8') {
        throw new Error(
            'Postgres server_encoding must be UTF8',
        );
    }
}

// Presence of the marker row, not table existence.
// No row and no seed flag: do not listen (Phase D).
export async function hasSchemaMarker(
    sql: SqlClient,
): Promise<boolean> {
    const rows = await sql.query<{ only: boolean }>`
        SELECT "only" FROM schema_marker
        WHERE "only"
        LIMIT 1
    `;
    return rows.length > 0;
}
