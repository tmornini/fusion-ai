import type { RecordEntity } from '../types.ts';

// The seeded Records and their stable ids. The id consts are
// shared with the record attributes, flow-record bindings, and
// record state events, so they are exported. Fixed data; the
// composition root assigns organization_id at write time.
export const customerProfileRecordId =
    'rec01CustProfRec0rdAB1';
export const projectBriefRecordId =
    'rec02Pr0jBriefRec0rd02';

export function buildRecords():
    Omit<RecordEntity, 'organization_id'>[] {
    return [
        {
            id: customerProfileRecordId,
            name: 'Customer Profile',
            description:
                'Company-side facts captured during'
                + ' onboarding and sales pursuits.',
            position: 1,
        },
        {
            id: projectBriefRecordId,
            name: 'Project Brief',
            description:
                'Lightweight scoping shape used by'
                + ' the Fusion Flow.',
            position: 2,
        },
    ];
}
