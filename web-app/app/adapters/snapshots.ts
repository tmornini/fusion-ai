import { GET, POST, PUT, DELETE } from '../../../api/api.ts';
import { MissingTableError } from '../../../api/db.ts';
import type { UserEntity } from '../../../api/types.ts';

// Fallback when navigator.storage.estimate() is
// unavailable (older browsers, Node test runtime).
// Conservative default that fits comfortably in any
// browser's localStorage quota.
const FALLBACK_SNAPSHOT_CAP_BYTES = 5_000_000;

// Headroom for the import operation itself: the
// importSnapshot path holds the parsed snapshot in
// memory while writing per-table payloads, briefly
// doubling peak usage. Half the available quota keeps
// us off the QuotaExceededError edge.
const QUOTA_HEADROOM_RATIO = 0.5;

export class SnapshotTooLargeError extends Error {
    readonly fileSize: number;
    readonly available: number;
    constructor(
        fileSize: number,
        available: number,
    ) {
        super(
            'Snapshot too large: ' + fileSize
            + ' bytes exceeds available cap '
            + available + ' bytes',
        );
        this.name = 'SnapshotTooLargeError';
        this.fileSize = fileSize;
        this.available = available;
    }
}

async function computeAvailableForUpload(
): Promise<number> {
    const storage =
        typeof navigator !== 'undefined'
            ? navigator.storage
            : undefined;
    if (storage?.estimate) {
        const est = await storage.estimate();
        const quota = est.quota ?? 0;
        const usage = est.usage ?? 0;
        return Math.max(0, quota - usage);
    }
    return FALLBACK_SNAPSHOT_CAP_BYTES;
}

export async function deleteSchema(): Promise<void> {
    await DELETE('snapshots/schema');
}

export async function postSchemaCreation(
): Promise<void> {
    await POST('snapshots/schema', {});
}

export async function postMockDataLoad(
): Promise<void> {
    await POST(
        'snapshots/mock-data', {},
    );
}

export async function postBootstrap(
): Promise<void> {
    await POST(
        'snapshots/bootstrap', {},
    );
}

export async function putSnapshot(json: string): Promise<void> {
    await PUT('snapshots/import', { json });
}

export async function putSnapshotFromFile(
    file: File,
): Promise<void> {
    const available =
        await computeAvailableForUpload();
    const cap = Math.floor(
        available * QUOTA_HEADROOM_RATIO,
    );
    if (file.size > cap) {
        throw new SnapshotTooLargeError(
            file.size, cap,
        );
    }
    const json = await file.text();
    await putSnapshot(json);
}

export async function getSnapshot(): Promise<string> {
    return GET<string>('snapshots/schema');
}

export async function getDataPresent(): Promise<boolean> {
    try {
        const users =
            await GET<UserEntity[]>('users');
        return users.length > 0;
    } catch (err) {
        if (err instanceof MissingTableError) {
            return false;
        }
        throw err;
    }
}
