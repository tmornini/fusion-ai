// The ONLY place BroadcastChannel is named — the divorce
// point for cross-tab data notification, against the day the
// platform evolves. Inert without a browser: Node ships a
// BroadcastChannel (for worker threads), so absence can't be
// the guard; we key on `window`, so post/subscribe are no-ops
// under `node --test` and never hold the process open.

import {
    subscribeEventListener,
} from './event-listener.ts';
import type {
    NotificationEvent,
} from '../../../api/notifications.ts';
import {
    notificationEventFromWire,
} from '../../../api/notifications.ts';

const CHANNEL_NAME = 'fusion-ai:data';

interface TablesMessage {
    readonly tables: readonly string[];
}

let channel: BroadcastChannel | undefined;

function getChannel(): BroadcastChannel | undefined {
    if (typeof window === 'undefined') return undefined;
    if (channel === undefined) {
        channel = new BroadcastChannel(CHANNEL_NAME);
        // A test that shims `window` could reach here under
        // node --test, where BroadcastChannel is a ref'd
        // handle that would keep the runner from exiting.
        // Node's channel exposes unref(); the browser's does
        // not, so this is a no-op in a real tab.
        (channel as unknown as {
            unref?: () => void;
        }).unref?.();
    }
    return channel;
}

// Announce that `tables` changed in this tab. Other tabs'
// subscribers fire; BroadcastChannel does not echo to the
// poster, so the originating tab never double-refreshes.
export function postTablesChanged(
    tables: readonly string[],
): void {
    const message: TablesMessage = { tables };
    getChannel()?.postMessage(message);
}

// The wire shape is another tab's dharma — validate it at
// this adapter before any subscriber trusts it. A malformed
// message is a bug in the poster; crash loudly rather than
// hand subscribers a corrupt table list.
export function tablesFromMessage(
    data: unknown,
): readonly string[] {
    if (typeof data === 'object' && data !== null) {
        const { tables } = data as { tables?: unknown };
        if (
            Array.isArray(tables)
            && tables.every(t => typeof t === 'string')
        ) {
            return tables;
        }
    }
    throw new Error(
        'malformed cross-tab tables message: '
        + JSON.stringify(data),
    );
}

// Subscribe to cross-tab table-change announcements; returns
// an unsubscribe function.
//
// TRANSITIONAL (deleted in the retirement commit): while both
// the retiring table-name protocol and the new scoped
// notification protocol ride the one channel, a message
// bearing the OTHER protocol's shape ('kind' in data) is
// silently skipped rather than validated — validation still
// throws on a message matching NEITHER shape.
export function subscribeTablesChanged(
    handler: (tables: readonly string[]) => void,
): () => void {
    const ch = getChannel();
    if (ch === undefined) return () => {};
    const listener = (event: MessageEvent): void => {
        const data = event.data as unknown;
        if (typeof data === 'object' && data !== null
            && 'kind' in data) {
            return;
        }
        handler(tablesFromMessage(data));
    };
    return subscribeEventListener(ch, 'message', listener);
}

// Announce a scoped (or full) notification event. Other tabs'
// subscribers fire; BroadcastChannel does not echo to the
// poster, so the originating tab never double-refreshes.
export function postNotificationEvent(
    event: NotificationEvent,
): void {
    getChannel()?.postMessage(event);
}

// Subscribe to cross-tab notification events; returns an
// unsubscribe function.
//
// TRANSITIONAL (deleted in the retirement commit): a message
// bearing the retiring table-name protocol's shape ('tables'
// in data) is silently skipped rather than validated —
// validation still throws on a message matching NEITHER
// shape.
export function subscribeNotificationEvents(
    handler: (event: NotificationEvent) => void,
): () => void {
    const ch = getChannel();
    if (ch === undefined) return () => {};
    const listener = (event: MessageEvent): void => {
        const data = event.data as unknown;
        if (typeof data === 'object' && data !== null
            && 'tables' in data) {
            return;
        }
        handler(notificationEventFromWire(data));
    };
    return subscribeEventListener(ch, 'message', listener);
}
