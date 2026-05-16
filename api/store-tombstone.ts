import type {
    TombstoneStore as TombstoneStoreInterface,
    StorageBackend,
} from './db.ts';
import {
    nowUtc,
    type Id,
} from './types.ts';
import { createSerializer } from './store-serializer.ts';

// A global tombstone bag, parameterized by table and
// timestamp field. Two instances exist:
//   - 'deleted' (append-only by convention; consulted
//     by EntityStore on getAll/getById to suppress
//     deleted entities)
//   - 'deprecated' (consulted only by domain queries
//     for objectives; reactivation splices its row)
// HistoryEntityStore (correctly) never touches either.
export class TombstoneStore
    implements TombstoneStoreInterface
{
    readonly #backend: StorageBackend;
    readonly #table: string;
    readonly #timestampField: string;
    readonly #serialize:
        <R>(fn: () => Promise<R>) => Promise<R>;

    constructor(
        backend: StorageBackend,
        table: string,
        timestampField: string,
    ) {
        this.#backend = backend;
        this.#table = table;
        this.#timestampField = timestampField;
        this.#serialize = createSerializer();
    }

    async isTombstoned(id: Id): Promise<boolean> {
        const rows = await this.#backend.read<
            { id: Id }
        >(this.#table);
        return rows.some(r => r.id === id);
    }

    async record(id: Id): Promise<void> {
        return this.#serialize(async () => {
            const rows = await this.#backend.read<
                { id: Id } & Record<string, string>
            >(this.#table);
            if (rows.some(r => r.id === id)) return;
            const next = [
                ...rows,
                {
                    id,
                    [this.#timestampField]: nowUtc(),
                } as { id: Id } & Record<string, string>,
            ];
            await this.#backend.write(this.#table, next);
        });
    }

    async remove(id: Id): Promise<void> {
        return this.#serialize(async () => {
            const rows = await this.#backend.read<
                { id: Id }
            >(this.#table);
            const index = rows.findIndex(
                r => r.id === id,
            );
            if (index < 0) return;
            const next = [
                ...rows.slice(0, index),
                ...rows.slice(index + 1),
            ];
            await this.#backend.write(this.#table, next);
        });
    }

    async allTombstonedIds(): Promise<Set<Id>> {
        const rows = await this.#backend.read<
            { id: Id }
        >(this.#table);
        return new Set(rows.map(r => r.id));
    }

    async allRows(): Promise<
        ({ id: Id } & Record<string, string>)[]
    > {
        return this.#backend.read<
            { id: Id } & Record<string, string>
        >(this.#table);
    }
}
