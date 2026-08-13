# Postgres Backend — Design

Date: 2026-08-12
Status: approved (brainstorm 2026-08-08 → 2026-08-12; all nine
sections user-gated individually)

## Context

The app today is a standalone browser product: `api/` runs in
the page, IndexedDB is the store, and `./build` emits a static
ZIP. The schema of record is the message plane — two tables
(`requests`, `responses`) holding stored HTTP message pairs,
from which all domain state derives on read.

This spec designs the Postgres backend and the server tier
around it: the schema and indexes, the storage backend, the
server runtime, the security fixes the docs tie to this split,
the dual-artifact build, testing, and rollout. It also resolves
every `.md`-documented deferred-work item into a named
disposition so nothing rides on memory.

A key inventory finding shaped the scope: of the deferred items
the docs gate on the server tier, most are documented as
landing WITH the tier, not after it. They are in scope here.

`API-TREE.md:5` references a lost external plan
(`~/.claude/plans/go-to-church-binary-stonebraker.md`) as the
backend-structure authority. That file is gone; THIS spec is
its replacement and the authoritative reference. Its surviving
sentence (`API-TREE.md:7`) — "moving said state into each
message stored message" — is realized by § Render-at-write.

## User decisions

1. **One comprehensive spec.** Schema/backend, server split,
   security fixes, and build tooling in one document. No data
   migration: Postgres starts empty and seeds via the existing
   bootstrap/mock-data pair formation, operator-invoked.
