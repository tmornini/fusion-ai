import { generateCryptoSafeBase62 } from
    '../../../shared/crypto-safe-base62.ts';
import {
    UnauthorizedError,
    RequestError,
    HTTP_UNAUTHORIZED,
} from '../../../api/http-errors.ts';
import { REQUEST_ID_HEADER } from
    '../../../api/request-context.ts';
import { OPERATION_ID_HEADER } from
    '../../../api/message-pair.ts';

// Fetch transport for the server ZIP. Same RequestContext
// verbs as the in-page facade, over real HTTP. No import of
// api/api.ts — that graph stays out of the server client.
// Writes always send Operation-ID. A 401 surfaces as
// UnauthorizedError; the silent-refresh mutex is Task 46.

export interface HttpFacade {
    GET<T>(
        resource: string,
        token: string,
        requestId?: string,
    ): Promise<T>;
    GETWithEtag<T>(
        resource: string,
        token: string,
        requestId?: string,
    ): Promise<{ body: T; etag: string | undefined }>;
    PUT<T>(
        resource: string,
        payload: Record<string, unknown>,
        token: string,
        headerFields?: readonly (readonly [string, string])[],
        requestId?: string,
    ): Promise<T>;
    PUTWithEtag<T>(
        resource: string,
        payload: Record<string, unknown>,
        token: string,
        headerFields?: readonly (readonly [string, string])[],
        requestId?: string,
    ): Promise<{ body: T; etag: string | undefined }>;
    PATCH<T>(
        resource: string,
        payload: Record<string, unknown>,
        token: string,
        headerFields?: readonly (readonly [string, string])[],
        requestId?: string,
    ): Promise<T>;
    PATCHWithEtag<T>(
        resource: string,
        payload: Record<string, unknown>,
        token: string,
        headerFields?: readonly (readonly [string, string])[],
        requestId?: string,
    ): Promise<{ body: T; etag: string | undefined }>;
    DELETE(
        resource: string,
        token: string,
        requestId?: string,
        headerFields?: readonly (readonly [string, string])[],
    ): Promise<void>;
    POST<T>(
        resource: string,
        payload: Record<string, unknown>,
        token: string,
        requestId?: string,
        headerFields?: readonly (readonly [string, string])[],
    ): Promise<T>;
}

async function unwrapResponse<T>(
    response: Response,
): Promise<T> {
    if (response.ok) {
        const text = await response.text();
        if (text === '') return undefined as T;
        return JSON.parse(text) as T;
    }
    const { error } =
        (await response.json()) as {
            error: string;
        };
    if (response.status === HTTP_UNAUTHORIZED) {
        throw new UnauthorizedError(error);
    }
    throw new RequestError(
        `${error} (${response.url})`,
        response.status,
    );
}

function etagFromHeader(
    response: Response,
): string | undefined {
    const raw = response.headers.get('ETag');
    if (raw === null || raw === '') {
        return undefined;
    }
    if (
        raw.length >= 2
        && raw[0] === '"'
        && raw[raw.length - 1] === '"'
    ) {
        return raw.slice(1, -1);
    }
    return raw;
}

function requestHeaders(
    token: string,
    requestId: string | undefined,
    contentType: boolean,
    write: boolean,
    extra: readonly (readonly [string, string])[]
        | undefined,
): Headers {
    const headers = new Headers();
    headers.set('Authorization', 'Bearer ' + token);
    if (contentType) {
        headers.set('Content-Type', 'application/json');
    }
    if (requestId !== undefined) {
        headers.set(REQUEST_ID_HEADER, requestId);
    }
    if (extra !== undefined) {
        for (const [name, value] of extra) {
            headers.set(name, value);
        }
    }
    if (write && !headers.has(OPERATION_ID_HEADER)) {
        headers.set(
            OPERATION_ID_HEADER,
            generateCryptoSafeBase62(),
        );
    }
    return headers;
}

export function createHttpFacade(
    origin: string,
): HttpFacade {
    function exchange(
        method: string,
        resource: string,
        token: string,
        requestId: string | undefined,
        payload: Record<string, unknown> | undefined,
        extra: readonly (readonly [string, string])[]
            | undefined,
        write: boolean,
    ): Promise<Response> {
        return fetch(origin + '/' + resource, {
            method,
            credentials: 'same-origin',
            headers: requestHeaders(
                token,
                requestId,
                payload !== undefined,
                write,
                extra,
            ),
            ...(payload !== undefined
                ? { body: JSON.stringify(payload) }
                : {}),
        });
    }

    const facade: HttpFacade = {
        GET: async (resource, token, requestId) =>
            unwrapResponse(
                await exchange(
                    'GET', resource, token, requestId,
                    undefined, undefined, false,
                ),
            ),
        GETWithEtag: async (resource, token, requestId) => {
            const response = await exchange(
                'GET', resource, token, requestId,
                undefined, undefined, false,
            );
            return {
                body: await unwrapResponse(response),
                etag: etagFromHeader(response),
            };
        },
        PUT: async (
            resource, payload, token,
            headerFields, requestId,
        ) => unwrapResponse(
            await exchange(
                'PUT', resource, token, requestId,
                payload, headerFields, true,
            ),
        ),
        PUTWithEtag: async (
            resource, payload, token,
            headerFields, requestId,
        ) => {
            const response = await exchange(
                'PUT', resource, token, requestId,
                payload, headerFields, true,
            );
            return {
                body: await unwrapResponse(response),
                etag: etagFromHeader(response),
            };
        },
        PATCH: async (
            resource, payload, token,
            headerFields, requestId,
        ) => unwrapResponse(
            await exchange(
                'PATCH', resource, token, requestId,
                payload, headerFields, true,
            ),
        ),
        PATCHWithEtag: async (
            resource, payload, token,
            headerFields, requestId,
        ) => {
            const response = await exchange(
                'PATCH', resource, token, requestId,
                payload, headerFields, true,
            );
            return {
                body: await unwrapResponse(response),
                etag: etagFromHeader(response),
            };
        },
        DELETE: async (
            resource, token, requestId, headerFields,
        ) => {
            await unwrapResponse(
                await exchange(
                    'DELETE', resource, token, requestId,
                    undefined, headerFields, true,
                ),
            );
        },
        POST: async (
            resource, payload, token,
            requestId, headerFields,
        ) => unwrapResponse(
            await exchange(
                'POST', resource, token, requestId,
                payload, headerFields, true,
            ),
        ),
    };
    return facade;
}
