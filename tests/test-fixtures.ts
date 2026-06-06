import type { DbAdapter } from '../api/db.ts';
import { seedRootAdmin } from './root-admin-fixture.ts';

// createSchema + seedRootAdmin — the setup nearly every adapter
// test repeats before driving the gate. Composes the existing
// seedRootAdmin fixture; the seed*Member fixtures stay separate.
export async function seedAdminSchema(
    db: DbAdapter,
): Promise<void> {
    await db.createSchema();
    await seedRootAdmin(db);
}
