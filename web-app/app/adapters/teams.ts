import type {
    UserEntity,
} from '../../../api/types.ts';
import { User } from '../../../api/types.ts';
import type { FetchContext } from './shared.ts';
import {
    createSubscriptionChannel,
} from '../channels.ts';
export {
    User,
    AVAILABILITY_HIGH,
    AVAILABILITY_LOW,
} from '../../../api/types.ts';
export type { UserEntity } from '../../../api/types.ts';

const userChanges =
    createSubscriptionChannel(['users']);

export function subscribeUserChanges(
    fn: () => void,
): () => void {
    return userChanges.subscribe(fn);
}

export function notifyUserChange(): void {
    userChanges.notify();
}

const TOP_MEMBERS_COUNT = 6;

export type UserRole =
    | 'admin'
    | 'manager'
    | 'member'
    | 'viewer';

export type UserAccountStatus =
    | 'active'
    | 'pending'
    | 'deactivated';

export async function getUsers(
    ctx: FetchContext,
): Promise<User[]> {
    const userMap = await ctx.getUserMap();
    return Array.from(userMap.values());
}

export async function getUserRows(
    ctx: FetchContext,
): Promise<UserEntity[]> {
    return ctx.getUserRows();
}

export function featuredTeamMembers(
    users: User[],
): User[] {
    return users
        .filter(user =>
            user.hasDepartment()
            && user.hasPerformanceScore(),
        )
        .slice(0, TOP_MEMBERS_COUNT);
}

export async function getUserRow(
    ctx: FetchContext,
    id: string,
): Promise<UserEntity> {
    return ctx.GET<UserEntity>(
        `users/${id}`,
    );
}

export async function putUser(
    ctx: FetchContext,
    id: string,
    entity: Omit<UserEntity, 'id'>,
): Promise<void> {
    await ctx.PUT(`users/${id}`, entity);
    userChanges.notify();
}

export async function putUserStatus(
    ctx: FetchContext,
    id: string,
    next: UserAccountStatus,
): Promise<void> {
    const rows = await ctx.getUserRows();
    const row = rows.find(r => r.id === id);
    if (!row) {
        throw new Error(
            `putUserStatus: unknown user ${id}`,
        );
    }
    const { id: _id, ...rest } = row;
    await ctx.PUT(`users/${id}`, {
        ...rest,
        status: next,
    });
    userChanges.notify();
}
