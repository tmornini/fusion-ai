// Fail-fast boot. Env → pool → UTF8 → DDL →
// marker → listen. Seed flags are Task 41.
// One mint process: do not run two of these.
// Node-only; excluded from tsc (no @types/node).

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BackedDbAdapter } from '../api/db-backed.ts';
import { PostgresBackend } from
    '../api/backend-postgres.ts';
import {
    connectPostgres,
    type SqlClient,
} from '../api/postgres-client.ts';
import { POSTGRES_SCHEMA } from
    '../api/schema-postgres.ts';
import { listenHttp } from './http-server.ts';

export const STATEMENT_TIMEOUT_MS = 30_000;
export const POOL_ACQUIRE_TIMEOUT_MS = 5_000;
export const UTF8_REQUIRED =
    'Postgres server_encoding must be UTF8';
export const MISSING_MARKER =
    'schema_marker is empty; refuse to listen';

export type EnvBag = Record<string, string | undefined>;

export interface ListenEnv {
    readonly postgresUrl: string;
    readonly jwtHmacSigningKey: string;
    readonly port: number;
    readonly trustedProxyHops: string | undefined;
}

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

export function readListenEnv(
    env: EnvBag = process.env,
): ListenEnv {
    const postgresUrl = requiredEnv(
        'POSTGRES_URL', env,
    );
    const jwtHmacSigningKey = requiredEnv(
        'JWT_HMAC_SIGNING_KEY', env,
    );
    const portRaw = requiredEnv(
        'HTTP_SERVER_PORT', env,
    );
    const port = Number(portRaw);
    if (!Number.isInteger(port)
        || port < 1
        || port > 65535) {
        throw new Error(
            'HTTP_SERVER_PORT must be an integer 1-65535',
        );
    }
    const hops = env['TRUSTED_PROXY_HOPS'];
    return {
        postgresUrl,
        jwtHmacSigningKey,
        port,
        trustedProxyHops:
            hops !== undefined && hops !== ''
                ? hops
                : undefined,
    };
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
// No row: do not listen. Seed flags are Task 41.
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

export async function applyDdl(
    sql: SqlClient,
): Promise<void> {
    await sql.unsafe(POSTGRES_SCHEMA);
}

export async function assertSchemaMarker(
    sql: SqlClient,
): Promise<void> {
    if (!(await hasSchemaMarker(sql))) {
        throw new Error(MISSING_MARKER);
    }
}

function staticRootFromMeta(): string {
    return resolve(
        fileURLToPath(new URL('.', import.meta.url)),
    );
}

const SAFE_BOOT_MESSAGES: ReadonlySet<string> = new Set([
    UTF8_REQUIRED,
    MISSING_MARKER,
]);

export function bootErrorMessage(
    error: unknown,
): string {
    if (!(error instanceof Error)) return 'boot failed';
    if (SAFE_BOOT_MESSAGES.has(error.message)) {
        return error.message;
    }
    if (error.message.startsWith('missing required env ')) {
        return error.message;
    }
    if (error.message.startsWith('HTTP_SERVER_PORT ')) {
        return error.message;
    }
    return 'boot failed';
}

export interface RunningHttp {
    readonly port: number;
    close(): Promise<void>;
}

export async function boot(
    env: EnvBag = process.env,
): Promise<RunningHttp> {
    const listenEnv = readListenEnv(env);
    const sql = connectPostgres(listenEnv.postgresUrl, {
        statementTimeoutMs: STATEMENT_TIMEOUT_MS,
        acquireTimeoutMs: POOL_ACQUIRE_TIMEOUT_MS,
    });
    await assertUtf8(sql);
    await applyDdl(sql);
    await assertSchemaMarker(sql);
    const adapter = new BackedDbAdapter(
        new PostgresBackend(sql),
        async () => {},
        async () => {},
        () => {},
    );
    const listener = await listenHttp({
        adapter,
        staticRoot: staticRootFromMeta(),
        port: listenEnv.port,
    });
    return {
        port: listener.port,
        close: async () => {
            await listener.close();
            await sql.end();
        },
    };
}

function isMainModule(): boolean {
    const invoked = process.argv[1];
    if (invoked === undefined) return false;
    return resolve(invoked)
        === fileURLToPath(import.meta.url);
}

function installSigterm(
    close: () => Promise<void>,
): void {
    process.once('SIGTERM', () => {
        void close().then(
            () => process.exit(0),
            () => process.exit(1),
        );
    });
}

if (isMainModule()) {
    boot().then((running) => {
        process.stdout.write(JSON.stringify({
            at: new Date().toISOString(),
            level: 'info',
            message: 'listening',
            port: running.port,
        }) + '\n');
        installSigterm(() => running.close());
    }).catch((error: unknown) => {
        process.stderr.write(JSON.stringify({
            at: new Date().toISOString(),
            level: 'error',
            message: bootErrorMessage(error),
        }) + '\n');
        process.exit(1);
    });
}