2. **Dual ZIPs until stable, then the yank.** `./build` emits
   a browser ZIP (today's product, unchanged) and a server ZIP
   until Postgres is proven; then the IndexedDB and
   localStorage backends, the browser ZIP, and the dev-tier
   postures are deleted.
3. **postgres.js behind our own adapter.** No library
   vocabulary outside the adapter. Tagged-template
   parameterization only — placeholders and auto-prepared
   statements are structural; the adapter exports no path to
   `sql.unsafe()`. Boot-time DDL assembled from compile-time
   constants is the one non-parameterized class (zero user
   input).
4. **Extended seam.** The equality-only `getWhere` seam gains
   composite, ordered-head, prefix-range, and body-containment
   reads. A verbatim port was rejected: it scales with the
   whole database; the extended seam scales with the slice.
5. **Message storage is the entire canonical wire message** —
   headers included — byte-verbatim TEXT. JSONB storage
   rejected (byte-shifted read-backs, inert verbatim-number
   machinery, unverifiable hash preimage, tier fork, doctrine
   reversal). Body queryability comes from one GIN expression
   index, never from stored jsonb.
6. **Reads stream stored bytes.** Single GETs stream the head
   response body verbatim; collections assemble in one SQL
   pass as a JSON array of string-escaped wire messages.
7. **Render-at-write** (named by this spec; the user's A12
   mechanism realized): every write leaves the stored bodies
   of every GET it affects current, in the same transaction.
   All streamable families convert in one wave behind parity
   pins. Instances are exempt (per-caller ACL projection).
8. **The work-order deep dive moves to a follow-on session.**
   This spec records the covenant and the follow-on's charter;
   the conversion wave completes only after that session
   supplies the work-order design.
9. **No-extraction principle.** The backend stores what its
   caller sends; Postgres never parses column values out of
   the message. The one sanctioned extraction is the GIN body
   expression index.
10. **`/history` → `/versions`, unified**, plus per-version
    fetch at `/versions/<etag>` on every PUTable family.
11. **Env names call the thing the thing:** `POSTGRES_URL`,
    `JWT_HMAC_SIGNING_KEY`, `HTTP_SERVER_PORT`.
12. **Password hashing upgrades to scrypt** at the server tier
    (Node platform primitive), with self-describing hash
    strings and upgrade-on-login.

## Deferred-work dispositions

The docs' deferred items, resolved. Tier A items are those the
docs explicitly gate on the server tier / Postgres; Tier B are
adjacent deferrals. Canonical list: `ARCHITECTURE.md`
§ Server-tier deploy blockers (four documents link to it; the
audit counts its KNOWN seams).

### Tier A

| Item | Disposition |
|---|---|
| A1 client-shipped HMAC key | IN: key → `JWT_HMAC_SIGNING_KEY` env; mint/verify server-side; wire format, HS256, caller signatures unchanged |
| A2 in-band credential reveal | IN: deleted; operator boot-flag seeding prints credentials to the terminal, once, never HTTP |
| A3 plaintext credential ledger | RE-GATE chosen (docs allow re-gate and/or re-mask): snapshot surface admin-only; messages stay verbatim; NAMED RESIDUAL: credentials inside stored messages, behind the gate |
| A4 client_assertion jti replay | IN: spent-jti check is a GIN body probe over stored grant pairs — the ledger already holds the data; no new table; exp-bounded |
| A5 auth-free BOOTSTRAP_ROUTES | IN: server tier removes the bearer exemption and adds admin ROUTE_POLICY entries; install runs below HTTP via operator flags; browser ZIP unchanged until the yank deletes the plane |
| A6 soft-optional PKCE | IN: server rejects public-client authorize without a code_challenge; client_assertion JWS clients exempt per OAuth 2.1 |
| A7 delegation ledger | STAYS DEFERRED: cross-party token exchange remains 403 |
| A8 LISTEN/NOTIFY notifications | SEAM ONLY: backend emits NOTIFY on commit; the SSE `/notifications` surface stays TARGET-STATE |
| A9 RUM sink / Server-Timing | STAYS AFTER: the module boundary already exists |
| A10 longitudinal measurement | IN AS OBLIGATION: `./measure --record` at pre-split baseline, server first-light, post-yank |
| A11 DbAdapter migration seam | REALIZED: `backend-postgres.ts` is the fourth backend |
| A12 lost binary-stonebraker plan | RESOLVED: this spec is the authoritative reference; `API-TREE.md:5` re-points here (implementation-plan work) |

### Tier B

| Item | Disposition |
|---|---|
| B1 no migration primitive | Idempotent boot DDL (`CREATE ... IF NOT EXISTS`); no migration framework until a third schema change demands one; reset = drop + reseed |
| B2 IndexedDB orphan stores | Browser-tier residual; dies with the tier at the yank |
| B3 PII erasure residuals | Posture unchanged: hard delete ports as one Postgres tx, single-id-set rule intact; already-exported snapshot files stay a named residual; the export route becomes admin-gated |
| B4 /snapshots/export route | Stays future; admin-gated `GET /snapshots/schema` serves export |
| B5 /snapshots/pristine | Stays deferred; bootstrap covers the minimal seed |
| B6 single-user acceptances | TEST-PLAN.md gains a server-tier section (zero deploy-blocker coverage today — named deliverable); real multi-user concurrency is tested for the first time (§ Testing) |
| B7 versioned type snapshots | Domain feature, orthogonal; stays future |
| B8 W5 no work-order abandon | Domain gap; untouched |
| B9 API.md §5 chronology | Docs-only; stays deferred |

## Design

### A. Architecture

Two build outputs from one source tree.

- **Browser ZIP** — today's product, unchanged: composed pages,
  `api/` in the page, IndexedDB store, demo-tier auth posture.
- **Server ZIP** — one Node process serves the composed static
  pages AND the API on one origin (no CORS surface). The same
  `api/` spine runs against Postgres via the fourth
  `StorageBackend`. The browser bundle inside this artifact
  speaks real `fetch`.

The server does not get a new API layer: a thin `node:http`
adapter turns each incoming request into the same vessel
`handleRequest` consumes today. The two new load-bearing files
are both divorce points — `node:http` → vessel, and seam →
postgres.js.

Endgame (the yank): delete the IndexedDB and localStorage
backends, the in-page dispatch composition, the browser ZIP,
and `BOOTSTRAP_ROUTES`; re-point `API-TREE.md:5` at this spec.

### B. Storage-format covenant

Cross-tier, prerequisite change; both tiers store the same
string.

- The `message` column holds the ENTIRE canonical wire message
  (`serializeWire` output: start-line, sorted lower-cased
  fields, derived Content-Length framing, body), stored as
  UTF-8 TEXT. The in-app wire form is a Latin-1 binary string
  (one char per byte); at the storage boundary it is decoded
  as UTF-8 — valid by construction (ASCII envelope + UTF-8
  JSON bodies; the media registry is JSON-only). Text → UTF-8
  bytes round-trips to the exact wire bytes, so
  `sha256Hex(message)` (TextEncoder = UTF-8) IS the hash of
  the wire bytes.
- `message_hash` becomes sha256 of the wire form. Every hash
  value changes once; `canonicalJson` write-path call sites
  become `serializeWire`; `parseJson` derive call sites become
  `parseWire`; the mock-data pair count 1498 holds while all
  hash values re-baseline.
- The stored wire is always Content-Length framed (chunked is
  parse-side only), so the body region is everything after the
  FIRST CRLFCRLF — a provably unique boundary (compact JSON
  bodies and header values cannot contain a raw CRLF).
- Chain provenance rename, riding the same break: the
  `Supersedes` concept is DELETED system-wide (field, wire
  header, and the per-simple-write `headPairIdAt` pre-tx read
  that fed it — verified zero consumers). The one surviving
  chain field (today's `follows`) renames to
  `Replaces-Response-ID` (wire header) /
  `replaces_response_id` (seam row key and column). The
  header field inside the stored wire message is the truth;
  the column is app-sent index machinery beside it.
- The requests seam row gains two app-sent fields, both known
  at pair formation: `route` (the gate's matched route
  pattern; synthesized, auth, and seed pairs name their
  shapes) and `method`. Validators, snapshot format, and the
  IndexedDB tier take the same shape — one covenant break,
  never a second.

### C. Schema (DDL, final)

PostgreSQL 15+ (SQL-standard function bodies). All text columns
`COLLATE "C"`: byte order IS the codebase's orders (id-lex,
zulu-lexical `at`), and a C-collated btree serves `LIKE 'x%'`
as a range scan with no extra opclass. `at` stays TEXT — the
six-digit fraction tail is a same-millisecond sequence counter,
not microseconds; `timestamptz` would renormalize it and
destroy the strict-monotonic mint. Ids and timestamps are
app-minted (no sequences, no `now()`).

    CREATE TABLE IF NOT EXISTS requests (
        id text COLLATE "C" PRIMARY KEY
            CHECK (id ~ '^[0-9A-Za-z]{22}$'),
        uri_prefix text COLLATE "C" NOT NULL
            CHECK (left(uri_prefix, 1) = '/'
               AND right(uri_prefix, 1) = '/'),
        uri_id text COLLATE "C" NOT NULL,
        at text COLLATE "C" NOT NULL CHECK (at ~
            '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$'),
        requester_identity_id text COLLATE "C" NOT NULL,
        message_hash text COLLATE "C" NOT NULL
            CHECK (message_hash ~ '^[0-9a-f]{64}$'),
        message text NOT NULL,
        route text COLLATE "C" NOT NULL
            CHECK (route ~ '^[a-z0-9:/-]+$'),
        method text COLLATE "C" NOT NULL
            CHECK (method ~ '^[A-Z]+$')
    );

    CREATE TABLE IF NOT EXISTS responses (
        id text COLLATE "C" PRIMARY KEY
            CHECK (id ~ '^[0-9A-Za-z]{22}$')
            REFERENCES requests (id)
            DEFERRABLE INITIALLY DEFERRED,
        uri_prefix text COLLATE "C" NOT NULL
            CHECK (left(uri_prefix, 1) = '/'
               AND right(uri_prefix, 1) = '/'),
        uri_id text COLLATE "C" NOT NULL,
        at text COLLATE "C" NOT NULL CHECK (at ~
            '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$'),
        status integer NOT NULL
            CHECK (status BETWEEN 100 AND 599),
        etag text COLLATE "C" NOT NULL,
        message_hash text COLLATE "C" NOT NULL
            CHECK (message_hash ~ '^[0-9a-f]{64}$'),
        message text NOT NULL,
        replaces_response_id text COLLATE "C" CHECK
            (replaces_response_id ~ '^[0-9A-Za-z]{22}$')
    );

    CREATE TABLE IF NOT EXISTS schema_marker (
        only boolean PRIMARY KEY CHECK (only),
        created_at text NOT NULL
    );

    CREATE FUNCTION message_body(message text) RETURNS jsonb
    IMMUTABLE STRICT PARALLEL SAFE LANGUAGE sql
    RETURN CASE
        WHEN strpos(message, E'\r\n\r\n') = 0 THEN NULL
        WHEN substr(message,
             strpos(message, E'\r\n\r\n') + 4) = ''
            THEN NULL
        ELSE substr(message,
             strpos(message, E'\r\n\r\n') + 4)::jsonb
    END;

Column notes:

- Every column is app-sent; the only nullable column is
  `replaces_response_id`, whose absence IS genesis (the
  seam's one sanctioned optional; a NULL never escapes the
  backend — the row mapper emits key-absence).
- The pair FK (`responses.id REFERENCES requests`) makes the
  1:1 pair balance structural instead of test-asserted.
  DEFERRABLE INITIALLY DEFERRED: checked at COMMIT, so the
  PII hard-delete loop's per-row delete order and snapshot
  import's bulk order stay free. Named tier divergence: a
  torn snapshot imports silently on IndexedDB and fails on
  Postgres — Postgres is right.
- CHECKs mirror the JS storage-edge validators. Not internal
  defense: the datastore is an edge. The JS validator guards
  the seam; CHECKs guard direct-SQL access. One gate per
  tier, same contract.
- `schema_marker` mirrors the IndexedDB `__schema__` marker
  store: `hasSchema()` = row exists. Table existence is NOT
  schema existence — a failed import must leave `hasSchema()`
  false, and `postSchemaCreation()` stamps only after the
  import commits.
- `message_body()` is the ONE sanctioned extraction (§ E). It
  returns NULL for bodyless messages so the expression index
  never throws on 204s and bodyless tombstones (NULLs are
  simply not indexed).
- No pgcrypto in core DDL. The hash-verify query
  (`sha256(convert_to(message,'UTF8'))` vs `message_hash`) is
  documented ops tooling where pgcrypto is available, never a
  CHECK.

### D. Indexes

    CREATE INDEX IF NOT EXISTS requests_address
        ON requests (uri_prefix, uri_id, at, id);
    CREATE INDEX IF NOT EXISTS responses_address
        ON responses (uri_prefix, uri_id, at, id);
    CREATE INDEX IF NOT EXISTS requests_route
        ON requests (route, uri_prefix);
    CREATE INDEX IF NOT EXISTS requests_uri_id
        ON requests (uri_id);
    CREATE INDEX IF NOT EXISTS responses_uri_id
        ON responses (uri_id);
    CREATE INDEX IF NOT EXISTS requests_replay
        ON requests (message_hash);
    CREATE UNIQUE INDEX IF NOT EXISTS responses_replaces_key
        ON responses (replaces_response_id)
        WHERE replaces_response_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS requests_body
        ON requests
        USING gin (message_body(message) jsonb_path_ops);
    CREATE INDEX IF NOT EXISTS responses_body
        ON responses
        USING gin (message_body(message) jsonb_path_ops);

Each index maps to catalogued reads:

- `*_address` — the ~130 family-slice reads (leading-column
  equality); the six by-id-within-prefix reads as single
  probes; ordered head selection (`ORDER BY at DESC, id DESC
  LIMIT 1`) and collection heads (`DISTINCT ON (uri_id)`)
  come back index-ordered — the `(at, id)` reduction becomes
  the index's job.
- `requests_route` — the nine whole-plane discovery scans
  become exact probes (`WHERE route = $1`), with per-org
  narrowing as a `uri_prefix` range inside the route.
- `*_uri_id` — seam fidelity for today's
  `getWhere('uri_id', ...)`; retired when the six by-id call
  sites ride composite reads.
- `requests_replay` — the replay fast-path and the in-tx
  dedup re-check, twice per write. Non-unique on purpose:
  auth grant pairs legitimately carry duplicate hashes.
- `responses_replaces_key` — the locked-write concurrency
  backstop and revision-ETag recovery. Partial uniqueness
  reproduces IndexedDB's skip-absent-key semantics: genesis
  rows coexist.
- `*_body` GINs — body-fact probes (`jti`, `code`,
  `chain_id`, `identity_id`, `organization_id`,
  `attribute_id`, graph node ids) via `@>` containment,
  which descends nested arrays. `jsonb_path_ops` because
  every query is containment.

### E. The no-extraction principle

The backend stores what its caller sends; Postgres never
parses column values out of the message. The app knows every
machinery value at pair formation and sends it explicitly.
Rationale: an extraction expression in DDL is a second wire
parser, in a second language, that must stay bit-compatible
with `shared/http-message` forever — a standing drift risk.

The ONE sanctioned extraction is the GIN body expression
index. `message_body()` encodes exactly one RFC-level framing
fact — the body starts after the first CRLFCRLF — plus
Postgres's own standard JSON parser. It never encodes library
serialization internals, and it stores nothing: stored bytes
and served bytes are always the app's own.

### F. The Postgres backend

`api/backend-postgres.ts` — the fourth `StorageBackend`, a
constructor preset over the same `BackedDbAdapter` as the
other three. Node-only. postgres.js lives entirely inside
this backend plus a thin client adapter (the divorce point);
no library vocabulary escapes, and no path to `sql.unsafe()`
is exported.

- **Transactions.** `transaction(tables, mode, fn)` maps to a
  real `BEGIN ... COMMIT`; the `Tx` ops run parameterized
  SQL; a thrown body rolls back (rollback is "never
  happened", matching the buffer-discard tiers). The
  IndexedDB auto-commit constraint does not exist here, but
  the pre-tx crypto discipline is RETAINED: one write-path
  shape across tiers, short transactions. Statement timeout
  30 s, mirroring `IDB_OP_TIMEOUT_MS`.
- **Typed-error mapping** keeps `handleRequest` tier-blind:
  SQLSTATE 23505 → `UniqueConstraintError` (→ 412); 42P01 →
  `MissingTableError` (→ recovery); 23503 (torn pair at
  commit) → new typed error, impossible via the app path,
  loud 500; 23514 (CHECK) → new typed error, loud 500 (two
  gates disagreeing is a bug); timeout/connection loss →
  typed timeout error, surfaced, resources released.
- **Concurrency.** The pair-append dedup race under READ
  COMMITTED closes with
  `pg_advisory_xact_lock(hashtext($hash))` as the append
  transaction's first statement: same-hash appends serialize,
  everything else never waits, the in-tx re-check sees the
  winner. Auth grants bypass dedup by design and do not take
  the lock. Platform primitive; auto-released at commit.
- **Notifications.** `postNotification` maps to
  `pg_notify('fusion_events', payload)` inside the
  transaction — Postgres delivers on commit, which is the
  seam's covenant. A8's seam made real; no listener ships
  yet.
- **Snapshots.** `getSnapshot` reads both tables in one
  readonly tx, same JSON shape. `putSnapshot` validates, then
  one tx: delete-all + bulk insert both tables, then stamps
  `schema_marker` after commit. Genuinely atomic — closes the
  localStorage mid-write quota gap, the last snapshot
  atomicity residual.

### G. The extended seam

Named additions only, each traced to catalogued call sites:

| New read | SQL shape | Serves |
|---|---|---|
| `getAllAt(prefix, uriId)` | equality on both columns | the six fetch-then-filter sites |
| `getHeadAt(prefix, uriId)` | + `ORDER BY at DESC, id DESC LIMIT 1` | head selection |
| `getAllByRoute(route[, prefixRange])` | route probe + optional range | the nine discovery scans |
| `getAllWhereBody(containment)` | `message_body(message) @> $1` | body-fact lookups |
| `getCollectionBody(prefix, filters)` | `string_agg(to_json(message)::text, ',' ...)` over `DISTINCT ON` heads | one-pass collection GET |
| `existsAt(prefix[, uriId])` | `SELECT EXISTS` | presence probes |

During dual-tier these methods get IndexedDB implementations
(JS filtering inside the store — same semantics, not faster).
The seam stays one interface; derives stay the shared
implementation until § H's conversion retires them per family.

### H. Render-at-write

The name: the app renders the GET answer at write time. NOT a
Postgres materialized view — no view objects exist anywhere;
there is no second copy, no refresh; the stored response body
IS the only copy, written in the same transaction as the write
that changed the truth.

**Covenant.** The stored response body of a write is the
servable GET answer for its address. Single-resource GET
streams the head body verbatim (envelope re-spoken through
`node:http` from columns, fresh `Date`). Collection GET is one
SQL pass producing `["<escaped wire message>", ...]` — the
elements are complete wire responses, JSON-string-escaped by
`to_json`. Named accepted costs: ~10–20% pre-gzip escaping
bloat, client double-parse, adapter re-plumb to the new
collection contract.

**Write-side obligation.** Every write that changes what any
GET would say leaves that GET's stored body current, same
transaction. Document PUTs are free (the body written is the
row). Operation writes must also append an updated parent
document pair. The op→parent class, exact:

- `work-orders/:id/claim`, `/release`, `/transition`,
  `/binding` (routes.ts:5338/5348/5364/5385) — claim state,
  node placement, and binding embeds live only in op pairs
  today.
- `invitations/:id/acceptance`, `/decline`, `/revocation`
  (synthesized off the route table) — invitation state is
  op-pair presence today.
- Shipped precedent: `flows/:id/undo` ALREADY appends the op
  pair plus an updated `flows/:id` document pair in one tx
  (`postFlowUndoOp`, routes.ts:1654-1671). This spec
  generalizes that pattern.
- NOT in the class: identity-token rotation/revocation (each
  appends its own event document; chain state is
  auth-internal), auth grants (no parent), instance PATCH
  (exempt family). Create POSTs already append op + document
  pairs.

**The wave.** All streamable families convert at once, each
behind a parity pin: a test proving streamed == derived (the
current derive is the reference implementation, demoted to
checker) before that family's derive retires. Two carve-outs:

1. **Instances — exempt from streaming permanently.**
   Per-attribute `read_roles` project each caller's view of
   `values`; one stored body cannot serve two
   differently-roled callers. A response-shape fact;
   authorization itself is untouched everywhere.
2. **Work-orders — design deferred** to the follow-on session
   (§ Follow-on charter). The wave executes only after that
   session supplies the work-order design.

**Re-verb mandate** (decided here; executed by the follow-on):

- `claim` + `release` collapse into ONE document sub-resource
  `work-orders/:id/claim`: PUT = claim, DELETE = early
  release (tombstone), GET = the claim facts, 404 when
  unclaimed — the absence of the row IS the absence of the
  claim.
- **Claims expire.** The first time-lapsing state in the
  system. Stored bodies carry FACTS ONLY — holder and expiry
  — never judgments: a stored `claimed: true` would rot when
  the clock crosses expiry with no write to refresh it.
  "Claimed now" is a read-time comparison of a stored
  timestamp against the clock (house precedent: the
  authorization-code TTL derives from the stored pair's
  `at`; the revocation gate compares seconds at evaluation
  time). The PUT contention gate 409s only against a live
  UNEXPIRED head; an expired head is claimable as if
  released.
- `binding` re-verbs to a create-only PUT document
  `{instance_id, record_type_id}` — rebind 409 IS the
  spent-address rule; no DELETE (no-unbind posture).
- `transition` STAYS POST: a genuine process (graph gates,
  If-Match coupling, set/clear effects), not a fact.
- Invitations STAY POST event ops: presence-is-state with
  EARLIEST-wins semantics (a first acceptance beats later
  ops), unlike the document family's latest-wins; the
  synthesis machinery is untouched.

**Keyed-read principle.** No family scan may serve a
single-document answer. Surviving read-side derives take
exactly three keyed shapes:

- HEAD PROBE — `(uri_prefix, uri_id)`,
  `ORDER BY at DESC, id DESC LIMIT 1`: most current wins.
- CHAIN FETCH — same filter, the document's full history,
  DESC.
- BODY PROBE — GIN `@>` containment on a body fact.

Family-shaped fetches remain only where the answer is
family-shaped: collection GET (one-pass SQL) and bulk history
(route-column probes). This kills the named pathologies:
single-entity GETs paying full-family scans, history routes
fetching the family then filtering to one id, flow undo
fetching the whole flows family, and the fence's
enumerate-all-organizations walks (membership and flow-graph
ownership become GIN probes). Instances are exempt from
streaming only, NOT from keyed reads: head probe →
ACL-project → serve.

**Where reduction lives now.** On the Postgres read path the
JS reductions dissolve into machinery: the head probe's
`ORDER BY ... LIMIT 1` and the collection's `DISTINCT ON` do
what `latestByKey` did; the lifecycle walk IS the `/versions`
chain fetch. JS reduction remains only on the IndexedDB tier
during dual-ZIP, inside write-time rendering (the writer
computes embedded state), and in the auth-plane security
reducers (fail-closed custom comparators). After the yank,
`latestByKey` on the read path is dead code.

### I. Versions unification

`/history` renames to `/versions` across the nine lifecycle
routes and the instance value-history. The version index
subsumes state history: each version row embeds its lifecycle
trio; instance versions carry `{etag, at, values}`.

NEW: `GET <family>/:id/versions/<etag>` on every PUTable
family — per-version fetch. The document-family wire ETag is
the head pair's response id, and the response id IS the pair
id, so the fetch is: responses PK probe on `<etag>`; verify
`uri_prefix` + `uri_id` match the addressed document (else
404 — no cross-address oracle); stream the stored body
verbatim. Historical versions are immutable, so this is the
purest streamed read in the system. Standard fence and
ownership checks apply.

Hazard, managed: `flows/:id/versions` is a RETIRED address
(Phase 15 router-404, test-pinned). The rename resurrects the
address with pair-chain semantics. The succession is
documented (old = a stored version-row table; new = the pair
chain itself) and the 404 pins flip deliberately, with the
succession named at the pin site.

Work-order and invitation EVENT histories (op folds) keep
their own shapes; the work-order one belongs to the follow-on
session.

### J. Server runtime

One Node process, one origin, `node:http` (platform
primitive). The `node:http` adapter feeds the same
`handleRequest` vessel the browser tier uses — no second API
layer.

Boot, fail-fast: validate env → connect pool (fail loud) →
idempotent DDL → listen.

| Env | Meaning |
|---|---|
| `POSTGRES_URL` | connection string; required |
| `JWT_HMAC_SIGNING_KEY` | JWT HMAC material; required (A1) |
| `HTTP_SERVER_PORT` | listener port; required |

Secrets enter through the vessel at initialization, immutable
for the process life, never logged, never defaulted. TLS is
the deployment front door's job; the process speaks HTTP on
its port.

- **Operator seeding:** `--seed-bootstrap` /
  `--seed-mock-data` boot flags seed an empty database and
  print credentials to the operator terminal, once (A2). No
  HTTP seeding path exists on this tier.
- **Every I/O bounded:** statement timeout 30 s, request
  header/body timeouts, a per-request deadline, pool-acquire
  timeout.
- **Structured logs:** one line per request — RFC-3339 zulu
  `at`, standard level, request id, method, path, status,
  latency ms. Fault detail to logs; the wire keeps the fixed
  opaque 500 body. No secret, credential, or PII value is
  ever logged.
- **Static serving:** the composed pages and bundles, correct
  content-types, `Cache-Control` on hashed assets — the HTTP
  cache header is the one cache this design ships.
- **Failure posture:** impossible states crash loud; the
  supervisor restarts. SIGTERM → stop accepting, drain
  in-flight within a bounded window, close the pool, exit 0.

### K. Security fixes (seven)

Tier posture is COMPOSITION, not conditionals: each artifact's
init passes its auth configuration into the spine; no
`if (isServer)` in gate code. The browser ZIP knowingly keeps
its documented dev-tier posture until the yank.

1. **A1 — signing key leaves the client.**
   `SIGNING_KEY_MATERIAL` is replaced by
   `JWT_HMAC_SIGNING_KEY` from env, injected at init. Mint
   and verify run only server-side. Wire format, HS256, and
   caller signatures unchanged. The server ZIP's browser
   bundle physically contains no key (tree-shaken
   composition).
2. **A2 — in-band credential reveal deleted.** Seeding is
   operator flags; plaintext prints to the terminal once and
   never rides HTTP.
3. **A3 — credential ledger re-gated.** Stored messages stay
   byte-verbatim; the exposure closes via A5's gate. Named
   accepted residual: credentials exist verbatim inside
   stored messages, shielded by the admin gate and Postgres
   access control.
4. **A4 — jti replay closed.** The spent-jti check is a GIN
   body probe over stored token-grant pairs — the ledger
   already remembers every accepted assertion. A replayed
   jti → 401. Bounded by the assertion's `exp`.
5. **A5 — BOOTSTRAP_ROUTES re-gated.** The bearer exemption
   for `snapshots/*` is removed on the server tier;
   `ROUTE_POLICY` gains admin-only entries. The
   no-identity-exists install problem is solved below HTTP by
   the operator flags. Wipe and import become admin actions.
6. **A6 — hard PKCE.** Authorize rejects a public client
   without a `code_challenge`; confidential clients
   authenticating via `client_assertion` JWS are exempt per
   OAuth 2.1.
7. **Password hashing** (user-added). Server tier hashes with
   scrypt via `node:crypto` — memory-hard, platform
   primitive (Argon2id rejected: npm native dependency
   against platform doctrine). Hash strings become PHC-style
   self-describing (algorithm, params, salt, digest);
   verification dispatches on the stored self-description,
   so PBKDF2 credentials (demo seeds, browser-ZIP snapshots)
   keep verifying. Upgrade-on-login: a successful PBKDF2
   verify appends a rehashed scrypt credential document pair
   — convergence at the one moment plaintext is legitimately
   held. Parameters are named constants, OWASP-aligned
   (N=2^17, r=8, p=1 interactive class). The browser ZIP
   stays PBKDF2 (WebCrypto has no scrypt) until the yank.
   Hashers are injected at init per tier;
   `shared/password-hash.ts` stays the divorce point.

### L. Build tooling — the dual ZIP

Bare `./build` emits two artifacts (clean tree required, as
today):

- `fusion-ai-browser.zip` — today's product, unchanged.
- `fusion-ai-server.zip` — composed pages + a browser bundle
  whose adapters speak `fetch` + `server.mjs` (the Node
  bundle: http adapter, Postgres backend, shared `api/`
  spine) — self-contained.

Two composition roots, one codebase: esbuild tree-shakes each
bundle, so the server ZIP's browser bundle contains no
IndexedDB backend, no in-page `api/` dispatch, and no demo
signing key — A1 enforced by the bundler, not by trust.

postgres.js enters `devDependencies` (joining esbuild and
typescript) and is bundled INTO `server.mjs` at build time.
The shipped artifact resolves zero packages: deploy = unzip,
set three env vars, `node server.mjs`.

`./serve [port]` stays the browser tier. Running the server
locally IS the deploy path; the Postgres test suite boots it
programmatically the same way.

The `generate-schema-svg --check` gate keeps working: the
schema of record stays `api/db.ts` + `api/types.ts`, which
gain the new fields as part of the covenant break.

### M. Testing

The governing split: `./validate` stays fast and
dependency-free — it never requires Postgres. A new
`./test-postgres` runner owns everything needing a live
database (boots the server programmatically against
`POSTGRES_URL`); it is a deliberate invocation, never a
silently-skipped test inside `./validate`.

In `./validate` (no Postgres):

- The existing suite, re-baselined once for the wire-format
  break (pair count 1498 absolute holds).
- Parity pins: per family, render-at-write output == the
  reference derive over the same store (memory backend).
- Versions surface logic: index shape (DESC, trio embedded),
  `/versions/<etag>` hit, wrong-address 404, foreign-org 403,
  and the `flows/:id/versions` succession pins flipped
  deliberately with the succession named.
- Hasher self-description logic: PHC parse/dispatch, PBKDF2
  verify path, scrypt path (Node crypto is available to the
  runner).

In `./test-postgres` (live database):

- Seam conformance: the pinned acceptance suite (read
  isolation, transaction view, entity validation, snapshot
  round-trip, message-pair semantics) parameterized by
  backend factory, run against real Postgres. Postgres
  becomes the best-tested backend — IndexedDB never had
  Node-side automated coverage.
- Typed-error mapping against real SQLSTATEs.
- Real concurrency: racing identical appends → the advisory
  lock yields one stored pair, both callers get the stored
  response; two locked writes citing one
  `replaces_response_id` → exactly one 412; cross-org
  writers stay isolated under concurrency.
- Security compositions: anon → `/snapshots/*` 401, member
  403, admin 200; public-client authorize without challenge
  rejected; jti replay → 401; boot fails loud without
  `JWT_HMAC_SIGNING_KEY`; PBKDF2 credential verifies AND the
  upgrade-on-login pair lands scrypt-self-described.
- Runtime behavior: fail-fast boot, structured log line
  shape, fixed 500 body, SIGTERM drain completes then exit 0.

TEST-PLAN.md gains a server-tier section — the named
deliverable closing the manual plan's zero deploy-blocker
coverage: browser app against the real server, auth flows
end-to-end, snapshot gating, and the first genuine multi-user
regression (two browsers, two identities, one database).

### N. Measurement, rollout, and the yank

**Measurement (A10).** `./measure --record` at three named
milestones: pre-split baseline, server first-light (all pages
via `node server.mjs` against Postgres), post-yank. The
fetch/render phase split is the migration signal; the harness
gains a base-URL mode to measure a running server origin.
Budgets recalibrate after cutover — the network is in the
path, and the per-machine-class gate must say so.

**Rollout — capability milestones** (the implementation plan
turns these into tasks):

| Phase | Lands | Gate |
|---|---|---|
| A | The covenant break: wire-format storage, hash re-baseline, supersedes deletion, `replaces_response_id` rename, `route` + `method` fields, `/versions` unification + `/versions/<etag>` | `./validate` green |
| B | Render-at-write machinery + keyed reads + converted families behind parity pins | pins green; wave completion blocked on the follow-on |
| C | The Postgres backend + `./test-postgres` | seam conformance green on live PG |
| D | Server runtime + the seven fixes + dual-ZIP build | security tests green; first-light `--record` |
| E | Work-order follow-on integrated (re-verb + WO render-at-write) | wave complete; WO parity pins green |
| F | Stability window → the yank | post-yank `--record` |

**The yank checklist:**

- Delete: the IndexedDB and localStorage STORAGE BACKENDS and
  factories, the in-page `api/` dispatch composition, the
  demo signing constant, `BOOTSTRAP_ROUTES` and its
  exemption, browser-tier PBKDF2 HASHING (verify survives
  for self-described stragglers), the browser ZIP.
- Keep, deliberately: the memory backend (test tier),
  localStorage THEME/SIDEBAR persistence (UI state was never
  the data tier), scrypt + self-description, parity pins
  still earning retirement.
- Retire when earned: the seam-fidelity `uri_id` indexes,
  once the six by-id call sites ride composite reads.
- Docs: closed seams move KNOWN → CLOSED in ARCHITECTURE.md
  § Server-tier deploy blockers (the audit's KNOWN count
  changes with it); `API-TREE.md:5` re-points to this spec;
  SCHEMA.md gains the DDL; CLAUDE.md and README follow.

**Residuals that survive, named:** A3's gated verbatim
credentials; A7 delegation 403; A8 SSE surface and A9 RUM
stay future; B3's already-exported snapshot files; B7
versioned type snapshots; B8/W5 no-abandon. B2's orphan
stores die with the browser tier.

## Follow-on session charter

A separate session, after this spec lands, owns the
work-order surface:

1. Deep-dive the surface (ten read shapes, two whole-plane
   scans, the collection GET's per-row binding N+1, the
   claim machine, workbox consumption — which fields
   consumers actually need).
2. Execute the re-verb mandate: claim(+release) as the
   PUT/DELETE/GET claim document with expiry-aware
   contention; binding as a create-only PUT document;
   transition stays POST.
3. Settle expiry mechanics: stored `expires_at` per claim vs
   expiry derived from the claim pair's `at` plus a named
   TTL; holder-only transition/release rules.
4. Settle the parent-embed question: whether work-order rows
   embed claim/binding FACTS (holder, expiry, instance and
   type ids) for list streaming, or the sub-resources are
   fetched separately — decided by workbox consumer
   analysis.
5. Design work-order render-at-write + its event-history
   shape; the conversion wave completes behind its parity
   pins.

## Out of scope

- Data migration of any kind — Postgres starts empty.
- The SSE `/notifications` surface (A8 emits only).
- RUM / Server-Timing (A9).
- Cross-party delegation (A7 stays 403).
- `/snapshots/export` and `/snapshots/pristine` routes
  (B4/B5).
- Versioned record-type snapshots (B7); work-order abandon
  (B8/W5).
- Re-pointing `API-TREE.md:5` and other doc edits — the
  implementation plan's work, not this spec's diff.

## Cross-references

- `ARCHITECTURE.md` § Server-tier deploy blockers — the
  canonical KNOWN-seam list this spec closes or re-gates.
- `docs/superpowers/specs/2026-07-12-page-performance-`
  `measurement-design.md` — the fetch/render migration
  signal and the RUM seam.
- `docs/superpowers/specs/2026-07-11-clients-table-`
  `elimination-design.md` — the identity/registration model
  the auth fixes build on.
- `SCHEMA.md` — the message-plane row shapes and orders this
  schema ports; gains the DDL at implementation.
- `TEST-PLAN.md` § Protocol — the manual tier gaining the
  server section.
