import {
    Identity,
    nowUtc,
    type Id,
    type IdentityEntity,
    type IdentityPiiEntity,
    type MemberPii,
} from '../../../api/types.ts';
import {
    generateCryptoSafeBase62,
} from '../../../api/crypto-safe-base62.ts';
import { hashPassword } from '../../../api/password-hash.ts';
import type { RequestContext, WriteOp } from './shared.ts';

export async function getIdentity(
    ctx: RequestContext,
    id: Id,
): Promise<Identity> {
    const entity = await ctx.GET<IdentityEntity>(
        `identities/${id}`,
    );
    return new Identity(entity);
}

// Returns the tagged union. A missing pii row (erased, or a
// service identity) is reported as erased — the CALLER, not
// this adapter, decides what to display.
export async function getMemberPii(
    ctx: RequestContext,
    id: Id,
): Promise<MemberPii> {
    const all = await ctx.GET<IdentityPiiEntity[]>(
        'identity-pii',
    );
    const row = all.find(r => r.id === id);
    if (row === undefined) {
        return { erased: true };
    }
    return {
        erased: false,
        name: row.name,
        email: row.email,
        phone: row.phone,
        bio: row.bio,
    };
}

export async function putMemberPii(
    ctx: RequestContext,
    id: Id,
    pii: Omit<IdentityPiiEntity, 'id'>,
): Promise<void> {
    await ctx.PUT(`identity-pii/${id}`, { ...pii });
}

export async function deleteIdentityPii(
    ctx: RequestContext,
    id: Id,
): Promise<void> {
    await ctx.DELETE(`identity-pii/${id}`);
}

// A person identity carries PII; a service identity
// carries a hashed client_secret credential and no PII.
// The discriminant mirrors IdentityEntity.kind.
export type IdentityCreationSpec =
    | {
        readonly kind: 'person';
        readonly pii: Omit<IdentityPiiEntity, 'id'>;
    }
    | {
        readonly kind: 'service';
        readonly secret: string;
    };

// Mint an identity by client-minted id + idempotent PUT
// (Commandment VII — no server INSERT). The identity
// stores carry no organization_id, so creation rides the
// GLOBAL spine, OFF the org facade. Person → identity +
// PII; service → identity + a hashed client_secret
// credential. Both halves ride one ctx.commit batch.
export async function postIdentityCreation(
    ctx: RequestContext,
    id: Id,
    spec: IdentityCreationSpec,
): Promise<void> {
    const ops: WriteOp[] = [{
        method: 'put',
        resource: `identities/${id}`,
        body: { kind: spec.kind },
    }];
    if (spec.kind === 'person') {
        ops.push({
            method: 'put',
            resource: `identity-pii/${id}`,
            body: { ...spec.pii },
        });
    } else {
        const credId = generateCryptoSafeBase62();
        ops.push({
            method: 'put',
            resource: `identity-credentials/${credId}`,
            body: {
                identity_id: id,
                kind: 'client_secret',
                status: 'set',
                secret: await hashPassword(spec.secret),
                at: nowUtc(),
            },
        });
    }
    await ctx.commit({ ops });
}
