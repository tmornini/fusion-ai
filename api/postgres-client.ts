// Thin postgres.js wrapper. Application code never imports
// postgres. begin is one transaction; advisory locks are
// pg_advisory_xact_lock inside it.

import postgres from 'postgres';

export interface SqlClient {
    query<T>(
        strings: TemplateStringsArray,
        ...values: readonly unknown[]
    ): Promise<T[]>;
    begin<T>(
        fn: (sql: SqlClient) => Promise<T>,
    ): Promise<T>;
    unsafe<T>(query: string): Promise<T[]>;
    end(): Promise<void>;
}

type Tagged = {
    (
        strings: TemplateStringsArray,
        ...values: readonly unknown[]
    ): Promise<unknown[]>;
    begin: (
        fn: (tx: Tagged) => Promise<unknown>,
    ) => Promise<unknown>;
    savepoint?: (
        fn: (tx: Tagged) => Promise<unknown>,
    ) => Promise<unknown>;
    unsafe: (query: string) => Promise<unknown[]>;
    end?: () => Promise<void>;
};

function wrap(sql: Tagged): SqlClient {
    return {
        query<T>(
            strings: TemplateStringsArray,
            ...values: readonly unknown[]
        ): Promise<T[]> {
            return sql(strings, ...values) as
                unknown as Promise<T[]>;
        },
        begin<T>(
            fn: (inner: SqlClient) => Promise<T>,
        ): Promise<T> {
            const start = sql.savepoint ?? sql.begin;
            return start((tx) => fn(wrap(tx))) as
                Promise<T>;
        },
        unsafe<T>(query: string): Promise<T[]> {
            return sql.unsafe(query) as
                unknown as Promise<T[]>;
        },
        end(): Promise<void> {
            return sql.end?.() ?? Promise.resolve();
        },
    };
}

export function connectPostgres(
    url: string,
): SqlClient {
    return wrap(postgres(url, {
        onnotice: () => {},
    }) as unknown as Tagged);
}
