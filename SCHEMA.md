# Database Schema

> **Note on `SCHEMA.svg`:** the ERD is generated from the
> schema of record (`api/db.ts` + `api/types.ts`) by
> `./generate-schema-svg`; `./validate` runs it with
> `--check` and fails on drift, so it never goes stale.
> Regenerate with `./generate-schema-svg` after a schema
> change.

The tables are listed in `api/db.ts` as `TABLE_NAMES` (the
authoritative count). Each table is an IndexedDB object store
(`keyPath: 'id'`) in the `fusion-ai` database; the simulated
backends key the same tables as `fusion-ai:tableName`. All
rows have a text `id` primary key. Column types: TEXT
(string), INTEGER (number), REAL (float), BOOLEAN (see
below). JSON columns store stringified
arrays or objects. All columns are NOT NULL — entity
validation on creation ensures every field is present.

**Timestamp width:** every persisted timestamp is RFC-3339
zulu at EXACTLY six fraction digits (`…T12:00:00.000000Z`)
— the one width the mints emit and the append-only ledgers
sort (lexical = chronological holds only within one width).
The validation gate rejects any other width, so a snapshot
exported before this pin that carries 3-digit or
fractionless stamps fails import loudly; the documented
recovery is re-seeding (Settings → mock data) or
re-exporting from a current build.

**Boolean storage:** BOOLEAN columns are typed as `boolean`
in TypeScript (`api/types.ts`) and persist NATIVELY — there
is no `0`|`1` transform. The one storage-edge transform is
the NOT-NULL gate in `api/storage-serialize.ts`
(`serializeValue`), which every backend applies so a write
with a null/undefined field throws rather than persisting.

**Timestamp convention:** TEXT columns storing timestamps
use RFC-3339 Zulu format (e.g.,
`2024-01-15T09:30:00.000000Z`). Temporal facts belong in
event tables — the absence of a row is the absence of the
event.

**State and deletion:** Entity rows themselves never carry
state columns (`status`, `readiness`, `deleted_at`,
`deprecated_at`, etc. are retired) — with one named
deviation: `clients.status` is a mutable lifecycle column
on the client registry row (see § clients). Ledger tables'
`status` columns are event labels on immutable rows, not
entity state. Every entity
lifecycle change is recorded as one row in the unified
`states` event log. The latest event by `at` (a same-`at`
tie falls to the larger row id — one total order on every
backend) is the entity's current state. `'deleted'` is a
state event value, not a separate table.
`EntityStore.getAll`/`getById` consult
`StateStore.getDeletedIdsIn(tx)` / `isDeletedIn(tx, id)` — the
in-transaction variants that ride the SAME tx as the
entity-row read (two reads, one truth) — to filter
currently-deleted rows; `EntityStore.delete(id)` is
retained for hard splice of relationship rows
(`state_field_values`, etc.) where lifecycle event log
overkill — the seam is "entity lifecycle = state event;
relationship dissolution = splice." History tables
(`flow_versions`) are exempt and hard-delete via row
removal.

**The `'system'` member:** `SYSTEM_MEMBER_ID = 'system'`
in `api/types.ts` is a `members` parent row with
`type = 'system'` and no detail row, seeded by both
`postMockDataLoad` and `postBootstrap`. Its
corresponding `identity` row carries `kind = 'service'`
— the platform itself as a non-person principal. State
events with no specific user actor reference it. It is a
pure event-author: `getMemberMap` resolves it for
authorship display, but the `getMembers` roster — and
every list, picker, and detail view — omits it.

## Core

### members

The parent member table: one row per member holding the
shared identity and the `type` discriminant only. The
display name lives with the kind — `ai_members.name`,
`identity_pii.name` — or as the `SYSTEM_MEMBER_NAME`
constant. Kind-specific detail lives in `human_members` /
`ai_members`, keyed by the same id; a `'system'` member
is a parent row with no detail row. The terminal
lifecycle state is `'archived'`, recorded in the `states`
log.

| Column | Type |
|--------|------|
| id | TEXT |
| type | TEXT (`human` \| `ai` \| `system`) |

### human_members

Human org-profile detail, keyed by the shared member id.
Contact PII (name, email, phone, bio) lives in
`identity_pii`, not here; this row carries only the org
profile.

