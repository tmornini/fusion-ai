import {
    MissingTableError,
    type StorageBackend,
} from './db.ts';

export class MemoryStorageBackend
    implements StorageBackend
{
    readonly #tables:
        Map<string, { id: string }[]>;

    constructor() {
        this.#tables = new Map();
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
        this.#tables.set(
            table,
            rows.map(r => ({ ...r })) as
                { id: string }[],
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
