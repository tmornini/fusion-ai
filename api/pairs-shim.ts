// TEMPORARY. Pairs over the two existing
// tables. Deleted when storage flips to one
// `pairs` table. Reads zip by id and sort by
// response at (today's reader posture);
// unmatched rows are skipped. put writes both
// halves.

import { EntityNotFoundError } from './db.ts';
import type {
    EntityPut, EntityStore,
} from './db.ts';
import type {
    PairEntity, RequestEntity, ResponseEntity,
} from './types.ts';

function compareResponseAtId(
    a: PairEntity, b: PairEntity,
): number {
    if (a.response_at < b.response_at) return -1;
    if (a.response_at > b.response_at) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
}

function zip(
    request: RequestEntity | undefined,
    response: ResponseEntity | undefined,
): PairEntity | undefined {
    if (
        request === undefined
        || response === undefined
    ) {
        return undefined;
    }
    return {
        id: request.id,
        uri_collection: request.uri_collection,
        uri_id: request.uri_id,
        requester_identity_id:
            request.requester_identity_id,
        method: request.method,
        request_at: request.at,
        request_hash: request.message_hash,
        request: request.message,
        response_at: response.at,
        version: response.version,
        response: response.message,
        operation_id: request.operation_id,
    };
}

function requestHalf(pair: PairEntity): RequestEntity {
    return {
        id: pair.id,
        uri_collection: pair.uri_collection,
        uri_id: pair.uri_id,
        at: pair.request_at,
        requester_identity_id:
            pair.requester_identity_id,
        message_hash: pair.request_hash,
        message: pair.request,
        method: pair.method,
        operation_id: pair.operation_id,
    };
}

function responseHalf(pair: PairEntity): ResponseEntity {
    return {
        id: pair.id,
        uri_collection: pair.uri_collection,
        uri_id: pair.uri_id,
        at: pair.response_at,
        version: pair.version,
        message: pair.response,
        operation_id: pair.operation_id,
    };
}

export function pairsShim(
    requests: EntityStore<RequestEntity>,
    responses: EntityStore<ResponseEntity>,
): EntityStore<PairEntity> {
    async function zipLists(
        reqs: readonly RequestEntity[],
        resps: readonly ResponseEntity[],
    ): Promise<PairEntity[]> {
        const requestById = new Map(
            reqs.map((row) => [row.id, row]),
        );
        const pairs: PairEntity[] = [];
        for (const response of resps) {
            const pair = zip(
                requestById.get(response.id),
                response,
            );
            if (pair !== undefined) {
                pairs.push(pair);
            }
        }
        return pairs.sort(compareResponseAtId);
    }

    return {
        async getAll() {
            return zipLists(
                await requests.getAll(),
                await responses.getAll(),
            );
        },
        async getAllWhere(column, key) {
            if (column === 'request_hash') {
                const reqs =
                    await requests.getAllWhere(
                        'message_hash', key,
                    );
                const resps = await Promise.all(
                    reqs.map((row) =>
                        responses.getById(row.id)
                            .catch(() =>
                                undefined),
                    ),
                );
                const pairs: PairEntity[] = [];
                for (let i = 0; i < reqs.length;
                    i++) {
                    const pair = zip(
                        reqs[i], resps[i],
                    );
                    if (pair !== undefined) {
                        pairs.push(pair);
                    }
                }
                return pairs.sort(
                    compareResponseAtId,
                );
            }
            return zipLists(
                await requests.getAllWhere(
                    column, key,
                ),
                await responses.getAllWhere(
                    column, key,
                ),
            );
        },
        async getAllAtAddress(collection, uriId) {
            return zipLists(
                await requests.getAllAtAddress(
                    collection, uriId,
                ),
                await responses.getAllAtAddress(
                    collection, uriId,
                ),
            );
        },
        async getAllAtVersion(
            collection, uriId, version,
        ) {
            const resps =
                await responses.getAllAtVersion(
                    collection, uriId, version,
                );
            const pairs: PairEntity[] = [];
            for (const response of resps) {
                const request = await requests
                    .getById(response.id)
                    .catch(() => undefined);
                const pair = zip(
                    request, response,
                );
                if (pair !== undefined) {
                    pairs.push(pair);
                }
            }
            return pairs.sort(
                compareResponseAtId,
            );
        },
        async getAllWhereBody(
            collection, containment,
        ) {
            const resps =
                await responses.getAllWhereBody(
                    collection, containment,
                );
            const pairs: PairEntity[] = [];
            for (const response of resps) {
                const request = await requests
                    .getById(response.id)
                    .catch(() => undefined);
                const pair = zip(
                    request, response,
                );
                if (pair !== undefined) {
                    pairs.push(pair);
                }
            }
            return pairs.sort(
                compareResponseAtId,
            );
        },
        async getById(id) {
            const request = await requests
                .getById(id)
                .catch(() => undefined);
            const response = await responses
                .getById(id)
                .catch(() => undefined);
            const pair = zip(request, response);
            if (pair === undefined) {
                throw new EntityNotFoundError(
                    'pairs', id,
                );
            }
            return pair;
        },
        async put(id, fields) {
            const pair = {
                ...fields, id,
            } as PairEntity;
            await requests.put(
                id, requestHalf(pair),
            );
            await responses.put(
                id, responseHalf(pair),
            );
            return pair;
        },
        async putMany(entries, deleteIds) {
            const requestEntries:
                EntityPut<RequestEntity>[] = [];
            const responseEntries:
                EntityPut<ResponseEntity>[] = [];
            for (const entry of entries) {
                const pair = {
                    ...entry.fields,
                    id: entry.id,
                } as PairEntity;
                requestEntries.push({
                    id: entry.id,
                    fields: requestHalf(pair),
                });
                responseEntries.push({
                    id: entry.id,
                    fields: responseHalf(pair),
                });
            }
            await requests.putMany(
                requestEntries, deleteIds,
            );
            await responses.putMany(
                responseEntries, deleteIds,
            );
        },
        async delete(id) {
            await requests.delete(id);
            await responses.delete(id);
        },
    };
}