| Column | Type |
|--------|------|
| id | TEXT |
| title | TEXT |
| department | TEXT |
| strengths | TEXT (JSON array) |
| team_dimensions | TEXT (JSON object) |

### ai_members

AI detail, keyed by the shared member id. The AI's
display `name` lives here, not on the parent. All member
kinds share the `MEMBER_STATES` alphabet (`active`,
`pending`, `archived`), recorded in the `states` log.

`model` is a foreign key into the code-resident
provider-model catalog (`api/provider-models.ts`), not a
DB table; the gate validates membership. `skill_focus`
is free text, NOT NULL — empty is `''`, never null.

| Column | Type |
|--------|------|
| id | TEXT |
| name | TEXT |
| description | TEXT |
| skill_focus | TEXT |
| model | TEXT |

### identities

One row per principal in the system. The `id` is the
universal key: `member.id === identity.id`, always —
no separate join is needed. `kind` is the NATURE of
the principal: `person` (a human being) or `service`
(an automated agent, API client, or the platform
itself). `kind` is NOT a statement about sensitive
data — both kinds carry it: persons an
`identity_pii` row, services credentials in
`identity_credentials`.

| Column | Type |
|--------|------|
| id | TEXT |
| kind | TEXT (`person` \| `service`) |

### identity_pii

Person-PII facet, keyed by the shared identity id.
Services have no row here; their secrets live in
`identity_credentials`. All columns are NOT NULL —
erased PII is the ABSENCE of the row, not a null
column. Erasure is a hard splice (`EntityStore
.delete`): the identity row, the member row, and
every `member_id` reference survive unchanged.

| Column | Type |
|--------|------|
| id | TEXT |
| name | TEXT |
| email | TEXT |
| phone | TEXT |
| bio | TEXT |

### identity_credentials

Append-only credential lifecycle ledger
(`HistoryEntityStore`). One row per event; current
validity is the latest event per
`(identity_id, kind)`. `kind` is `password`
(person interactive secret) or `client_secret`
(service shared secret). `status` is `set`,
`rotated`, or `revoked`. `at` is the RFC-3339 Zulu
moment of the event.

Revocation is a NEW `'revoked'` event — never a
splice. This is the OPPOSITE discipline from
`identity_pii` (which erases by splice). For a
`password` credential, `secret` is the PBKDF2 hash
(a `$pbkdf2-sha256$` PHC string, `api/password-hash.ts`),
verified at login by `verifyPassword`
(`api/password-hash.ts`) — plaintext is never stored.
The read routes project `secret` out (`routes.ts`
`withoutSecret`), so it never crosses the API boundary.

| Column | Type |
|--------|------|
| id | TEXT |
| identity_id | TEXT (FK → identities) |
| kind | TEXT (`password` \| `client_secret`) |
| status | TEXT (`set` \| `rotated` \| `revoked`) |
| secret | TEXT |
| at | TEXT |

### identity_token_revocations

Append-only "log-out-everywhere" ledger
(`HistoryEntityStore`). Each row records a moment
after which every access token for that identity is
revoked. The effective revoked-before stamp is the
LATEST `at` per `identity_id` (derive from the
ledger — `latestRevocationAt` in
`api/access-token.ts` is its single home). The token
gate (`handleRequest`) rejects a Bearer whose `iat`
precedes that stamp. A logout is a NEW row — never a
mutated column; append-and-max-reduce is commutative,
so a concurrent cross-tab append can only DELAY a
logout, never un-revoke. `at` is validated as a
well-formed RFC-3339 Zulu timestamp at the storage
gate (the revoked-before reduce trusts it parses).

Logging an identity out everywhere also revokes the
ACTOR's own in-flight token (its `iat` predates the
new stamp) — a caller must re-establish a session
before any further write.

| Column | Type |
|--------|------|
| id | TEXT |
| identity_id | TEXT (FK → identities) |
| at | TEXT |

### identity_default_organizations

Append-only set-default-org ledger
(`HistoryEntityStore`). Each row records a moment an
identity chose its default organization — the org a
flat (un-exchanged) token lands in. The current
default is the LATEST `at` per `identity_id`
(`currentDefaultOrganizationFor` in `api/authorization.ts` is
its single home); `identityDefaultOrganization` falls
through to the PRIMARY membership org when the ledger
is empty, else a 403. A re-choice is a NEW row — never
a mutated column. `at` is validated as a well-formed
RFC-3339 Zulu timestamp at the storage gate.

