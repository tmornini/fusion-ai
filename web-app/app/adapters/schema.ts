import {
    createSubscriptionChannel,
} from '../channels.ts';
import {
    TABLE_NAMES,
} from '../../../api/db-localstorage.ts';

const schemaChanges =
    createSubscriptionChannel(TABLE_NAMES);

export function subscribeSchemaChanges(
    fn: () => void,
): () => void {
    return schemaChanges.subscribe(fn);
}
