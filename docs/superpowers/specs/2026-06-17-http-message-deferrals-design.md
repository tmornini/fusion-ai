# Close the http-message named deferrals

*Reliability (I), Security (II), Uniformity (III),
Simplicity (VIII), Generality (IX); the Articles "we choose
platform primitives," "we validate at every edge," and
"insulation through adapters" (the divorce point). The
faithful tension: closing a deferral is Premature
Generalization (IX) for application code — but http-message
is a LIBRARY whose stated contract is a full HTTP message
transform, so its completeness is measured against the RFCs,
not against a single live caller. The caller chose to pre-
stock the complete primitive; each speculative piece is
named as such. Commits carry no plan tag — plain present-
tense imperative subjects.*

This is the approved, self-contained design of record for
closing the four named deferrals in `api/http-message/`. The
library stays UN-WIRED by deliberate choice: its real callers
arrive with the Postgres server tier. Re-derive every code
anchor by SYMBOL search at execution — line numbers drift,
symbols do not.

## Context

`api/http-message/` is a complete, adversarially reviewed,
gate-green HTTP message library — a tri-directional transform
(TS ↔ wire ↔ JSON) with deterministic inline+queryable JSON
bodies, a chainable decode API, dotted-key queries with RFC
8941 structured fields, and immutable `with*` modification.
It is imported ONLY by `tests/` — no production code path
uses it, and none will until the server tier lands. That
un-wired status is intentional and is NOT changed here.

Four capabilities were deferred "until a caller needs them,"
each carrying a comment that records the deferral:

- gzip/br content-decoders behind the `contentDecoded()`
  seam (`body.ts`)
- the two obsolete HTTP-date formats, RFC 850 and asctime
  (`http-date.ts`)
- non-JSON body codecs (`media-registry.ts`)
- structured-field inner-lists and byte-sequences
  (`structured-fields.ts`)

The caller has elected to close all four now, treating the
library as a complete HTTP primitive rather than a YAGNI-
minimal one, and accepting the Generality (IX) cost
knowingly. This spec records what "complete" means for each,
and the one required hardening each completion drags behind
it.

## Principle

A library's completeness contract differs from application
code's. Application code earns each generalization by the
third duplication (IX). A library that declares itself "a
full HTTP message transform" is contracted against the
specification: a date parser that accepts one of three
mandated formats is INCOMPLETE, not minimal; a content-
decoding seam that throws on every real coding is a stub,
not a primitive.

We still honor the platform-primitives Article: gzip and
deflate decode through the platform `DecompressionStream`;
form bodies through `URLSearchParams`; byte-sequences reuse
the existing `Octets` base64 vessel. Where the platform has
NO primitive (Brotli), we do not vendor and we do not hand-
roll — we expose the divorce-point seam and let a caller
inject its own adapter. The thinnest adapter is the divorce
point, not ceremony.

## Approved design decisions

1. **Async content-decode seam, sync paths untouched.**
   `DecompressionStream` is a `TransformStream` — inherently
   async — while the library's decode chain is synchronous.
   We do NOT make the whole chain async (that breaks the
   hardened sync contract and its tests). Instead we add
   async siblings and leave the sync paths exactly as the
   security review left them: still throwing loudly on an
   encoded body.

2. **Brotli (`br`) is an injectable seam, not a built-in.**
   `new DecompressionStream('br')` throws on the platform
   (verified, Node v26). Zero-dep + platform-primitives
   doctrine forbids vendoring a Brotli library or hand-
   rolling inflate. The content-coding registry is pluggable
   and injected; the default ships gzip + deflate only; a
   server with its own Brotli adapter registers `br`.

3. **form/text codecs join `defaultBodyRegistry()`.** The
   library is now HTTP-complete, so `withBody('text/plain',
   …)` and form bodies work without configuration (Office of
   the Interface: no configuration before first use). JSON
   inline behavior is unchanged because the inline
   discriminator becomes JSON-SPECIFIC (decision 5).

4. **RFC 850 two-digit year uses an injected reference.**
   RFC 9110 §5.6.7 mandates a sliding 50-year window, which
   is inherently relative to "now." `parseHttpDate` gains an
   optional `reference: Date = new Date()`. The default reads
   now (spec-correct); tests pass a fixed reference
   (deterministic). The instant is still computed in UTC via
   `Date.UTC` — the 2-digit-year resolution is RFC semantics,
   not a localtime sin (Office of Time preserved).

5. **The JSON inline discriminator becomes JSON-specific.**
   `json-codec.ts` currently decides inline-vs-base64 via a
   helper that finds ANY codec for the content-type and then
   assumes it is JSON. With form/text codecs in the registry
   that assumption is false. A `kind: 'json'` marker on
   `BodyCodec` (the platform-honest discriminator) makes the
   inline path test JSON-ness specifically; non-JSON bodies
   stay base64 in the JSON form. This is required to close
   deferral 3 correctly — not gold-plating.

