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
identities in the memberships message pairs; max
`states.at`) — a stored aggregate would be a second
truth kept in sync by nothing.

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
