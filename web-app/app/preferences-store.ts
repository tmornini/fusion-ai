import { log } from './logger';

function readPreference(
    key: string,
): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        log.warn(
            'Failed to read preference: '
            + key,
            'preferences-store',
        );
        return null;
    }
}

function writePreference(
    key: string,
    value: string,
): void {
    localStorage.setItem(key, value);
}

export {
    readPreference,
    writePreference,
};