## Deferral 1 — RFC 850 + asctime dates

`http-date.ts` parses only IMF-fixdate. Add two explicit
parsers, tried in order after IMF-fixdate, each resolved to
an absolute instant via `Date.UTC` (the existing tz-safe
pattern):

| Format      | Example                          | Note          |
| ----------- | -------------------------------- | ------------- |
| IMF-fixdate | `Sun, 06 Nov 1994 08:49:37 GMT`  | have          |
| RFC 850     | `Sunday, 06-Nov-94 08:49:37 GMT` | 2-digit year  |
| asctime     | `Sun Nov  6 08:49:37 1994`       | padded day    |

- RFC 850: full weekday name, `DD-Mon-YY`, trailing `GMT`.
  Two-digit year resolved by the §5.6.7 sliding 50-year
  window against `reference`.
- asctime: `Wdy Mon DD HH:MM:SS YYYY`, day space-padded
  (single-digit days carry a leading space → two spaces
  before the day), no timezone token (implicitly GMT).
- Unrecognized input still throws `HttpMessageError` — the
  parse gate stays a loud, expected rejection.

`parseHttpDate(text, reference?: Date)` — `reference`
defaults to `new Date()`; only RFC 850 consults it. The
caller in `field-value.ts` (`toDate()`) passes no reference,
so it reads now.

## Deferral 2 — gzip/deflate decode + br seam

A pluggable `ContentCodingRegistry`, mirroring `BodyRegistry`
(immutable, injected at construction, carried across `with*`
modification). A `ContentCodec` exposes
`handles(coding: string): boolean` and
`decode(body: Octets): Promise<Octets>`.

- `gzipContentCodec` / `deflateContentCodec` drive
  `DecompressionStream('gzip' | 'deflate')`, reading the
  decompressed stream fully into `Octets` (async — runs
  OUTSIDE any IDB transaction by the auto-commit constraint;
  not a concern while un-wired, recorded for the server
  tier).
- `defaultContentCodingRegistry()` ships gzip + deflate.
  `br` is absent — injectable by a caller.

`Body` (`body.ts`) gains:

```
contentDecoded(): Body                  // unchanged: identity
                                        // only; throws on real
                                        // codings
async contentDecodedAsync(): Promise<Body>   // strip gzip /
                                             // deflate via the
                                             // coding registry
async decodedAsync(): Promise<Decoded>       // async-strip then
                                             // codec-decode
```

`HttpMessage` carries the content-coding registry alongside
the body registry, defaulting to
`defaultContentCodingRegistry()`, and threads it through
`#derive`. An unknown coding (e.g. `br` with the default
registry) throws `HttpMessageError` loudly — the seam refuses
to pass still-encoded octets downstream, exactly as the sync
path does today.

## Deferral 3 — non-JSON body codecs

Add two codecs on platform primitives, export them, register
them in `defaultBodyRegistry()`:

- `formBodyCodec` — `application/x-www-form-urlencoded`;
  decode via `URLSearchParams` to a plain object
  (last-value-wins on duplicate keys, the platform default,
  documented), encode an object/iterable back to the wire
  form.
- `textBodyCodec` — `text/plain`; decode to a UTF-8 string,
  encode a string to octets.

`BodyCodec` gains `kind: 'json' | 'other'` (or equivalent
marker). `json-codec.ts`'s inline helper consults the marker:
inline only when a JSON codec handles the content-type AND
the body decodes to a non-string value; everything else stays
base64. JSON round-trips are unchanged; a form/text body is
base64 in the JSON form and the type-based parse rule
reconstructs it.

## Deferral 4 — SF inner-lists + byte-sequences

The highest-ripple change: the structured-field value model
widens through three files.

