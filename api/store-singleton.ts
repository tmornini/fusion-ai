import {
    EntityNotFound,
    type SingletonStore as SingletonStoreInterface,
    type StorageBackend,
} from './db.ts';

// Per-store serializer mutex; see store-entity.ts.
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

const SINGLETON_ID = '1';

// One row per table. Reads return the first (and
// only) row; writes replace it. Existing row's id is
// preserved on subsequent writes — fresh stores adopt
// SINGLETON_ID.
export class SingletonStore<T extends { id: string }>
    implements SingletonStoreInterface<T>
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

    async get(): Promise<T> {
        const rows = await this.#backend.read<T>(
            this.#table,
        );
        if (rows.length === 0) {
            throw new EntityNotFound(
                this.#table, '<singleton>',
            );
        }
        return rows[0]!;
    }

    async put(
        fields: Omit<T, 'id'>,
    ): Promise<T> {
        return this.#serialize(async () => {
            const rows = await this.#backend.read<T>(
                this.#table,
            );
            const id = rows[0]?.id ?? SINGLETON_ID;
            const written = {
                ...fields, id,
            } as T;
            await this.#backend.write(
                this.#table, [written],
            );
            return written;
        });
    }
}
