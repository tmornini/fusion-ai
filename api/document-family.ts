import type { DbAdapter } from './db.ts';
import { EntityNotFoundError } from './db.ts';
import type { Id } from './types.ts';
import type { MessagePair } from './message-pair.ts';
import { canonicalUriPrefix } from './message-pair.ts';
import {
    deriveDocumentsAt,
    documentPairsAt,
    documentLifecycleEvents,
    stateHistoryFrom,
    currentDocumentState,
    byIdAscending,
    DELETED_STATE,
    type DerivedDocument,
    type DocumentPair,
} from './derive-documents.ts';
import {
    param,
    requireOrganization,
    withoutId,
    postIdeaDocumentOp,
    postProjectDocumentOp,
    type Route,
    type GetHandler,
    type PutHandler,
    type WriteResponseSpec,
} from './routes.ts';
import {
    validateIdeaDocumentBody,
    validateProjectDocumentBody,
} from './validators.ts';
import { ideaEntityOf } from './derive-ideas.ts';
import { projectEntityOf } from './derive-projects.ts';

// The generic verb-class components (spec verb-class addendum):
// by the third registered family, the hand-written per-family
// route scaffolding (a GET deriving the head document, a PUT
// dispatching to the family's own decompose op, a
// WRITE_RESPONSE_SPECS entry re-deriving the same successBody)
// is ONE shape, parameterized by exactly three per-family
// facts — never grown beyond them without a fourth family's
// evidence.
export interface DocumentFamilyWiring {
    readonly family: string;
    // Validates the full wire document (entity + trio [+ family
    // extras]); throws ValidationError.
    readonly validateDocument:
        (body: Record<string, unknown>) => unknown;
    // The family's decompose op (old-plane rows + pair).
    readonly documentOp: (
        db: DbAdapter, id: Id,
        body: Record<string, unknown>, actor: Id,
        pair?: MessagePair,
    ) => Promise<unknown>;
    // Head-pair body -> wire entity (id + organization_id
    // stamped by the caller).
    readonly entityOf: (
        document: DerivedDocument, organization: Id,
    ) => unknown;
}

// The per-family wiring table — grown family by family (Task 3
// adds the flows row) — never consulted through anything but
// documentFamilyWiring: the gate's locked/simple keying (api.ts)
// treats membership here, ANDed with a 'locked' registration, as
// "this route is served via documentPutHandler" — never a
// blanket family-registry or DOCUMENT_CLASS_ROUTE_PATTERNS
// consult, so an unregistered-here family (flows, through this
// task) never rides the locked arm no matter what
// family-registry.ts declares. Exported (a mutable table, like
// FAMILY_REGISTRY) so the locked-arm's own tests can register a
// SYNTHETIC family for the duration of a test — no live family
// rides the locked arm through this task, since only ideas and
// projects are registered here, and both are 'simple'.
export const DOCUMENT_FAMILY_WIRINGS:
    Record<string, DocumentFamilyWiring> = {};

// ideas/projects are registered LAZILY, on documentFamilyWiring's
// FIRST call, rather than in a top-level object literal: this
// module and routes.ts import each other (this module's generic
// dispatch needs routes.ts's param/requireOrganization/withoutId;
// routes.ts's route table needs this module's builders), and a
// top-level literal referencing routes.ts's postIdeaDocumentOp/
// postProjectDocumentOp would race the OTHER side of that cycle
// during module evaluation — whichever module's top-level code
// runs first could observe the other's not-yet-initialized
// const. Deferring the literal's construction into a function
// body — invoked only at first REQUEST or test-call time, long
// after every module has finished evaluating — sidesteps the
// race entirely (function declarations, unlike const bindings,
// are hoisted whole across the cycle, so postIdeaDocumentOp/
// postProjectDocumentOp are always safe to reference HERE).
let builtinFamiliesRegistered = false;

function ensureBuiltinFamiliesRegistered(): void {
    if (builtinFamiliesRegistered) return;
    builtinFamiliesRegistered = true;
    DOCUMENT_FAMILY_WIRINGS['ideas'] = {
        family: 'ideas',
        validateDocument: validateIdeaDocumentBody,
        documentOp: postIdeaDocumentOp,
        entityOf: ideaEntityOf,
    };
    DOCUMENT_FAMILY_WIRINGS['projects'] = {
        family: 'projects',
        validateDocument: validateProjectDocumentBody,
        documentOp: postProjectDocumentOp,
        entityOf: projectEntityOf,
    };
}

