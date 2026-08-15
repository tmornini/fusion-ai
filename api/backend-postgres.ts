// Fourth StorageBackend. postgres.js stays behind
// postgres-client. Locks and notify are Task 33.

import {
    TABLE_INDEXES,
    indexColumn,
    type StorageBackend,
    type Tx,
    type TxMode,
} from './db.ts';
import type { SqlClient } from './postgres-client.ts';
import { POSTGRES_SCHEMA } from './schema-postgres.ts';
import { serializeRecord } from './storage-serialize.ts';
import { mapPostgresError } from './errors-postgres.ts';
import { Octets } from '../shared/http-message/octets.ts';

const DROP_SCHEMA =
    'DROP TABLE IF EXISTS responses;\n'
    + 'DROP TABLE IF EXISTS requests;\n'
    + 'DROP TABLE IF EXISTS schema_marker;\n'
    + 'DROP FUNCTION IF EXISTS message_body(bytea);';

export interface PostgresTx extends Tx {
    getAddress<T extends { id: string }>(
        table: string,
        collection: string,
        uriId: string,
    ): Promise<T[]>;
}

export class PostgresBackend implements StorageBackend {
    readonly #sql: SqlClient;

    constructor(sql: SqlClient) {
        this.#sql = sql;
    }

    async transaction<R>(
        tables: readonly string[],
        mode: TxMode,
        fn: (tx: Tx) => Promise<R>,
    ): Promise<R> {
        for (const table of tables) {
            assertMessageTable(table);
        }
        try {
            return await this.#sql.begin(
                (sql) => fn(postgresTx(sql, mode)),
            );
        } catch (error) {
            throw mapPostgresError(error);
        }
    }

    async ensureTables(
        _tables: readonly string[],
    ): Promise<void> {
        try {
            await this.#sql.unsafe(POSTGRES_SCHEMA);
        } catch (error) {
            throw mapPostgresError(error);
        }
    }

    async hasSchema(): Promise<boolean> {
        try {
            const rows = await this.#sql.query<{
                only: boolean;
            }>`
                SELECT "only" FROM schema_marker
                WHERE "only"
                LIMIT 1
            `;
            return rows.length > 0;
        } catch (error) {
            throw mapPostgresError(error);
        }
    }

    async postSchemaCreation(): Promise<void> {
        try {
            await this.#sql.query`
                INSERT INTO schema_marker ("only")
                VALUES (true)
                ON CONFLICT DO NOTHING
            `;
        } catch (error) {
            throw mapPostgresError(error);
        }
    }

    async deleteSchema(): Promise<void> {
        try {
            await this.#sql.unsafe(DROP_SCHEMA);
        } catch (error) {
            throw mapPostgresError(error);
        }
    }

    async getAddress<T extends { id: string }>(
        table: string,
        collection: string,
        uriId: string,
    ): Promise<T[]> {
        return this.transaction(
            [table],
            'readonly',
            (tx) => (tx as PostgresTx).getAddress<T>(
                table, collection, uriId,
            ),
        );
    }
}

function postgresTx(
    sql: SqlClient,
    mode: TxMode,
): PostgresTx {
    const assertWritable = (): void => {
        if (mode === 'readonly') {
            throw new Error(
                'Cannot write in a readonly transaction.',
            );
        }
    };
    return {
        async get<T extends { id: string }>(
            table: string,
            id: string,
        ): Promise<T | null> {
            const name = assertMessageTable(table);
            const rows = await selectById(sql, name, id);
            const row = rows[0];
            return row === undefined
                ? null
                : entityOf<T>(row);
        },
        async getAll<T extends { id: string }>(
            table: string,
        ): Promise<T[]> {
            const name = assertMessageTable(table);
            const rows = await selectAll(sql, name);
            return rows.map((row) => entityOf<T>(row));
        },
        async getWhere<T extends { id: string }>(
            table: string,
            column: string,
            key: string,
        ): Promise<T[]> {
            const name = assertMessageTable(table);
            assertIndexedColumn(name, column);
            const rows = await selectWhere(
                sql, name, column, key,
            );
            return rows.map((row) => entityOf<T>(row));
        },
        async getAddress<T extends { id: string }>(
            table: string,
            collection: string,
            uriId: string,
        ): Promise<T[]> {
            const name = assertMessageTable(table);
            const rows = await selectAddress(
                sql, name, collection, uriId,
            );
            return rows.map((row) => entityOf<T>(row));
        },
        async put<T extends { id: string }>(
            table: string,
            row: T,
        ): Promise<void> {
            assertWritable();
            const name = assertMessageTable(table);
            const written = serializeRecord(
                row as Record<string, unknown>,
                name,
            );
            await upsertRow(sql, name, written);
        },
        async delete(
            table: string,
            id: string,
        ): Promise<void> {
            assertWritable();
            const name = assertMessageTable(table);
            await deleteById(sql, name, id);
        },
        async clear(table: string): Promise<void> {
            assertWritable();
            const name = assertMessageTable(table);
            await deleteAll(sql, name);
        },
    };
}

function assertMessageTable(
    table: string,
): 'requests' | 'responses' {
    if (table === 'requests' || table === 'responses') {
        return table;
    }
    throw new Error('unknown table: ' + table);
}

function assertIndexedColumn(
    table: 'requests' | 'responses',
    column: string,
): void {
    if (column === 'uri_id') {
        throw new Error(
            'getWhere does not accept uri_id',
        );
    }
    const allowed = (TABLE_INDEXES[table] ?? [])
        .map(indexColumn);
    if (!allowed.includes(column)) {
        throw new Error(
            'getWhere does not accept ' + column,
        );
    }
}

function entityOf<T extends { id: string }>(
    row: Record<string, unknown>,
): T {
    return {
        ...row,
        message: latin1OfBytea(row.message),
    } as unknown as T;
}

// Node Buffer.toString('latin1') — never TextDecoder.
function latin1OfBytea(value: unknown): string {
    const asBuffer = value as {
        toString?: (encoding: string) => string;
    };
    if (
        value instanceof Uint8Array
        && typeof asBuffer.toString === 'function'
        && asBuffer.toString
            !== Uint8Array.prototype.toString
    ) {
        return asBuffer.toString('latin1');
    }
    if (value instanceof Uint8Array) {
        return Octets.fromBytes(value).toLatin1();
    }
    throw new Error('message is not BYTEA');
}

function byteaOfWire(message: unknown): Uint8Array {
    if (typeof message !== 'string') {
        throw new Error(
            'message must be a Latin-1 wire',
        );
    }
    return Octets.fromLatin1(message).asBytes();
}

function textField(
    row: Record<string, unknown>,
    name: string,
): string {
    const value = row[name];
    if (typeof value !== 'string') {
        throw new Error(
            `NOT NULL violation: "${name}" is`
            + ` ${String(value)}.`,
        );
    }
    return value;
}

async function selectById(
    sql: SqlClient,
    table: 'requests' | 'responses',
    id: string,
): Promise<Record<string, unknown>[]> {
    if (table === 'requests') {
        return sql.query`
            SELECT * FROM requests
            WHERE id = ${id}
        `;
    }
    return sql.query`
        SELECT * FROM responses
        WHERE id = ${id}
    `;
}

async function selectAll(
    sql: SqlClient,
    table: 'requests' | 'responses',
): Promise<Record<string, unknown>[]> {
    if (table === 'requests') {
        return sql.query`
            SELECT * FROM requests
            ORDER BY at, id
        `;
    }
    return sql.query`
        SELECT * FROM responses
        ORDER BY at, id
    `;
}

async function selectWhere(
    sql: SqlClient,
    table: 'requests' | 'responses',
    column: string,
    key: string,
): Promise<Record<string, unknown>[]> {
    if (table === 'requests') {
        if (column === 'uri_collection') {
            return sql.query`
                SELECT * FROM requests
                WHERE uri_collection = ${key}
                ORDER BY at, id
            `;
        }
        if (column === 'message_hash') {
            return sql.query`
                SELECT * FROM requests
                WHERE message_hash = ${key}
                ORDER BY at, id
            `;
        }
        if (column === 'operation_id') {
            return sql.query`
                SELECT * FROM requests
                WHERE operation_id = ${key}
                ORDER BY at, id
            `;
        }
    } else {
        if (column === 'uri_collection') {
            return sql.query`
                SELECT * FROM responses
                WHERE uri_collection = ${key}
                ORDER BY at, id
            `;
        }
        if (column === 'operation_id') {
            return sql.query`
                SELECT * FROM responses
                WHERE operation_id = ${key}
                ORDER BY at, id
            `;
        }
        if (column === 'version') {
            return sql.query`
                SELECT * FROM responses
                WHERE version = ${key}
                ORDER BY at, id
            `;
        }
    }
    throw new Error(
        'getWhere does not accept ' + column,
    );
}

async function selectAddress(
    sql: SqlClient,
    table: 'requests' | 'responses',
    collection: string,
    uriId: string,
): Promise<Record<string, unknown>[]> {
    if (table === 'requests') {
        return sql.query`
            SELECT * FROM requests
            WHERE uri_collection = ${collection}
              AND uri_id = ${uriId}
            ORDER BY at, id
        `;
    }
    return sql.query`
        SELECT * FROM responses
        WHERE uri_collection = ${collection}
          AND uri_id = ${uriId}
        ORDER BY at, id
    `;
}

async function deleteById(
    sql: SqlClient,
    table: 'requests' | 'responses',
    id: string,
): Promise<void> {
    if (table === 'requests') {
        await sql.query`
            DELETE FROM requests
            WHERE id = ${id}
        `;
        return;
    }
    await sql.query`
        DELETE FROM responses
        WHERE id = ${id}
    `;
}

async function deleteAll(
    sql: SqlClient,
    table: 'requests' | 'responses',
): Promise<void> {
    if (table === 'requests') {
        await sql.query`DELETE FROM requests`;
        return;
    }
    await sql.query`DELETE FROM responses`;
}

async function upsertRow(
    sql: SqlClient,
    table: 'requests' | 'responses',
    row: Record<string, unknown>,
): Promise<void> {
    const id = textField(row, 'id');
    const collection = textField(row, 'uri_collection');
    const uriId = textField(row, 'uri_id');
    const at = textField(row, 'at');
    const operationId = textField(row, 'operation_id');
    const message = byteaOfWire(row.message);
    if (table === 'requests') {
        const requester = textField(
            row, 'requester_identity_id',
        );
        const hash = textField(row, 'message_hash');
        const method = textField(row, 'method');
        await sql.query`
            INSERT INTO requests (
                id, uri_collection, uri_id, at,
                requester_identity_id, message_hash,
                message, method, operation_id
            ) VALUES (
                ${id}, ${collection}, ${uriId}, ${at},
                ${requester}, ${hash}, ${message},
                ${method}, ${operationId}
            )
            ON CONFLICT (id) DO UPDATE SET
                uri_collection = EXCLUDED.uri_collection,
                uri_id = EXCLUDED.uri_id,
                at = EXCLUDED.at,
                requester_identity_id =
                    EXCLUDED.requester_identity_id,
                message_hash = EXCLUDED.message_hash,
                message = EXCLUDED.message,
                method = EXCLUDED.method,
                operation_id = EXCLUDED.operation_id
        `;
        return;
    }
    const version = textField(row, 'version');
    await sql.query`
        INSERT INTO responses (
            id, uri_collection, uri_id, at,
            version, message, operation_id
        ) VALUES (
            ${id}, ${collection}, ${uriId}, ${at},
            ${version}, ${message}, ${operationId}
        )
        ON CONFLICT (id) DO UPDATE SET
            uri_collection = EXCLUDED.uri_collection,
            uri_id = EXCLUDED.uri_id,
            at = EXCLUDED.at,
            version = EXCLUDED.version,
            message = EXCLUDED.message,
            operation_id = EXCLUDED.operation_id
    `;
}
