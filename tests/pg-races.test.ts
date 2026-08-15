import { test } from 'node:test';

// Locks, notify, and live races land in Task 33.
// Skip so ./validate stays Postgres-free and
// ./test-postgres can list this file verbatim.

test(
    'pg-races: deferred to Task 33',
    { skip: 'Task 33' },
    () => {},
);
