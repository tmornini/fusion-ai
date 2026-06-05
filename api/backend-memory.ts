import {
    MissingTableError,
    type StorageBackend,
    type Tx,
    type TxMode,
} from './db.ts';
import {
    serializeRecord,
} from './storage-serialize.ts';

export class MemoryStorageBackend
    implements StorageBackend
{
    readonly #tables:
        Map<string, { id: string }[]>;

    constructor() {
        this.#tables = new Map();
    }

    // Transitional stubs (A1). Real simulated transaction
    // lands in A2; no caller exists until the stores route
    // through it.
    async transaction<R>(
        _tables: readonly string[],
        _mode: TxMode,
        _fn: (tx: Tx) => Promise<R>,
    ): Promise<R> {
        throw new Error(
            'transaction not yet implemented',
        );
    }

    async ensureTables(
        _tables: readonly string[],
    ): Promise<void> {
        throw new Error(
            'ensureTables not yet implemented',
        );
    }

    async read<T extends { id: string }>(
        table: string,
    ): Promise<T[]> {
        const rows = this.#tables.get(table);
        if (rows === undefined) {
            throw new MissingTableError(table);
        }
        return [...rows] as T[];
    }

    async write<T extends { id: string }>(
        table: string,
        rows: T[],
    ): Promise<void> {
        const serialized = rows.map(
            row => ({
                ...serializeRecord(
                    row as Record<string, unknown>,
                    table,
                ),
                id: row.id,
            }),
        );
        this.#tables.set(
            table,
            serialized as { id: string }[],
        );
    }

    async remove(table: string): Promise<void> {
        this.#tables.delete(table);
    }

    async clearAll(): Promise<void> {
        this.#tables.clear();
    }

    async list(): Promise<string[]> {
        return Array.from(this.#tables.keys());
    }
}
