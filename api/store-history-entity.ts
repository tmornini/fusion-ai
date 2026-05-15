import {
    EntityNotFound,
    type EntityStore as EntityStoreInterface,
    type StorageBackend,
} from './db.ts';

// Per-store serializer mutex; see store-entity.ts
// for the rationale. The duplication will be hoisted
// to a shared utility in Phase F if a third store
// kind earns the abstraction (Commandment IX).
function createSerializer():
    <R>(fn: () => Promise<R>) => Promise<R>
{
    let tail: Promise<unknown> = Promise.resolve();
    return function run<R>(
        fn: () => Promise<R>,
    ): Promise<R> {
        const next = tail.then(fn, fn);
        tail = next.then(
            () => undefined,
            () => undefined,
        );
        return next as Promise<R>;
    };
}

// History tables hold immutable point-in-time facts.
// Their only valid removal is hard splice (eviction
// for cap enforcement, schema reset, etc.) — never a
// tombstone, which would corrupt the global deleted-id
// keyspace shared with entity tables.
export class HistoryEntityStore<
    T extends { id: string },
> implements EntityStoreInterface<T>
{
    readonly #table: string;
    readonly #backend: StorageBackend;
    readonly #serialize:
        <R>(fn: () => Promise<R>) => Promise<R>;

    constructor(
        table: string,
        backend: StorageBackend,
    ) {
        this.#table = table;
        this.#backend = backend;
        this.#serialize = createSerializer();
    }

    async getAll(): Promise<T[]> {
        return await this.#backend.read<T>(this.#table);
    }

    async getById(id: string): Promise<T> {
        const rows = await this.#backend.read<T>(
            this.#table,
        );
        const row = rows.find(e => e.id === id);
        if (!row) {
            throw new EntityNotFound(
                this.#table, id,
            );
        }
        return row;
    }

    async put(
        id: string,
        fields: Omit<T, 'id'>,
    ): Promise<T> {
        return this.#serialize(async () => {
            const rows = await this.#backend.read<T>(
                this.#table,
            );
            const index = rows.findIndex(
                e => e.id === id,
            );
            const written = { ...fields, id } as T;
            const next = index >= 0
                ? rows.with(index, written)
                : [...rows, written];
            await this.#backend.write(
                this.#table, next,
            );
            return written;
        });
    }

    async delete(id: string): Promise<void> {
        return this.#serialize(async () => {
            const rows = await this.#backend.read<T>(
                this.#table,
            );
            const idx = rows.findIndex(
                e => e.id === id,
            );
            if (idx >= 0) {
                await this.#backend.write(
                    this.#table,
                    rows.toSpliced(idx, 1),
                );
            }
        });
    }
}
