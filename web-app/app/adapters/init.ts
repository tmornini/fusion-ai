import {
    createLocalStorageAdapter,
} from '../../../api/db-localstorage.ts';
import { initApi } from '../../../api/api.ts';
import { createFetchContext } from './shared.ts';

export async function initAdapter(
): Promise<boolean> {
    const adapter =
        await createLocalStorageAdapter();
    await adapter.initialize();
    initApi(adapter);
    const ctx = createFetchContext();
    const schema =
        await ctx.GET<string | null>(
            'snapshots/schema',
        );
    return schema !== null;
}
