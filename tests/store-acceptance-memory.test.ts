import { memoryDbAdapter } from '../api/db-memory.ts';
import { defineStoreAcceptance } from
    './store-acceptance.ts';

defineStoreAcceptance(
    Deno.test,
    'memory',
    async () => memoryDbAdapter(),
);
