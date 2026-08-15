import { test } from 'node:test';

// UTF8 boot and missing-marker pins land in Task 35.
// Skip so ./validate stays Postgres-free and
// ./test-postgres can list this file verbatim.

test(
    'pg-boot: deferred to Task 35',
    { skip: 'Task 35' },
    () => {},
);
