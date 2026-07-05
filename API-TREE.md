Take a look at this URI schema.

Please analyze how this fits into the applications's state needs, what verbs need to be implemented, what's missing, etc.

Know that every entity will be kept in a backend structured in this way: ~/.claude/plans/go-to-church-binary-stonebraker.md.

That mechanism will replace the existing ledger's and common states system by moving said state into each message stored message.

└─|─ /invitations/ • derived view over org-nested canonical storage
  |  └── :id
└─|─ /memberships/ • derived view over org-nested canonical storage
  |  └── :id
└─|─ /records/ • derived view over org-nested canonical storage
  |  └── :id
  |      └── /attribute-definitions.          • RECONCILED: shipped as the sibling record-attributes/:id family (canonical storage, per-attribute documents, 'stateless', the sixth registered family), not a nested single document — see the records FLIPPED 2026-07-05 block, go-to-church-peaceful-castle.md §Phased sequence
  |      └── /attribute-values                • RECONCILED: NOT built — no consumer; would derive the latest value per attribute (same block, B2)
└─|─ work-orders/ • derived view over org-nested canonical storage
  |  └── :id/
  |      └── claim
  |      └── transition
└─|─ /identities/
  |  └── :id                                   • default-organization is an attribute of the identity itself
  |      └─|─ /credentials                     • all of them, single document
  |      └─|─ /notifications                   • postgres LISTEN/NOTIFY for all changes to identity
  |      └─|─ /pii                             • full physical removal from the DB required, i.e. physical delete, all others: Delete-At: header
  |      └─|─ /role-grants                     • all of them, single document
  |      └─|─ /third-party-identity-providers  • all of them, single document
  |      └─|─ /token-revocations               • if the answer to the question directly above is "PUT/GET"
  |      └─|─ /memberships/                    • /memberships/ with forced and/or filtered identity
  |      └─|─ /organizations/                  • /organizations/ with forced and/or filtered identity
  |      └─|─ /work-orders/                    • /work-orders/ with forced and/or filtered identity
  |      └─|─ /tokens/
  |        |  └── :id
  |        |      ├── /rotation                • is this a POST?
  |        |      └── /revocation              • is this a POST?
  |        |      └── /revocation              • is this a POST, if not, a PUT/GET pair?
  |        \
  |         \- identity authz realm 
└─|─ /organizations/
  |  └─|─ :id
  |    |  └── /notifications                  • postgres LISTEN/NOTIFY for all changes to organization
  |    |  └── /objectives                     • RECONCILED: shipped as per-objective documents at objectives/:id (the seventh registered family, 'simple' + lifecycle 'stateless'), collection served by the generic document handler over per-entity heads, revision history as per-objective message history at objectives/:id/revisions/, NOT a single org document — see the objectives FLIPPED 2026-07-05 block, go-to-church-peaceful-castle.md §Phased sequence (Author gates 1/3)
  |    |  └── /flows/
  |    |      └── :id
  |    |          └── /undo
  |    |  └── /ideas/
  |    |      └── :id
  |    |  └── /memberships/                   • canonical storage (tenancy covenant)
  |    |  └── /projects/
  |    |      └── :id
  |    |          └── /scores                 • RECONCILED: NOT built — no consumer; the baseline and actual scores are shipped as per-row documents at projects/:id/objective-baseline-scores and objective-actual-scores, each flipped via a bespoke per-parent derive module — see the same block (Author gate 2)
  |    |  └── /records/                       • canonical storage
  |    |  └── /work-orders/                   • canonical storage
  \    \
   \    \- organization membership authz realm
    \- administration authz realm

└─|─ index.html
└─|─ /authentication/
  |  ├── token
  |  └── authorize
└─|─ /snapshots/
  |  └── export
  |  └── import
  |  └── mock-data
  |  └── pristine
  \
   \- public realm
