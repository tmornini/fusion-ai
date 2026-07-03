import type { Id, RequestEntity, ResponseEntity } from './types.ts';
import { latestByKey } from '../shared/ledger-reduction.ts';
import { HttpMessage } from '../shared/http-message/http-message.ts';
import { parseJson } from '../shared/http-message/json-codec.ts';
import {
    defaultBodyRegistry,
} from '../shared/http-message/media-registry.ts';

// The message-plane reduction, family-agnostic and pure over
// rows a family's own derivation has already fetched (Efficiency:
// one prefix scan per derivation lives in the caller, never
// here — this module never touches a DbAdapter).

const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 299;
const DELETE_METHOD = 'DELETE';

function isSuccessStatus(status: number): boolean {
    return status >= SUCCESS_STATUS_MIN
        && status <= SUCCESS_STATUS_MAX;
}

function requestMethodOf(message: string): string {
    const model = parseJson(message, defaultBodyRegistry());
    if (model.startLine.kind !== 'request') {
        throw new Error(
            'stored request message carries no request line',
        );
    }
    return model.startLine.method;
}

function requestBodyOf(
    message: string,
): Record<string, unknown> {
    const model = parseJson(message, defaultBodyRegistry());
    const body = HttpMessage.fromModel(model).body();
    return body.exists()
        ? JSON.parse(body.toText()) as Record<string, unknown>
        : {};
}

// One decoded 2xx pair at a prefix: the request's parsed body,
// plus the fields a family's own reduction needs beyond the
// document itself — the response envelope's own (at, id) for
// arrival order, and the requester for provenance. Shared raw
// material for both the head-document reduction below and a
// family's own lifecycle reduction over the SAME pairs, grouped
// and compared by fields the family alone knows (api/derive-
// ideas.ts's state trio).
export interface DocumentPair {
    readonly id: Id;
    readonly at: string;
    readonly uriId: string;
    readonly method: string;
    readonly body: Record<string, unknown>;
    readonly requesterIdentityId: Id;
}

// Every 2xx pair at `uriPrefix`, request matched to its response
// by their shared id, decoded once — ascending by the envelope
// (at, id), the SAME arrival order headPairIdAt (message-pair.ts)
// picks a single head from. A response with no stored request
// (should never happen for an appended pair) is skipped rather
// than thrown — this module trusts validated storage completely
// but does not assume it can dereference a foreign key that
// itself would be a storage bug elsewhere.
export function documentPairsAt(
    requests: readonly RequestEntity[],
    responses: readonly ResponseEntity[],
    uriPrefix: string,
): readonly DocumentPair[] {
    const requestById = new Map(
        requests.map((request) => [request.id, request]),
    );
    const pairs: DocumentPair[] = [];
    for (const response of responses) {
        if (
            response.uri_prefix !== uriPrefix
            || !isSuccessStatus(response.status)
        ) continue;
        const request = requestById.get(response.id);
        if (request === undefined) continue;
        pairs.push({
            id: response.id,
            at: response.at,
            uriId: response.uri_id,
            method: requestMethodOf(request.message),
            body: requestBodyOf(request.message),
            requesterIdentityId: request.requester_identity_id,
        });
    }
    return pairs.sort((a, b) =>
        a.at < b.at ? -1
            : a.at > b.at ? 1
                : a.id < b.id ? -1
                    : a.id > b.id ? 1
                        : 0);
}

// The head document per uri_id at a prefix. Family-agnostic and
// pure over the fetched rows; a family's own reshaping (api/
// derive-ideas.ts) turns each DerivedDocument into its own entity
// shape.
export interface DerivedDocument {
    readonly uriId: string;
    readonly pairId: string;        // head pair (== the
                                     // advertisable
                                     // Response-ID)
    readonly method: string;        // head method; DELETE
                                     // head == absent
    readonly body: Record<string, unknown>;
}

// Latest pair per uri_id at a prefix by the (at, id) reduction;
// 2xx pairs only; a DELETE head excludes the document. Supersedes
// is NEVER walked (provenance-only — a DAG under races; only the
// reduction decides currency).
export function deriveDocumentsAt(
    requests: readonly RequestEntity[],
    responses: readonly ResponseEntity[],
    uriPrefix: string,
): Map<string, DerivedDocument> {
    const pairs = documentPairsAt(requests, responses, uriPrefix);
    const heads = latestByKey(pairs, (pair) => pair.uriId);
    const documents = new Map<string, DerivedDocument>();
    for (const [uriId, head] of heads) {
        if (head.method === DELETE_METHOD) continue;
        documents.set(uriId, {
            uriId,
            pairId: head.id,
            method: head.method,
            body: head.body,
        });
    }
    return documents;
}
