import {
    GET,
    PUT,
    DELETE,
} from '../../../api/api.ts';
import type {
    Id,
    UserEntity,
    CompanyEntity,
    IdeaEntity,
    ProjectEntity,
    FlowEntity,
} from '../../../api/types.ts';
import { User } from '../../../api/types.ts';
import {
    generateCryptoSafeBase62,
} from './crypto-safe-base62.ts';
import type { Channel } from '../channels.ts';

export type { Id } from '../../../api/types.ts';
export { User } from '../../../api/types.ts';

export async function getCurrentUserRow(
    ctx?: FetchContext,
): Promise<UserEntity> {
    if (ctx) return ctx.getCurrentUser();
    return GET<UserEntity>('current-user');
}

export async function getCompanyRow(
): Promise<CompanyEntity> {
    return GET<CompanyEntity>('company');
}

async function fetchUserMap(
): Promise<Map<Id, User>> {
    const users =
        await GET<UserEntity[]>('users');
    return new Map(
        users.map(
            entity => [
                entity.id,
                new User(entity),
            ],
        ),
    );
}

// A unit of write work executed by ctx.commit().
// `put` upserts a row by full state; `delete` removes
// a row by its resource path. Sequenced in order;
// best-effort, no rollback (real atomicity arrives
// with Postgres). notifyChannels fire once after the
// last op succeeds — single batched event per
// channel per logical operation.
export type WriteOp =
    | {
        method: 'put';
        resource: string;
        body: Record<string, unknown>;
    }
    | {
        method: 'delete';
        resource: string;
    };

export interface Transaction {
    readonly ops: readonly WriteOp[];
    readonly notifyChannels?: readonly Channel<void>[];
}

export interface FetchContext {
    readonly requestId: string;
    getUserMap(): Promise<Map<Id, User>>;
    getCurrentUser(): Promise<UserEntity>;
    getIdeaRows(): Promise<IdeaEntity[]>;
    getProjectRows(
    ): Promise<ProjectEntity[]>;
    getFlowRows(): Promise<FlowEntity[]>;
    commit(tx: Transaction): Promise<void>;
}

export function createFetchContext(
): FetchContext {
    // Per-request memoization: each table
    // is fetched at most once per ctx.
    // The promise is captured the first
    // time the getter is called (lazy)
    // except getUserMap which is eager —
    // the user map is needed by virtually
    // every page, so kicking the fetch
    // off at construction is a hot-path
    // win, not premature optimization.
    const userMapPromise = fetchUserMap();
    let currentUserPromise:
        Promise<UserEntity> | null = null;
    let ideaRowsPromise:
        Promise<IdeaEntity[]> | null = null;
    let projectRowsPromise:
        Promise<ProjectEntity[]> | null = null;
    let flowRowsPromise:
        Promise<FlowEntity[]> | null = null;
    return {
        requestId: generateCryptoSafeBase62(),
        getUserMap: () => userMapPromise,
        getCurrentUser: () => {
            if (!currentUserPromise) {
                currentUserPromise =
                    GET<UserEntity>(
                        'current-user',
                    );
            }
            return currentUserPromise;
        },
        getIdeaRows: () => {
            if (!ideaRowsPromise) {
                ideaRowsPromise =
                    GET<IdeaEntity[]>(
                        'ideas',
                    );
            }
            return ideaRowsPromise;
        },
        getProjectRows: () => {
            if (!projectRowsPromise) {
                projectRowsPromise =
                    GET<ProjectEntity[]>(
                        'projects',
                    );
            }
            return projectRowsPromise;
        },
        getFlowRows: () => {
            if (!flowRowsPromise) {
                flowRowsPromise =
                    GET<FlowEntity[]>(
                        'flows',
                    );
            }
            return flowRowsPromise;
        },
        commit: async (
            tx: Transaction,
        ): Promise<void> => {
            for (const op of tx.ops) {
                if (op.method === 'put') {
                    await PUT(
                        op.resource,
                        op.body,
                    );
                } else {
                    await DELETE(op.resource);
                }
            }
            if (tx.notifyChannels) {
                for (
                    const ch of tx.notifyChannels
                ) {
                    ch.send();
                }
            }
        },
    };
}

export async function getUserMap(
    ctx?: FetchContext,
): Promise<Map<Id, User>> {
    if (ctx) return ctx.getUserMap();
    return fetchUserMap();
}

export function userName(
    userMap: Map<Id, User>,
    userId: Id,
): string {
    const user = userMap.get(userId);
    if (!user) {
        throw new Error(
            'userName: unknown user '
                + userId,
        );
    }
    return user.fullName();
}
