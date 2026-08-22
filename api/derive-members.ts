import type { DbAdapter } from './db.ts';
import { EntityNotFoundError } from './db.ts';
import type { Id, MemberEntity } from './types.ts';
import { pickString } from './validators.ts';
import { canonicalUriCollection } from './message-pair.ts';
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
    deriveOrganizationMemberSeats,
} from './derive-memberships.ts';

// Roster is seats ∩ identities. Leftover /members/ parent
// documents do not join. A person identity with a live seat
// is a human roster row; absence of either is not a member.

const MEMBERS_PREFIX = canonicalUriCollection(undefined, '/members/');

// id-first — the seven-sibling entityOf convention — picked
// explicitly (pickString) rather than a body spread, the
// deriveObjectiveRevisions/deriveFlowRecords precedent: a leaked
// operation-pair body reaching this construction throws loudly
// rather than silently mis-deriving. `type`'s validated alphabet
// ('human' | 'ai' | 'system') was enforced at write time
// (validateMemberDocumentBody) — trusted here, not re-checked,
// per the Article of Faith: once data has crossed validation,
// trust it completely. Head document → wire MemberEntity:
// entity field (`type`) from the head body.
export function memberParentOf(
    document: DerivedDocument,
): MemberEntity {
    return {
        id: document.uriId,
        type: pickString(document.body, 'type') as
            MemberEntity['type'],
    };
}

function memberRowsFrom(
    documents: Map<string, DerivedDocument>,
    pairs: readonly DocumentPair[],
): MemberEntity[] {
    const pairsById = new Map<Id, DocumentPair[]>();
    for (const pair of pairs) {
        const list = pairsById.get(pair.uriId);
        if (list === undefined) {
            pairsById.set(pair.uriId, [pair]);
        } else {
            list.push(pair);
        }
    }
    const rows: MemberEntity[] = [];
    for (const [id, document] of documents) {
        const history = stateHistoryFrom(
            documentLifecycleEvents(
                pairsById.get(id) ?? [],
            ),
            id,
        );
        if (currentDocumentState(history) === DELETED_STATE) {
            continue;
        }
        rows.push(memberParentOf(document));
    }
    return rows;
}

// Every member-parent head, id-lex ordered (byIdAscending —
// the derivation's own order, never the backend's).
export async function deriveMemberParents(
    db: DbAdapter,
): Promise<MemberEntity[]> {
    const stored = await db.pairs.getAllWhere(
        'uri_collection', MEMBERS_PREFIX,
    );
    const documents = deriveDocumentsAt(
        stored, MEMBERS_PREFIX,
    );
    const pairs = documentPairsAt(
        stored, MEMBERS_PREFIX,
    );
    return memberRowsFrom(documents, pairs)
        .sort(byIdAscending);
}

// The single-head read; throws EntityNotFoundError('members', id)
// on absence — the 404-byte parity anchor ('Not found:
// members/<id>') tests/drift-roster.test.ts pins byte-for-byte
// against the old plane. Lifecycle-deleted heads 404 the same
// way (DELETED filter).
export async function deriveMemberParent(
    db: DbAdapter,
    id: Id,
): Promise<MemberEntity> {
    const stored = await db.pairs.getAllWhere(
        'uri_collection', MEMBERS_PREFIX,
    );
    const document = deriveDocumentsAt(
        stored, MEMBERS_PREFIX,
    ).get(id);
    if (document === undefined) {
        throw new EntityNotFoundError('members', id);
    }
    const pairs = documentPairsAt(
        stored, MEMBERS_PREFIX,
    ).filter((pair) => pair.uriId === id);
    const history = stateHistoryFrom(
        documentLifecycleEvents(pairs), id,
    );
    if (currentDocumentState(history) === DELETED_STATE) {
        throw new EntityNotFoundError('members', id);
    }
    return memberParentOf(document);
}

const IDENTITIES_PREFIX = canonicalUriCollection(
    undefined, '/identities/',
);

function seatedHumanOf(
    identityId: Id,
): MemberEntity {
    return {
        id: identityId,
        type: 'human',
    };
}

// Roster is seats ∩ person identities. Leftover /members/
// parent documents do not join. System is not a seat.
export async function deriveMembers(
    db: DbAdapter,
    organization: Id,
): Promise<MemberEntity[]> {
    const [seats, identityPairs] = await Promise.all([
        deriveOrganizationMemberSeats(db, organization),
        db.pairs.getAllWhere(
            'uri_collection', IDENTITIES_PREFIX,
        ),
    ]);
    const identities = deriveDocumentsAt(
        identityPairs, IDENTITIES_PREFIX,
    );
    const rows: MemberEntity[] = [];
    for (const seat of seats) {
        const identity = identities.get(seat.identity_id);
        if (identity === undefined) continue;
        if (pickString(identity.body, 'kind') !== 'person') {
            continue;
        }
        rows.push(seatedHumanOf(seat.identity_id));
    }
    return rows.sort(byIdAscending);
}