export function documentFamilyWiring(
    family: string,
): DocumentFamilyWiring | undefined {
    ensureBuiltinFamiliesRegistered();
    return DOCUMENT_FAMILY_WIRINGS[family];
}

// The generic per-id derivation: fetch the family's prefix ONCE,
// reduce to the head document (deriveDocumentsAt) plus the
// lifecycle history (documentLifecycleEvents/stateHistoryFrom/
// currentDocumentState) over the SAME pairs, and 404 either
// absent or lifecycle-deleted — byte-identical to what
// deriveIdea/deriveProject already compute, since neither ever
// carried family-specific logic beyond the prefix, the
// not-found table name, and the entity mapper.
async function derivedDocumentEntity(
    wiring: DocumentFamilyWiring,
    db: DbAdapter,
    organization: Id,
    id: Id,
): Promise<unknown> {
    const prefix = canonicalUriPrefix(
        organization, '/' + wiring.family + '/',
    );
    const [requests, responses] = await Promise.all([
        db.requests.getAllWhere('uri_prefix', prefix),
        db.responses.getAllWhere('uri_prefix', prefix),
    ]);
    const document = deriveDocumentsAt(
        requests, responses, prefix,
    ).get(id);
    if (document === undefined) {
        throw new EntityNotFoundError(wiring.family, id);
    }
    const pairs = documentPairsAt(requests, responses, prefix)
        .filter((pair) => pair.uriId === id);
    const history = stateHistoryFrom(
        documentLifecycleEvents(pairs), id,
    );
    if (currentDocumentState(history) === DELETED_STATE) {
        throw new EntityNotFoundError(wiring.family, id);
    }
    return wiring.entityOf(document, organization);
}

export function documentGetHandler(
    wiring: DocumentFamilyWiring,
): GetHandler {
    return (db, params, _actor, organization) =>
        derivedDocumentEntity(
            wiring, db, requireOrganization(organization),
            param(params, 0),
        );
}

// The route body is UNCHANGED dispatch to the documentOp for
// BOTH concurrency classes — the locked/simple divide is
// resolved entirely upstream, at the gate (api.ts's four-outcome
// table decides follows/supersedes/412 BEFORE this handler ever
// runs), so documentPutHandler carries no concurrency branch of
// its own.
export function documentPutHandler(
    wiring: DocumentFamilyWiring,
): PutHandler {
    return (db, params, body, actor, pair) =>
        wiring.documentOp(
            db, param(params, 0), body, actor, pair,
        );
}

export function documentEntityRoute(
    wiring: DocumentFamilyWiring,
): Route {
    return {
        segments: [wiring.family, ':id'],
        get: documentGetHandler(wiring),
        put: documentPutHandler(wiring),
    };
}

export function documentCollectionRoute(
    wiring: DocumentFamilyWiring,
): Route {
    return {
        segments: [wiring.family],
        get: async (db, _params, _actor, organization) => {
            const organizationId = requireOrganization(
                organization,
            );
            const prefix = canonicalUriPrefix(
                organizationId, '/' + wiring.family + '/',
            );
            const [requests, responses] = await Promise.all([
                db.requests.getAllWhere('uri_prefix', prefix),
                db.responses.getAllWhere('uri_prefix', prefix),
            ]);
            const documents = deriveDocumentsAt(
                requests, responses, prefix,
            );
            const pairs = documentPairsAt(
                requests, responses, prefix,
            );
            const pairsById = new Map<Id, DocumentPair[]>();
            for (const pair of pairs) {
                const list = pairsById.get(pair.uriId);
                if (list === undefined) {
                    pairsById.set(pair.uriId, [pair]);
                } else {
                    list.push(pair);
                }
            }
            const rows: { id: Id }[] = [];
            for (const [id, document] of documents) {
                const history = stateHistoryFrom(
                    documentLifecycleEvents(
                        pairsById.get(id) ?? [],
                    ),
                    id,
                );
                if (
                    currentDocumentState(history)
                        === DELETED_STATE
                ) continue;
                rows.push(
                    wiring.entityOf(
                        document, organizationId,
                    ) as { id: Id },
                );
            }
            return rows.sort(byIdAscending);
        },
    };
}

export function documentWriteResponseSpec(
    wiring: DocumentFamilyWiring,
): WriteResponseSpec {
    return {
        status: 200,
        successBody: (params, body, _actor, organization) => {
            const doc = wiring.validateDocument(
                withoutId(body ?? {}),
            ) as { entity: Record<string, unknown> };
            return {
                id: param(params, 0),
                organization_id: organization,
                ...doc.entity,
            };
        },
    };
}
