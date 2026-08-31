// Operator wipe. Drops the message plane and leftover
// retired objects. Node-only. No seed.

import { POSTGRES_DROP_SCHEMA } from
    '../api/backend-postgres.ts';
import {
    connectPostgres,
    type SqlClient,
} from '../api/postgres-client.ts';
import {
    POOL_ACQUIRE_TIMEOUT_MS,
    STATEMENT_TIMEOUT_MS,
    requiredEnv,
    safeErrorMessage,
} from './postgres-gate.ts';

const USAGE =
    'Usage: postgres-wipe [--print-start-command]\n';
const PRINT_START = '--print-start-command';
const WIPE_FAILED = 'wipe failed';

export async function wipePostgres(
    sql: SqlClient,
): Promise<void> {
    await sql.unsafe(POSTGRES_DROP_SCHEMA);
}

export function renderWipeStartCommand(): string {
    const script =
        "import postgres from 'postgres';"
        + 'const url = process.env.POSTGRES_URL;'
        + 'if (!url) throw new Error('
        + "'missing POSTGRES_URL');"
        + 'const sql = postgres(url, { max: 1 });'
        + 'await sql.unsafe('
        + JSON.stringify(POSTGRES_DROP_SCHEMA)
        + ');'
        + 'await sql.end();';
    return 'node --input-type=module -e '
        + JSON.stringify(script);
}

export function wipeErrorMessage(
    error: unknown,
): string {
    return safeErrorMessage(
        error,
        new Set(),
        WIPE_FAILED,
    );
}

export async function wipeMain(
    args: readonly string[],
): Promise<number> {
    try {
        if (args.includes('--help')
            || args.includes('-h')) {
            process.stdout.write(USAGE);
            return 0;
        }
        if (args.includes(PRINT_START)) {
            process.stdout.write(renderWipeStartCommand());
            return 0;
        }
        const postgresUrl = requiredEnv('POSTGRES_URL');
        const sql = connectPostgres(
            postgresUrl,
            {
                statementTimeoutMs: STATEMENT_TIMEOUT_MS,
                acquireTimeoutMs: POOL_ACQUIRE_TIMEOUT_MS,
            },
        );
        try {
            await wipePostgres(sql);
        } finally {
            await sql.end();
        }
        return 0;
    } catch (error: unknown) {
        process.stderr.write(
            JSON.stringify({
                at: new Date().toISOString(),
                level: 'error',
                message: wipeErrorMessage(error),
            }) + '\n',
        );
        return 1;
    }
}
