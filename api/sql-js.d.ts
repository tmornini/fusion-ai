declare module 'sql.js' {
  type BindParams = Array<string | number | null | Uint8Array> | Record<string, string | number | null | Uint8Array>;

  interface Database {
    run(sql: string, params?: BindParams): Database;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface Statement {
    bind(params?: BindParams): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  interface InitSqlJsOptions {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
  export type { Database, Statement, SqlJsStatic };
}
