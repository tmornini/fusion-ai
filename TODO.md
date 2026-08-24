# TODO

## Later work

- READY gate rejects dangling attribute
  refs and unbind prunes them —
  `tests/adapters-flow-publish.test.ts`
- One client 401-recovery voice through
  `redirectToLogin()` with `?return=` —
  `tests/adapters-http-facade.test.ts`
- Toast pause on hover and focus
- Physical PII erasure — closes KNOWN
  seam: Erased PII persists as superseded
  pairs
- Mock seed's fixed 2026-06-15 anchor —
  after 2026-09-13 serial-mode FS3
  carries in-flight heat only
- Work-order locked verbs not executed —
  `tests/family-registry.test.ts`
- Token-at-rest hashing — closes KNOWN seam:
  A raw dump still has verbatim auth messages
- Two-role views — `tests/backend-postgres.test.ts`
- `putRecordInstance` still PATCHes (name lie) —
  `tests/adapters-record-instances.test.ts`,
  `tests/api-instances-create.test.ts`
- Same-body PATCH still appends 201 —
  `tests/api-instances-create.test.ts`
- Roster seat that names an AI agent —
  `tests/family-registry.test.ts`
- Profile as its own document,
  `identities/:id/profile`, 404 = no profile —
  closes whole-or-none —
  `tests/api-identity-document.test.ts`
- Roster rows carry a fabricated empty profile
  (`emptyPersonProfile`) —
  `web-app/app/adapters/members.ts`
- `DEFAULT_DIM` stands in for an assessment that
  never happened — `web-app/members/index.ts`
- The re-mint refresh is not single-flighted with
  the facade's cookie refresh —
  `web-app/app/adapters/shared.ts`
- Member detail's subscriber refresh after save is
  a redundant GET trio — `web-app/members/detail.ts`
- `./measure` harvests error-page timings;
  `page:ready` carries no status —
  `web-app/app/measure.ts`
