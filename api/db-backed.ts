import {
    TABLE_NAMES,
    SNAPSHOT_SCHEMA_VERSION,
    SNAPSHOT_SCHEMA_VERSION_KEY,
    backendRunner,
    ambientRunner,
} from './db.ts';
import type {
    GuardedDbAdapter,
    GuardedDbStores,
    GuardedEntityStore,
    StorageBackend,
    StateStore as IStateStore,
    Tx,
    TxRunner,
} from './db.ts';
import type {
    ClientEntity,
    RequestEntity,
    ResponseEntity,
} from './types.ts';
import type { LatencySimulation } from './latency.ts';
import type {
    NotificationEvent,
    NotificationPost,
} from './notifications.ts';
import { EntityStore } from './store-entity.ts';
import { HistoryEntityStore }
    from './store-history-entity.ts';
import { StateStore } from './store-state.ts';
import {
    parseAndValidateSnapshot,
} from './snapshot-validator.ts';
import {
    validateClientEntity,
    validateStateEntity,
    validateRequestEntity,
    validateResponseEntity,
} from './validators.ts';

// One adapter over any StorageBackend. The store wiring,
// the transaction view, and the tx-based snapshot ops live
// here once (Commandment IX — the third backend, IndexedDB,
// triggers the abstraction). The per-tier variation rides in
// the constructor: the backend itself, a latency shim, and
// an open hook the async tiers (IndexedDB) use to connect
// before any store op. Schema lifecycle delegates to the
// backend, which signals "schema exists" its own way.
export class BackedDbAdapter
    implements GuardedDbAdapter, LatencySimulation
{
    readonly #backend: StorageBackend;
    readonly #latency: () => Promise<void>;
    readonly #open: () => Promise<void>;
    readonly #notify: NotificationPost;

    readonly clients!: GuardedEntityStore<ClientEntity>;
    readonly requests!: GuardedEntityStore<RequestEntity>;
    readonly responses!: GuardedEntityStore<ResponseEntity>;
    readonly states!: IStateStore;

    constructor(
        backend: StorageBackend,
        latency: () => Promise<void>,
        open: () => Promise<void>,
        notify: NotificationPost,
    ) {
        this.#backend = backend;
        this.#latency = latency;
        this.#open = open;
        this.#notify = notify;
        Object.assign(
            this,
            this.#buildStores(backendRunner(backend)),
        );
    }

    async initialize(): Promise<void> {
        await this.#open();
    }

    simulateLatency(): Promise<void> {
        return this.#latency();
    }

    postNotification(event: NotificationEvent): void {
        this.#notify(event);
    }

    hasSchema(): Promise<boolean> {
        return this.#backend.hasSchema();
    }

    postSchemaCreation(): Promise<void> {
        return this.#backend.postSchemaCreation();
    }

    ensureTables(
        tables: readonly string[],
    ): Promise<void> {
        return this.#backend.ensureTables(tables);
    }

    deleteSchema(): Promise<void> {
        return this.#backend.deleteSchema();
    }

    async getSnapshot(): Promise<string> {
        const obj = await this.#backend.transaction(
            TABLE_NAMES, 'readonly',
            async (tx) => {
                // Widened to admit the ONE reserved scalar
                // marker beside the TABLE_NAMES-keyed arrays —
                // see SNAPSHOT_SCHEMA_VERSION_KEY (api/db.ts)
                // for why a wrapper shape was rejected.
                const out:
                    Record<string, unknown[] | number> = {};
                for (const table of TABLE_NAMES) {
                    out[table] = await tx.getAll(table);
                }
                return out;
            },
        );
        // Stamped OUTSIDE the tx (a synchronous assignment
        // needs no row op): every export carries the marker
        // an import will re-check at the gate.
        obj[SNAPSHOT_SCHEMA_VERSION_KEY] =
            SNAPSHOT_SCHEMA_VERSION;
        return JSON.stringify(obj, null, 2);
    }

    async putSnapshot(json: string): Promise<void> {
        // Validators run at the gate, before any storage
        // touch — a bad snapshot throws here, leaving prior
        // data intact. The clear+put then runs in one
        // transaction; a logic error discards the buffer
        // (rollback). On IndexedDB the whole flush is a
        // genuine atomic commit; localStorage's multi-key
        // flush is not OS-atomic on a mid-write quota error.
        const validated = parseAndValidateSnapshot(json);
        await this.#backend.ensureTables(TABLE_NAMES);
        await this.#backend.transaction(
            TABLE_NAMES, 'readwrite',
            async (tx) => {
                for (const [table, rows] of validated) {
                    await tx.clear(table);
                    for (const row of rows) {
                        await tx.put(table, row);
                    }
                }
            },
        );
        // Imported data IS a schema: stamp the marker after
        // the commit so hasSchema() answers true after a
        // restore onto a fresh origin. A failed import never
        // stamps.
        await this.#backend.postSchemaCreation();
    }

    async transaction<R>(
        tables: readonly string[],
        fn: (view: GuardedDbAdapter) => Promise<R>,
    ): Promise<R> {
        return this.#backend.transaction(
            tables, 'readwrite',
            (tx) => fn(this.#viewForTx(tx, tables)),
        );
    }

    // Raw single-row read bypassing the EntityStore deleted
    // filter — see GuardedDbAdapter.rawReadRow.
    rawReadRow<T extends { id: string }>(
        table: string,
        id: string,
    ): Promise<T | null> {
        return this.#backend.transaction(
            [table], 'readonly',
            tx => tx.get<T>(table, id),
        );
    }

    // An adapter whose stores are bound to the open tx
    // (ambientRunner joins it), so every op runs in one
    // transaction. Lifecycle methods delegate to the parent;
    // a nested transaction RE-ENTERS this same tx — it runs
    // `fn` against this view after asserting the nested tables
    // are a subset of the outer declared set, so a composing
    // POST opens one tx and calls the same single-noun store
    // ops the per-noun routes use, all committing together.
    #viewForTx(
        tx: Tx,
        declaredTables: readonly string[],
    ): GuardedDbAdapter {
        const view: GuardedDbAdapter = {
            ...this.#buildStores(ambientRunner(tx)),
            initialize: () => this.initialize(),
            deleteSchema: () => this.deleteSchema(),
            hasSchema: () => this.hasSchema(),
            postSchemaCreation: () => this.postSchemaCreation(),
            ensureTables: (tables) =>
                this.ensureTables(tables),
            getSnapshot: () => this.getSnapshot(),
            putSnapshot: (json) =>
                this.putSnapshot(json),
            postNotification: (e) =>
                this.postNotification(e),
            transaction: (tables, fn) => {
                this.#assertSubset(tables, declaredTables);
                return fn(view);
            },
            rawReadRow: <T extends { id: string }>(
                table: string,
                id: string,
            ) => tx.get<T>(table, id),
        };
        return view;
    }

    // The nested-tx guard. IndexedDB locks object stores at
    // tx-open, so a nested op touching a table the outer did
    // not declare fails there; the simulated tiers would let
    // it slip (they buffer any table lazily). This asserts
    // the subset on every tier — a clear error naming the
    // table, raised before any row op.
    #assertSubset(
        nestedTables: readonly string[],
        declaredTables: readonly string[],
    ): void {
        for (const table of nestedTables) {
            if (!declaredTables.includes(table)) {
                throw new Error(
                    `Nested transaction table '${table}'`
                    + ' is not in the outer declared set'
                    + ` [${declaredTables.join(', ')}].`,
                );
            }
        }
    }

    // The store wiring lives here once. The constructor
    // binds it to the backend; the transaction view rebinds
    // the same wiring to an open tx via ambientRunner.
    #buildStores(run: TxRunner): GuardedDbStores {
        const stateStore = new StateStore(
            run, 'states', validateStateEntity);
        return {
            states: stateStore,
            clients: new EntityStore(
                'clients', run, stateStore,
                validateClientEntity,
            ),
            requests: new HistoryEntityStore(
                'requests', run, validateRequestEntity,
            ),
            responses: new HistoryEntityStore(
                'responses', run, validateResponseEntity,
            ),
        };
    }
}