- `structured-fields.ts`: `readBareItem` accepts `:base64:`
  byte-sequences (reusing `Octets.fromBase64`), so a bare
  value is now `number | string | boolean | Octets`.
  `rejectInnerList` is replaced by `readInnerList` — `(` …
  `)` parses a parenthesized sequence of items into an
  `SfInnerList { items: readonly SfItem[]; params }`. A
  List/Dictionary member's value is now `BareValue |
  SfInnerList`.
- `query.ts`: `navigateList` recurses one level into an
  inner-list member (`query('field.0.1')` indexes the inner
  list); a byte-sequence value reaches `FieldValue` as bytes.
- `field-value.ts`: `Leaf` widens to admit `Octets`;
  `FieldValue` gains byte-aware leaf conversions
  (`toBase64()`, `toBytes()`); `toText()`/`toNumber()`/
  `toBoolean()`/`toDate()` on a byte value throw honestly
  (Design by Contract), never coerce.

No `any`: the unions are explicit; navigation switches on
shape. Existing SF queries (item / list / dict / parameter)
are behavior-preserved.

## Scope inventory

Files changed:

- `api/http-message/http-date.ts` — two date parsers +
  `reference`.
- `api/http-message/body.ts` — async content-decode siblings;
  carry the coding registry.
- `api/http-message/content-coding.ts` — NEW: `ContentCodec`,
  `ContentCodingRegistry`, gzip/deflate codecs,
  `defaultContentCodingRegistry()`.
- `api/http-message/http-message.ts` — carry + thread the
  content-coding registry; default it.
- `api/http-message/media-registry.ts` — `kind` marker;
  form/text codecs; register them in the default.
- `api/http-message/json-codec.ts` — JSON-specific inline
  discriminator via the `kind` marker.
- `api/http-message/structured-fields.ts` — inner-lists +
  byte-sequences; widened value model.
- `api/http-message/query.ts` — inner-list recursion;
  byte-sequence leaf.
- `api/http-message/field-value.ts` — `Leaf` widening; byte
  conversions.

Tests added/extended (Office of Verification — behavior at
the seam):

- `tests/tz/http-date.test.ts` — RFC 850 (incl. the 50-year
  window against a fixed reference) + asctime + rejection.
- `tests/http-content-encoding.test.ts` — NEW: gzip/deflate
  round-trip (compress in-test via `CompressionStream`,
  async-decode back); `br` registry-miss throws; an injected
  `br` codec succeeds.
- `tests/http-body.test.ts` / `tests/http-body-value.test.ts`
  — form + text decode; `withBody` round-trip; JSON-inline
  regression unchanged.
- `tests/http-query.test.ts` / `tests/http-field-value.test.ts`
  — inner-list indexing; byte-sequence leaf + base64/bytes
  conversions; existing SF cases stay green.

## Critical files (re-derive anchors by symbol)

- `parseHttpDate`, `IMF_FIXDATE`, `MONTHS` — `http-date.ts`.
- `Body`, `contentDecoded`, `decoded`, `#contentEncodings`,
  `IDENTITY` — `body.ts`.
- `BodyCodec`, `BodyRegistry`, `jsonBodyCodec`,
  `defaultBodyRegistry` — `media-registry.ts`.
- `parseJsonBody`, `bodyToJson`, `jsonCodecFor` — the inline
  discriminator — `json-codec.ts`.
- `readBareItem`, `rejectInnerList`, `readItem`,
  `BareValue`, `SfItem` — `structured-fields.ts`.
- `navigateItem`, `navigateList`, `navigateDictionary`,
  `parameter` — `query.ts`.
- `FieldValue`, `Leaf`, `present`, `toText` — `field-value.ts`.

## Sequencing — tiny commits, green each

One deferral per arc, ordered by ascending ripple so the
type-model change lands last on a stable base. Each step is
test-first and leaves `./validate` gate-green; never mix a
rename with a content change in one commit.

1. RFC 850 + asctime dates (+ `reference`).
2. `kind` marker + form/text codecs + JSON-specific inline
   discriminator (the marker first, then the codecs, then
   the default registry — separate commits).
3. `ContentCodingRegistry` + gzip/deflate + async `Body`
   siblings + thread through `HttpMessage`.
4. SF byte-sequences, then SF inner-lists, then the
   `query.ts` / `field-value.ts` consumers.

## Test strategy

Highest level possible (Office of Verification): assert the
input→output contract, never the sausage. Compression tests
generate their fixtures with the platform `CompressionStream`
so the round-trip is self-contained and dependency-free.
Date tests pin a fixed `reference` so the 50-year window is
deterministic; the timezone suite (`tests/tz/`) keeps
`TZ=Pacific/Honolulu` to prove the instant never depends on
host time.

## Verification

`./validate` is the gate: `tsc --noEmit`, the full
`node --test` suite (UTC + the tz suite), the 78-char line
lint, and the schema-svg gate. Green before every commit;
green at the end.

## Out of scope / non-goals

- Wiring the library into any production code path. It stays
  un-wired by deliberate choice (server-tier work).
- Making the synchronous decode chain async. The async
  capability is additive siblings only.
- Vendoring or hand-rolling Brotli. `br` is a seam.
- RFC 9651 structured-field Dates (`@`) and Display Strings —
  beyond the two named SF deferrals; not requested.
- Any change to wire-codec framing, the canonical sort, or
  the number-preservation path — untouched.
