import { generateCryptoSafeBase62 } from
    '../shared/crypto-safe-base62.ts';

const BASE = 'http://localhost';

// Fixed 22-char id for below-gate pair fixtures that do
// not ride a public write (seed/tests). Not a public mint.
export const TEST_OPERATION_ID = '0123456789ABCDEFGHIJKL';

export function apiRequest(input: {
    readonly method: string;
    readonly path: string;
    readonly token?: string;
    readonly body?: unknown;
    readonly operationId?: string;
    readonly headers?: Readonly<Record<string, string>>;
}): Request {
    const write = input.method !== 'GET'
        && input.method !== 'HEAD';
    const headers: Record<string, string> = {
        ...(input.headers ?? {}),
    };
    if (input.token !== undefined) {
        headers['Authorization'] =
            'Bearer ' + input.token;
    }
    if (input.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    if (write && headers['operation-id'] === undefined) {
        headers['operation-id'] =
            input.operationId
            ?? generateCryptoSafeBase62();
    }
    return new Request(BASE + input.path, {
        method: input.method,
        headers,
        ...(input.body !== undefined
            ? { body: JSON.stringify(input.body) }
            : {}),
    });
}