| Column | Type |
|--------|------|
| id | TEXT |
| identity_id | TEXT (FK → identities) |
| organization_id | TEXT (FK → organizations) |
| at | TEXT |

### role_grants

Append-only role-assignment ledger
(`HistoryEntityStore`). Roles are PER-ORG: the roles
an identity CURRENTLY holds in an org = the latest
action per `(organization_id, identity_id, role)` — a
`granted` with no later `revoked`, fenced to that org.
Append-only: a revoke is a NEW `revoked` row, never a
splice. `by_member_id` is the actor (== their identity
id). Authorization derives roles from THIS ledger fresh
at the gate (`currentRolesForInOrganization` in
`api/authorization.ts`, filtered to the request's org)
— never from a token claim, so a revoke takes effect on
the next request. `at` is the RFC-3339 zulu moment,
validated at the storage gate. The store is org-fenced
(`db-org-scoped.ts`), so the gate's own reads see only
the request org's grants.

| Column | Type |
|--------|------|
| id | TEXT |
| organization_id | TEXT (FK → organizations) |
| identity_id | TEXT (FK → identities) |
| role | TEXT |
| action | TEXT (`granted` \| `revoked`) |
| by_member_id | TEXT (FK → members) |
| at | TEXT |

### clients

OAuth client registry (`EntityStore`) — the websites
built by us and others. Mutable config of record:
redirect URIs change, JWKS rotate, a client is
disabled. `status` (`active` | `disabled`) is the
schema's one mutable lifecycle column on an entity
row — a named deviation from the states-ledger
discipline (§ State and deletion).
`grant_types` and `redirect_uris` are
space-delimited (OAuth convention); `jwks` is the
client's JSON Web Key Set as a JSON string — JWS
verification of `private_key_jwt` assertions runs for
real against it (RS256/ES256, `api/client-assertion.ts`;
jti replay tracking is the remaining server-tier seam);
`aud` is the audience the client's assertions must
claim and the origin a token is minted for.

| Column | Type |
|--------|------|
| id | TEXT |
| grant_types | TEXT |
| redirect_uris | TEXT |
| jwks | TEXT |
| aud | TEXT |
| status | TEXT (`active` \| `disabled`) |

### identity_providers

Append-only ledger of external-IdP links
(`HistoryEntityStore`). One row per link/unlink; a link
is current = its latest action per
`(identity_id, provider)` is `linked`. `provider` names
the IdP; `provider_subject` is the identity's id at that
IdP. An unlink is a NEW `unlinked` row, never a splice.
`at` is the RFC-3339 zulu moment, validated at the
storage gate.

| Column | Type |
|--------|------|
| id | TEXT |
| identity_id | TEXT (FK → identities) |
| provider | TEXT |
| provider_subject | TEXT |
| action | TEXT (`linked` \| `unlinked`) |
| at | TEXT |

## Platform

### organizations

Tenant-root table — one row per organization. The empty
bootstrap (`postBootstrap`) seeds only the default
org (`id = '1'`, Stark Industries); the demo mock-data
seed (`postMockDataLoad`)
plants TWO orgs — `'1'` Stark Industries and `'2'` Wayne
Enterprises. Every org-owned entity carries a NOT-NULL
`organization_id` FK to this table; pure join tables derive
org from their parent, and the identity/auth spine stays
global.

| Column | Type |
|--------|------|
| id | TEXT |
| name | TEXT |
| domain | TEXT |
| next_billing | TEXT |
| seats | INTEGER |
| projects_limit | INTEGER |
| ideas_limit | INTEGER |

Seat usage and last activity are NOT columns: both are
derived from their ledgers at read time (distinct
identities in `memberships`; max `states.at`) — a stored
aggregate would be a second truth kept in sync by nothing.

### memberships

The covenant binding an identity to an organization, with
the moment of union — the source of "which orgs can this
identity reach". A person in N orgs has N membership rows;
`member.id === identity.id` stays GLOBAL (one profile, many
memberships, no `organization_id` column on `members`). The
members roster is DERIVED from this ledger (the `members`
route handler filters the global directory by the org-scoped
memberships); `GET /organizations` enumerates a caller's
reachable orgs from it; the `token-exchange` membership
check fences org access against it. Org-fenced
(`db-org-scoped.ts`).

A membership row is written by an ACCEPTED `invitation` (see
below) — accepting appends `accepted` to the invitation's
`states` log AND writes the membership row in the SAME atomic
commit. The semantics here are UNCHANGED: a row still means
"accepted member", so roster, reachable-orgs, and
token-exchange read it exactly as before.

| Column | Type |
|--------|------|
| id | TEXT |
| organization_id | TEXT (FK → organizations) |
| identity_id | TEXT (FK → identities) |
| at | TEXT |

### invitations

An invitation binding an identity (the invitee) to an
organization, awaiting the holder's answer. Immutable like a
`memberships` row — all columns NOT NULL — but its lifecycle
lives in the `states` log (alphabet `INVITATION_STATES`), not
a `status` column. The current state is the latest event on
the invitation `id` (the same `(at, id)` tiebreak as every
entity), derived, never mutated.

Global-spine (pass-through), NOT org-fenced: the invitee must
read an invitation to an org they are not yet a member of, so
the org fence cannot apply. The invitation routes fence
instead by the caller's identity (invitee) or admin role
(inviter). Validator: `validateInvitationEntity`
(`api/validators.ts`). No secondary index — read by full
scan or primary key (`api/db.ts` `TABLE_INDEXES`).

The lifecycle: grant (admin) appends `pending`; accept
(invitee) appends `accepted` AND writes a `memberships` row in
the SAME atomic commit, in the INVITATION's organization
(never the caller's active org); decline (invitee) appends
`declined`; revoke (admin) appends `revoked`. There is no
`'deleted'` state — an invitation persists as audit.

| Column | Type |
|--------|------|
| id | TEXT |
| organization_id | TEXT (FK → organizations) |
| identity_id | TEXT (FK → identities) |
| at | TEXT |

## Relationships

### objectives

Org-owned (org-fenced): NOT-NULL `organization_id`.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PRIMARY KEY |
| organization_id | TEXT | FK → organizations |
| position | REAL | Display order |

The objective's name and description live in
`objective_revisions` — an objective is a long-lived
identity whose human-facing text evolves over time.

### objective_revisions

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PRIMARY KEY |
| objective_id | TEXT | References objectives |
| name | TEXT | Human-facing name at this revision |
| description | TEXT | Human-facing description |
| member_id | TEXT | FK → members (author) |
| at | TEXT | RFC-3339 Zulu |

The latest row per `objective_id` by `at` is the
current text.

## State Event Log

### states

The unified append-only event log for every entity
lifecycle change in the system. One row, one fact.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PRIMARY KEY (base62 token) |
| entity_id | TEXT | Id of the entity this event concerns |
| state | TEXT | A value from the entity's state alphabet |
| member_id | TEXT | FK → members (actor) |
| at | TEXT | RFC-3339 Zulu — moment of the event |

The latest event on `entity_id` by `at` (a same-`at` tie
falls to the larger row id — a total order identical on
every backend and row permutation) is the entity's
current state. Reversal is a *new* event, not an edit of
the prior row.

State alphabets by entity kind:

- **ideas** — `IDEA_STATES` (7 values, lifecycle only;
  readiness is derived from required-field presence):
  `active`, `in_review`, `approved`, `promoted`,
  `sent_back`, `archived`, `deleted`
- **projects** — `PROJECT_STATES` (7 values):
  `submitted`, `under_review`, `sent_back`, `approved`,
  `declined`, `archived`, `deleted`
- **members** (all kinds share one alphabet) —
  `MEMBER_STATES` (3 values): `active`, `pending`,
  `archived`
- **records** — `RECORD_STATES` (3 values): `active`,
  `archived`, `deleted`
- **objectives** — `OBJECTIVE_STATES` (2 values): `active`,
  `archived`
- **invitations** — `INVITATION_STATES` (4 values; no
  `deleted` — an invitation persists as audit): `pending`,
  `accepted`, `declined`, `revoked`
- **work orders** — open-ended transitions (state = any
  graph node id, a base62 token) plus the closed claim
  alphabet (`'claimed'`, `'claim_released'`,
  `'claim_expired'`)
- **flow nodes / flow edges** — the `EntityStore` removal
  lifecycle (these are the only two stores whose deletion is a
  states-log event, not a hard splice): `'deleted'` removes a
  node/edge; `'restored'` revives a tombstoned id on undo/redo,
  superseding the prior `'deleted'` under the `(at, id)` total
  order. A fresh node/edge is born live and event-free; the log
  records only its removal and any revival

`buildStateEventOp(ctx, entityId, state)` in
`adapters/state-events.ts` is the canonical helper for
state-event op construction; entity-lifecycle adapters
compose it into a `ctx.commit` batch with their sibling
entity-table op.

## Messages

Phase 0 of the message-as-state migration: the append-only
ledgers every stored HTTP request/response will dual-write
into starting Phase 1. EMPTY at Phase 0 — mock-data seeding
and the snapshot plane leave both tables untouched, and
`tests/mock-data-fingerprint.test.ts` pins that. Global-spine
(pass-through), NOT org-fenced: tenancy lives IN `uri_prefix`,
enforced at the route gate.

### requests

One row per stored canonical HTTP request message. The
message text IS the row; `uri_prefix` (retains its trailing
`/`) and `uri_id` (empty string for a collection request) are
addressing metadata, and `message_hash` is an index over the
sha256 digest (`shared/digest.ts` `sha256Hex`) of `message`
— never a second copy of its truth. `at` is pair ENVELOPE
metadata only, not a domain timestamp inside the message.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PRIMARY KEY — shared with the paired response |
| uri_prefix | TEXT | Collection URI, trailing `/` kept |
| uri_id | TEXT | Resource id, or `''` for a collection |
| at | TEXT | RFC-3339 Zulu — envelope metadata |
| requester_identity_id | TEXT | FK → identities |
| message_hash | TEXT | sha256 hex digest of `message` |
| message | TEXT | The canonical stored HTTP message |

Validator: `validateRequestEntity` (`api/validators.ts`).
Secondary indexes: `uri_prefix`, `uri_id`, `message_hash`
(`api/db.ts` `TABLE_INDEXES`).

### responses

The paired response: `id` equals the request's `id` (one
UUID per pair, never a foreign key of its own). `follows` /
`supersedes` are ABSENT KEYS when the write had no
predecessor — never `null`, never `''`. Absence-of-key IS
absence-of-event, and IndexedDB skips absent keys when
indexing, which is the partial-unique-index semantics the
two-PUT-classes design (Task 5) requires; a `null` value for
either is rejected by `validateResponseEntity` as invalid.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PRIMARY KEY — equals the request's id |
| uri_prefix | TEXT | Collection URI, trailing `/` kept |
| uri_id | TEXT | Resource id, or `''` for a collection |
| at | TEXT | RFC-3339 Zulu — envelope metadata |
| status | INTEGER | HTTP status, 100..599 |
| etag | TEXT | The response's ETag |
| message_hash | TEXT | sha256 hex digest of `message` |
| message | TEXT | The canonical stored HTTP message |
| follows | TEXT | ABSENT unless this follows a prior pair |
| supersedes | TEXT | ABSENT unless this supersedes a pair |

Validator: `validateResponseEntity` (`api/validators.ts`).
Secondary indexes: `uri_prefix`, `uri_id` (`api/db.ts`
`TABLE_INDEXES`) — the unique `follows` index arrives in
Task 5 with the machinery that can express a partial unique
index.

### Flow tags (pair-plane only, no table)

`flows/:id/tags/:name` (Phase 14 Task 9) is the FIRST
document family with no backing table at all: PUT, GET, and
DELETE all touch only `requests`/`responses`, addressed at
`flows/<flow-id>/tags/<name>/`. A tag body carries exactly
one field, `flow_response_id` — the pinned `id` of one of the
flow's own `flows/:id` document-pair responses — so the tag
survives every later save of the flow it names (GET replays
the tag's own stored body, never re-derives against the
flow's current head). DELETE is a marked tombstone: a
DELETE-shaped response pair excluded from the head by
`deriveDocumentsAt`, exactly like every other document
family's DELETE — there is no row to splice, since there was
never a row to begin with.
