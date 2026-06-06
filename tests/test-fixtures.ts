import type { DbAdapter } from '../api/db.ts';
import type { OrganizationEntity } from '../api/types.ts';
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

// A complete organization row (minus id) for tests needing a
// tenant root. `name` varies; the rest are fixed demo values.
export function orgRow(
    name: string,
): Omit<OrganizationEntity, 'id'> {
    return {
        name,
        domain: 'x.com',
        next_billing: '2026-01-01T00:00:00.000Z',
        seats: 10,
        used_seats: 1,
        projects_limit: 10,
        ideas_limit: 10,
        last_activity: '2026-01-01T00:00:00.000Z',
    };
}
