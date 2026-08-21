// Shared Postgres entry gates. boot.ts and
// postgres-seed.ts import this and never
// import each other.

import type { SqlClient } from
    '../api/postgres-client.ts';
import {
    SEED_ARGV_EXCLUSIVE,
    SEED_EXCLUSIVE_FLAGS,
    SEED_NONEMPTY,
} from './seed.ts';

export const STATEMENT_TIMEOUT_MS = 30_000;
export const POOL_ACQUIRE_TIMEOUT_MS = 5_000;
export const UTF8_REQUIRED =
    'Postgres server_encoding must be UTF8';
export const MISSING_MARKER =
    'schema_marker is empty; refuse to listen';

export type EnvBag = Record<string, string | undefined>;

export function requiredEnv(
    name: string,
    env: EnvBag = process.env,
): string {
    const value = env[name];
    if (value === undefined || value === '') {
        throw new Error('missing required env ' + name);
    }
    return value;
}

export async function assertUtf8(
    sql: SqlClient,
): Promise<void> {
    const rows = await sql.query<{
        server_encoding: string;
    }>`
        SHOW server_encoding
    `;
    if (rows[0]?.server_encoding !== 'UTF8') {
        throw new Error(UTF8_REQUIRED);
    }
}

// Presence of the marker row, not table existence.
// No row and no successful seed: do not listen.
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

export async function assertSchemaMarker(
    sql: SqlClient,
): Promise<void> {
    if (!(await hasSchemaMarker(sql))) {
        throw new Error(MISSING_MARKER);
    }
}

const SAFE_BOOT_MESSAGES: ReadonlySet<string> = new Set([
    UTF8_REQUIRED,
    MISSING_MARKER,
    SEED_NONEMPTY,
    SEED_EXCLUSIVE_FLAGS,
]);

const SAFE_SEED_MESSAGES: ReadonlySet<string> = new Set([
    UTF8_REQUIRED,
    SEED_NONEMPTY,
    SEED_ARGV_EXCLUSIVE,
]);

export function safeErrorMessage(
    error: unknown,
    allowlist: ReadonlySet<string>,
    fallback: string,
): string {
    if (!(error instanceof Error)) return fallback;
    if (allowlist.has(error.message)) {
        return error.message;
    }
    if (error.message.startsWith(
        'missing required env ',
    )) {
        return error.message;
    }
    if (error.message.startsWith(
        'HTTP_SERVER_PORT ',
    )) {
        return error.message;
    }
    return fallback;
}

export function bootErrorMessage(
    error: unknown,
): string {
    return safeErrorMessage(
        error,
        SAFE_BOOT_MESSAGES,
        'boot failed',
    );
}

export function seedErrorMessage(
    error: unknown,
): string {
    return safeErrorMessage(
        error,
        SAFE_SEED_MESSAGES,
        'seed failed',
    );
}
