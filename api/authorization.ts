import type { Id, RoleGrantEntity } from './types.ts';

// Roles an identity currently holds: latest action per
// (identity_id, role); a 'granted' with no later 'revoked'
// wins. RFC-3339 zulu `at` sorts lexically = chronologically
// (the same reduce discipline as latestRevocationAt).
export function currentRolesFor(
    rows: readonly RoleGrantEntity[],
    identityId: Id,
): string[] {
    const latest = new Map<
        string,
        { action: RoleGrantEntity['action']; at: string }
    >();
    for (const row of rows) {
        if (row.identity_id !== identityId) continue;
        const prev = latest.get(row.role);
        if (prev === undefined || row.at > prev.at) {
            latest.set(
                row.role,
                { action: row.action, at: row.at },
            );
        }
    }
    const held: string[] = [];
    for (const [role, last] of latest) {
        if (last.action === 'granted') held.push(role);
    }
    return held;
}

// A policy entry: the roles permitted to use `verb` on any
// path that BEGINS WITH `pathPrefix`. Prefixes are chosen on
// segment boundaries so startsWith never half-matches.
export interface PolicyEntry {
    readonly verb: string;
    readonly pathPrefix: string;
    readonly roles: readonly string[];
}

// Deny-by-default policy. `admin` is allowed on every verb at
// the root prefix `/` — "admin everywhere" in four honest
// lines, no implicit-superuser special case. Narrower
// (verb, prefix) entries widen access to other roles later.
export const ROUTE_POLICY: readonly PolicyEntry[] = [
    { verb: 'GET', pathPrefix: '/', roles: ['admin'] },
    { verb: 'PUT', pathPrefix: '/', roles: ['admin'] },
    { verb: 'POST', pathPrefix: '/', roles: ['admin'] },
    { verb: 'DELETE', pathPrefix: '/', roles: ['admin'] },
];

// Permitted iff SOME matching entry (same verb; pathname
// begins with prefix) lists a role the principal holds.
// No match → false (deny-by-default).
export function isPermitted(
    method: string,
    pathname: string,
    heldRoles: readonly string[],
): boolean {
    for (const entry of ROUTE_POLICY) {
        if (entry.verb !== method) continue;
        if (!pathname.startsWith(entry.pathPrefix)) continue;
        for (const role of entry.roles) {
            if (heldRoles.includes(role)) return true;
        }
    }
    return false;
}
