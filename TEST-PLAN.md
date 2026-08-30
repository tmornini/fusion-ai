# Fusion Angle — Test Plan

> **Encoding:** `- [ ]` = pending (not yet executed). Run outcomes are recorded as words in the Summary (PASS / FAIL / BLOCKED / DEFERRED / DRIFT), not by flipping the checkbox. Optional inline annotation: `- [FAIL]` with a note for a failed case.

## The walk

Three layers verify this product. Two are gates. The third
is exploration, and nothing rides on its result.

| Layer | Command | Runs | Standing |
|---|---|---|---|
| 1 | `./validate` | AT1–AT3: both `tsc` projects, `./test` in two TZ passes, the lints, the two drift gates. Chrome-free, Postgres-free | Gate: every commit |
| 2 | `./test-all` | Layer 1, then `./test-browser` (AT5) | Gate: the operator's, before `./build`, a deploy, or a walk; `./crank` enforces it for the walk |
| 3 | "run the test plan" | `./crank --mock-data 8080` — Layer 1, AT4 `./test-postgres`, AT5 — then one explorer walks A4 through SV | Exploration; nothing rides on its result |

**A browser observation changes product only through a red
test at Layer 1 or Layer 2.** The walk finds; the test
proves. A product commit may cite a mitigation stub only
when that stub's `Reproduced by` names a red test. The
ruling is not evidence; the red test is.

### Invocation

Use a fresh local Postgres via Docker. Do not set
`POSTGRES_URL`, `JWT_HMAC_SIGNING_KEY`, or
`HTTP_SERVER_PORT` by hand — `./crank` mints them for its
children and never prints them.

The browser layer is the **browser-use** plugin (MCP
`browser-use`, or CLI `browser-use`). If that plugin is not
connected and the CLI is not on PATH, **refuse the run.** Do
not fall back to Claude-in-Chrome, chrome-devtools MCP, or
source-only workarounds. Canvas gestures, the CSS viewport,
skeletons, reduced-motion, and the two-jar SV cases need a
compositor mouse and a real CSS viewport.

One macOS approval sheet appears per browser-use daemon
connection. Answer it, or run `browser-use mac-approve`
first. A 45-second silence fails the walk before it starts,
not mid-walk.

### The master's steps

1. **A1** `./build` from a clean tree, then **A2** inventory
   the artifact.
2. **A3** `./crank --mock-data 8080`. Crank runs Layer 1,
   `./test-postgres` (AT4), and `./test-browser` (AT5)
   before it serves. Red anywhere aborts the walk — no
   explorer is dispatched. Read the seed reveal from stdout;
   it is shown once. A3 **is** SV1.
3. Dispatch one explorer with the prompt below. A1–A3
   are the master's — they run before the origin exists;
   A4 onward are the explorer's.
4. Receive one line per case. Write the summary
   (`## Summary Format`) and one stub per FAIL cluster.
5. Run **K8** (wipe and reseed — the explorer has returned),
   then **J1–J3**.

The master does not drive the product and does not patch.

### The explorer prompt

Copy this verbatim, substituting the seed reveal's sign-ins.

```
Go to Medium Church!

Then read AGENTS.md at
/Users/tmornini/code/fusion-angle/AGENTS.md in full.

You are the explorer for the Fusion Angle TEST-PLAN walk.

Origin: http://localhost:8080
Admin: {admin_username} / {admin_password}
{the seed reveal's other sign-ins}

Read TEST-PLAN.md from `## The walk` to the end. Every
case from **A4** through the end of `## SV` is yours, in
document order. A1–A3 are the master's. Skip K8
(the master runs it after you return) and J (the
master's teardown).

Refuse if browser-use is not available. Do not fall back
to Claude-in-Chrome or chrome-devtools MCP.

Setup, once: clear this origin's cookies with
`Storage.clearDataForOrigin` (`storageTypes: 'cookies'`);
set `Emulation.setDeviceMetricsOverride` to 1280×800 with
`deviceScaleFactor: 1` (I10–I15 set ≤767 and restore);
open one tab and `activate_tab` it. That tab stays
visible for the whole walk. Open a second tab of the
same context only where a same-jar case needs one
(SV8, SV8b, SV9); open a second browser context — a
separate cookie jar — where a case needs a second
identity (SV6, SV7, SV10), recording BLOCKED with the
reason named if the driver offers no multi-context
support; activate whichever tab you are driving;
confirm `document.visibilityState === 'visible'`
before every gesture and every timing assertion.

Drive with compositor mouse and CDP key events. Never
`js()` fetch the API — the bearer is memory-only; read
the network log. Sign-ins are throttled to 5 per 60 s
per client: pace them, and a 429 inside that window is
the product working, not a FAIL.

Do not patch. Do not re-seed. Do not retry the plan.

Return one line per case:
ID PASS|FAIL|BLOCKED|DEFERRED|DRIFT — one-line note.
```

### Driving notes

These are product-true. A case that needs one names it; do
not repeat the note in every case.

- The canvas `<svg>` is replaced on every commit — query it
  fresh before each gesture.
- There is no `dblclick` listener: send two pointerdowns on
  one element id inside `DBLCLICK_MS` (400).
- Chords carry the browser's `key`; Shift uppercases it.
- `.focus()` selects the way Tab does; `.click()` selects
  nothing.
- F56: no canvas click before Space.
- List-row drags are pointer capture on `.drag-handle`.
- Probe for the skeleton before fetches settle.
- Reduced motion is `Emulation.setEmulatedMedia`.
- Downloads are intercepted at `URL.createObjectURL`;
  uploads are built with `DataTransfer`.
- List pages wait on the card count — never screenshot
  early.
- Authentication is throttled to five hits per 60 seconds
  per client, counting `authorize` and `token` together.
- The first click after a reload only focuses the window.
  This is a product seam, filed in TODO.md; drive a second
  click.

### Scoring

| Outcome | Meaning |
|---|---|
| PASS | the PASS line was observed |
| FAIL | the PASS line could not be observed as driven — a finding, not a verdict |
| BLOCKED | a step could not be performed for a named reason outside the product (driver or environment); the reason is the note |
| DEFERRED | a prerequisite case did not produce what this case needs |
| DRIFT | passes in substance; the document or the UI text disagrees — the document changes |

Nothing blocks on any outcome. BLOCKED is allowed for a
driver limit: with no gate riding on the walk, an honest
BLOCKED costs nothing and a dishonest FAIL costs a day. A
durable limit earns the case a one-line driving note, added
by the master.

## Summary

| Section | Tests |
|---|--:|
| AT. Automated Test Suite | 5 |
| A. Build & Setup | 5 |
| AA. Data Entry Workflow | 46 |
| B. Entry Pages | 31 |
| C. Core: Dashboard | 7 |
| D. Core: Ideas Workflow | 38 |
| E. Core: Projects | 12 |
| F. Tools | 80 |
| F2. Workbox | 31 |
| FS. Flow Statistics | 9 |
| G. Admin Pages | 38 |
| H. Reference & System | 2 |
| I. Cross-Cutting Concerns | 30 |
| J. Teardown | 3 |
| K. Objectives & Scoring | 30 |
| R. Records | 25 |
| SV. Server (Node + Postgres) | 9 |
| **Total** | **401** |

A3 **is** SV1 — counted once, in A. The explorer
skips SV1. F is 80 (F1–F75 plus F37a, F37b, F38a,
F38b, F57a).

### Combined Totals (CLI + Browser)

The per-section table above counts 401 distinct
TEST-PLAN cases (A3 is SV1; not counted twice). The
CLI count is the most recent `./validate` (AT2)
report — the main `tests/*.test.ts` suite plus the
`tests/tz/*.test.ts` timezone suite; AT2 without
`POSTGRES_URL` skips the seven `pg-*.test.ts` /
`schema-lifecycle.test.ts` stubs, and after AT4 those
seven run. The number grows as tests land in either
glob and is not pinned here. Update the case count
when a case is added or removed.

The five outcomes are defined once, in `## The walk`'s
`### Scoring`. `pending` is the sixth and is not an
outcome: it is the default `- [ ]`, not yet executed.

---

## AT. Automated Test Suite

AT1–AT3 are Layer 1, the one `./validate` crank runs
first. AT5 is Layer 2's browser suite. AT4 is crank's
`./test-postgres`, run after postgres is up. Layer 3
runs all five through `./crank`; the walk never invokes
them separately. Abort on any AT red.

- [ ] **AT1** Run `npx tsc --noEmit -p tsconfig.json`,
  then `npx tsc --noEmit -p web-app/app/tsconfig.json`.
  PASS: both exit 0; no diagnostics emitted.
  Pin: exploratory — the command is its own witness
- [ ] **AT2** Run `./test` (delegates to `TZ=UTC node --test --strip-types tests/*.test.ts` for the main suite, then `TZ=Pacific/Honolulu node --test --strip-types tests/tz/*.test.ts` for the timezone suite). PASS: exits 0; the runner's final summary reports `pass N` with `fail 0` for both suites.
  Pin: exploratory — the command is its own witness
- [ ] **AT3** Run `./validate`. PASS: exits 0 (composes AT1+AT2 plus the 78-char awk lint over `api/`, `web-app/`, `tests/`, `shared/`, `server/` `*.ts|html|css` with `compose.ts` exempt, and the root scripts `build`, `serve`, `crank`, `test`, `test-postgres`, `validate`, `generate-schema-svg`, `generate-api-documentation`, `measure`, `postgres-wipe`, `postgres-lib`, and `postgres-seed`; the org-abbreviation identifier lint over `api/`, `web-app/`, `tests/`, `shared/` `*.ts|html|css` with `compose.ts` exempt — reject `org` camel/Pascal/ORG_ identifier forms in favor of `organization`; then the `generate-schema-svg --check` SCHEMA.svg-drift gate; then the `generate-api-documentation --check` API.svg/room-drift gate). Any long-line violation prints `FILE:LINE: N chars` to stderr and fails the script; any org-abbreviation hit prints `FILE:LINE:` and fails.
  Pin: exploratory — the command is its own witness
- [ ] **AT4** Crank sets `POSTGRES_URL` and
  runs `./test-postgres` after postgres is
  up and before `./build --no-zip`. The
  suite creates and drops its own
  `fusion_test_*` schema. PASS: exits 0,
  `fail 0`. `./validate` stays Postgres-free.
  Pin: exploratory — the command is its own witness
- [ ] **AT5** Crank runs `./test-browser` after AT4 and
  before `./build --no-zip`. It bundles the client into
  `$TMPDIR` and runs `tests/browser/*.test.ts` serially
  against an in-process origin on the memory backend,
  one Chrome browser context per test. Needs Chrome
  (`CHROME` or `CHROME_DEBUG_URL`). PASS: exits 0,
  `fail 0`. `./test-all` runs AT1–AT3 then AT5.
  Pin: exploratory — the command is its own witness

---

## A. Build & Setup

- [ ] **A1** Run `./build` from a clean working directory. PASS: exits 0, prints no errors, creates `~/Desktop/fusion-angle-server-${SHA}.zip`.
  Pin: exploratory — the exit code and the ZIP
       file appearing on disk
- [ ] **A2** Unzip the A1 ZIP (or run `./build --no-zip /tmp/fusion-test/`). PASS: the temp dir contains `server.mjs`, `assets/app.js`, `assets/styles.css`, `assets/` (*.woff2 fonts), 18 page directories (`api-documentation`, `auth`, `billing`, `dashboard`, `design-system`, `flows`, `ideas`, `identities`, `identity-providers`, `identity-tokens`, `invitations`, `landing`, `members`, `not-found`, `organization`, `projects`, `records`, `workbox`) with 29 HTML page files (including `api-documentation/index.html`, `flows/stats.html`, `records/detail.html`, `identities/index.html`, `identities/detail.html`, `identity-providers/index.html`, `identity-tokens/index.html`, and `invitations/index.html`), plus root `index.html`. Verb/status rooms under `api-documentation/` are generated, not PAGE_REGISTRY pages — do not count them as the 29.
  The 29 are the `PAGE_REGISTRY` HTML files; do
  **not** count root `index.html` inside the 29
  (it stays the separate "plus root `index.html`");
  do **not** count verb/status rooms.
  Pin: tests/page-registry.test.ts 'PAGE_REGISTRY is 29
       HTML page files including the api-documentation
       index'; exploratory — that a real `./build` run
       actually emits those 29 files (the eight named
       above included) into the artifact, the 18
       directories, `server.mjs`, `assets/app.js`,
       `assets/styles.css`, the fonts, and the
       generated verb/status rooms
- [ ] **A3** `./crank --mock-data 8080`. Crank
  validates, mints secrets, starts postgres
  only, runs `./test-postgres`, `./build
  --no-zip` into a temp dir, wipes, seeds, and
  listens. Empty is the wipe step, not a human
  prerequisite. Secrets never print (seed's
  one-shot stdout is the only reveal). PASS:
  process listens; seed stdout prints `Save
  your demo sign-ins — shown once; copy them
  now.` plus one `username<TAB>password` line
  per seeded human (including
  `demo@example.com` and
  `sarah.chen@company.com`); listen stdout has
  no passwords; seed does not travel over
  HTTP. A3 is SV1.
  Pin: tests/pg-seed.test.ts 'mock-data seed
       prints every human sign-in'; exploratory
       — the live process listening, the
       stdout/HTTP boundary, and that
       `demo@example.com` and
       `sarah.chen@company.com` are specifically
       among the 11 printed lines (the test
       counts lines, not names)
- [ ] **A4** Open `http://localhost:8080/` in the test browser with site data deleted and no `refresh_token` cookie. PASS: unsigned root hops to `landing/index.html` (one hop from the blank root document). Does not open `auth/` and does not open `snapshots/`. Landing remains the public marketing page; it is now also the unsigned root target.
  Pin: tests/apex-destination.test.ts 'a dead session
       hops to landing'; tests/root-redirect.test.ts
       'apex hops via the destination helper';
       exploratory — the live single-hop navigation
- [ ] **A5** Open DevTools Console on that load. PASS: no 501; no JSON parse crash. An anonymous `POST /api/authentication/token` refresh 401 is acceptable.
  Pin: tests/apex-destination.test.ts
       'probeRefreshSession treats 401 as unsigned';
       exploratory — the DevTools console shows no
       501 or uncaught error

---

## AA. Data Entry Workflow

tenant: required
parallel: yes
global_lock: none
depends: A

Parallel: AA's slice is already bootstrap-only —
do not restart the process. Sign in as the AA
admin and run AA3+ create-from-empty.
Each later step creates data that subsequent
steps depend on. Run AA3+ in order. Serial: A3
`--mock-data` stands through J. Do not wipe to
`--bootstrap`. Do not mint garden rows: no Add
Member, no Add objective, no Create Idea, no
Submit for Review, no idea Approve, no Create
Project, no New Flow (AA26 and E7). Dialog-open
cases stay. Edits of a seeded subject stay.
AA24a may approve one seeded `submitted`
project (not an idea, not a K26 `under_review`
title). Serial leftover Convert is AA21: click
Convert to open the form; do not Create
Project.

- [ ] **AA3** Verify bootstrap data exists: user "Tony Stark", organization "Stark Industries" (domain `acmecorp.com`). `OrganizationEntity` has no plan field — its quota fields are `seats`, `projects_limit`, `ideas_limit`.

### AA2. Create Members

- [ ] **AA4** Navigate to Members (sidebar). Click "+ Add
  Member". PASS: dialog opens with a Kind toggle (Human /
  AI, Human selected by default), a Human form below
  showing Name, Email, Title, Department,
  Phone, Bio, and an AI form (hidden by default) with
  Name, a Model pulldown (grouped by provider, no
  default selection), Description, and a Skill Focus
  textarea — no Auth Token field or security warning.
- [ ] **AA5** Serial: Sarah Chen is already seated
  (Title: Project Lead, Department: Operations);
  do not Create. PASS: she appears in the
  seat-derived roster. Parallel: With Human
  selected, fill all fields for "Sarah Chen"
  (Title: Project Lead, Department: Operations).
  Click Create. PASS: toast confirms creation;
  `PUT /identities/:id` plus PII and a seat at
  the active organization (`PUT
  organizations/:id/members/:identity-id`); the
  person appears in the seat-derived roster.
- [ ] **AA6** Serial: the mock garden already
  holds all 10 humans — Sarah Chen, Mike
  Thompson, Jessica Park, David Martinez, Emily
  Rodriguez, Alex Kim, Marcus Johnson, David
  Kim, Lisa Wang, James Miller. Do not Create.
  PASS: Stark Members shows the six seated
  there (Sarah Chen, Jessica Park, Emily
  Rodriguez, Marcus Johnson, Lisa Wang, plus
  Tony Stark from AA3); the other five sit on
  Wayne. Parallel: Repeat for all 10 humans:
  Sarah Chen, Mike Thompson, Jessica Park,
  David Martinez, Emily Rodriguez, Alex Kim,
  Marcus Johnson, David Kim, Lisa Wang, James
  Miller. PASS: all 10 are written as identity
  + PII + seat and appear in the seat-derived
  roster.
- [ ] **AA7** Reload the Members page. PASS:
  the roster is seat-derived. Serial: the
  seeded humans re-render with their seats.
  Parallel: the freshly Added humans re-render
  with the seeded seats.
- [ ] **AA7a** Click "+ Add Member", switch the
  Kind toggle to AI. PASS: the Human form hides
  and the AI form appears. Serial: PASS: the
  AIs group already holds Claude Opus 4.8,
  Claude Sonnet 4.6, GPT-5.5, and Grok 4.3
  (agents are global, not seated); do not
  Create. Parallel: Fill Name, pick a Model,
  fill Description and Skill Focus. PASS:
  Create is blocked until a Model is chosen;
  once chosen, click Create →
  toast confirms and the AI is written as a
  message-plane AI agent document (`PUT
  /ai-agents/:id`); it appears in the AIs
  group (agents are global, not seated).
  Repeat for 4 AIs matching mock data (Claude
  Opus 4.8, Claude Sonnet 4.6, GPT-5.5, Grok
  4.3).

### AA3. Member Detail & Organization

- [ ] **AA8** On Members, click the current user's row.
  PASS: navigates to `member-detail` for that human. Read
  mode shows avatar, name, title •
  department subtitle, Personal Information card (Name,
  Email, Phone, Title, Department, Bio),
  Working Styles card, and Strengths card.
- [ ] **AA8a** From the Members list, click any AI
  member's row. PASS: navigates to `member-detail` for
  that AI. Read mode shows the AI identity card (Name,
  Model as "{name} — {provider}", Description) and a
  Skill Focus row; there is no Auth Token row.
- [ ] **AA9** Open the current user's own detail — the
  seeded admin, who carries three strengths (Strategic
  Planning, Data Analysis, Stakeholder Management); never
  an AA5/AA6-added human, which starts with none. Click
  Edit, change Phone and Bio, toggle Data Analysis off and
  Agile Methods on (`.strength-chip` buttons with
  `data-strength`, toggled by click — not checkboxes),
  click Save. PASS: toast "Member saved" appears and the
  page returns to read mode showing the edits — no
  navigation. Read mode renders `#member-strengths
  .pill-tag-strength` spans (three, with no
  `data-strength`); `.strength-chip` is edit-only. Reload
  the page. PASS: edited Phone, Bio, and the three
  strengths persist.
- [ ] **AA9a** From an AI member detail, click Edit,
  change Description and Skill Focus, and pick a
  different Model from the pulldown (grouped by
  provider, current model pre-selected), click Save.
  PASS: toast "AI member saved" fires and the
  page returns to read mode showing the edits — no
  navigation. Reload; the edited Description, Skill Focus,
  and Model persist.
  There is no Auth Token field.
- [ ] **AA10** Navigate to Organization. Click the
  page-level Edit button (a single button at the page
  header, not per-card), change Domain (e.g.
  `acmecorp.io`), click Save. PASS: success toast
  "Organization saved" appears.
- [ ] **AA11** Navigate away, return to Organization.
  PASS: edited Domain persists with saved value, card is
  back in read mode.
- [ ] **AA-Obj** On the Organization page, locate the
  Objectives box. Serial: 4 active objectives already
  sit in that order — "Lower expenses", "Increase
  incomes", "Raise customer NPS", "Improve employee
  morale". Do not Add. PASS: all four appear in the
  active list in that order. Parallel: Click `+ Add
  objective` four times, creating in that same order.
  PASS: all four appear in the active list in the
  order created. End-state delivered to Phase 2: 4
  active objectives — required by Agent-E's K9–K23
  scoring lifecycle, which has a read-dependency on
  the Organization Objectives produced here.

### AA4. Create Ideas

- [ ] **AA12** Navigate to Ideas. Serial: open
  seeded "AI-Powered Customer Segmentation"; do
  not Create. PASS: the idea is on the list.
  Parallel: Click "Create Idea". Fill in title,
  problem, solution, and outcome for
  "AI-Powered Customer Segmentation". Click
  "Submit Idea". PASS: idea appears on ideas
  list.
- [ ] **AA13** Navigate to that idea's detail
  page (Serial: the seeded idea. Parallel: the
  idea just created). Click "Edit". Verify
  title and text fields (problem, solution,
  outcome) are editable. Click "Save". PASS:
  toast confirms save, all fields persist.
- [ ] **AA14** Serial: Stark Ideas list already
  shows the 6 Stark mock titles — AI-Powered
  Customer Segmentation, Predictive Maintenance
  System, Smart Inventory Optimization,
  AI-Powered Customer Support Chatbot,
  Sustainability Dashboard for Operations,
  Real-time Inventory Tracking System. Do not
  Create. Do not claim 11 titles on one page.
  Wayne holds the other 5; do not mint; do not
  switch here. PASS: those six titles are
  present. Parallel: Repeat creation and field
  entry for all 11 ideas matching mock data
  titles. PASS: ideas list shows all 11 with
  correct titles.

### AA5. Submit Ideas for Review

- [ ] **AA15** Serial: seeded statuses already
  match; do not Submit. PASS: "AI-Powered
  Customer Segmentation" is already
  `in_review`. Parallel: Navigate to idea #1
  detail (status: active). Click "Submit for
  Review". PASS: status changes to "In Review",
  button disappears.
- [ ] **AA16** Serial: do not Submit. PASS:
  the four Stark `in_review` titles (AI-Powered
  Customer Segmentation, AI-Powered Customer
  Support Chatbot, Sustainability Dashboard
  for Operations, Real-time Inventory Tracking
  System). Do not name Wayne titles as already
  `in_review` on this page. Parallel: Submit
  ideas 1, 4, 7, 8, 9, 10, 11 for review
  (matching mock data statuses). PASS: each
  transitions from active to in_review.
- [ ] **AA17** Navigate to Ideas list and
  filter by "In Review" status badge. Serial:
  PASS: 4 cards on Stark. Parallel: PASS: the
  7 just submitted ideas appear.

### AA7. Approve Ideas & Convert to Projects

- [ ] **AA18** On Ideas list, filter by "In
  Review". Click an `in_review` idea (Serial:
  seeded "AI-Powered Customer Segmentation".
  Parallel: idea #1). PASS: navigates to idea
  detail with Send Back / Approve buttons in
  the header next to Edit.
- [ ] **AA19** Serial: PASS: Send Back / Approve
  are visible; do not Approve. Parallel: Click
  "Approve". PASS: idea status changes to
  approved, confirmation shown.
- [ ] **AA20** Serial: do not Approve. PASS on
  Stark: 0 `approved`, 4 `in_review`, 2
  `active`, 0 `sent_back`. The one seeded
  `approved` idea (Automated Report Generation)
  sits on Wayne. Parallel: Approve idea #4 as
  well (it was submitted for review in AA16).
  Leave others in their current status. PASS:
  statuses match the AA walk (2 approved, rest
  in_review/active).
- [ ] **AA21** Serial: leftover Convert stays
  Automated Report Generation
  (`WurwPqXxGtLhRAoCEcPzfQ`) on Wayne. Select
  Wayne Enterprises in the sidebar footer
  `.org-switcher` (G36). Convert is visible;
  click Convert. PASS: conversion form loads
  with 4 required fields (Project Name, Time
  with a "days" input suffix, Cost, Success
  Criteria) — there is no Impact field — plus
  a Scores box holding one required baseline
  slider per active objective. Do not Create
  Project. (D16 inherits this Wayne-switch.)
  Parallel: Navigate to approved idea #1.
  Click "Convert". PASS: the same form loads.
- [ ] **AA22** Serial: do not Create Project.
  PASS: Create Project is present on the form;
  do not click it. Parallel: Fill the 4 required
  fields (Project Name, Time with a "days"
  input suffix, Cost, Success Criteria) and
  drag every objective baseline slider in the
  Scores box. PASS: Create Project stays
  disabled until all required fields AND all
  baselines are set, then enables; clicking it
  navigates to project detail for the new
  project (the baselines commit atomically
  with project creation).
- [ ] **AA22a** On the Convert form before
  scoring, every baseline slider in the Scores
  box reads as pending, not zero: the slider
  is dimmed (~50% opacity) and its value shows
  an em-dash "—" in muted text (unscored is
  genuine absence — no score row is written —
  not a measured 0). Serial: PASS: one pending
  Wayne slider (Wayne demo objective), em-dash,
  Create still disabled; inspect; do not drag;
  then select Stark Industries in
  `.org-switcher` before AA23–AA24a. Parallel:
  PASS: four sliders; dragging a slider clears
  only that row's pending styling (full
  opacity, a signed value such as "+51", a
  green check by the label) while untouched
  rows stay dimmed, and Create Project stays
  disabled until all four objectives are
  scored.
- [ ] **AA23** Serial: on a seeded project
  (AI-Powered Customer Segmentation), click
  "Edit". Set a field and Save. PASS: project
  data persists. Parallel: On the newly
  converted project detail, click "Edit". Set
  fields (title, description, status, start
  date, end date, cost baseline) to match mock
  data. Save. PASS: project data persists.
  (Impact is no longer a directly-editable
  field — it is derived read-only from the
  objective baseline scores.)
- [ ] **AA24** Serial: do not Approve remaining
  ideas; do not Convert. Hunter is on Stark
  Industries after AA22a. PASS: Projects list
  is the seeded Stark list (~16). Parallel:
  Approve remaining ideas (7, 8, 9, 10) from
  Ideas list (filter by "In Review"), then
  convert all 6 approved ideas to projects.
  PASS: Projects list shows all 6 with
  correct status and progress.

### AA8. Score and Approve Projects

- [ ] **AA24a** From the Projects list, click
  into a `submitted` project. Serial: seeded
  Market Sentiment Analyzer
  (`PIfhHMLQQxTxKFDdabXbOw`), the only Stark
  `submitted` — not a K26 `under_review` title
  (Workforce Capacity Forecasting, Predictive
  Maintenance System, Employee Training
  Assistant). Parallel: project #1 (the first
  converted project, status `submitted`).
  Click Edit, change Status to `under_review`,
  Save. PASS: toast confirms. The objectives
  section's baseline sliders are now editable
  INLINE (no Score button, no modal). Serial:
  this project was seeded `submitted` with no
  baselines — move each baseline slider off
  its initial value and click Save; Approve
  enables only once every objective is scored.
  Parallel: because this project was converted
  through the UI its baselines were committed
  at convert time, so the Approve button is
  already enabled. Click Approve; confirm.
  PASS: status flips to `approved`; the action
  bar re-renders with `Archive` / `View
  history`, and the per-objective actual
  sliders become editable. Parallel: the
  project is now eligible for the New Flow
  gate in AA25. (Without approving, projects
  remain at `submitted` and the New Flow
  button stays hidden behind the `Approve to
  add flows` info badge.)

### AA9. Create Flows

- [ ] **AA25** Navigate to Projects. Click into
  an approved project's detail. Serial: an
  approved project that already has flows —
  Sales Pipeline Modernization (Lead-to-Close)
  or AI-Powered Customer Segmentation
  (Customer Onboarding and Layout Test). PASS:
  a "Flows" section is visible listing those
  flows (not "No flows yet") and a "New Flow"
  button. Parallel: project #1 detail (status:
  approved). PASS: a "Flows" section is
  visible showing "No flows yet" empty state
  and a "New Flow" button. Non-approved
  projects show an info badge "Approve to add
  flows" instead of the button, and empty
  state reads "Flow creation limited to
  approved projects only".
- [ ] **AA26** Click "New Flow". PASS: a "New
  Flow" dialog opens with a Flow Name input
  and Create/Cancel buttons. Serial: PASS:
  Cancel; do not Create. Parallel: Enter a
  name and click Create. PASS: navigates to
  the flow designer page. The SVG canvas
  shows two nodes:
  "Create" (start, top-left with green
  border) and "Archive" (end, bottom-right
  with red 3-px border) connected by no
  edges. Toolbar shows Undo, Redo, Zoom −/+,
  Copy Mermaid, Export ZIP, and Delete (trash
  icon); the header above the canvas hosts
  the Locked, Auto Layout, and Auto Fit
  switches. Changes auto-save (no explicit
  Save button).
- [ ] **AA27** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Drag the port circle on the start
  node into empty canvas past 20 pixels. PASS:
  during the drag a ghost "New State" card
  follows the cursor along with a faint bezier
  preview. On release, a new node appears at the
  drop position with a blue border,
  auto-connected from the start by an edge with
  a default name. The start node is also
  draggable by its body.
  (The node-creation + auto-edge logic — including
  the start-node-single-outgoing rule — is now
  covered by `tests/flow-operations.test.ts`
  (`performAddNodeAtPosition` + `performAddEdge`).
  Drive the port-drag with compositor mouse.)
  Activate the tab first (prompt rule): a hidden
  tab lands every `mouseMoved` past the daemon
  timeout and paints no ghost.
- [ ] **AA28** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Double-click the new blue-bordered
  node. PASS: properties panel appears with a
  "State Properties" title and close button on
  the right, then a `<fieldset>` labeled "Members"
  containing two groups — HUMANS and AIs — each
  with a labeled checkbox per member (no checkbox
  ticked yet), then a Name input, a Task Instructions
  textarea, an empty Attributes list, and outgoing
  transitions. The node gets a gold glow selection
  effect on the canvas.
  Drive the double-click with compositor mouse.
- [ ] **AA29** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Edit the state name in the
  properties panel to "Data Capture". PASS: the
  node label updates on the canvas immediately
  (auto-saves via 800ms debounce).
- [ ] **AA30** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Double-click the edge between
  start and "Data Capture". PASS: no properties
  panel opens — the outgoing edge from Create is
  intentionally not interactive. The edge has no
  name label visible on the canvas, just a plain
  blue arrow.
- [ ] **AA31** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Drag from "Data Capture"'s port
  into empty canvas past 20 pixels to create a
  new middle node; rename it "Review" via its
  properties panel. Rename the new edge
  "submit".
  (The add-node-at-position + auto-edge logic is
  now covered by `tests/flow-operations.test.ts`.
  Drive the port-drag with compositor mouse.)
- [ ] **AA32** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Hold Shift and drag from "Review"
  onto "Data Capture". PASS: during the drag the
  preview redraws as a dashed-orange curved
  bezier because a forward path "Data Capture" →
  "Review" already exists, and the reachability
  check recognises the release would close a
  loop. Release to create the cycle edge; rename
  it "needs revision". Hold Shift and drag from
  "Review" onto "Archive". PASS: preview is a
  solid-blue curved bezier (no return path).
  Release to create the edge; rename it
  "approve".
  (The connection-validation rules this would
  check — no edge to a start node, none from an
  end node, no duplicate, start-node-single-
  outgoing, and the cycle-vs-forward
  classification via the reachability check — are
  now covered by `tests/flow-operations.test.ts`
  (`performAddEdge`). Drive the shift-drag with
  compositor mouse.)
- [ ] **AA33** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: In the flow header, set the
  "Record:" dropdown to "Customer Profile"
  (seeded in the AA slice). Then in the "Data
  Capture" properties panel, open the
  "Attributes" fieldset. Click the
  "+ Add Attribute…" dropdown. PASS: the picker
  lists available record attributes pre-defined
  in the bound Record. Select an attribute (e.g.
  "Company Name"). PASS: the attribute appears in
  the attributes list with mode (Editable /
  Read-only) and required toggles plus a remove
  control. (The add-attribute logic is covered by
  `tests/flow-operations.test.ts`
  (`performAddAttributeRef`) — this case verifies
  the picker rendering and attribute-binding UI
  only.)
- [ ] **AA34** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Add more attributes to "Data
  Capture": select 2–3 attributes from the
  picker, each with a distinct mode (Editable /
  Read-only) and required toggle. PASS: all
  attributes appear in the list with correct
  mode (Editable / Read-only) and toggle state.
- [ ] **AA35** Serial: N/A — requires the empty
  Create+Archive graph that serial must not
  mint; do not add nodes; do not JSON-inject.
  Parallel: Wait for auto-save (800ms
  debounce). Navigate away and back. PASS: all
  nodes, edges, and attributes persist.

### AA10. Verify Dashboard

- [ ] **AA36** Navigate to Dashboard. PASS:
  gauge cards (Time, Cost, Impact) show
  aggregated values. Serial: computed from
  the seeded project data. Parallel: computed
  from the entered project data.
- [ ] **AA37** Header stats reflect data
  counts (ideas, projects, flows). PASS:
  counts are non-zero and match. Serial:
  seeded Stark counts. Parallel: the entered
  garden counts.

### AA11. Edit & Verify Cycle

- [ ] **AA38** Edit idea #1: change title. Save,
  navigate to ideas list, return to detail. PASS:
  changed title persists. Serial: seeded
  "AI-Powered Customer Segmentation". Parallel:
  idea #1 from AA12.
- [ ] **AA39** Edit project #1: change
  description. Save, navigate away, return.
  PASS: changed description persists. Serial:
  seeded AI-Powered Customer Segmentation.
  Parallel: the first converted project.
- [ ] **AA40** Edit flow: navigate to flow
  designer, rename a state (auto-saves).
  Navigate away, return. PASS: changed state
  name persists. Serial: a seeded flow (Layout
  Test or Lead-to-Close). Parallel: the AA26
  flow.
- [ ] **AA41** Edit human member: navigate to a human
  member's detail page, click Edit, change phone number,
  Save. Navigate away, return. PASS: changed phone
  persists.
- [ ] **AA42** Edit organization: click the page-level
  Edit button, change Domain in the overview card. Save,
  navigate away, return. PASS: changed Domain persists.

---

## B. Entry Pages

### Apex (`/`)

- [ ] **B0** With site data deleted and no
  `refresh_token` cookie, open `/`. PASS: lands on
  `landing/index.html` (one hop from the blank root
  document). Does not open `auth/` and does not open
  `snapshots/`.
  Pin: tests/apex-destination.test.ts 'a dead session
       hops to landing'; tests/root-redirect.test.ts
       'apex hops via the destination helper';
       exploratory — the live single-hop navigation
- [ ] **B0b** After signing in, open `/` in the same
  cookie jar. PASS: lands on `dashboard/index.html`.
  Landing (`/landing/index.html`) still stays until
  a click (B1).
  Pin: tests/apex-destination.test.ts 'a live session
       hops to dashboard'; exploratory — the live
       single-hop navigation in the same cookie jar

### Landing Page (`landing/`)

- [ ] **B1** Page renders with marketing hero content, feature sections, and call-to-action buttons, and stays. Wait ~3 seconds. PASS: still on `landing/index.html`. No hop to dashboard.
  Pin: tests/landing-stay.test.ts 'landing does not
       shove to dashboard'; exploratory — the rendered
       hero/feature/CTA content and the live
       3-second stay
- [ ] **B2** "Start Free Trial" (hero CTA) and "Get Started" (navbar CTA) are present and navigate to `auth/index.html`. PASS: buttons exist with correct target.
  Pin: exploratory — the live buttons and their
       navigation target
- [ ] **B3** "Sign In" button is present and navigates to `auth/index.html`. PASS: button exists with correct target.
  Pin: exploratory — the live button and its
       navigation target

### Auth Page (`auth/`)

> Note: the demo auto-login is RETIRED. Gated pages require the sign-in the origin's reveal provides. Cases below that "navigate to `dashboard`" assume a valid sign-in.

- [ ] **B4** Page loads in **Sign In** mode by default. PASS: title is "Welcome back", submit button reads "Sign in" with an SVG arrow icon (matching the Sign Up button's "Create account" affordance per B10).
  Pin: exploratory — the default rendered title,
       button text, and icon
- [ ] **B5** On desktop (≥1024px), left panel shows branded marketing stats (10K+ Active Users, 98% Satisfaction, 50+ Integrations). PASS: two-column layout visible.
  Pin: exploratory — the live two-column layout and
       stat copy
- [ ] **B6** Submit with empty fields. PASS: "Email is required" error appears below email input; input gets error styling.
  Pin: exploratory — the live validation;
       `validateEmail` in `web-app/auth/index.ts` is
       unexported and carries no CLI test today
- [ ] **B7** Enter `notanemail` in email, leave password empty. PASS: "Please enter a valid email address" error on email.
  Pin: exploratory — the live validation
- [ ] **B8** Enter `test@example.com`, password `123`. PASS: "Password must be at least 6 characters" error on password.
  Pin: exploratory — the live validation
- [ ] **B9** Enter the seeded admin credentials (`demo@example.com` + the password revealed at seed time), click "Sign in". PASS: button shows spinner briefly, then navigates to `dashboard/index.html`. Auto-login is retired, so an unseeded credential is rejected with "Invalid email or password.".
  Pin: tests/browser/sign-in.test.ts 'sign-in lands on
       the dashboard as the seeded admin';
       tests/browser/sign-in.test.ts 'a wrong password
       stays on auth with the inline error' (asserts a
       non-empty inline error and no navigation, not
       the literal "Invalid email or password." text);
       exploratory — the spinner and the exact
       rejection text
- [ ] **B10** Click the "Sign up" button (positioned next to the static "Don't have an account?" label — the label is not itself the toggle; the adjacent button is). PASS: switches to Sign Up mode — title changes to "Get started", "Company name (optional)" field appears, submit reads "Create account" with an SVG arrow icon (not a literal "→" character).
  Pin: exploratory — the live mode toggle
- [ ] **B11** Fill valid email + password (≥6 chars) in Sign Up mode, click the "Create account" submit control (SVG arrow icon, not a literal "→"). PASS: toast "Sign-up is coming soon — sign in with a seeded account." appears, the form flips to **Sign In** mode (title "Welcome back"), and NO navigation occurs — the demo no longer mock-establishes a session (real sign-up is SP-6 — see `TODO.md`; minting a bare mock with no refresh token would bounce on reload and could admit anyone to the seeded admin's data).
  Pin: exploratory — the live toast, mode flip, and
       absence of navigation

### Auth Validation Edge Cases

- [ ] **B12** In Sign In mode, enter valid email, valid password, then clear email and submit. PASS: email error reappears.
  Pin: exploratory — the live re-validation
- [ ] **B13** Toggle between Sign In and Sign Up modes multiple times. PASS: form resets cleanly each time, no layout glitches.
  Pin: exploratory — the live form reset and layout
- [ ] **B14** Footer shows "By continuing, you agree to our Terms of Service and Privacy Policy." PASS: text is visible.
  Pin: exploratory — the rendered footer text

### Auth Session & Redirect

- [ ] **B15** With no session (Sign out, or a profile with no `refresh_token` cookie), open `dashboard/index.html` directly. PASS: bounced to `auth/index.html?return=dashboard` (the Sign In page), not the dashboard.
  Pin: tests/auth-redirect-login.test.ts 'a gated
       page still carries return' (decides the
       `auth?return=dashboard` shape produced by
       `redirectToLogin()`, the function both
       `bootAuthGate` branches call when they
       bounce); tests/browser/two-jars.test.ts 'two
       contexts hold two identities on one origin'
       (a fresh context with no cookie navigates
       straight to `dashboard` and lands on
       `/auth/`); exploratory — that an explicit
       sign-out, not only a never-signed-in context,
       reaches the identical bounce
- [ ] **B16** From the B15 bounce, sign in with the seeded admin credentials. PASS: lands on `dashboard/index.html` — the `?return=` target, not a generic default.
  Pin: tests/page-registry.test.ts 'dashboard is gated
       and landing is public'; tests/auth-redirect-url.test.ts
       'a known gated page with no params decodes
       plainly' (proven on `members`, the same code
       path `dashboard` takes); exploratory — the live
       sign-in landing on the decoded target
- [ ] **B17** With no session, open `flows/detail.html?flowId=<id>` directly. PASS: bounced to `auth` with the flow preserved in `?return=`; after signing in, lands back on that exact flow with `flowId` intact.
  Pin: tests/auth-redirect-login.test.ts 'a gated page
       still carries return'; tests/auth-redirect-url.test.ts
       'a page with nested params round-trips the wire'
       (round-trips `flow-detail` with a `flowId`
       param intact); exploratory — the live bounce and
       the post-sign-in landing on the exact flow
- [ ] **B18** After signing in on the dashboard, reload (Cmd-R). PASS: stays authenticated on the dashboard — no bounce to `auth` (boot cookie-refreshes via `POST /api/authentication/token` with `grant_type=refresh` and `credentials: 'same-origin'`).
  Pin: tests/browser/two-jars.test.ts 'two tabs share
       the cookie; sign-out in one bounces the other'
       (a brand-new tab of the same context — no
       in-memory state, only the shared cookie —
       loads `dashboard` directly and lands
       authenticated with the painted chip:
       `bootAuthGate`'s cookie-session branch,
       live); tests/api-authentication-token.test.ts
       'refresh grant rotates from the Cookie, not
       the body' (the server side of the same grant);
       exploratory — a literal reload specifically,
       as opposed to a brand-new tab
- [ ] **B19** With no session, open each public page in turn — `landing/`, `auth/`, `not-found/`, `design-system/`. PASS: each renders normally with NO redirect to `auth`.
  Pin: tests/page-registry.test.ts 'public pages are
       auth-exempt only' (decides `landing`, `auth`,
       `not-found`, and `design-system` all carry
       `requiresAuth: false`); exploratory — the live
       render of each with no redirect
- [ ] **B20** After signing in, close the tab, then reopen `dashboard/index.html` in a new tab in the **same** cookie jar. PASS: still authenticated — no bounce (the HttpOnly `refresh_token` cookie is shared by the jar; boot cookie-refreshes).
  Pin: tests/browser/two-jars.test.ts 'two tabs share
       the cookie; sign-out in one bounces the other'
       — the same pin as SV8, which this case
       duplicates almost exactly; exploratory — the
       live open and the painted chip in tab B (same
       as SV8)
- [ ] **B21** Silent refresh: after signing in, replace the in-memory access token with an expired JWT (keep the live `refresh_token` cookie), then navigate to `members/`. PASS: the page loads with no bounce and no error card — the dead access token was cookie-refreshed transparently.
  Pin: tests/adapters-refresh-mutex.test.ts 'two
       concurrent 401s cause one refresh POST' (a dead
       access token against `members` under a cookie
       session transparently refreshes and the
       original call still succeeds); exploratory —
       the live page load with no bounce or error card
- [ ] **B22** Dead refresh: clear the `refresh_token` cookie and drop the in-memory access token, then open `dashboard/`. PASS: bounced once to `auth?return=dashboard` — no retry loop, no console error storm.
  Pin: tests/adapters-refresh-mutex.test.ts
       'cookie-session recover after a failed facade
       refresh does not POST again' (exactly one
       refresh POST, then a terminal
       `UnauthorizedError` — no retry loop);
       tests/auth-redirect-login.test.ts 'a gated
       page still carries return' (decides the
       `auth?return=dashboard` bounce shape
       `redirectToLogin()` produces, the function
       `bootAuthGate` calls on a dead refresh);
       exploratory — the live single bounce and the
       absence of a console error storm

### Sidebar Sign-out

- [ ] **B23** On any gated page (e.g. dashboard), click "Sign out" in the sidebar. PASS: the `refresh_token` cookie is cleared (`Set-Cookie` `Max-Age=0`), a revocation row is recorded, and the page navigates to `auth`; pressing Back to the protected page bounces again to `auth?return=`.
  Pin: tests/api-identity-token-revocations-self.test.ts
       'logout-everywhere success clears the refresh
       cookie' (the self-revoke PUT sign-out triggers
       201s and clears `refresh_token` with
       `Max-Age=0`, `HttpOnly`, `Path`, `SameSite`);
       tests/adapters-session-logout.test.ts 'logout
       revokes this identity and clears credentials'
       (decides a revocation row lands for the
       signed-out identity); exploratory — the live
       navigation to `auth` and the Back-bounce
- [ ] **B24** Open the app in two tabs (both signed in). Click "Sign out" in tab A, then trigger a fetch in tab B (navigate within it). PASS: tab B's next request 401s against the shared revocation ledger and bounces to `auth` — eventual cross-tab convergence, no corruption.
  Pin: tests/browser/two-jars.test.ts 'two tabs share
       the cookie; sign-out in one bounces the other'
       — the same pin as SV9, which this case
       duplicates almost exactly; exploratory — the
       live in-memory-access-token nuance before
       navigation (same as SV9); also unclaimed: that
       the 401 comes from the shared revocation
       ledger specifically, rather than simply a
       cleared cookie — both tabs share one jar, so
       tab B's cookie is already gone too, and no
       test isolates the ledger check from the
       cookie-absence case

### Zero-membership landing (org gate)

> Setup for B25–B29: these exercise the boot/login org gate that lands a ZERO-membership identity on its pending invitations (accepting one grants the first membership and unblocks every org-scoped route). The seed gives every login-capable identity a membership, and the walk has no instrument to strip one: there is no member-removal affordance under `web-app/members/` or `web-app/identities/`, the explorer may not `js()` fetch the API to fake it, and `POSTGRES_URL` is minted by `./crank` for its children and never printed, so a direct message-plane insert is out of reach too. If the zero-membership state cannot be produced through the running origin, record BLOCKED for B25–B29 naming that reason — an honest BLOCKED costs nothing. `getOrganizations` is fenced to the derived membership ledger, so an identity that truly reaches no org lands here regardless of how it got there.

- [ ] **B25** From the zero-membership state, click "Sign out", then sign in again with that member's credentials. PASS: the `refresh_token` cookie is cleared (`Set-Cookie` `Max-Age=0`) — sign-out is not org-fenced; a zero-membership identity must still revoke. Lands directly on `invitations/index.html` — NOT the `?return=` target and NOT the dashboard "Something went wrong" card; no flash of the dashboard shell (the auth-page short-circuit decides before the first navigation). Sidebar renders the member chip from token claims with NO org switcher. Navigating Back after sign-out does not boot into the account.
  Pin: tests/api-identity-token-revocations-self.test.ts
       'org-less self-revoke PUT 201s and clears the
       refresh cookie' (a zero-reachable-org identity's
       self-revoke 201s, clears `refresh_token` with
       `Max-Age=0`, and records a revocation row —
       sign-out is not org-fenced); tests/session-holder.test.ts
       'an empty reachable set has none' (decides
       `sessionHasReachableOrganization()` is false for
       that identity — the auth-page predicate that
       short-circuits a fresh sign-in straight to
       `invitations` before the return target ever
       loads); exploratory — the live landing, the chip
       with no switcher, and the Back-navigation guard
- [ ] **B26** From the zero-membership state while signed in, open `dashboard/index.html` (or any org-gated page) directly and reload (Cmd-R). PASS: redirected to `invitations/index.html` by the boot org gate — no dashboard error card, no retry loop (the returning-user path, not just fresh login).
  Pin: tests/boot-organization-gate.test.ts
       'invitations page keeps an empty organization
       list' (its `resolveOrganizationGate([],
       'dashboard')` assertion — the boot gate's
       bounce-to-invitations branch); exploratory —
       the live reload and the absence of an error
       card or retry loop
- [ ] **B27** As the zero-membership identity, land on `invitations/index.html`. PASS: the page renders and STAYS — no redirect loop (the gate's self-guard exempts the invitations page); it shows pending invitations, or the "No invitations." empty state when none exist.
  Pin: tests/boot-organization-gate.test.ts
       'invitations page keeps an empty organization
       list' (its `resolveOrganizationGate([],
       'invitations')` assertion returns the empty
       list itself, not `null` — the self-guard);
       exploratory — the live stay, the rendered
       invitations, and the empty state
- [ ] **B28** Restore the deleted membership row (or repeat with an untouched seeded member), then sign in. PASS: lands on the `?return=` target / dashboard as before — the org gate does not fire for an identity that reaches an org (B16/B18 unaffected by the new gate).
  Pin: exploratory — the live landing on the target;
       no test exercises `resolveOrganizationGate`
       with a non-empty organization list against a
       page other than `invitations`, so nothing
       today decides that the gate passes a
       non-empty-org identity through on an ordinary
       gated page like `dashboard` (the only cited
       assertion for a non-empty list uses
       `invitations` as the page, so it cannot tell
       "fires for any page" from "fires only for
       invitations" apart)
- [ ] **B29** As the zero-membership identity, open `design-system/`. PASS: renders normally with NO redirect to invitations — the org gate guards auth-gated pages; public pages degrade to the unscoped sidebar (B19).
  Pin: tests/page-registry.test.ts 'public pages are
       auth-exempt only' (`design-system` carries
       `requiresAuth: false`, so `bootApp` never runs
       the org gate on it); exploratory — the live
       render with no redirect

---

## C. Core: Dashboard

- [ ] **C1** Navigate to `dashboard/`. PASS: page loads with sidebar, header, and main content area.
  Pin: tests/browser/sidebar.test.ts 'collapse and
       expand transition the sidebar width';
       tests/browser/sign-in.test.ts 'sign-in lands
       on the dashboard as the seeded admin';
       exploratory — the header and main content
       area rendering
- [ ] **C2** Sidebar shows flat navigation
  links in this order: Dashboard,
  Organization, Ideas, Projects, Records,
  Flows, Workbox, Members, Identities, Billing,
  API, Design System. PASS: all 12 links
  present, in order, and styled. Source of
  truth: `PAGE_REGISTRY` (entries with
  `inSidebarNav: true`) in
  `web-app/app/page-registry.ts`.
  (Teams, People, Roles, Crews, Company,
  Activity Feed, and Profile sidebar entries
  have been retired — the current user's
  detail is reachable via the sidebar account/
  member chip (the old header greeting that also
  linked to it has been removed); humans and AIs
  both live on the Members page.)
  Pin: exploratory — the rendered order and
       styling of the 12 links
- [ ] **C3** Header shows search bar, company
  stats as structured tiles (org name as a
  `header-stat-label`, then per-stat value +
  Ideas / Projects / Flows labels separated by
  `header-stat-divider` dividers — the counts track
  the current working data and change as you create
  or convert, so don't assert exact numbers),
  and theme toggle. PASS: elements visible and
  styled. The old "Good {morning/afternoon/
  evening}, {name}" greeting and the top-bar org
  `<select>` have both been REMOVED; the top bar
  shows neither. (The org switcher moved to the
  sidebar footer — see G36; the pending-invitations
  bell may appear at the top bar — see V3.)
  Pin: exploratory — the rendered header and the
       absence of the retired greeting and select
- [ ] **C4** Dashboard renders 4 surfaces in order: three
  visually-equivalent arc-gauge cards (Time and Cost are
  ratio arc-gauges — dual concentric semicircles: outer
  baseline track + inner actual fill; Impact is a bipolar
  arc — left/right split from a center apex; all three
  share the same card chrome) and, below the grid, an
  Objectives box one gauge column wide
  (`.objective-aggregates-card`,
  `calc((100% - 2 * var(--space-6)) / 3)`; full width
  only under 768px; card title "Objectives"). Sign in as
  the demo admin (`demo@example.com`, Tony Stark) with
  Stark Industries active — surfaces carry seeded scores,
  not zeros. PASS: all 4 render with baseline and current
  values; the Time and Cost cards each show dual
  concentric ratio arcs and the Impact card shows a
  bipolar arc; the Objectives box shows one row per
  objective, each with a small bipolar arc gauge and a
  sparkline trendline. A `—` Impact or a `data-empty` row
  is a FAIL.
  Pin: tests/adapters-dashboard.test.ts
       'getDashboardGauges returns the three sibling
       gauges'; tests/adapters-dashboard.test.ts
       'getDashboardGauges marks Time and Cost as
       ratio'; tests/adapters-dashboard.test.ts
       'getDashboardGauges marks Impact as bipolar';
       tests/presenter-dashboard-objective-aggregates.test.ts
       'renders one row per active objective';
       tests/presenter-dashboard-objective-aggregates.test.ts
       'row renders the small bipolar gauge SVG';
       tests/presenter-dashboard-objective-aggregates.test.ts
       'row renders colored segments and dots';
       tests/presenter-dashboard-objective-aggregates.test.ts
       'heading reads "Objectives"';
       tests/objectives-card-width.test.ts 'the
       Objectives card is one gauge column wide';
       tests/objectives-card-width.test.ts 'the
       Objectives card is full-width under 768px';
       exploratory — the visual order/layout of the 4
       surfaces and the painted dual-concentric and
       bipolar arcs
- [ ] **C5** Sidebar navigation links all function correctly. PASS: clicking a sidebar link navigates to the expected page.
  Pin: exploratory — each link's live navigation
- [ ] **C6** Scroll the page. PASS: sidebar stays fixed, main content scrolls independently.
  Pin: exploratory — the sidebar's fixed position
       while the main content scrolls
- [ ] **C7** Check that seed data populates all 4 dashboard
  surfaces (three arc-gauge cards + Objectives box). PASS:
  no "No data" empty states on a fresh mock-data load.
  NOTE: the mock seed now spans TWO orgs (Stark Industries + Wayne
  Enterprises; the demo admin belongs to both) and the
  dashboard is scoped to the ACTIVE org, so its header and
  gauges show that org's portion — not global totals. Counts
  are tolerant lower bounds, not equalities (the seed
  grows): for active-org Stark expect ~6 ideas, ~16
  projects, ~4 flows, 4 objectives, plus the roster (6
  humans — 5 single-org seeded members + Tony Stark, the
  both-org admin; the System member authors seed events but
  is excluded from the roster — and 4 AIs).
  Global raw mock totals are larger (~11 ideas, ~17
  projects, ~5 flows across both orgs). A `—` Impact or a
  `data-empty` row is a FAIL.
  Pin: tests/adapters-dashboard-mock-seed.test.ts 'mock
       seed produces portfolio Impact baseline +50';
       tests/adapters-dashboard-mock-seed.test.ts 'mock
       seed produces per-objective baseline means';
       exploratory — the tile counts against the stated
       bounds and the absence of any "No data" empty
       state on the other surfaces

---

## D. Core: Ideas Workflow

tenant: required
parallel: yes
global_lock: none
depends: A

### Ideas List (`ideas/`)

- [ ] **D1** Navigate to `ideas/`. PASS: list shows the active org's ideas as cards (≈6 for Stark on the mock seed — the list is org-scoped, so this is a tolerant lower bound, not the global 11; note the org-scoped reads can take 5–8s to paint, so wait for the cards before asserting empty), each with a drag-handle grip, title, status badge, and (for approved ideas) a Convert button. Ideas represent the problem-and-proposed-solution shape and do not carry time/cost/impact estimates; those fields live on projects created by conversion.
- [ ] **D2** Each idea row shows a lifecycle status badge (Active, In Review, Approved, Promoted, Sent Back, or Archived); an active idea missing a required field also shows a single "Incomplete" readiness pill (warning tone) derived from required-field presence — ready ideas and non-active ideas show no pill. PASS: the status badge always renders, and the Incomplete pill appears only on active, not-ready ideas.
- [ ] **D3** Click an idea row/title. PASS: navigates to `ideas/detail.html?ideaId=<id>` (idea-detail) with the correct `ideaId` parameter.
- [ ] **D4** "New Idea" or "Create Idea" button is visible. PASS: clicking it navigates to `ideas/create.html`.

### Idea Create Form (`ideas/create.html`)

- [ ] **D5** Page loads showing a single-page form with six conversationally-labeled fields: "Give your idea a clear title" (Title), "What problem does this solve?" (Problem Statement), "Who will benefit from this?" (Target Users), "How would you solve this?" (Proposed Solution), "What outcome do you expect?" (Expected Outcome), "How would you measure success?" (Success Metrics). Parentheticals are conceptual field names (draft keys: title, problemStatement, targetUsers, proposedSolution, expectedOutcome, successMetrics), not DOM field ids; the prompt is the visible label. DOM ids for selectors: `idea-create-field-title|problem|target|solution|outcome|metrics`. PASS: all six fields visible.
- [ ] **D6** With any required field empty, click
  "Submit Idea". PASS: an error toast reads
  "Title, problem, solution, and outcome are
  required"; the page does not navigate. The
  button stays clickable (no `disabled`
  attribute — validation is post-click).
- [ ] **D7** Fill in all required fields (Title,
  Problem Statement, Proposed Solution,
  Expected Outcome). PASS: the button stays
  clickable (there is no disabled→enabled
  transition). Submit itself is D8.
- [ ] **D8** Click "Submit Idea". PASS: navigates to `ideas/index.html`.
- [ ] **D9** Click "Cancel". PASS: navigates to `ideas/` list.

### Idea Detail (`ideas/detail.html?ideaId=<id>`)

- [ ] **D10** Navigate to `ideas/detail.html?ideaId=<id>` (a real identifier from the Ideas list). PASS: page loads with idea title, status badge, and "Submitted by [name] @ [date/time]" in the header.
- [ ] **D11** Page displays one card: Problem & Solution (Problem Statement,
  Target Users, Proposed Solution, Expected
  Outcome, Success Metrics). PASS: all fields populated. No Details or Estimates cards.
- [ ] **D12** Click "Edit" button. PASS: text fields become editable inputs/textareas, Save and Cancel buttons appear, Edit button hides.
- [ ] **D13** Modify a field (e.g. Problem Statement or Expected Outcome), click "Save". PASS: toast "Idea saved" appears, page returns to view mode with updated data.

### Idea Detail — Edit & Actions

- [ ] **D14** Click "Edit", then "Cancel". PASS: returns to view mode with original data unchanged.
- [ ] **D15** For an idea in "in_review"
  status: clicking the card navigates to
  `ideas/detail.html` with Send Back /
  Approve buttons in the header next to Edit.
- [ ] **D16** Convert is on the list card
  (`data-idea-convert`) and on detail
  (`#idea-convert-btn`). Serial: leftover
  Convert is Automated Report Generation
  (`WurwPqXxGtLhRAoCEcPzfQ`) on Wayne. Select
  Wayne Enterprises in the sidebar footer
  `.org-switcher` (G36) — it is not on the
  Stark list. PASS: both Convert controls are
  visible; one click (list or detail) navigates
  to `ideas/convert.html`. That click does
  **not** promote (D24 does). Then select Stark
  Industries in `.org-switcher` before D17–D19.
  Parallel: a slice-garden `approved` idea,
  same control, same PASS.
- [ ] **D17** Navigate to `ideas/detail.html?ideaId=999` (non-existent). PASS: page handles gracefully — shows error state, no unhandled JS exception.

### Idea Detail — Submit for Review

- [ ] **D18** Navigate to an idea with status
  "active". Serial: leftover `active` is
  Stark — Predictive Maintenance System or
  Smart Inventory Optimization. Parallel: a
  slice-garden `active` idea. PASS: "Submit
  for Review" button is visible in the
  header area.
- [ ] **D19** Click "Submit for Review". PASS:
  toast "Submitted for review", navigates to
  the ideas list, and the idea's status badge
  there now reads "In Review". The toast is
  still visible on the ideas list after
  navigation (it survives `navigateTo`).
  Serial: stay on D18's Stark `active`
  leftover.

### Idea Detail — Sent Back Re-Submit

- [ ] **D20** Navigate to an idea with status
  "sent_back" (after a reviewer sends it
  back). Serial: org-switch to Wayne
  Enterprises in `.org-switcher` (G36).
  Leftover `sent_back` is Employee Training
  Assistant (`IjrYiSuRyjkQaqiRLhadAg`).
  Parallel: a slice-garden `sent_back` idea.
  PASS: "Submit for Review" button is
  visible, allowing re-submission.
- [ ] **D21** Click "Edit", modify a field,
  click "Save". PASS: idea updates. Click
  "Submit for Review". PASS: navigates to
  the ideas list with the idea now "In
  Review". Serial: leftover is Wayne
  Employee Training Assistant; stay on
  Wayne for D22.

### Idea Convert (`ideas/convert.html`)

- [ ] **D22** Navigate to
  `ideas/convert.html?ideaId=<id>` for a
  convertible idea. Serial: stay on Wayne
  Enterprises after D21. Automated Report
  Generation (`WurwPqXxGtLhRAoCEcPzfQ`) —
  D16 verified this leftover. Parallel: a
  slice-garden `approved` idea. PASS: page
  loads with conversion form showing 4
  required fields:
  Project Name, Time (label "Time", unit
  "days" as the input suffix; field key
  `time-days`), Cost, Success Criteria (it
  maps to the project description). There is
  no Impact field. A Scores box renders one
  required baseline slider per active
  objective. Serial: 1 Wayne slider (Wayne
  demo objective). Parallel: 4 sliders.
  Sticky sidebar shows the idea summary
  (Title, Problem Statement, Target Users,
  Proposed Solution, Expected Outcome,
  Success Metrics). Source of truth:
  `REQUIRED_FIELDS` in
  `web-app/app/presenters/idea-conversion.ts`.
- [ ] **D23** Project Name auto-prefills from the
  idea title, so the bar starts 1/N — not 0/N
  — with the other required fields empty.
  N = 4 + one per active objective. Serial:
  1/5 (4 fields + 1 Wayne objective). Parallel:
  1/8 (4 + 4). "Create Project" stays disabled
  until every remaining required field and
  every baseline is set. Fill fields and drag
  baseline sliders one at a time. PASS: the
  bar increments with each required field AND
  each baseline, checkmarks appear next to
  completed items, and the button enables only
  when all required fields AND all baselines
  are set. Success Criteria is required —
  filling it advances the bar.
- [ ] **D24** Fill every required field and
  baseline (the progress bar reaches its max;
  Serial: 5/5. Parallel: 8/8), click "Create
  Project". Serial: Create Project on ARG
  after D16 verified the leftover. PASS:
  navigates to project detail page for the
  newly created project. The source idea's
  lifecycle state becomes `promoted` (list
  badge label **Promoted**, not "Approved") —
  convert is a promotion, not a re-approve.
  Then select Stark Industries in
  `.org-switcher` before D25–D30.

### Idea Status Filtering (`ideas/index.html`)

- [ ] **D25** Navigate to `ideas/index.html`. PASS: status badges appear showing each status present in the data (e.g., Active, In Review, Approved).
- [ ] **D26** Click a status badge. PASS: list filters to show only ideas with that status, badge is highlighted (`aria-pressed="true"`), others are dimmed (`data-dimmed="true"`); badges carry label + icon only (no per-badge count).
- [ ] **D27** Click the same badge again. PASS: filter clears, all ideas shown, all badges at full opacity.
- [ ] **D28** Click a different badge. PASS: filter switches to the new status.

### Idea Detail — Approval Actions

- [ ] **D29** Navigate to `ideas/detail.html?ideaId=<id>` for an in_review idea (entity ids are identifiers, not sequential integers — copy a real id from the Ideas list). PASS: page loads with idea details and Send Back / Approve buttons in the header next to Edit.
- [ ] **D30** Click "Approve". PASS: success toast,
  navigates to ideas list, idea status is now
  "approved". The success toast (`Idea approved
  successfully`) is visible on the list the same
  way. This is a second `approved` — not
  D16's leftover Convert subject.
- [ ] **D31** Click "Send Back". PASS: confirm dialog opens. Confirm. PASS: idea status changes to "sent_back", navigates to ideas list.
- [ ] **D32** Navigate to idea detail for a non-in_review idea. PASS: no Send Back / Approve buttons are shown.
- [ ] **D32a** On an in_review idea, click "Edit". PASS: the header shows only Cancel / Save — no Send Back, Approve, Submit, or Convert. Click Cancel: the read header (Send Back / Approve / Edit) returns.

### Ideas Workflow Integration

- [ ] **D33** After creating an idea and converting it to a project, navigate back to `ideas/`. PASS: the ideas list still loads correctly with seed data.
- [ ] **D34** Navigate from ideas list → idea convert → back button. PASS: navigates to ideas list.
- [ ] **D35** Navigate to `ideas/convert.html?ideaId=999` (non-existent). PASS: page handles gracefully — shows empty/error state, no unhandled JS exception.

### Ideas List — Drag-reorder

- [ ] **D36** On `ideas/index.html`, press and hold
  the `.drag-handle` on an idea row then drag it
  upward past another row's midpoint. Drive with
  compositor mouse: `pointerdown` on `.drag-handle`
  (pointer capture), `pointermove`, `pointerup` —
  not HTML5 `drop`. Activate the tab first (prompt
  rule). PASS: during the drag a
  hysteresis indicator appears at the target drop
  position, the dragged row follows the pointer,
  and on release the ideas list reorders in place.
  Reload the page — new order persists.
- [ ] **D37** During a drag, hover slowly across the
  midpoint of a neighbouring row. Drive with two
  or more `pointermove` samples across the
  midpoint. PASS: the drop indicator line only
  flips to the new target once the pointer crosses
  the hysteresis threshold, not on the first pixel
  over the midpoint.

---

## E. Core: Projects

### Projects List (`projects/`)

- [ ] **E1** Navigate to `projects/`. PASS: list shows the active org's projects (≈16 for Stark on the mock seed — the list is org-scoped, so this is a tolerant lower bound, not the old fixed 6) with title, status, and progress. Each project card shows three metrics (time, cost, impact). Em-dash ("—") substitutes for the entire metric when its **baseline (denominator) is missing**; a zero current value over a non-zero baseline renders as `0d / 213d`, `$0k / $120k`, or `0 / 85 pts` — not em-dash. Em-dash signals "no baseline to compare against," not "zero current value." When the current is missing but the baseline is present, the half-em-dash form (e.g. `— / 46 pts`) renders the absent current side only — distinct from full em-dash (both absent) and from `0d / 213d` (zero current over present baseline).
  Pin: tests/presenter-projects-organization.test.ts
       'ProjectPresenter.buildCard renders title,
       status label and timeline progress';
       exploratory — the org-scoped card count, the
       paint-timing wait, and the metric grid's
       em-dash / half-em-dash rendering
- [ ] **E2** Click a status filter badge (e.g. "Approved"). PASS: project list filters to show only projects with that status. Click the same badge again. PASS: full list returns.
  Pin: tests/presenter-misc.test.ts 'toggleStatusFilter
       from all moves to filtered on the clicked
       status'; tests/presenter-misc.test.ts
       'toggleStatusFilter clears back to all when
       the active status is clicked again';
       tests/list-choreography.test.ts
       'filteredSortedList filters, sorts, then
       renders'; tests/list-choreography.test.ts
       'filteredSortedList renders all when the
       filter is all'; exploratory — the live badge
       click and its visual active state
- [ ] **E3** Click a project row. PASS: navigates to `projects/detail.html?projectId=<id>`.
  Pin: exploratory — the live click and navigation

### Project Detail (`projects/detail.html?projectId=<id>`)

- [ ] **E4** Page loads with project summary
  card (description, dates, progress bar) and
  baseline vs. current metrics. PASS: all cards
  render with data. Baseline/current metrics
  show em dash when values are zero or missing.
  Pin: tests/presenter-projects-organization.test.ts
       'ProjectDetailPresenter renders a read view
       with title, description and summary/metrics
       sections'; exploratory — the dates and
       progress bar rendering, and the em-dash rule
       for the Time, Cost, and Impact metrics
- [ ] **E5** Sidebar shows the Flows section
  (Team card has been retired with the team
  data model). PASS: no Team card on the
  project sidebar.
  Pin: exploratory — the absence of a Team card
- [ ] **E6** Flows section shows linked flows with
  node/edge counts. For approved projects, a "New
  Flow" button is visible. For non-approved
  projects, an info badge "Approve to add flows"
  appears instead and empty state reads "Flow
  creation limited to approved projects only".
  PASS: correct UI for project status.
  Pin: tests/presenter-projects-organization.test.ts
       'ProjectDetailPresenter offers a New Flow
       button for approved projects and a gating
       message otherwise';
       tests/presenter-projects-organization.test.ts
       'ProjectDetailPresenter renders a flow card
       with the flow name and node/edge counts';
       exploratory — the zero-flows empty-state
       copy actually painting
- [ ] **E7** On an approved project, click "New
  Flow" button. PASS: a "New Flow" dialog opens
  with a Flow Name input and Create/Cancel
  buttons. Enter a name and click Create. PASS: a
  new flow is created and the browser navigates to
  the flow designer page. The new flow is
  associated with the current project.
  Pin: tests/adapters-flow-mutations.test.ts
       'postFlowCreation creates flow plus link';
       exploratory — the dialog's fields and the
       live navigation to the flow designer

### Project Detail — Edit Mode

- [ ] **E8** Click "Edit" button on project detail. PASS: fields become editable inputs/textareas, Save and Cancel buttons appear.
  Pin: tests/presenter-projects-organization.test.ts
       'ProjectDetailEditPresenter renders an
       editable title input, state select and
       Save/Cancel actions'; exploratory — the live
       click swapping read mode for edit mode
- [ ] **E9** Modify a field, click "Save". PASS: project saves successfully, returns to view mode with updated data.
  Pin: tests/adapters-projects.test.ts 'putProject
       updates an existing project';
       tests/projects-detail-reduce.test.ts
       'reduceProjectSave lands in read mode with
       the fresh description and Edit, not Save';
       exploratory — the live click-Save interaction
- [ ] **E10** Click "Edit", then "Cancel". PASS: returns to view mode with original data unchanged.
  Pin: exploratory — the live click-Cancel
       interaction restoring the original data
- [ ] **E10a** On a project whose state shows action-bar buttons (`submitted` → Approve / Decline / Send back, or `approved` → Archive / View history), click "Edit". PASS: those action-bar buttons are hidden; only the State select, editable fields, and Cancel / Save remain. Click Cancel: the action-bar buttons reappear.
  Observable: `#project-review-actions` /
  `#project-lifecycle-actions` carry `hidden`
  while the inner `.action-bar` keeps its own
  `display:flex`. The objectives section and
  flows sidebar stay visible in edit mode.
  Pin: exploratory — the action-bar buttons hiding
       on Edit and reappearing on Cancel

### Projects List — Drag-reorder

- [ ] **E11** On `projects/index.html`, press and hold
  the `.drag-handle` on a project card then drag it
  to a new position. Drive with compositor mouse:
  `pointerdown` on `.drag-handle` (pointer capture),
  `pointermove`, `pointerup` — not HTML5 `drop`.
  PASS: drop indicator appears, card follows the
  pointer, and on release the projects list
  reorders. Reload the page — new order persists.
  Pin: tests/browser/list-reorder.test.ts 'a
       captured drag reorders, persists, and stays
       put'; exploratory — the drop indicator's
       appearance and the card visually following
       the pointer mid-drag

---

## F. Tools

tenant: required
parallel: yes
global_lock: none
depends: A

### Flow List (`flows/`)

- [ ] **F1** Navigate to `flows/`. PASS: page shows
  flow cards with name, project name badge, and
  state/transition counts.
- [ ] **F2** Flow-list search. RETIRED / N/A: `flows/` has
  no search input (never shipped on the list page). Do not
  assert a filter control. PASS vacuously; re-open only if
  a flow-list search UI is added later.
- [ ] **F3** Click a flow card. PASS: navigates
  to `flows/detail.html?flowId=<id>`.

### Flow Import

(Mermaid parse/serialize round-trip is covered by
`tests/mermaid.test.ts` and ZIP read/write by
`tests/zip-guards.test.ts` — the cases below verify the import
dialog, the file-upload affordance, and that the imported flow
opens and renders.)

- [ ] **F4** Click "Import Flow" button on the flows list page. PASS: import dialog opens with a project selector dropdown and a "Choose File" button (the file input is hidden and triggered by that button).
- [ ] **F5** Choose a project from the dropdown, click "Choose File", and select a `.mmd` file — selecting the file imports it directly (no separate confirm button). PASS: flow is created, toast confirms import, and browser navigates to the flow designer for the imported flow.
- [ ] **F6** Repeat with a `.zip` file exported from a previous flow. PASS: imported flow renders with nodes, edges, and attributes visible (round-trip fidelity is covered by `tests/mermaid.test.ts` + `tests/zip-guards.test.ts`). NOTE: export ZIP carries graph + positions (`flow.mmd` / `flow.json` / `sidecar.json`) only — it does **not** rebind `flow_records`. After import the designer Record control may show **(none)** until the operator rebinds a record; that is scope, not a failed import.

### Flow Designer (`flows/detail.html?flowId=...`)

- [ ] **F7** Navigate to a flow designer page.
  PASS: page wears the standard sidebar + top-bar
  layout (formerly standalone) — left sidebar with
  the global nav, top bar with search/
  organization stats/theme toggle (no greeting —
  it has been removed), and the flow
  designer occupying the remaining content area.
  Toolbar runs vertically along the left edge of
  the canvas (inside the content area, not the
  global sidebar) with Undo/Redo, Zoom −/+,
  Copy Mermaid, Export ZIP, and Delete (trash icon)
  arranged top-to-bottom. The header above the
  canvas hosts the Back button, a Stats button, and
  three header switches (Locked, Auto Layout, Auto Fit). SVG
  canvas to the right of the toolbar with dot
  grid background showing the flow graph. When
  Auto Fit is on, conflicting interactions (drag,
  pan, zoom buttons, panel pan) are gated with a
  fire-and-toast "blocked" message rather than
  being silently absorbed; the user either turns
  Auto Fit off or accepts the constraint. Changes
  auto-save (no explicit Save button).
- [ ] **F8** Nodes display correctly: start node
  has green border with its name centered in the
  card and no subtitle, standard nodes have blue
  border with attribute count subtitle, complete
  node has a red 3-px border with its name centered
  in the card and no subtitle.
- [ ] **F9** Edges display correctly: forward
  edges are solid blue lines with arrow markers
  and named labels. Cycle edges — those that
  close a loop because a return path from target
  back to source already exists in the graph —
  are dashed orange with a warning arrow. Sibling
  transitions between nodes that have no return
  path render as solid blue even when they share
  a level.
  Serial and Parallel: open the seeded "Layout
  Test: Proposal Review Cycle" (parallel F lists
  two flows — garden Customer Onboarding plus
  Layout Test). Cycle edges live on that graph.
- [ ] **F10** Connection ports (small circles) are
  visible on every middle node when the flow is
  unlocked. Create and Archive nodes show a port
  only when they have no connected edges yet —
  per `canShowPort` in `web-app/app/flow-graph.ts`,
  ports render when not locked AND (not a
  start/complete node OR that special node has no
  connections). When the flow is locked, no node
  shows a port. Each port sits on the longest open
  perimeter gap of its node, not always the right
  side. Hover over a port. PASS: cursor changes
  to crosshair and a browser tooltip reads "Click
  and drag to create a new node attached here.
  Hold Shift to connect to an existing node
  instead."
- [ ] **F11** Click a node. PASS: node gets gold
  glow selection effect. Double-click the node.
  PASS: properties panel appears with the
  "State Properties" title and close button on
  the right (regular nodes only — Create/Archive
  nodes still show their kind title), then a
  Members fieldset (HUMANS / AIs checkbox
  groups), then state name, a Task Instructions
  textarea, the attributes list, and outgoing
  transitions.
  Drive the double-click with compositor mouse.
- [ ] **F12** Pan so a node sits near the right
  edge of the canvas, then double-click it. PASS:
  the properties panel slides out from the
  toolbar edge over ~200ms and the canvas
  re-centers so the node sits at the visual center
  of the canvas region not covered by the panel.
  Drive the double-click with compositor mouse.
- [ ] **F13** While the panel is open, drive two compositor
  `pointerdown`s on a different node within 400
  ms (there is no `dblclick` listener), same as
  F11. PASS: panel content updates to the new
  node and the canvas re-centers on it.
- [ ] **F14** Enable Auto Fit, then double-click a
  node. PASS: panel opens and the canvas re-fits to
  the panel-aware visible region (no toast, no
  blocking — Auto Fit handles the re-fit via
  `fitBoxToCanvas`'s `panelOffsetPx`). Turn Auto
  Fit off and double-click again. PASS: panel opens
  and the canvas pans to keep the node visible, and
  the previous viewBox is saved for restoration when
  the panel closes.
- [ ] **F15** Drag from a middle node's port into
  empty canvas past 20 pixels, without holding
  Shift. PASS: during the drag a faint bezier
  preview plus a "New State" ghost card track the
  cursor. On release, a new middle node is
  created at the drop position and
  auto-connected from the source node with a
  default edge name.
  (The node-creation + auto-edge logic is now
  covered by `tests/flow-operations.test.ts`
  (`performAddNodeAtPosition` + `performAddEdge`).
  Drive the port-drag with compositor mouse.)
- [ ] **F16** Drag a standard node to a new
  position. PASS: the node's `transform`
  follows the pointer **during** the drag
  (rAF). F-slice Auto Layout starts ON —
  drop may snap (F17). For a resting free
  placement see F34 (toggle Auto Layout off
  first; F18's first toggle is that off).
  Activate the tab first (prompt rule): the
  rAF paint this PASS observes exists only
  on the visible tab.
- [ ] **F17** Drag the start node. PASS: it moves
  freely like any standard node (start and
  complete nodes are both draggable; with Auto
  Layout on, the drop re-lays out — Create
  returns to the head of the first column,
  Archive to the foot of the last). Clicking
  the start node's port still initiates a
  drag-from-start to create a new state.
- [ ] **F18** Toggle the Auto Layout header
  switch twice (the seed starts ON — the first
  toggle turns it off and moves nothing). PASS:
  all nodes reposition by rank from start — one
  column per rank (one row per rank when the
  graph is taller than wide), others by graph
  depth. Create heads the first column and
  Archive ends the last — never above or below
  a column-mate; the covenant is the columns,
  not the corners. Create min x, Archive max x.
  Hunter measures laid-out node positions on
  `svg.flow-canvas` (`data-node-id` plus the
  node's x/y or transform) after the second
  Auto Layout toggle, not screenshot y. A long
  chain wraps into a serpentine (Customer
  Onboarding,
  Lead-to-Close): Create leads the top row and
  Archive ends the last — bottom-left on an
  even row count.
- [ ] **F19** Hold Shift and drag from a middle
  node's port over another middle node, then
  release. PASS: during the drag the preview
  re-draws from a ghosted grey straight line
  (when the cursor is over empty canvas) into a
  curved bezier with an arrowhead the moment the
  cursor enters a valid target node. On release
  over the target, a new edge is created with a
  default name. No "New State" ghost card is
  shown while Shift is held.
  (Applies to F19–F23: the connection-validation
  rules these would check — no edge to a start
  node, none from an end node, no duplicate edge,
  start-node-single-outgoing, and the cycle-vs-
  forward classification via the reachability
  check — are now covered by
  `tests/flow-operations.test.ts` (`performAddEdge`,
  including the noop branch for a release in empty
  canvas). Drive F19–F23 with compositor mouse;
  the FSM preview transitions are also
  exercised by `tests/flow-fsm-reduce.test.ts`.)
- [ ] **F20** Shift-drag forward (earlier node →
  later node). PASS: the curved preview is solid
  blue while over the target. The committed edge
  matches the preview exactly.
- [ ] **F21** Shift-drag backward (later node →
  earlier node). PASS: the curved preview is
  dashed orange with a warning arrow while over
  the target — the reachability check recognises
  that target → … → source already exists. The
  committed cycle edge matches the preview.
- [ ] **F22** Shift-drag and release in empty
  canvas (no node under cursor). PASS: the grey
  straight-line preview disappears and nothing
  happens — no edge, no new node.
- [ ] **F23** Begin a plain drag from a port (no
  Shift). While the mouse remains stationary,
  press and hold Shift. PASS: without any mouse
  movement the ghost "New State" card disappears
  and the preview collapses to the grey line (or
  curved bezier if the cursor is already over a
  target). Release Shift — the ghost card
  returns. Release the mouse with Shift held to
  create an edge, or without Shift to create a
  node.
- [ ] **F24** Double-click a node, edit its name in
  the properties panel. PASS: the node label
  updates on the SVG canvas immediately (changes
  auto-save after 800ms debounce).
- [ ] **F25** Double-click a node to open the
  properties panel. Open a node that does not
  already reference every record attribute. On
  the F slice that is Create, Archive, or a New
  State — not Capture or Review (both already
  bind Company Name and Industry; an empty
  picker there is correct). In the "Attributes"
  fieldset, click the "+ Add Attribute…"
  dropdown. PASS: the picker lists available
  record attributes. Select one. PASS: the
  attribute appears in the attributes list with
  mode (Editable / Read-only) and required
  toggles plus a remove control.
- [ ] **F26** Click an edge to select it (gold glow).
  Drive two compositor `pointerdown`s on the edge
  within 400 ms (there is no `dblclick` listener),
  same as F11. PASS: panel shows transition name,
  from/to state names. Edit the name. PASS: label
  updates on the canvas.
- [ ] **F27** Select a non-start/non-complete node,
  click the Delete (trash) button in toolbar.
  PASS: node and all connected edges are removed.
  If F15 already created a New State, delete a
  *different* intermediate (Capture or Review),
  not that New State — F68–F72 need it.
- [ ] **F28** Select an edge, click the Delete
  (trash) button in toolbar. PASS: edge is
  removed from the canvas.
- [ ] **F29** The seed loads with Auto Fit ON:
  click Zoom in (icon-only buttons; `title` /
  `aria-label` "Zoom in" / "Zoom out") — an
  error toast "Disable Auto-Fit to change the
  view" appears and `viewBox` stands. Toggle
  Auto Fit OFF. Click Zoom in,
  then Zoom out, re-querying `svg.flow-canvas`
  after each click (every commit rebuilds the
  `<svg>`). PASS: `viewBox` width and height
  shrink then restore (zoom steps ±0.1,
  clamped 0.25–2.0). Click the empty canvas
  once — `viewBox` keeps the zoomed value.
  Toggle Auto Fit ON — the canvas re-fits to
  all nodes.
- [ ] **F30** Edit a node name via the properties
  panel, wait 1 second for auto-save. Navigate
  away and return to the designer. PASS: all
  nodes, edges, and attributes persist.
  Positions persist only when Auto Layout is
  off (F18's first toggle; wait for the flow
  PUT before leaving). Seed Auto Layout is ON:
  boot re-lays-out to the current canvas, so a
  1-row snake may wrap to 2×2 on return —
  that is not a fail.
- [ ] **F31** Navigate to
  `flows/detail.html?flowId=nonexistent`. PASS:
  page handles gracefully — shows error state,
  no unhandled JS exception.

### Flow Designer — Undo/Redo

(Undo is undo-as-replay (Phase 14 Task 8): the server resolves the restore
target by replaying the flow's own document-message-pair history against its
own undo operation-message-pair history (stack+pointer — a second consecutive
undo goes FURTHER back rather than oscillating; a save after an undo-undo
truncates the abandoned branch). Redo is client-only — an in-memory stack
(`web-app/app/flow-history.ts`) cleared by `recordFlowMutation()` on every
committed content edit. This cursor algorithm, redo's in-memory stack,
exhaustion as a graceful no-op, and the 412-retry-then-fresh-resolve on a save
racing an undo are covered by `tests/flow-undo-cursor.test.ts` and
`tests/flow-operations.test.ts` (`performUndo` / `performRedo`).
`flow_versions` routes were RETIRED (Phase 15 Task 7; router 404) and the
table is DELETED (Phase Final); undo walks the flow's own
document-message-pair history only. The cases below verify the toolbar
buttons, the keyboard shortcuts, the disabled states, and that the canvas
re-renders after each step.)

- [ ] **F32** After adding a state, click the Undo
  toolbar button. PASS: the state and its
  connecting edge are removed. Redo button
  becomes enabled.
- [ ] **F33** Click the Redo toolbar button. PASS:
  the state and edge reappear.
- [ ] **F34** On a non-auto-layout flow, after moving a
  node, press Cmd+Z (Mac) or Ctrl+Z. PASS: node returns
  to its previous position, pixel-identical (see F37b for
  the auto-layout exception to this promise).
- [ ] **F35** Toolbar Delete (`data-action="delete-selected"`)
  on a non-Create / non-Archive node, same as F27.
  Wait until that node is gone, then Undo. Do
  not use Backspace unless F38's `aria-current`
  is already true. PASS: the state and all
  its connected edges are restored.
- [ ] **F36** Undo and Redo buttons are disabled
  when their respective stacks are empty. PASS:
  buttons show disabled state initially. (Undo
  may stay enabled at exhaustion —
  `hasUndoHistory` is `pairs > 1`
  (`api/derive-flows.ts`) — and the click is a
  graceful server no-op.)
- [ ] **F37** Perform an action, undo, then perform
  a new action; let the new action's
  `PUT /api/organizations/:id/flows/:id` land —
  a panel rename saves `SAVE_DELAY_MS` = 800 ms
  after the last keystroke; do not click the
  canvas or another node before the PUT. PASS:
  the redo stack is cleared (redo button
  disabled).
- [ ] **F37a** Open the same flow in two tabs. In tab A, edit
  a node name and let auto-save complete. In tab B (which
  still shows the pre-edit head), click Undo immediately.
  PASS: nothing looks wrong — no error toast, no stuck
  spinner, no console error surfaces to the user. Under the
  hood the stale-basis undo collides with tab A's save (HTTP
  412) and the client silently retries with a freshly
  resolved target against the new head — the 412-retry is
  invisible to the tester by design.
- [ ] **F37b** On a flow with Auto Layout ON, add via
  F15's plain port-drag (no Shift). Wait until node
  count + 1, then Undo. PASS: the canvas restores
  to the pre-edit graph. Now make ANY new
  edit (e.g. rename a node). PASS: node positions may
  re-flow to the auto-layout orientation on this next edit —
  this is expected, not a regression (the server-resolved
  restore is canvas-less; auto-layout re-computes positions
  on its own next content change). Pixel-identical restores
  are only promised for non-auto-layout (manually-positioned)
  flows, per F34.

### Flow Designer — Keyboard Shortcuts

- [ ] **F38** Focus a `.flow-node` (Tab through
  chrome, or `js()` `.focus()` on the node) —
  do not Tab from document start expecting the
  first node. Tab through chrome now lands on
  `svg.flow-canvas`, then the first `.flow-node`
  or `.flow-edge` — that is PASS, not a skip.
  Wait for `aria-current="true"` before Delete /
  Backspace (F38) or Enter (F38b) / Space
  (F57a). Assert `aria-current="true"`; it
  also takes the selection (glow), panel closed.
  Press Delete or Backspace. PASS: the focused
  node is deleted; focus lands on `<body>`.
- [ ] **F38a** Focus a remaining `.flow-node`
  first (same chrome-first drive as F38). Tab
  through chrome now lands on `svg.flow-canvas`,
  then the first `.flow-node` or `.flow-edge`
  — that is PASS, not a skip. Wait for
  `aria-current="true"` before Delete /
  Backspace (F38) or Enter (F38b) / Space
  (F57a). Next Tab moves to the next node or
  edge; from the last item it wraps to the first
  (DOM order) and never leaves the canvas.
  Selection follows the focus. With the panel
  open the camera pans to reveal the selection,
  zoom unchanged. Tab across a marquee-selected
  group keeps the group selected only while
  focus lands on one of its members — Tab
  order is DOM order (render order, not
  selection order), so the first tab onto a
  non-member collapses the selection to that
  node. PASS: focus and selection stay paired
  through every re-render.
- [ ] **F38b** Tab to a node, press Enter — its
  panel opens and the node keeps focus through
  the re-render; Escape closes the panel and
  focus stays on the node. A mouse click
  selects without keeping focus. PASS:
  keyboard focus survives open and close.
- [ ] **F39** With Undo enabled, press Cmd+Z /
  Ctrl+Z — it matches the Undo toolbar button.
  Without a node click in between, press
  Cmd+Shift+Z / Ctrl+Shift+Z (the browser
  reports `key: 'Z'`) — it matches Redo. PASS:
  keyboard shortcuts match toolbar button
  behavior.

### Flow Designer — Additional Coverage

- [ ] **F40** Seed starts unlocked. First toggle of
  the Locked switch in the designer header locks:
  ports gone, `svg.flow-canvas` has
  `flow-canvas-locked`, node `<rect>` and
  edge vis-path `stroke` attributes are
  `hsl(var(--accent-text))`. Do not look for a
  CSS keyword `gold`. PASS: connection ports
  disappear from all middle nodes, the Delete
  toolbar button becomes disabled, and opening a
  properties panel shows panel controls as
  read-only (inputs `disabled`, every checkbox in
  the Members fieldset also `disabled` and
  unresponsive to clicks). Auto Layout remains
  enabled because it only repositions nodes
  without changing structure. Visual confirmation:
  locked strokes apply regardless of type (Create,
  Archive, Regular); edges use the same stroke
  (cycles remain dashed); edge-label backgrounds
  gain the same stroke; the dot-grid background
  renders unchanged from its unlocked appearance.
  Untoggle Locked: ports return, the Delete
  button re-enables, panel controls become
  editable, the Members checkboxes become
  interactive again, and per-type colors return
  (Create green, Archive red, Regular blue,
  Cycle amber).
- [ ] **F41** With a non-trivial flow loaded,
  click "Copy Mermaid" in the toolbar. PASS: a
  visible success toast "Mermaid copied to
  clipboard" confirms the copy (toasts sit on
  `document.body`, outside `#page-root`), and
  the clipboard holds Mermaid flowchart syntax
  for the current graph.
  (Round-trip correctness — `generateMermaid` → `parseMermaid`
  preserving nodes, edges, and attribute references — is covered by
  `tests/mermaid.test.ts`; this case verifies the toolbar action
  and the clipboard write.)
- [ ] **F42** Click "Export ZIP" in the toolbar. PASS: a `.zip` file
  downloads. Unzip the archive — it contains `flow.mmd` (Mermaid
  source), `flow.json` (graph with node positions), `sidecar.json`,
  and a human-readable `flow.txt`. (ZIP read/write correctness is covered
  by `tests/zip-guards.test.ts`.)
- [ ] **F43** On `flows/index.html` click "Import Flow", choose a
  project, click "Choose File", and select a `.mmd` file previously
  exported from a known flow — selecting the file imports it
  directly (no separate submit/confirm button; same shape as F5).
  PASS: the imported flow opens in the designer and renders nodes,
  edges, and attributes. (Structural fidelity of the mermaid
  round-trip is covered by `tests/mermaid.test.ts`; this case
  verifies the import dialog and that the designer opens on the
  imported flow.)
- [ ] **F44** Repeat F43 with a `.zip` archive. PASS: the imported
  flow renders with node positions preserved (not auto-laid-out).
  (ZIP round-trip is covered by `tests/zip-guards.test.ts`; this
  case verifies the `.zip` import path through the dialog and the
  preserved-position rendering.)
- [ ] **F45** The 11-step walk is required, not
  optional. Rename 11 nodes one at a time; after
  each name, wait for that flow's `PUT /api/
  organizations/:id/flows/:id` in the network log
  (the save fires `SAVE_DELAY_MS` = 800 ms after
  the last keystroke) before selecting the next
  node. Then click Undo 11 times. After each Undo
  click, wait for the **canvas name/graph to
  change**, not merely HTTP 201 (exhaustion 201
  with no canvas change is F36). PASS: every one
  of the 11 renames reverts in order — undo walks
  the flow's own full document-message-pair
  history (`FLOW_VERSION_CAP` and `flow_versions`
  are retired; there is no 10-edit bound). A
  further Undo that answers 201 with no canvas
  change, Undo still enabled, is F36 exhaustion
  (graceful server no-op), not a missed step.
- [ ] **F46** Edit a flow (rename a state), let
  auto-save complete. Navigate away from the
  designer to `flows/index.html`. Re-open the
  same flow. Click Undo. PASS: after the list
  round-trip, Undo must revert the rename the
  same way (wait for the canvas name/graph to
  change, not merely HTTP 201). The undo history
  survived navigation because it is the flow's
  own message-pair history, persisted to the
  schema, not held in memory. Unlike before
  Phase 14, this persistence has no 10-edit
  bound (see F45). Graph and name are undo
  content; Locked, Auto Layout, and Auto Fit
  are guards that undo never flips and never
  counts. Opening a flow writes nothing.

### Flow Designer — Flow Tags (API-only, no UI this phase)

(No manual browser case — Step 0 (Phase 14 Task 9) elected
API-ONLY: no designer affordance lands this phase. The
automated suite (`tests/api-flow-tags.test.ts`,
`tests/api-organization-isolation.test.ts`'s "nested
flows/:id/tags" fence case) is the sole coverage: PUT/GET/
DELETE lifecycle, Response-ID pinning survives further flow
saves, marked delete, member-tier authorization, two-tag
concurrency, and the org fence. A designer "tag current" action is tracked in
`TODO.md`.)

### Space Toggle (Pan Mode)

- [ ] **F47** Toggle Auto-Fit **off** before
  F47–F49 pan (seed Auto-Fit is ON). After
  touching Auto-Fit (or any header switch), do
  **not** leave focus on that `button` — Space
  would activate it. Focus `svg.flow-canvas` via
  Tab or `js()` (`tabindex="0"`) with **no**
  `pointerdown` on the canvas (F56's trap), then
  send Space. PASS: a
  primary-colored outline appears around the
  canvas; the cursor becomes `grab` over canvas,
  nodes, and edges.
- [ ] **F48** With pan mode on, tap the spacebar a second time.
  PASS: the outline disappears and the cursor returns to its
  default state.
- [ ] **F49** With pan mode on, drag the canvas, release, then
  drag again. PASS: both drags pan the viewport — pan mode
  persists across multiple drags until toggled off.
- [ ] **F50** Hold the spacebar down for two seconds without
  releasing. The first Space `keydown` must have
  `repeat: false`; hold may auto-repeat after that.
  PASS: pan mode toggles on exactly once; browser
  auto-repeat does not chatter the toggle.
- [ ] **F51** Begin dragging a node — require an
  in-flight `dragging` gesture. While the drag is
  in flight, tap the spacebar. PASS: the drag
  completes unchanged; pan mode state is unchanged
  when the drag ends. Space mid-gesture must not
  toggle pan.
- [ ] **F52** Begin a marquee selection on empty
  canvas — require an in-flight marquee. While the
  marquee is in flight, tap the spacebar. PASS:
  the marquee continues; pan mode state is
  unchanged when pointer-up resolves. Space
  mid-gesture must not toggle pan.
- [ ] **F53** The flow must be unlocked (ports
  visible); do not start from a locked canvas.
  Shift-drag from a node port to begin a connect
  gesture. While connecting, tap the spacebar.
  PASS: the connect gesture continues; pan mode
  state is unchanged at pointer-up. Space
  mid-gesture must not toggle pan.
- [ ] **F54** With pan mode on and a pan drag in flight, tap the
  spacebar mid-drag. PASS: the pan drag continues; pan mode
  state is unchanged until the drag ends.
- [ ] **F55** Seed Auto-Fit is ON. Pan must be
  off first (F48 if pan is on). Auto-Fit must
  be on (seed ON, or toggle **on** if F47–F49
  turned it off). After touching the Auto-Fit
  button, move focus off it: focus
  `svg.flow-canvas` via Tab or `js()`
  (`tabindex="0"`) with **no** `pointerdown`
  on the canvas (F56's trap). If F29 just
  toasted the same Auto-Fit message, wait out
  `WHEEL_TOAST_COOLDOWN_MS` (2000) before the
  Space that must toast again. Then send Space
  once. PASS: an error
  toast appears ("Disable Auto-Fit to change
  the view"); pan stays off.
- [ ] **F56** With pan mode on, toggle Auto-Fit on, then tap the
  spacebar. Do **not** click the canvas first to move focus
  off the Auto-Fit switch — that click starts a pan
  gesture, so Space is ignored (`isGestureActive`) and a
  leftover Auto-Fit toast looks like a fail. Focus
  `svg.flow-canvas` via `js()` (`tabindex="0"`)
  or Tab (no `pointerdown` on the canvas), then
  send Space with no in-flight gesture. PASS:
  pan mode turns off cleanly with no toast —
  exiting pan mode is always permitted.
- [ ] **F57** Focus `#prop-node-name` (the input,
  not a node). Tap the spacebar. PASS: a literal
  space character is inserted into the input;
  pan mode state is unchanged.
- [ ] **F57a** Tab to a node, tap Space. PASS: the
  node's panel opens (Space activates the
  focused item); pan mode stays off.

### Members Selector (Node Panel)

- [ ] **F58** Open a regular-node properties panel. PASS:
  the Members fieldset is the first body block, with a
  "Members" legend, a HUMANS group containing one
  labeled `<input type="checkbox" data-member-id="<id>">`
  per active human (alphabetized by full name), and an
  AIs group containing one checkbox per AI member
  (alphabetized by name). When the checkbox list overflows
  the panel height, the fieldset scrolls inside its own
  region.
- [ ] **F59** Tick one human checkbox. Reload the page
  and reopen the same node panel. PASS: that human
  checkbox is still ticked. Inspect the flow's head
  document message pair — the stored graph body carries
  `memberIds: [<humanId>]`. AI checkboxes are
  display-only (`data-ai-member-id`): they reflect
  stored `agentIds` and do not write. A seeded
  `agentIds` list survives this save.
- [ ] **F60** Untick the human checkbox. Reload the page
  and reopen the panel. PASS: the human is gone from
  `memberIds`. Stored `agentIds` are unchanged.
- [ ] **F61** Untick all human checkboxes so `memberIds`
  is `[]`. Reload the page. PASS: every human checkbox
  in the panel is unticked. The node now displays the
  danger badge per F73 if no humans remain.
- [ ] **F62** Lock the flow via the designer-header Locked switch.
  Open a regular-node panel. PASS: every checkbox in the
  Members fieldset is rendered with the `disabled`
  attribute; clicking does nothing.
- [ ] **F63** Open a Start-node panel. PASS: the header
  shows the "Create" title and close button — no
  Members fieldset (Create nodes never assign members).
- [ ] **F64** Open an End-node panel. PASS: the header
  shows the "Archive" title and close button — no
  Members fieldset.
- [ ] **F65** Open an edge panel. PASS: the header shows
  "Transition Properties" title and close button — no
  Members fieldset.
- [ ] **F66** MOOT (Phase Final). The `flow_versions` table is
  DELETED; there is nothing to inspect.
  Member assignment is captured only in the flow's own
  document-message-pair history (`message_pairs`). Confirm
  via pair fixtures or F67: a `memberIds` change is still
  undoable through that history.
- [ ] **F67** Tick one checkbox in the Members fieldset,
  then wait for the `memberIds` PUT (`SAVE_DELAY_MS`
  800 ms) before Cmd+Z (Mac) / Ctrl+Z (Win/Linux).
  PASS: the panel stays open on that node and the
  checkbox unticks — `memberIds` changes are undoable
  like name changes.

### Attribute Editor (Node Panel)

- [ ] **F68** Open F15's New State (not Capture, not
  Review, not Create/Archive): drive two compositor
  `pointerdown`s within 400 ms (there is no
  `dblclick` listener), same as F13. In the
  "Attributes" fieldset, click the "+ Add Attribute…"
  dropdown. PASS: the picker lists leftover record
  attributes (Company Name and/or Industry)
  pre-defined on the bound record-type (loaded via
  `getRecordAttributesByRecord` from the nested
  `record-types/:id/attributes` collection on the
  message plane).
  (Regression for the captured-presenter bug in the
  attribute-picker handler: this exact click used to do
  nothing because the handler closed over a presenter
  captured at init time, which had no selection.)
- [ ] **F69** Continuing from F68, select **Company Name**
  from the picker. PASS: the row "Company Name" appears
  in the list with mode (Editable / Read-only) and
  required toggles. The dropdown remains available so
  additional attributes can be added.
- [ ] **F70** Continuing from F69, click the remove ("×")
  control on the "Company Name" attribute row. PASS: the row
  disappears from the attributes list.
- [ ] **F71** Lock the flow via the designer-header Locked switch.
  Open the same New State as F68: drive two compositor
  `pointerdown`s within 400 ms (there is no `dblclick`
  listener), same as F13. Click the disabled
  "+ Add Attribute…" dropdown in the Attributes
  fieldset. PASS: nothing happens — no panel change,
  no toast, no attribute row appended (a disabled
  `<select>` does not fire `change`).
- [ ] **F72** Open the same New State as F68: drive two
  compositor `pointerdown`s within 400 ms (there is
  no `dblclick` listener), same as F13. Tick one
  Members checkbox on that New State, then click the
  "+ Add Attribute…" dropdown in the same panel. PASS:
  the dropdown remains functional and lists leftover
  record attributes (Company Name and/or Industry).
  (Regression: a `memberIds` commit
  replaces the presenter, so a click handler that
  captured a stale presenter would have acted on the
  pre-commit snapshot — this case proves the handler
  reads the current presenter at click time.)
- [ ] **F73 — Hazard severity rendering.** On a regular
  (non-start, non-complete) node, vary the member count
  and outgoing-edge count and confirm the bottom-left
  badge:
    - **0 members** → red no-entry sign (`iconNoEntry`,
      `.flow-node-danger`). Hover → tooltip
      "Members required".
    - **0 outgoing edges** (regardless of member count) →
      red no-entry sign, tooltip "Dead end (no outgoing edges)"
      when `memberIds.length > 0`.
    - **1 member AND ≥1 outgoing edge** → yellow triangle
      (`iconAlertTriangle`, `.flow-node-warning`). Hover →
      tooltip "Single member assigned (no backup)".
    - **≥2 members AND ≥1 outgoing edge** → no badge.
  Confirm the start node and the complete node never
  display a badge regardless of state.
- [ ] **F74** With the Properties panel closed,
  confirm the flow canvas fills the content area
  to the right of the global sidebar (panel-aware
  fit honors `PANEL_WIDTH_PX`). Open the panel,
  pan the canvas, then close the panel via the X.
  PASS: pan/zoom/auto-fit/panel-toggle interactions
  read the *content-area* clientWidth, not the
  full viewport — the global sidebar does not
  steal canvas space.
- [ ] **F75** Open a flow whose layout routes edges beyond the node bounding box — the seeded "Layout Test: Proposal Review Cycle" is one (its long back-edges arc above the top row and dip well below the bottom row) — with Auto Fit on. PASS: the whole graph, including the edge curves and waypoints that bow past the outermost nodes, sits inside the canvas with margin; nothing clips at any edge (the prior bug sliced the bottom routing). Then toggle Auto Fit off then on, add then delete an edge, and undo. PASS: every re-fit re-frames the full *drawn* content (curves included), never just the node rectangles — the camera measures the rendered SVG (`.flow-content` `getBBox`), not node positions.
  Serial and Parallel: open that Layout Test
  flow (do not open the garden chain).

---

## F2. Workbox

### Workbox Source Flow

- [ ] **AA-WB-SETUP** Verify Customer Onboarding is
  READY in Create Work Order — its Review node names
  Sarah Chen and Emily Rodriguez. Workbox's Create Work
  Order draws only on flows the mock seed already
  publishes; it does not depend on any AA or F case
  creating one live.
  Pin: tests/mock-flow-readiness.test.ts 'mock admin sees
       Customer Onboarding and Lead-to-Close' (decides
       Customer Onboarding is READY); exploratory — the
       live dropdown listing and the Review node's member
       names

### Workbox Inbox (`workbox/`)

- [ ] **WB1** Navigate to `workbox/`. PASS: page shows
  "Workbox" title, subtitle "Your work order inbox",
  Active/Archive tabs, and a "Create Work Order" button
  (plus icon + label; mobile short label "Create").
  Pin: exploratory — the live page chrome; the shell text
       carries no CLI or browser test
- [ ] **WB2** With no work orders, the Active tab shows
  an empty state with mail icon and "No Active Work
  Orders Yet" message. The mock seed has active work
  orders, so verify against an org with none, or by
  component source.
  Pin: tests/workbox-inbox.test.ts 'buildInboxItems
       returns an empty array in active mode with no work
       orders' (decides the data is empty; the rendered
       empty-state copy itself, `emptyStateFor` in
       web-app/workbox/index.ts, carries no test);
       exploratory — the live empty-state render
- [ ] **WB3** Click the Archive tab. PASS: tab switches
  to show the archive list — the mock seed carries
  ≥ 129 completed work orders (of ≥ 145 seeded total:
  `buildWorkOrders()` seeds Customer Onboarding and
  Layout Test work orders, and `buildLeadToCloseWorkload()`
  — a second, easily-missed source — seeds 100 more for
  Lead-to-Close; all 145 are stamped into Stark and the
  inbox is org-scoped, so all land in this one list).
  Pin: exploratory — the live tab switch and list render;
       the seeded completed count (129 of 145: Customer
       Onboarding 33/39, Layout Test 5/6, Lead-to-Close
       91/100 — computed from `buildWorkOrders()` +
       `buildLeadToCloseWorkload()` and each work order's
       own embedded `flow_graph`'s `isArchive` node, the
       same test `curNode.isArchive` in web-app/app/
       presenters/workbox-inbox.ts applies live) carries
       no CLI test pinning these numbers

### Workbox — Create Work Order

- [ ] **WB4** Click "+ Create Work Order". PASS: a
  dropdown opens with up to two labeled sections — READY
  (clickable rows, one per publishable flow) includes at
  least Customer Onboarding and Lead-to-Close. It may
  hold more by now: E7, earlier in this walk,
  unconditionally creates a flow whose bare start+complete
  graph has zero non-exempt nodes, so
  `validateFlowForCreation` reports it `ready` with zero
  problems — a live third READY row — and F's own Flow
  Designer edits may add further flows still. NOT READY
  includes Fusion Angle Flow and Layout Test: Proposal
  Review Cycle — disabled rows for any flow with
  zero-member or dead-end nodes, each carrying a red
  no-entry icon and a subtitle "1 node needs attention"
  or "N nodes need attention". Their exact problem counts
  (16 and 15 in the untouched seed) may also have drifted:
  F's Flow Designer cases (F19, F32–F39) edit Layout
  Test's own graph earlier in this walk. Hover a NOT
  READY row. PASS: cursor stays default (no `pointer`),
  `aria-disabled="true"` is present, no `data-flow-id`
  attribute.
  Pin: tests/mock-flow-readiness.test.ts 'mock admin sees
       Customer Onboarding and Lead-to-Close' (decides the
       untouched seed's exact READY pair and NOT READY
       problem counts — a fact about the seed alone, not
       a live guarantee once E7 and F have run);
       exploratory — the live dropdown's exact contents
       by the time F2 is reached, the NOT-READY subtitle
       text and its node-count wording (the adapter test
       pins `problemCount`; whether the page glue's
       subtitle string reflects that exact number live is
       unverified by any test), `aria-disabled="true"`,
       the no-entry icon, and the hover cursor
- [ ] **WB4a** Click a `NOT READY` row. PASS: nothing
  happens — the dropdown stays open, no navigation occurs
  (the click handler ignores rows without
  `data-flow-id`).
  Pin: exploratory — the live no-op click; the handler's
       `data-flow-id` guard carries no CLI or browser
       test
- [ ] **WB5** Click Customer Onboarding from the READY
  section. PASS: work order is created, browser navigates
  to the action screen at the first post-start state
  ("Data Capture"). Display ID (8-char hex) is visible in
  the header.
  Pin: tests/adapters-work-orders.test.ts
       'postWorkOrderCreation seeds work order, flow
       link, and three state events in one call' (decides
       creation lands the work order at the flow's
       post-start node, not the Create node itself);
       exploratory — the live click, navigation, and
       Display ID render
- [ ] **WB5a** Click the Data Capture → Review `submit`
  edge to select it, then click the Delete (trash)
  toolbar button — F28's own gesture. Reload Workbox and
  open Create Work Order. PASS: the subject sits in
  `NOT READY` with subtitle "1 node needs attention".
  Restore the edge the same way (or via Undo), reload.
  PASS: the subject returns to `READY`.
  Pin: tests/adapters-flow-publish.test.ts
       'validateFlowForCreation flags dead_end on a
       non-End node with zero outgoing edges' (decides
       the dead-end detection this edge removal
       exercises); exploratory — the live edge-select +
       delete gesture and the reload/dropdown re-check
- [ ] **WB5b — Server-side gate.** No manual browser
  verification is needed — the production IIFE bundle
  does not expose `postWorkOrderCreation` on the console,
  so a DevTools-driven check is not available against the
  deployed build. This case PASSES by virtue of automated
  coverage alone.
  Pin: tests/adapters-flow-publish.test.ts
       'validateFlowForCreation reports ready when every
       regular node has a member and an outgoing edge';
       tests/adapters-flow-publish.test.ts
       'getFlowsForCreation partitions ready and notReady
       flows'

### Workbox — Action Screen (`workbox/detail.html`)

- [ ] **WB6** The action screen shows: back button
  (icon-only), flow name, display ID, current state
  badge, and dynamically rendered attributes matching the
  current node's attribute references from the flow
  graph.
  Pin: tests/presenter-workbox-detail.test.ts
       'WorkboxDetailPresenter exposes id, display id,
       and flow name from the work order';
       tests/presenter-workbox-detail.test.ts
       'renderableAttributes are the current node refs
       and buildPage renders a labeled input per required
       attribute with a marker'; exploratory — the live
       back button and state badge
- [ ] **WB7** Attribute types render correctly: text
  inputs, selects, number inputs, date inputs,
  checkboxes, and radio buttons as appropriate for each
  attribute type in the flow definition.
  Pin: tests/presenter-workbox-detail.test.ts
       'buildAttributeInputHtml renders a text input
       carrying the attribute id'; tests/presenter-
       workbox-detail.test.ts 'buildAttributeInputHtml
       renders a number input for the number attribute
       type'; tests/presenter-workbox-detail.test.ts
       'buildAttributeInputHtml renders a date input for
       the date attribute type'; tests/presenter-workbox-
       detail.test.ts 'buildAttributeInputHtml renders a
       select with one option per choice plus a
       placeholder'; tests/presenter-workbox-detail.test.ts
       'buildAttributeInputHtml renders a radio group
       with one collectable input per option';
       tests/presenter-workbox-detail.test.ts
       'buildAttributeInputHtml renders a bare checkbox
       input for the checkbox type'
- [ ] **WB8** Transition buttons appear below the
  attributes, one per outgoing edge from the current
  node, labeled with the edge name.
  Pin: tests/presenter-workbox-detail.test.ts 'buildPage
       renders one transition button per outgoing edge
       and a release button when the work order is not
       complete'
- [ ] **WB9** A "Release Work Order" button is visible,
  separate from transition buttons.
  Pin: tests/presenter-workbox-detail.test.ts 'buildPage
       renders one transition button per outgoing edge
       and a release button when the work order is not
       complete' (the same test decides both)
- [ ] **WB10** A collapsible History section shows all
  transitions with from/to state names, user name, and
  relative timestamp.
  Pin: tests/presenter-workbox-detail.test.ts 'buildPage
       shows a single Created -> Triage history row for a
       freshly created work order'; tests/presenter-
       workbox-detail.test.ts 'buildPage history lists
       transitions newest first with their attribute
       values'; exploratory — the collapsible interaction
       and the relative-timestamp formatting live
- [ ] **WB10a — Bind picker on an unbound WO.** Open an
  unbound work order on a flow that has a record-type
  join and at least one instance. PASS: header shows an
  Unbound badge; a "Bind instance" button is visible;
  clicking it opens the bind-instance dialog listing
  instances for the flow's record type (rows use
  `data-instance-pick`, never `data-attribute-id`);
  picking an instance PUTs `work-orders/:id/binding`
  (201), the dialog closes, and the screen re-presents
  with a bound Instance badge and pre-filled values from
  the instance head.
  Pin: tests/presenter-workbox-detail.test.ts 'buildPage
       unbound disables fields, shows bind prompt and
       picker button'; tests/presenter-workbox-detail.test.ts
       'buildPage pre-fills inputs from instance values
       and shows a bound badge'; tests/api-work-order-
       binding.test.ts 'fresh bind → 201; detail + list
       embed; unbound omits keys'; exploratory — the live
       dialog open/close and the click-to-pick gesture
- [ ] **WB10b — Disabled fields + bind prompt.** On an
  unbound work order with current-node attribute refs.
  PASS: every attribute input is disabled/readonly with
  title "Bind an instance before editing values"; the
  bind button from WB10a is the path to enable editing.
  Pin: tests/presenter-workbox-detail.test.ts
       'buildAttributeInputHtml force-disables with bind
       prompt title when unbound'; tests/presenter-
       workbox-detail.test.ts 'buildPage unbound disables
       fields, shows bind prompt and picker button'

### Workbox — Transitions

- [ ] **WB11** Bind an instance, fill Company Name and
  Contact Email, click `submit` → Review. PASS: transition
  POSTs `work-orders/:id/transition` (201), work order
  moves to the next state, browser navigates back to the
  inbox. The work order appears in the Active tab
  (unclaimed).
  Pin: tests/api-work-order-transition-instance.test.ts
       'value-bearing fresh If-Match → 204; head advances'
       (its own assertion checks `res.status === 201`,
       despite the test's stale name); exploratory — the
       live form fill and the navigation back to the inbox
- [ ] **WB16** Read the network log across WB11's bind
  and transition (never `js()` fetch — the bearer is
  memory-only, per the explorer prompt). PASS: the
  binding PUT lands at `work-orders/:id/binding` with
  `{instance_id, record_type_id}` (201); the transition
  POST is `work-orders/:id/transition` (201) whose body
  is the **instance shape** (`targetState`, `instance_id`,
  `record_type_id`, `set`/`clear` delta, `release`,
  `transitionAt` — no `fieldValues` bag) and carries a
  strong `If-Match` against the instance etag; a pure move
  omits `set`/`clear`/`instance_id`/`record_type_id` and
  sends no `If-Match`; a sibling instance revision pair
  advances the head when the transition was value-bearing.
  Derived WO history is `(at, id)` DESC (index 0 =
  current) with one non-claim event per transition
  (`entity_id` = work-order id, `state` = target node id,
  `member_id` = actor, `at` = RFC-3339 Zulu). Live form
  values come from the instance head, not a history fold.
  Pin: tests/api-work-order-binding.test.ts 'fresh bind →
       201; detail + list embed; unbound omits keys';
       tests/api-work-order-transition-instance.test.ts
       'value-bearing fresh If-Match → 204; head advances'
       (its own assertion checks
       `instancePairCount === before + 1` — decides the
       sibling revision pair advancing the head);
       tests/api-work-order-transition-instance.test.ts
       'pure move WITH If-Match → 400' (decides a pure
       move sending an If-Match is rejected, so a
       succeeding one sent none);
       tests/api-work-order-transition-instance.test.ts
       'pure move carrying instance_id → 400';
       tests/api-work-order-transition-instance.test.ts
       'pure move carrying record_type_id → 400' (both
       decide a pure move must omit them);
       tests/api-work-order-history.test.ts 'GET
       organizations/:id/work-orders/:id/history returns
       200 DESC rows; row[0] is current; transition
       carries field_values; claim rows carry []';
       exploratory — the live network-log read itself
- [ ] **WB12** Click the work order row in the Active
  tab. PASS: work order PUTs `work-orders/:id/claim`
  (201) and the browser navigates to the action screen
  showing the new state's attributes.
  Pin: tests/api-work-order-claim.test.ts 'a fresh claim
       appends one claimed event'; exploratory — the live
       navigation and rendered attributes
- [ ] **WB13** Click "Release Work Order". PASS: a single
  click DELETEs `work-orders/:id/claim` (204),
  soft-releases the active claim, and the browser
  navigates to the inbox, where the work order reappears
  in the Active tab.
  Pin: tests/api-work-order-release.test.ts 'release of a
       live claim is 204 and the claim history shows
       claim_released'; exploratory — the live navigation
       back to the inbox and the reappearance in Active
- [ ] **WB13a — Claim → unclaim → reclaim.** From the
  Active tab, click the same work order again (claim).
  PASS: action screen opens under the caller's claim.
  Click "Release Work Order" (unclaim via DELETE claim).
  PASS: back on the Active tab unclaimed. Click the row a
  third time (reclaim). PASS: claim succeeds again; the
  message plane carries the sequence
  `claimed` → `claim_released` → `claimed` under the
  `(at, id)` order for this work order's `entity_id`
  (inspect via `GET work-orders/:id/history` or the
  matching operation message pairs).
  Pin: tests/api-work-order-claim.test.ts 'a released
       claim allows a fresh claim' (decides exactly this
       claim→release→reclaim sequence and its event
       ordering); exploratory — the live three-click UI
       sequence
- [ ] **WB19** Subject: the bound Active WO from
  WB11–WB13 (still Active; WB14 archives it). Skipping
  because "WO already archived" is FAIL. After
  transitioning a work order through at least two states,
  read the derived history (`GET work-orders/:id/history`
  or the matching pairs in `message_pairs`) for this work
  order's id. PASS: rows are `(at, id)` DESC (index 0 =
  current); each non-claim event has the immutable shape
  `{id, entity_id, state, member_id, at, field_values}`,
  with `state` carrying the target node's identifier.
  Live values live on the instance head; history
  `field_values` may be empty for new-shape transitions.
  Pin: tests/api-work-order-history.test.ts 'GET
       organizations/:id/work-orders/:id/history returns
       200 DESC rows; row[0] is current; transition
       carries field_values; claim rows carry []';
       tests/derive-work-order-lifecycle-for.test.ts
       'workOrderHistoryFor: folds field_values onto
       transition events, [] on claim/birth/release, DESC
       current-first'; exploratory — that no app code path
       ever mutates an existing pair (an architectural
       invariant, not a single assertion)
- [ ] **WB19a — Two-tab 412 on the action screen.**
  Subject: the same bound Active WO from WB11–WB13;
  skipping because "WO already archived" is FAIL. Bind a
  work order to an instance. Open the action screen in
  two tabs. In tab 2, change an instance value via the
  records detail instance editor (or a second transition)
  so the head etag advances. In tab 1, edit a value and
  transition. PASS: tab 1 receives 412, re-GETs the
  instance, re-presents the action screen with a conflict
  notice and a warning toast ("This instance changed
  underneath you — values refreshed; re-apply your
  edit"), and does **not** auto-retry the transition.
  Pin: tests/api-work-order-transition-instance.test.ts
       'value-bearing stale If-Match → 412' (decides the
       server 412 when a transition's held etag is
       stale); exploratory — the live re-GET, the
       conflict notice, and the absence of auto-retry (no
       CLI or browser test exercises workbox/detail.ts's
       client-side 412 recovery; `WorkboxDetailPresenter`'s
       `conflictNotice` rendering carries no test either)
- [ ] **WB19b — Direct instance PATCH vs transition 412
  convergence.** Subject: the same bound Active WO from
  WB11–WB13; skipping because "WO already archived" is
  FAIL. With a bound WO open on the action screen, PATCH
  the same instance from the record detail UI (save) so
  the head advances; then attempt a value-bearing
  transition on the stale action screen. PASS: same 412
  recovery shape as WB19a. Conversely, after a successful
  **value-bearing** transition (set/clear + If-Match —
  Review fills Reviewer Notes), a stale instance Save on
  record detail 412s and recovers — drive the converse as
  a plain instance Save from record detail, never as a WO
  transition: Review has two outgoing edges, and its
  `approve` edge archives the WO — exactly the transition
  WB14 still needs to drive later (value-bearing, with
  Reviewer Notes), so do not pre-empt it here. A
  **pure move** (no set/clear, no If-Match) does not
  advance the instance etag; a Save with the held etag is
  201, not a FAIL.
  Pin: tests/adapters-work-orders.test.ts
       'postWorkOrderTransition 412s when the snapshot
       etag is stale against a concurrent PATCH' (decides
       the forward direction: an instance PATCH advances
       the etag, so a stale-etag transition afterward
       412s); tests/api-work-order-transition-instance.test.ts
       'value-bearing transition then stale instance
       PATCH is 412' (the converse direction);
       tests/api-work-order-transition-instance.test.ts
       'pure move does not advance instance etag; held
       If-Match PATCH is 201'; tests/presenter-record-
       instances.test.ts 'edit form surfaces 412 conflict
       notice' (record detail's own conflict-notice
       render); exploratory — the live re-present and
       warning toast on the workbox action screen
       specifically

### Workbox — Completion

- [ ] **WB14** Transition a work order to the completion
  (Archive) node (its `isArchive` is true) — on Review
  fill Reviewer Notes and click `approve`. PASS: work
  order moves to the Archive tab. It no longer appears in
  Active.
  Pin: tests/workbox-inbox.test.ts 'buildInboxItems shows
       a finished work order in archived mode and hides
       it from active'; exploratory — the live transition
       and tab move
- [ ] **WB15** Click a completed work order in the
  Archive tab. PASS: action screen shows read-only view
  with history but no attributes or transition buttons.
  Pin: tests/presenter-workbox-detail.test.ts 'buildPage
       on a complete work order hides the attributes
       card, transition buttons, and release button';
       exploratory — the live read-only render

### Workbox — Data Integrity

- [ ] **WB17** Navigate away from the action screen and
  return. PASS: all data persists correctly across page
  navigation.
  Pin: exploratory — page-navigation data persistence has
       no CLI or browser test

### Workbox — Concurrency & Integrity

- [ ] **WB18** Open the same unclaimed work order in two
  browser tabs. In tab 1, click the row to claim it. In
  tab 2, attempt the same. PASS: tab 2 either navigates to
  a read-only/already-claimed view or the claim is
  rejected — and the message plane carries at most one
  live `'claimed'` event for this work order's `entity_id`
  under the `(at, id)` reduction (a stale prior claim is
  superseded by a `'claim_expired'` event, never
  overwritten in place). Inspect via `message_pairs` or
  derived `GET work-orders/:id/history` (DESC; claim rows
  carry `field_values: []`).
  Pin: tests/api-work-order-claim.test.ts 'a live claim by
       another member is a 409'; tests/api-work-order-
       claim.test.ts 'two-actor contention: exactly one
       claimed event lands and exactly one request gets
       the byte-exact 409 body — never which actor wins';
       tests/api-work-order-claim.test.ts 'an expired
       claim is superseded atomically' (the general
       never-overwritten-in-place invariant, though this
       specific live two-tab drive is unlikely to trigger
       an actual expiry); exploratory — tab 2's rendered
       read-only/already-claimed view specifically

### Workbox — All-See-All Visibility

Every authenticated user sees every active and archived
work order regardless of node assignment. There is no
per-user visibility filter.

- [ ] **WB20** As the demo user, navigate to `workbox/`.
  Active tab. PASS: every active (non-completed) work
  order is listed, claimed or not — a claim does not hide
  the row; the row names its claimant (`claimedByName`
  badge). Listed regardless of the current node's
  `memberIds` — including nodes assigned only to AI
  members and nodes with zero members (which carry the
  danger badge in the designer but are still visible in
  the inbox).
  Pin: tests/workbox-inbox.test.ts 'buildInboxItems
       surfaces a claimed, unfinished work order as an
       active item naming its claimant'; tests/workbox-
       inbox.test.ts 'buildInboxItems surfaces an
       unclaimed, in-progress work order as an active
       item'; exploratory — the live rendering for
       AI-only-member and zero-member nodes specifically
       (no fixture in tests/workbox-inbox.test.ts uses
       either)
- [ ] **WB21** Switch to the Archive tab. PASS: every
  completed work order is listed regardless of which
  member(s) the final transition referenced.
  Pin: tests/workbox-inbox.test.ts 'buildInboxItems shows
       a finished work order in archived mode and hides
       it from active'; exploratory — that the member(s)
       the final transition referenced do not affect
       Archive-tab visibility (no fixture varies this)
- [ ] **WB22** Inspect `web-app/app/presenters/workbox-
  inbox.ts`. PASS: `buildInboxItems` takes
  `(workOrders, transitions, claims, memberMap, mode)`
  with no scope parameter. The presenter exports nothing
  related to per-user visibility — the workbox shows all
  work orders to all users by construction.
  Pin: exploratory — confirmed directly by reading
       `buildInboxItems`'s exported signature (five
       parameters, no scope parameter); a function
       signature is not something a `node:test` assertion
       decides

---

## FS. Flow Statistics

**Mock-data blast radius:** the mock seed adds ~38 work
orders to "Customer Onboarding" and ~6 to a second flow,
plus their flow-work-order join rows and transition
chains — Workbox cases (WB1–WB22) and dashboard counts
elsewhere in the walk are lower bounds, not equalities,
because of this.

Hover/click on SVG `<g>` is compositor-mouse
driveable on this page (no pointer-capture
FSM, unlike `flows/detail`).

### Flow Statistics Page (`flows/stats.html`)

- [ ] **FS1** From `flows/index`, click a flow card's chart
  icon → lands on `flows/stats.html?flowId=<id>`. The page
  renders the heat-tinted SVG canvas, a path stepper, and a
  legend gradient bar. No left toolbar, no slide-in props
  panel, no connection ports, no marquee. The cursor over a
  node is `pointer` (clicking is allowed); no port-drag
  affordance appears.
  Pin: tests/navigation.test.ts 'buildPageUrl appends
       flowId param for flow-stats';
       tests/presenter-flow-stats.test.ts 'emits an
       svg with role=img and no editor affordances';
       tests/presenter-flow-stats.test.ts 'buildLegend:
       structure, end labels, no linear-gradient';
       tests/presenter-flow-stats.test.ts
       'buildStepperBar idx 0: path label, 75%, prev
       disabled'; exploratory — the left toolbar,
       props panel, and marquee absent from the page
       shell, and the pointer cursor over a node
- [ ] **FS2** From `flows/detail`, click the Stats button in
  the header → same stats page. The "Designer" / back button
  returns to `flows/detail.html?flowId=<id>` (and preserves
  `projectId` if set).
  Pin: exploratory — the live Stats/back navigation
       and the preserved `projectId`
- [ ] **FS3** Node tints span the ramp on the flagship flow
  ("Customer Onboarding"): Data Capture is yellow/red (hot),
  Review is warm, Create/Archive carry the cool (or no-data)
  tint. Node faces show the em-dash on Create and Archive and
  a value like `8.5m` / `2.1d` on regular nodes.
  Pin: tests/presenter-flow-stats.test.ts 'each node
       carries style="--heat-t:..." and no data-heat';
       tests/presenter-flow-stats.test.ts 'regular
       nodes show avg-sojourn face; special nodes show
       —'; exploratory — the painted color ramp
       (yellow/red hot, warm, cool/no-data)
- [ ] **FS4** Hover a node → a read-only stat card pops near
  it with: % of flow time, avg/median/p90 durations, visits /
  distinct WOs / Here now, ~N/wk throughput, loop-back rate, clan
  size + active producers, top producer (name + % of clan avg
  + % of node's work, with "(not in current clan)" iff
  applicable). For a branch node, `next` shows the per-edge
  split. The card has NO inputs and NO Save button.
  Mouse-out → card hides. Review's card subtitle names
  the two reviewers.
  Pin: tests/presenter-flow-stats.test.ts 'rich card
       renders all stat blocks for a regular node';
       tests/presenter-flow-stats.test.ts 'top producer
       not in clan is flagged'; exploratory — the live
       hover/mouse-out interaction, and the card's lack
       of inputs and a Save button
- [ ] **FS5** Click a node → the card pins (stays open on
  mouse-out). Click empty canvas → unpins. Click another
  node → re-pins to it.
  Pin: exploratory — the live click-to-pin,
       click-to-unpin, and re-pin interactions
- [ ] **FS6 — Hazard severity rendering on the stats
  canvas.** The stats renderer reads `n.memberHazard`
  emitted by `flow-stats-aggregate.ts`: `danger` for a
  zero-member node or a dead end (no outgoing edges,
  which takes precedence over a bare headcount),
  `warning` for exactly one member with an outgoing
  edge, and no badge for two or more members or for a
  Create/Archive node. On "Customer Onboarding" in the
  mock seed, Data Capture and Review each carry two
  members with an outgoing edge. Confirm: none of the
  four nodes (Create, Data Capture, Review, Archive)
  shows a hazard triangle. Zero-member danger, dead-end
  danger, and single-member warning are the CLI
  covenants in `tests/flow-stats-aggregate.test.ts` and
  `tests/flow-graph-hazard.test.ts`; this flow does not
  exhibit those shapes, and that is not a FAIL.
  Pin: tests/flow-stats-aggregate.test.ts 'memberHazard
       is danger on zero-member regular nodes (per
       shouldShowMemberHazard)';
       tests/flow-stats-aggregate.test.ts 'memberHazard
       is warning on single-member regular nodes with
       outgoing edges';
       tests/flow-stats-aggregate.test.ts 'memberHazard
       is null on multi-member regular nodes with
       outgoing edges';
       tests/flow-graph-hazard.test.ts 'one member with
       no outgoing edges (dead-end) renders danger
       (precedence over warning)';
       tests/flow-graph-hazard.test.ts 'a start node
       never renders hazard regardless of member count';
       tests/flow-graph-hazard.test.ts 'a complete node
       never renders hazard regardless of member count';
       tests/presenter-flow-stats.test.ts 'warning
       hazard glyph appears when memberHazard is
       warning';
       tests/presenter-flow-stats.test.ts 'danger
       hazard glyph appears when memberHazard is
       danger'; exploratory — the absence of any
       triangle glyph on the four painted nodes
- [ ] **FS7** On the flagship flow ("Customer Onboarding"),
  the path stepper reads `Path 1 of M · X% of N work
  orders` with prev/next controls. Clicking next advances;
  the selected path's nodes + edges get an accent stroke and
  off-path elements dim to ~30% opacity. The highlight does
  NOT pulse or animate (deliberately distinct from the
  editor's selection glow). At the last visible path, next is
  disabled (or, if there's a rest bucket, advances to
  "+N rarer paths, combined Z%" which highlights nothing).
  Pin: tests/presenter-flow-stats.test.ts
       'buildStepperBar idx 0: path label, 75%, prev
       disabled'; tests/presenter-flow-stats.test.ts
       'buildStepperBar idx 1: prev not disabled';
       tests/presenter-flow-stats.test.ts
       'buildStepperBar idx 2: rest entry, next
       disabled'; tests/presenter-flow-stats.test.ts
       'highlight set marks on-path and dims off-path
       nodes/edges'; tests/presenter-flow-stats.test.ts
       'emits an svg with role=img and no editor
       affordances'; exploratory — the live click
       advancing the stepper, the accent stroke's
       painted appearance, and the dimmed opacity's
       painted value
- [ ] **FS8** Dark-mode toggle persists across navigation to
  the stats page; the heat tints and the card remain legible
  in both themes. The face number text contrasts adequately
  at all heat levels.
  Pin: exploratory — the painted contrast of tints
       and card text in both themes, and that the
       theme choice itself persists across
       navigation to the stats page; a similarly-
       named existing test does not decide the
       persistence — it stubs `matchMedia` to
       `matches: true` and never distinguishes the
       theme module's own `'system'`-default
       fallback (which independently computes
       'dark' from that same stub) from an actual
       hydration of the stored value, so it stays
       green even with hydration deleted entirely
- [ ] **FS9** Data-shape regression: heat fractions sum to
  ~100% across non-special nodes on the flagship flow. WIP
  counts in the card match the WOs currently sitting in each
  node (cross-check against the Workbox). Direct navigation
  to `flows/stats.html` with no `flowId` redirects to
  `flows/index.html`.
  Pin: tests/flow-stats-aggregate.test.ts 'attributes
       sojourns and computes heatPct + heatT';
       exploratory — the cross-check of the card's
       WIP count against the Workbox, and the redirect
       when `flowId` is absent

---

## G. Admin Pages

tenant: required
parallel: yes
global_lock: none
depends: A

Parallel reveal extras: `org2_*`,
`unseated_*`, `member_*`, `erasable_*`,
`invitee_*` (`r-member@test-plan.example`
password for V5).

### Organization (`organization/index.html`)

- [ ] **G9** Navigate to `organization/index.html`. PASS:
  page wears the standard sidebar + top-bar layout. Shows
  the page header "Organization" with an Edit button, then
  an Overview card holding the org identity (read-only
  Organization Name and Domain) above a four-cell stat grid
  (Active People, Projects, Ideas, Next Billing — no health
  badge), then the Objectives box, then the Usage Overview
  card with progress bars. There is no separate General
  Information card — the read-only Name/Domain live in the
  Overview card and Edit lives in the page header — and no
  longer a Security & Administration card; Members and
  Billing are reached from the sidebar. (Overview/usage
  values are placeholders — verify the page renders
  without error; numeric accuracy arrives when wired to
  live tables.)
- [ ] **G10** In the page header, click Edit.
  PASS: page header swaps Edit for Save/Cancel; the
  Overview card's identity region switches the read-only
  Name/Domain to two inputs prefilled with the current
  Organization Name and Domain.
  (There is no health score — the retired 92/"excellent"
  badge has been removed.)
  V8 (Sent invitations + Revoke) and V9 (admin-only)
  run in the invitation walk after V5, beside V7.

### Members list (`members/index.html`)

> **Session role.** G11–G14 and V* Invite cases run as
> an **org admin** (Tony Stark after mock seed). The
> Members list fills names via `fillHumanMemberPii` —
> nested `GET identities/:id/pii` (self or admin). A
> non-admin Ideas list must paint without
> `GET /identities` or `GET /identity-pii`
> (`getMemberMap` is seats + `/ai-agents`; a missing
> name may read `MEMBER_WITHOUT_PII_NAME`). Invite
> **grant** stays admin-gated in `grantInvitation`.

- [ ] **G11** Navigate to `members/index.html` (reachable
  via the "Members" sidebar entry). PASS: page header reads
  "Members" with a static subtitle "Manage humans and AIs
  in your organization" (no count display — header text is
  static, populated counts live in the sidebar header and
  the table grouping). A `+ Add Member` button
  on the right opens the kind-picker dialog. Below the
  header sit a search input and three filter chips (All /
  Humans / AIs, with All pressed by default). The list
  table groups members under YOU (the signed-in human),
  then HUMANS, then AIs, each group showing avatar/name,
  title (humans) or the model name (AIs), and department
  (humans only). The YOU group is a third header, not a
  row inside HUMANS.
- [ ] **G12** Click the sidebar member chip (lower-left:
  name/avatar in the sidebar footer). PASS: navigates to
  the current human member's `member-detail` page
  (`?memberId=<id>`). (The old header greeting that also
  linked to the profile has been removed — the sidebar
  member chip is now the only "click → profile"
  affordance. Source: `web-app/app/sidebar-member.ts`.)
- [ ] **G13** Type in the search input. PASS: filters the
  list in real-time — human members match on name, email,
  title, or department; AI members match on name or
  description (not provider/model). Click the Humans
  filter chip. PASS: only the HUMANS group is visible.
  Click AIs. PASS: only the AIs group is visible. Click
  All. PASS: both groups return.
- [ ] **G43** Navigate to `identities/index.html` (or click "Identities" in the sidebar). PASS: the header reads "Identities" with an "Add Identity" button (`#add-identity-btn`); `#identity-list` renders one `.card[data-identity-id]` per identity — a person row shows an initials avatar + name + email sub-line + a "Person" badge; a service row shows a shield avatar plus "Service account" + "—" (agents are not identities), then a "Service" badge. Serial (A3 `--mock-data`, demo admin's active organization Stark): the nested PII fence (viaMembership, need-to-know) hides the five org-2-only persons: the list renders 6 named person rows (Emily Rodriguez, Sarah Chen, Lisa Wang, Marcus Johnson, Tony Stark, Jessica Park), 5 "Identity without PII" person rows (the org-2-only members: David Martinez, Alex Kim, Mike Thompson, David Kim, James), and 1 service row (the system service identity). Parallel (A3 `--test-plan-slices`): `identities/` is global (`organizationNested: false`) and the seed is one DB for all 14 slices, so the hunter sees bootstrap current + the system service identity + every slice admin + the B/G/SV extras — not a five-name closed G roster. `getIdentityRoster` GETs identities only — the G extras AI agent is `ai-agents/:id`, not an identity row, so no agent appears on the list. Named G people: G admin, `G Member`, `G Unseated`, plus the system service identity; other-slice people often render as "Identity without PII" (PII 403). An empty roster renders "No identities yet." Source: `web-app/identities/index.ts`, `web-app/app/presenters/identity-list.ts` (`IdentityRosterPresenter`).
- [ ] **G14** Return to `members/index.html` (G43 left
  the hunter on Identities). Click `+ Add Member`. PASS:
  dialog opens with the Kind toggle defaulting to Human,
  the Human form visible, and the AI form hidden. Switch
  the toggle to AI. PASS: the Human form hides, the AI
  form appears
  with a Model pulldown and a Skill Focus textarea; no
  Auth Token field or security warning. Create Human
  writes `PUT /identities/:id` plus PII and `PUT`s a
  seat at the active organization so the person appears
  in the seat-derived roster. "Invite member" (V1) still
  grants a pending invitation for an EXISTING identity.
- [ ] **G14a** With Kind=AI selected, leave the Model
  pulldown on its placeholder and click Create. PASS: a
  toast "Model is required" fires and no POST happens.
  Pick a Model, fill the other AI fields, click Create.
  PASS: toast confirms and the AI is written as a
  message-plane AI agent document (`PUT /ai-agents/:id`);
  it appears in the AIs group (agents are global, not
  seated).

### Membership invitations (V) — Members "Invite member"

> "Add Member" seats a new person at the active
> organization (AA5/G14). Invite is the path that seats
> an EXISTING identity in this org. An admin invites by
> email → a pending invitation; the invitee reads it on
> `invitations/` (reached via the top-bar bell) and Accepts
> (writes a seat in the invitation's org) or
> Declines; an admin can Revoke an outstanding one from the
> Organization page. DEFERRED: email delivery (see
> `TODO.md`).
> Sources:
> `web-app/members/index.ts` (`handleInviteSubmit`),
> `web-app/app/adapters/invitations.ts`,
> `api/invitations-domain.ts` (`grantInvitation` /
> `acceptInvitation` / `declineInvitation`
> / `revokeInvitation`), `web-app/invitations/`,
> `web-app/app/invitations-indicator.ts`.

- [ ] **V1 — Invite by email grants a pending invitation** On
  `members/index.html` as an org admin, click `+ Invite member` (`#invite-
  member-btn`, mail icon). Serial: Tony Stark on Stark
  Industries after A3 mock-data. Parallel: this hunter's
  G admin. PASS: the `invite-member` dialog
  opens with a single Email input (`#invite-email`), helper
  text "Invite an existing person to this organization", a
  Cancel and a "Send invitation" submit (`#invite-member-
  submit`). Enter the email of an EXISTING identity who is NOT
  yet a member of the inviting org. This grant is invitation
  A. Serial: `david.martinez@company.com` (Wayne-only).
  Parallel: `g-unseated@test-plan.example`.
  Click "Send invitation". PASS: an "Invitation sent" toast
  fires, the dialog closes, and the email field is cleared.
  The grant is idempotent — sending the same email again while
  still pending returns the same pending invitation (no
  duplicate, no error). Source: `handleInviteSubmit`,
  `postInvitationGrant`, `grantInvitation`.
- [ ] **V2 — Invite rejects empty / unknown / already-member**
  Open the Invite dialog. Submit with the Email blank → an
  "Email is required" toast and no POST. Submit an email that
  matches NO identity → an inline email-field error "No
  identity found for that email." (the adapter maps the 404 to
  a 'no-identity' outcome — no toast). Submit the email of
  someone ALREADY a member of the active org → an inline
  email-field error "Already a member of this organization."
  (the 409 maps to an 'already-member' outcome). The "Failed
  to invite: …" toast fires only on an unexpected server fault.
  In all three the dialog stays usable and no pending
  invitation is created. Leftover: does not consume
  invitation A (V1). Source: `setInviteEmailError` in
  `web-app/members/index.ts`; `grantInvitation` guards in
  `api/invitations-domain.ts`.
- [ ] **V6 — Org fence: a pending invite is invisible until
  accepted** While the V1 invitation is still PENDING (before
  V4), confirm the org fence holds: the invitee is NOT in the
  inviting org's Members roster (the roster derives from
  seats, and no seat exists yet), and the
  inviting org is NOT reachable by the invitee — it does not
  appear in their sidebar org `<select>` and boot will not
  scope a token to it (a pending invitation grants no
  seat). Do not Accept — V4 owns the accepted half.
  PASS: pending ⇒ not in roster, not reachable. Source:
  the org fence (`resolveOwningOrganization` via
  `writeAuthorizerFor`), `acceptInvitation`.
- [ ] **V3 — Top-bar pending-invitations bell → invitations
  page** As an identity with ≥1 pending invitation (the V1
  invitee, signed in), confirm the top bar shows a bell
  (`#invitations-bell`) with a count badge (`#invitations-
  badge`) equal to the number of pending invitations. PASS:
  the bell is VISIBLE only when pending ≥ 1 — an identity with
  zero pending invitations shows NO bell (the host carries
  `hidden`; it is never an empty bell). Click the bell. PASS:
  navigates to `invitations/index.html`. The read is identity-
  scoped (the invitation facade fences by the verified caller),
  so the bell works even for a member with no admin role.
  Source: `web-app/app/invitations-indicator.ts`
  (`mutateInvitationsBell`), `component-top-bar.html`.
  The wire path is `identities/:id/invitations/`
  (never a root `/api/invitations`).
- [ ] **V4 — Accept writes a seat; invitee becomes
  multi-org** On `invitations/index.html` (page header
  "Invitations", subtitle "Organizations inviting you to
  join"), confirm `#invitations-list` shows one card per
  PENDING invitation — org name, an "Invited by {name} ·
  {date}" sub-line, a state badge, and Accept / Decline
  buttons. Click Accept on the V1 invitation. PASS: an
  "Invitation accepted" toast fires and the row leaves the
  pending list. A REAL seat is now written in the
  INVITATION's org (the invitation's org), so the invitee becomes multi-org:
  reload any sidebar-layout page and the sidebar footer now
  shows the org `<select>` (G36) listing both their original
  org and Stark. Accept is idempotent — a re-accept is a 204
  no-op, no duplicate seat.
  Parallel (A3 `--test-plan-slices`): the V1 invitee
  `g-unseated` holds no prior seat, so after Accept `GET
  identities/:id/organizations/` lists ONE org and the
  sidebar footer shows it as plain text with no `<select>`
  (G36 needs two); multi-org is exercised by V7's invitee
  half (G Member accepts Wayne → both listed). Serial
  stands as written. Source:
  `postInvitationAcceptance`, `acceptInvitation` (atomic
  seat document message pair + invitations/:id/acceptance
  operation message pair via `appendMessagePair`).
- [ ] **V5 — Decline appends declined, writes no seat**
  Grant invitation B first (V4 consumed A). On
  `members/index.html` as an org admin, Invite member
  with a fresh EXISTING identity who is not a member of
  the inviting org. Serial: `alex.kim@company.com`
  (Wayne-only). Parallel: G reveal
  `invitee_username` / `invitee_password`
  (`r-member@test-plan.example`, seated in
  r-org, not G). PASS: "Invitation sent"
  toast. Sign in as that invitee. On `invitations/`
  click Decline. PASS: an "Invitation declined"
  toast fires, the row leaves the pending list, and NO
  seat is written (the declined org does NOT appear in
  the sidebar switcher and its rows stay unreachable). With no
  pending invitations remaining, the list shows the empty
  state "No invitations." and the top-bar bell disappears
  (V3). Decline is idempotent (re-decline → 204). Source:
  `postInvitationDecline`, `declineInvitation`.
- [ ] **V8 — Organization "Sent invitations" section + Revoke
  (admin)** Grant invitation C if none is pending (V4
  consumed A; V5 declined B). On `members/index.html` as
  an org admin, Invite member. Serial:
  `mike.thompson@company.com` (Wayne-only). Parallel:
  `sv-member@test-plan.example`. PASS: "Invitation sent"
  toast. Then on `organization/index.html` confirm a "Sent
  invitations" section (`#sent-invitations-box`, h2 "Sent
  invitations") appears below the cards, listing one row per
  PENDING org invitation (`#sent-invitations-list`) — each row
  shows the invitee EMAIL, an "Invited {date}" sub-line, a
  state badge, and a Revoke button. PASS: the section is
  VISIBLE only when the admin read succeeds (it boots hidden
  and reveals on success). Click Revoke on C. PASS: an
  "Invitation revoked" toast fires and the row leaves the
  pending list (a 'revoked' event supersedes the pending; the
  invitation row persists as audit, and the invitee's pending
  list — V3/V4 — no longer shows it). With no outstanding
  invitations, the list shows "No outstanding invitations."
  Revoke is idempotent (re-revoke → 204). Source:
  `web-app/organization/index.ts` (`renderSentInvitations` /
  `onSentInvitationClick`), `SentInvitationsPresenter`,
  `revokeInvitation`.
- [ ] **V7 — Authz: non-admin grant/revoke rejected; invitee
  may still read & accept** Sign in as a NON-admin member of
  an org (a seeded human with no admin role). Open the
  Invite dialog (`#invite-member-btn`) and submit a grant.
  Read the 403 from the **network log** on this load —
  never `js()` `fetch` (the bearer is
  memory-only). PASS: the grant POST is rejected with
  "forbidden: POST /organizations/<orgId>/invitations/
  requires a role this principal lacks" (403). The
  Organization page's Sent-invitations admin read fails
  and the section stays hidden (V9), so no Revoke is
  offered. YET the SAME role-less identity, when it is
  the INVITEE, CAN read its own invitations (the bell +
  `invitations/` work — the read is identity-scoped, not
  admin-gated) and CAN Accept/Decline its own invitation
  (V4/V5). PASS: grant/revoke require admin;
  read/accept/decline require only being the invitee.
  Source: the absent `MEMBER_VERBS` row for the org
  invitation nest (`api/authorization.ts`) and
  `authorizeRequest` (`api/request-auth.ts`), which 403s
  before any handler; the invitee read/accept/decline
  paths ride the identity nest.
  Parallel (A3 `--test-plan-slices`): run before G46
  so `G Member` still has PII and can sign in; the
  invitee half is granted from the second G
  organization (`org2_*`). Serial (A3 `--mock-data`,
  demo admin's active organization Stark): any
  seeded non-admin human.
- [ ] **V9 — Sent-invitations section is admin-only** Sign in
  as a NON-admin member and open `organization/index.html`.
  PASS: the admin Sent-invitations read fails (403 "forbidden:
  listing sent invitations requires an admin role") and the
  section stays HIDDEN — the read rejects before the reveal
  line, so the box never un-hides, and no Revoke affordance is
  offered to a non-admin. (Pairs with V7's grant/revoke 403s.)
  Source: `sentInvitations` admin guard in
  `api/invitations-domain.ts`.

### Member detail — Human (`members/detail.html?memberId=<hw_*>`)

- [ ] **G19** From `members/index.html`, click any human
  member's row. PASS: navigates to `member-detail`. Read
  mode shows avatar (initials), name,
  title • department subtitle, Personal Information card
  (Name, Email, Phone, Title, Department,
  Bio), Working Styles card (4-axis dimensions surfaced
  under presentation labels Mover / Shaker / Prover /
  Maker, backed by data keys `driver` / `analytical` /
  `expressive` / `amiable`), and Strengths card.
- [ ] **G20** Click Edit. PASS: header swaps Edit for
  Cancel/Save; Personal Information card switches to
  inputs (Name text, Email email-input, Phone
  text, Title text, Department select, Bio textarea);
  Strengths card switches to a tag picker. Working
  Styles card stays read-only.
- [ ] **G21** Edit Phone and Bio, toggle one strength on
  and one off, click Save. PASS: toast "Member saved"
  appears. PASS: the page returns to read mode showing
  the edits. Reload; all edits persist.
- [ ] **G22** Click Edit, change a field, press `Escape`.
  PASS: edits discarded, view returns to read mode.
- [ ] **G23** Click Edit, change a text field, press
  `Enter` while focused on the input. PASS: save fires
  (toast "Member saved") and the page returns to read
  mode.
- [ ] **G23a** From `member-detail`, click the back button.
  PASS: returns to `members/index.html`.

### Member detail — AI (`members/detail.html?memberId=<ai_*>`)

- [ ] **G24** From `members/index.html`, click any AI
  member's row. PASS: navigates to `member-detail`. Read
  mode shows the AI Member card (Name, Model as
  "{name} — {provider}", Description, Skill Focus);
  there is no Auth Token section.
- [ ] **G24a** Click Edit. PASS: identity fields become
  inputs (Name text, Model pulldown grouped by provider
  with the current model pre-selected, Description
  textarea, Skill Focus textarea); there is no Auth
  Token field.
  Change Description and Skill Focus, click Save. PASS:
  toast "AI member saved"; the page returns to read mode
  showing the edits; reload and they persist.
- [ ] **G24b** Click Edit again, pick a different Model
  from the pulldown, click Save. PASS: toast "AI member
  saved"; the page returns to read mode showing the new
  model; reload and it persists as
  "{name} — {provider}".

### Identities (list & detail) (`identities/`, `identities/detail.html`)

G43 ran before G14 (closed roster snapshot). Do not
re-pin the closed 6+5+1 count.

- [ ] **G44** Navigate to `identities/index.html`. Click "Add Identity". PASS: the `add-identity` dialog opens with a Kind toggle (Person checked by default / Service). With Person selected, the person form (`#add-identity-person-form`) shows Name/Email/Phone/Bio inputs; fill Name + Email, click "Create" (`#add-identity-submit`) → two sequential requests (POST `identities` `{id, kind}`, then PUT `identities/:id/pii` carrying the PII fields), an "Identity added" toast, the dialog closes, and the new person appears in the roster (name + email); a second-hop failure toasts a partial-state message naming the PII-less identity rather than a blanket create failure. Re-open the dialog and click the "Service" radio → the person form hides and the service form (`#svc-secret`, "Client Secret") shows; enter a secret, Create → a "Service identity added" toast, the dialog closes, and a new "Service"-badged row appears. Submitting Person with an empty Name or Email shows "Name and email are required" and keeps the dialog open. Source: `web-app/identities/index.ts` (`handleAddIdentitySubmit` / `submitPersonForm` / `submitServiceForm`).
- [ ] **G45** From the roster, click a person row (`.card[data-identity-id]`). PASS: navigates to `identities/detail.html?identityId=<id>`, which renders the back button (`#identity-back-btn`), the name + a kind badge + the id, a "Personal Information" card (Name/Email/Phone/Bio — each empty field rendered as "—" via `DISPLAY_ABSENT`), a "Connections" card (Identity Providers / Tokens buttons), and — for a person — an "Erase PII" button (`#identity-erase-btn`). A service identity instead shows a "Credentials" card and NO erase button (only persons carry erasable PII). Source: `web-app/identities/index.ts` (`onListClick`), `web-app/identities/detail.ts`, `web-app/app/presenters/identity-detail.ts`.
- [ ] **G46** On `G Erasable`'s identity detail (parallel — never the G admin and never `G Member`; serial: any person row that is not the signed-in admin), click "Erase PII" (`#identity-erase-btn`) to open the native `<dialog id="confirm-erase-dialog">` (`role="alertdialog"`, title "Erase personal information?", body "The identity itself survives; only its personal information is erased."); confirm via the `data-action="confirm-erase"` button. PASS: `deleteIdentityPii` runs, a "Personal information erased" toast appears, and the view re-renders in place — the name becomes "Identity without PII" (`IDENTITY_WITHOUT_PII_NAME`) and Email/Phone/Bio all read "—" (`DISPLAY_ABSENT`); the identity row still exists in the roster (erasure splices `identity_pii` only, leaving the identity and every `member_id` reference intact). The surviving pair at the address is the bodyless DELETE tombstone (head). Erased name remains in superseded pairs; derived reads and login show none. Cancel/Escape (`data-dialog-cancel="confirm-erase"`) leaves the PII unchanged. Source: `web-app/identities/detail.ts` (`performErase` → `deleteIdentityPii`). Drive the native `<dialog>` directly — no `window.confirm` stub needed.
- [ ] **G47** On the system service identity's detail page (admin session), a "Client registration" card renders before Credentials showing "Not registered." and a "Register client" button (`data-identity-action="registration"`). Click it → the `client-registration-dialog` opens; fill Grant types `client_credentials`, Audience `fusion-angle`, JWKS `{"keys":[]}`, leave Status Active, Save (`#client-registration-submit`) → "Client registration saved" toast, dialog closes, the card shows an `active` pill (`data-tone="success"`) plus Grant types / Redirect URIs / Audience / JWKS fields, and the button reads "Manage registration". Re-open, change JWKS, Save → the card reflects the new JWKS (rotate = same PUT-overwrite). Re-open, set Status Disabled, Save → `disabled` pill (`data-tone="warning"`). Re-open → a "Deregister" button (`#client-registration-deregister`, hidden while unregistered) is visible; click it → "Client registration removed" toast and the card returns to "Not registered." Empty Grant types / Audience / JWKS shows "Grant types, audience, and JWKS are required" and keeps the dialog open. Cancel (`data-dialog-cancel="client-registration"`) discards edits. Source: `web-app/identities/detail.ts` (`saveRegistration` / `deregisterClient`), `web-app/app/presenters/identity-detail.ts` (`buildRegistrationCard`). Wire: PUT|GET|DELETE `identities/:id/registration` (admin realm; kind gate 404/400).

### Identity tokens & providers (`identity-tokens/`, `identity-providers/`)

- [ ] **G25** Open `identities/`, click an identity, then its "Tokens" link (`data-identity-link="tokens"`). PASS: the page title is "Tokens" with muted subtitle "Refresh-token chains for this identity"; the page renders one card per chain, each showing the chain id, the event jti, `parent: —` for a root event (or the parent jti for a rotated one), an `issued`/`rotated`/`revoked` badge, and a LOCAL-time stamp; an identity with no tokens shows "No tokens." The presenter consumes the adapter's camelCase `TokenEvent` domain shape (`jti`, `parentJti`, `action`, `at`) — a snake_case storage leak would render `parent: undefined` instead of `parent: —`. A non-canonical `identityId` (any value that is not a 22-character identifier) 400s at the route gate; an absent one bounces to `identities/`. Source: `GET identities/:id/tokens` via `web-app/app/adapters/identity-tokens.ts` (`TokenEvent`), `web-app/app/presenters/identity-tokens.ts`.
- [ ] **G26** From the same detail, click its "Providers" link (`data-identity-link="providers"`). PASS: the page title is "Identity Providers" with muted subtitle "External sign-in links for this identity"; the page renders one card per link/unlink event (provider name + the `providerSubject` + a `linked`/`unlinked` badge + local-time stamp), or "No linked providers." for an identity with none (the seeded Tony Stark logs in by password, so its providers list is empty). The presenter consumes the adapter's camelCase `ProviderEvent` shape (`provider`, `providerSubject`, `action`, `at`). Source: `GET identities/:id/providers` via `web-app/app/adapters/identity-providers.ts` (`ProviderEvent`), `web-app/app/presenters/identity-providers.ts`.

### Sidebar org-switcher

- [ ] **G36 — Sidebar org-switcher (multi-org user)** A3 mock-data seeds two orgs and Tony Stark is the multi-org admin. Sign in as Tony. The SIDEBAR FOOTER (not the top bar) shows an inline native org `<select>` (`.org-switcher`, inside `#sidebar-org-switcher` / `#mobile-sidebar-org-switcher`) next to the member chip — it appears ONLY because the user can reach ≥2 orgs (`shouldShowOrganizationSwitcher`). PASS: the select lists "Stark Industries" and "Wayne Enterprises" with Stark active; the plain org-name text line in the chip is cleared so the org is not named twice. Note the Members and Ideas lists for Stark. Select "Wayne Enterprises" → the page does a FULL reload and re-scopes: Members shows Wayne's roster and Ideas shows Wayne's ideas (org-fenced — Stark's rows are no longer visible). Reload the page again WITHOUT changing the select → the selection persists (Wayne stays active; the choice is stored under `fusion-angle:active-organization-id` and boot re-exchanges a scoped token from it). A single-org seeded user, by contrast, sees NO `<select>` in the sidebar — just the org name as PLAIN TEXT in the chip. The top bar shows neither the switcher nor a greeting; its only org-aware affordance is the pending-invitations bell (V3). Source of truth: `web-app/app/organization-switcher.ts`, `web-app/app/sidebar-member.ts`, `web-app/app/adapters/organization-session.ts`, `web-app/app/core.ts::scopeBootToActiveOrganization`.
- [ ] **G41** Person and agent writes land on the message
  plane. On a human detail page, click Edit, change
  Title or Bio, and Save. PASS: `PUT /identities/:id`
  (and PII when contact fields change) persists the
  profile; reload shows the new values. On an AI
  detail page, change Description or Skill Focus and
  Save. PASS: `PUT /ai-agents/:id` persists; reload
  shows the new values. No composing POST writes
  three pairs.

### Billing (`billing/`) — STUB

Billing is a placeholder page. `init()` is empty and
the body is hand-written static HTML. These tests
verify the page loads and the sidebar nav link
works; functional billing is tracked in `TODO.md`.

- [ ] **G42** Click "Billing" in the sidebar. PASS:
  browser navigates to `billing/index.html`. The page
  renders without console errors. Sidebar highlights
  the Billing link as active. No runtime JS errors
  from the empty `init()`.

### Organization General Information — Edit Cycle

- [ ] **G38** On `organization/index.html`, click
  Edit in the page header. Modify the
  Domain to a new value. Click Cancel. PASS: card
  returns to read mode, Domain shows the original
  (unmodified) value, no toast fires.
- [ ] **G39** Click Edit again. Modify Domain.
  Press `Escape`. PASS: card returns to read mode,
  Domain shows the original value (Escape behaves
  identically to Cancel; same code path as the
  Member Detail edit cycle).
- [ ] **G40** Click Edit. Modify both Organization
  Name and Domain. Click Save. PASS: toast
  "Organization saved" fires at top-center,
  card returns to read mode showing the new
  values. Reload the page. PASS: new values
  persist (round-tripped through
  `PUT /organizations/<id>`). Inspect the
  `organizations/:id` document message pairs on the message
  plane (`message_pairs`): the latest head
  body carries the updated `name` and `domain`
  alongside the unchanged `seats`,
  `projects_limit`, `ideas_limit`, and
  `next_billing` fields (no `organizations` entity
  store remains after Phase Final).

---

## H. Reference & System

- [ ] **H1** Navigate to `design-system/`. PASS: component gallery renders showing buttons, badges, cards, form elements, toasts, and other UI components from the design system.
  Pin: tests/design-system-render.test.ts
       'design-system render is byte-stable';
       exploratory — the browser-painted gallery
- [ ] **H2** Navigate to `not-found/`. PASS: 404 page renders with a message and a link back to the dashboard or landing page.
  Pin: exploratory — the rendered 404 message and link

---

## I. Cross-Cutting Concerns

### Theme

- [ ] **I1** Click the theme toggle (sun/moon icon) in the header, select "Dark". PASS: page switches to dark theme — background darkens, text lightens, CSS custom properties update.
  Pin: exploratory — the live toggle click and the
       dark-theme repaint
- [ ] **I2** Navigate to another page. PASS: dark theme persists across navigation.
  Pin: exploratory — the live cross-page persistence
       and repaint; a similarly-named existing test
       does not decide this — it stubs `matchMedia`
       to `matches: true` and never distinguishes the
       module's own `'system'`-default fallback
       (which independently computes 'dark' from that
       same stub) from an actual hydration of the
       stored value, so it stays green even with
       hydration deleted entirely
- [ ] **I3** Select "Light" theme. PASS: page returns to light theme.
  Pin: exploratory — the live toggle click and the
       light-theme repaint
- [ ] **I4** Select "System" theme. PASS: theme follows OS preference (matches `prefers-color-scheme`).
  Pin: tests/state-theme-icon.test.ts 'a
       prefers-color-scheme change event applies
       data-theme while preference is system';
       exploratory — the live System selection and
       the OS-preference match
- [ ] **I5** Reload the page. PASS: theme choice persists (stored in `localStorage` key `fusion-angle:theme`).
  Pin: tests/fusion-angle-identifiers.test.ts
       'storage keys use the fusion-angle prefix'
       (decides the exact key name
       `fusion-angle:theme`); exploratory — the live
       reload persistence; a similarly-named existing
       test does not decide the hydration itself — see
       I2's Pin for the confound
- [ ] **I6** Open the app in a second browser
  tab. Change theme in the first tab. PASS:
  second tab updates to the new theme without
  manual reload (cross-tab sync via
  StorageEvent), including the sun / moon /
  system toggle icon — not only `data-theme`
  on `<html>`. An OS `prefers-color-scheme`
  change while preference is System fires the
  `MediaQueryList` `change` event and updates
  `data-theme` without reload; the toggle
  glyph stays the system icon. CDP
  `Emulation.setEmulatedMedia` that mutates
  `matches` without `change` is not this case
  — after emulate, dispatch
  `new MediaQueryListEvent('change', {
  matches: mq.matches })` on
  `window.matchMedia('(prefers-color-scheme:
  dark)')` (one interned list per query), or
  use a real OS toggle.
  Pin: tests/state-theme-icon.test.ts 'a cross-tab
       theme storage event repaints the toggle icon'
       (a synthetic `storage` event repaints both the
       desktop and mobile toggle icons, not only
       `data-theme`); tests/state-theme-icon.test.ts
       'a prefers-color-scheme change event applies
       data-theme while preference is system';
       tests/state-theme-icon.test.ts 'a
       MediaQueryList change on a later matchMedia
       call applies data-theme while preference is
       system' (a listener registered at init still
       fires from a MediaQueryList obtained by a later
       `matchMedia()` call — the interned-list
       precondition this case's CDP workaround
       depends on); exploratory — the live second tab
       and the dispatched `MediaQueryListEvent`

### Sidebar

- [ ] **I7** Click the sidebar collapse button. PASS: sidebar collapses to icon-only view, main content area expands.
  Pin: tests/browser/sidebar.test.ts 'collapse and
       expand transition the sidebar width' (its
       collapse half: width to 64px, the
       `sidebar-collapsed` class, nav-text hidden);
       exploratory — the main content area expanding
- [ ] **I8** Navigate to another page. PASS:
  collapsed state persists (stored in
  `localStorage` key
  `fusion-angle:sidebar-collapsed`).
  Pin: tests/fusion-angle-identifiers.test.ts
       'storage keys use the fusion-angle prefix'
       (decides the exact key name); exploratory —
       the live cross-page persistence; `initState`
       hydrating a valid stored sidebar-collapsed
       value carries no CLI test today — only the
       corrupt-value rejection is (a sibling test in
       `tests/state-init.test.ts`)
- [ ] **I9** Click the expand button. PASS: sidebar returns to full width with labels.
  Pin: tests/browser/sidebar.test.ts 'collapse and
       expand transition the sidebar width' (its
       expand half: width back to 256px, nav-text
       visible again); exploratory — the live click
       and paint of the expand

### Mobile Responsive

Set a real CSS viewport ≤767px for I10–I15
(browser-use device metrics / CDP
`Emulation.setDeviceMetricsOverride`). Do
not source-verify in lieu of the live
layout.

- [ ] **I10 — Mobile breakpoint** Set CSS
  viewport ≤767px. PASS: desktop `.sidebar`
  is not visible; `.mobile-header` is
  visible (`display: flex`). Restore ≥768px.
  PASS: sidebar visible, mobile header
  hidden.
  Pin: tests/browser/viewport.test.ts 'below 768px
       the drawer replaces the desktop sidebar'
       (checks both elements at ≤767px, but after
       restoring to ≥768px re-checks only
       `#desktop-sidebar`, not that `.mobile-header`
       hides again); exploratory — that
       `.mobile-header`'s computed `display` is
       specifically `flex` rather than merely
       visible, and that it goes hidden again after
       the restore
- [ ] **I11** Tap/click the hamburger menu. PASS: mobile sidebar sheet slides in from the left with navigation links.
  Pin: exploratory — the live drawer slide-in;
       `initMobileDrawer` carries no CLI or browser
       test today
- [ ] **I12** Tap/click the backdrop or a nav link. PASS: mobile sidebar closes.
  Pin: exploratory — the live backdrop/nav-link close
- [ ] **I13** Tap a navigation link in the mobile sidebar. PASS: navigates to the target page and mobile sidebar closes. (Note: the drawer closes implicitly via page navigation — the next page loads in default-hidden state. No explicit close-on-link-click handler is required; navigation is the close trigger.)
  Pin: exploratory — the live navigation and the
       drawer's default-hidden state on the next page
- [ ] **I14** Open the mobile sidebar, press `Escape`. PASS: sidebar closes.
  Pin: exploratory — the live Escape-close
- [ ] **I15** Open the mobile sidebar, press `Tab` repeatedly. PASS: focus cycles through focusable elements inside the sidebar without escaping to the page behind it. `Shift+Tab` at the first element wraps to the last.
  Pin: exploratory — the live focus cycle and wrap;
       no focus-trap test exists today

### Command Palette

- [ ] **I16** Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux). PASS: command palette overlay appears with search input focused.
  Pin: exploratory — the live keybinding, overlay,
       and input focus
- [ ] **I17** Type a search term (e.g. "ideas"). PASS: filtered results appear. Select a result — navigates to the corresponding page.
  Pin: tests/command-palette-search.test.ts
       'searchItems matches title case-insensitively'
       (decides the filtering a typed term drives);
       exploratory — the live open, the typed search,
       and the result-click navigation
- [ ] **I18** Press `Escape`. PASS: command palette closes.
  Pin: exploratory — the live Escape-close
- [ ] **I19** Open command palette, type a search term. Use `Down Arrow` and `Up Arrow` to navigate results. PASS: active result highlight moves with arrow keys. Press `Enter`. PASS: navigates to the highlighted result.
  Pin: exploratory — the live arrow-key highlight and
       Enter navigation; the palette's keyboard-index
       logic is unexported DOM glue with no CLI test
       today
- [ ] **I20** Open command palette with an empty search field. PASS: results list shows up to 12 items from the combined index, grouped by category (Ideas, Projects, Members, Pages) with category headers — when the dataset is sparse enough for multiple categories to fit in 12 items, multiple groups appear; otherwise a single group is shown. Type a multi-category term (e.g. "a", which matches across Pages / Ideas / Projects / Members) that matches across groups. PASS: results regroup under multiple category headers. Type a term that matches no results. PASS: result list is empty or shows a no-results message.
  Pin: tests/command-palette-search.test.ts
       'searchItems empty query caps at default
       count' (an empty query over 50 items returns
       exactly 12); tests/command-palette-search.test.ts
       'searchItems no match returns empty';
       exploratory — the live category grouping,
       headers, and the regroup across categories

### Loading States

- [ ] **I21** Navigate to a data-dependent page
  with mock data loaded; do not `wait_for_load`
  first (see Driving notes). PASS: loading
  skeleton (card-grid, card-list, or detail
  pattern) appears, then content replaces it.
  Pin: exploratory — the live pre-settlement
       skeleton; `loadInto` is tested only after its
       fetch settles (empty, data, or error), never
       during the pending skeleton itself
- [ ] **I22** If an error occurs inside a `loadInto()` fetch path (e.g. a data-dependent page hits a thrown adapter error after the database initialized successfully), the error state with "Try Again" retry button is shown. PASS: clicking retry re-attempts data loading. The explorer has no way to force this fault live; if none occurs naturally, record BLOCKED naming that reason — an honest BLOCKED costs nothing.
  Pin: tests/loading-states.test.ts 'a rejecting
       fetch renders the error state and calls
       neither hook' (a rejected fetch renders a
       "Try Again" control and calls neither
       `onEmpty` nor `onData`); exploratory — the
       live retry click re-attempting the load

### Toasts

- [ ] **I23** Trigger a toast (e.g. save an idea). PASS: toast appears at top-center of the viewport (fixed to `top: var(--space-4); left: 50%; translateX(-50%)`), auto-dismisses after ~6 seconds with fade-out. (Toast position was migrated from bottom-right to top-center.)
  Pin: exploratory — the live position, the
       ~6-second auto-dismiss, and the fade
- [ ] **I24** While a toast is visible, click its close button (×). PASS: toast dismisses immediately without waiting for auto-dismiss timer.
  Pin: tests/browser/toasts.test.ts 'the close button
       detaches a toast inside its fade' (the toast
       detaches within 1.5s of the close click, well
       inside the 6s auto-dismiss window); exploratory
       — the live fade-out visual
- [ ] **I25** Trigger multiple toasts in rapid succession (e.g. save an idea repeatedly). PASS: toasts stack visibly with the *newest at the top*, older ones flowing downward (`prepend` ordering, not `appendChild`). Up to 5 visible. When a 6th toast arrives, the *oldest* — at the bottom of the stack — is removed.
  Pin: tests/browser/toasts.test.ts 'the stack caps
       at five toasts' (decides the cap only — every
       toast in the test carries identical text, so
       it cannot decide which one is evicted or that
       new ones render on top); exploratory — the
       newest-on-top ordering and that the toast
       removed is specifically the oldest

### General

- [ ] **I26** Confirm Snapshots is gone: sidebar
  has no Snapshots item; `snapshots/` is not a
  PAGE_REGISTRY page (unsigned load is the
  not-found page, not a restore UI). Historical
  I26 (download → wipe → upload) retired with
  the snapshots page.
  Pin: tests/page-registry.test.ts 'sidebar has no
       Snapshots item'; tests/page-registry.test.ts
       'PAGE_REGISTRY has no snapshots page';
       tests/page-registry.test.ts 'retired snapshots
       is a missing page' (an unsigned `snapshots/`
       load resolves as the not-found page);
       exploratory — the live sidebar and the live
       not-found render
- [ ] **I27** Check DevTools Console after navigating through 5+ different pages. PASS: no unhandled JavaScript errors (warnings and info messages from browser extensions are acceptable).
  Pin: exploratory — the live DevTools console across
       5+ navigations

### Sidebar Cross-Tab Sync

- [ ] **I28** Open the app in two tabs. In tab 1 collapse the
  sidebar. PASS: tab 2 reflects the collapsed state without manual
  reload (cross-tab sync via StorageEvent on
  `fusion-angle:sidebar-collapsed`).
  Pin: exploratory — the live cross-tab sync; only
       the `STORAGE_KEY_THEME` branch of `state.ts`'s
       shared storage-event listener is tested (a
       sibling test in `tests/state-theme-icon.test.ts`)
       — its `STORAGE_KEY_SIDEBAR` sibling branch
       carries no CLI test today

### Accessibility

- [ ] **I29 — Skip link & `<main>` landmark**
  From a fresh load of any sidebar-layout
  page, press `Tab` once. PASS: the first
  focusable element is a "Skip to main
  content" link (visually hidden until
  focused via the `.skip-link` translateY
  rule in `base.css`); pressing `Enter`
  moves focus past the sidebar and top-bar
  into the page body. Then confirm via
  `js()` that the content wrapper is a
  `<main id="main-content">` landmark (not
  a bare `<div class="page-content">`) and
  that the composed shell
  (`web-app/app/components-layout.html`)
  contains exactly one `<main>`. Guards
  WCAG 2.4.1 Bypass Blocks (Level A).
  Pin: exploratory — the live tab order, the focus
       move on Enter, and the single `<main>` landmark
- [ ] **I30 — Reduced-motion view-transition
  guard** Emulate `prefers-reduced-motion:
  reduce` (see Driving notes). PASS: the
  `@media (prefers-reduced-motion: reduce)`
  rule in `base.css` sets
  `::view-transition-group(*)` /
  `::view-transition-old/new(*)` and the
  named `::view-transition-old/new(page-content)`
  to `animation: none` (the named rule
  otherwise beats `*`). Navigating does
  not play `fade-in-up`'s `translateY`
  slide (`utilities.css`). The universal
  `*, *::before, *::after` reset does NOT
  reach view-transition pseudo-elements.
  Guards WCAG 2.3.3 Animation from
  Interactions (AAA).
  Pin: tests/base-css-motion.test.ts 'reduced motion
       names page-content view transitions so
       fade-in-up cannot win' (decides the block
       names the `page-content` pair with
       `animation: none`; it does not check for the
       `::view-transition-group(*)` or wildcard
       `::view-transition-old/new(*)` selectors this
       case's PASS line also names); exploratory —
       the live navigation not playing the slide, and
       that the wildcard selectors themselves carry
       `animation: none`. A neighboring browser test
       clamps a different CSS mechanism (the
       universal `transition-duration` reset on
       `#desktop-sidebar`), not the named
       view-transition override this case guards, so
       that test is not cited here

---

## K. Objectives & Scoring

Every case below assumes the active organization is
Stark Industries — if the sidebar org-switcher still
shows Wayne Enterprises (a G36 leftover), switch back
first. K8 is the master's: it wipes and reseeds after
the explorer returns (`## The walk` step 5), not in
document order with the rest of this section.

### K1–K6 — Organization Objectives box

- [ ] **K1** Open Organization page; confirm Objectives
  box renders between the Overview and Usage cards with
  4 seeded active objectives in position order. PASS if
  all 4 names display.
  Pin: tests/mock-data-objectives.test.ts 'seeds every
       objective seed plus the org-2 objective' (pins the
       seeded count at exactly `OBJECTIVE_SEEDS.length`,
       4); tests/presenter-organization-objectives.test.ts
       'renders active section with each active
       objective' (renders each objective's name and id);
       exploratory — the live position-ordered placement
       between Overview and Usage
- [ ] **K2** Click `+ Add objective`; confirm modal
  opens. Enter name "Test Objective" and description
  "Test desc"; click Add. PASS if the new objective
  appears at the bottom of the active list.
  Pin: tests/presenter-organization-objectives.test.ts
       'renders add-objective affordance'; tests/drag-
       reorder.test.ts 'nextPosition appends one
       POSITION_GAP past the last integer entry' (decides
       a new objective's position lands after every
       existing one); tests/adapters-objectives.test.ts
       'postObjectiveCreation writes via GET the
       objective and its first revision through POST
       /objectives'; exploratory — the live modal and the
       visual bottom-of-list placement
- [ ] **K3** Click `Edit` on "Lower expenses"; confirm
  modal opens pre-filled. Change the name to "Cut costs";
  click Save. PASS if the list re-renders with the new
  name. K30 and K7 later confirm this rename resolves
  temporally.
  Pin: exploratory — the live modal, pre-fill, and
       re-render; `postObjectiveRevision` in
       web-app/app/adapters/objectives.ts (the write this
       Save triggers) carries no test today
- [ ] **K4** Click `Archive` on "Test Objective" (K2);
  confirm dialog opens. Confirm. PASS if the objective
  moves from active to the Archived sub-section, with
  strikethrough.
  Pin: tests/adapters-objectives.test.ts
       'postObjectiveArchival PUTs the document with an
       archived trio and the current position';
       tests/presenter-organization-objectives.test.ts
       'renders archived section under active' (its own
       assertions are unscoped `.includes()` calls that
       confirm an "Archived" section and the objective's
       name both render, not their relative order);
       exploratory — the live confirm dialog, the
       strikethrough style, and the Archived
       sub-section's position under Active
- [ ] **K5** Click `Reactivate` on "Test Objective"; PASS
  if it returns to the active list.
  Pin: tests/adapters-objectives.test.ts
       'getObjectiveLifecycleEvents streams dated
       transitions oldest-first' (drives
       postObjectiveReactivation and confirms the
       lifecycle records it); exploratory — the live
       return to the active list
- [ ] **K6** Drag "Test Objective" to a new position.
  Drive with compositor mouse: `pointerdown` on
  `.drag-handle` (pointer capture), `pointermove`,
  `pointerup` — not HTML5 `drop`. PASS if the new
  position persists across a page reload.
  Pin: tests/adapters-objectives.test.ts 'computeNewPosition
       + putObjectivePosition wedge an item into the
       middle without renumbering anyone';
       tests/adapters-objectives.test.ts
       'putObjectivePosition preserves adjacent
       fractional values across sequential reorders';
       exploratory — the live compositor-mouse drag and
       the reload-persistence observation (no browser
       test drags an objective row;
       tests/browser/list-reorder.test.ts drags projects,
       a different list)
- [ ] **K8** Empty state: stop the A3 process.
  `./postgres-wipe --postgres local` then
  `./postgres-seed --postgres local --bootstrap` then
  start `node server.mjs`. Sign in with the stdout admin
  credential. Open Organization. PASS: the empty-state
  copy "No objectives yet. Add one to get started."
  renders (bootstrap seeds org 1 with no objectives).
  Restore the mock garden by stopping again,
  `./postgres-wipe --postgres local`, then
  `./postgres-seed --postgres local --mock-data`, then
  start. This is the one case that seeds `--bootstrap`
  rather than `--mock-data`; do not skip it. `crank`
  mints `POSTGRES_URL`/`JWT_HMAC_SIGNING_KEY` and never
  prints them, so this manual restart needs them already
  set in the master's own shell (e.g. from a prior
  `./serve` session) — a pre-existing limitation of this
  case, not one this audit can resolve.
  Pin: tests/presenter-organization-objectives.test.ts
       'empty state when no objectives'; exploratory —
       the live wipe/bootstrap/restore ceremony

### K9–K18 — Project detail: inline scoring + Approve

The Score and Log-measurement MODALS are retired.
Baseline and actual scores are edited INLINE in
`#project-objectives-section`: each
`.project-objective-row` carries EITHER a
`.baseline-slider` (before approval) OR an
`.actual-slider` (once approved) — mutually exclusive,
selected by project state — with one shared `Save`
(`data-action="save-objectives"`) button that enables
only when a slider moves off its `data-initial-value`. A
project converted through the UI arrives at `submitted`
ALREADY baseline-scored (convert requires a baseline per
active objective), so exercising the
unscored-then-score-then-approve path needs a project
seeded directly, never converted.

Subject: Smart Inventory Optimization
(`OXxlaOFaAWfVofOqOHeTrQ`), seeded `sent_back` — the
only unreserved Stark project still carrying an unscored
objective. The sole seeded `submitted` project, Market
Sentiment Analyzer, is not available here: AA24a's
surviving text drives it all the way to `approved`
earlier in this same document-order walk. K26's three
`under_review` titles (Workforce Capacity Forecasting,
Predictive Maintenance System, Employee Training
Assistant) are reserved — do not Approve or Archive
them; K18 below only reads one, and does not save.
Smart Inventory Optimization's "Lower expenses" baseline
is already seeded; "Increase incomes", "Raise customer
NPS", and "Improve employee morale" are not.

- [ ] **K9** Open Smart Inventory Optimization. PASS if
  the header actions slot shows Edit
  (`#project-edit-btn` in `.project-actions-slot`), the
  review action bar (`#project-review-actions` /
  `.action-bar`) shows Approve / Decline / Send back and
  no View history, and the objective rows' baseline
  sliders are editable inline.
  Pin: tests/presenter-project-action-bar.test.ts
       'sent_back project: Score button hidden, other
       review actions shown' (decides only the Score
       button's absence and Approve's presence on
       `sent_back` — Decline and Send back are pinned for
       `submitted` in that file's sibling test, not for
       `sent_back` itself); exploratory — Decline/Send-
       back's presence and View history's absence on
       `sent_back` specifically (the nearest real
       decider, 'lifecycle actions empty on
       under_review', tests a different state —
       `under_review`, not `sent_back` — and a different
       presenter method, `buildLifecycleActions`); the
       live header actions slot and the inline sliders on
       a `sent_back` project (the presenter's
       editable-baseline branch is exercised only for
       `under_review` in tests/presenter-project-
       objectives.test.ts; `sent_back` shares the same
       code but carries no direct test)
- [ ] **K10** Transition status to `under_review` via the
  edit form (resubmitting after being sent back). PASS if
  the baseline sliders remain editable inline — there is
  NO Score button and NO modal.
  Pin: tests/presenter-project-objectives.test.ts
       'baseline sliders enabled while under_review';
       exploratory — the live edit-form transition and
       the absent Score button/modal specifically at
       `under_review` (only `submitted` and `sent_back`
       have a direct Score-button-hidden test)
- [ ] **K11** With every objective but "Cut costs"
  (K3's rename) still unscored — Increase incomes, Raise
  customer NPS, Improve employee morale, and Test
  Objective if K2's creation and K5's reactivation both
  held — the `Approve` button is disabled with a tooltip
  prefixed "Set a baseline score before approving:"
  followed by the comma-joined names of every
  still-unscored objective. The convert-time gating
  STILL HOLDS even though the modal is gone.
  Pin: tests/adapters-project-publish.test.ts
       'validator: not ready when objectives unscored'
       (decides the gate itself returns `ready: false`
       while any active objective lacks a baseline);
       tests/presenter-project-action-bar.test.ts
       'under_review with no scores: Approve disabled'
       (decides the rendered `disabled` attribute follows
       from `ready: false`); tests/presenter-project-
       action-bar.test.ts 'Approve tooltip enumerates
       unscored objective names' (decides the exact
       tooltip prefix and comma-joined format — proven
       there with two names, not however many are live
       here); exploratory — the live enumeration's exact
       membership
- [ ] **K12** Inspect the objective rows; PASS if
  "Cut costs" (K3's rename of "Lower expenses") shows
  its seeded baseline value and every other active
  objective — Increase incomes, Raise customer NPS,
  Improve employee morale, and Test Objective if it is
  still active — shows an inline slider at its unset
  position (no modal opens).
  Pin: tests/presenter-project-objectives.test.ts
       'renders one row per active objective'; exploratory
       — the live seeded-vs-unset row states and the row
       count (four or five, depending on K5)
- [ ] **K13** Drag the "Increase incomes" and "Raise
  customer NPS" sliders to non-zero values — send "Raise
  customer NPS" to the far left (−100); Save. PASS if the
  shared `Save` button enables (dirty-tracked), the rows
  show the saved baselines including the signed −100, and
  Approve is **still** disabled because at least "Improve
  employee morale" (and Test Objective, if K2/K5 left it
  active) remains unscored.
  Pin: tests/presenter-project-objectives.test.ts
       'renders Save button when any slider is editable'
       (decides the button is present in the markup, not
       that it dynamically enables on drag — that is
       exploratory); tests/validators-objectives.test.ts
       'validateBaselineScoreEntity accepts -100 and
       +100' (decides −100 is a legal, persistable signed
       score); tests/adapters-project-publish.test.ts
       'validator: not ready when objectives unscored'
       (decides the gate returns `ready: false` while any
       active objective lacks a baseline);
       tests/presenter-project-action-bar.test.ts
       'under_review with no scores: Approve disabled'
       (decides the rendered `disabled` attribute follows
       from `ready: false`); exploratory — the live drag,
       the dirty-tracked enable, and the signed −100
       display on this screen (its post-save persistence
       is K14's; its history-modal rendering is K17's)
- [ ] **K14** After save, PASS if the moved sliders'
  `Save` button disables again (each slider's
  `data-initial-value` resets to the saved value) and
  saved values persist on re-render.
  Pin: exploratory — dirty-tracking has no CLI or browser
       test; only the presenter's initial render is tested
       (tests/presenter-project-objectives.test.ts), never
       a save-then-rerender cycle
- [ ] **K15** Drag every still-unscored slider —
  "Improve employee morale", and Test Objective if K2's
  creation and K5's reactivation both held; Save. PASS if
  the Approve button enables now that every active
  objective has a baseline.
  Pin: tests/adapters-project-publish.test.ts
       'validator: ready when all scored' (decides the
       gate itself: ready once every active objective
       carries a baseline, independent of count);
       tests/presenter-project-action-bar.test.ts
       'under_review with full scoring: Approve enabled'
       (decides the button renders enabled once the gate
       says ready — fed `{ready: true}` directly, so it
       does not itself decide the gate); exploratory — the
       live drag and the enable transition
- [ ] **K16** Click Approve; confirm dialog opens.
  Confirm. PASS if status flips to `approved` and the
  action bar re-renders with `Archive` / `View history`;
  the row `.actual-slider`s become editable inline.
  Pin: tests/adapters-project-publish.test.ts
       'postProjectApproval moves state to approved'
       (decides the write itself lands `approved`);
       tests/presenter-project-objectives.test.ts
       'baseline slider hidden after approval' (decides
       the slider swap this transition produces);
       exploratory — the live confirm dialog and the
       `View history` button (`data-action="view-history"`
       in web-app/app/presenters/project-action-bar.ts
       carries no test today)
- [ ] **K17** Negative-score path: recall K13's −100 for
  "Raise customer NPS". PASS if the row still shows the
  saved value as a signed −100, and View history (K30)
  lists it with the negative-score tone.
  Pin: tests/presenter-project-score-history.test.ts
       'negative score TD carries data-tone="error"';
       exploratory — the live persistence of the signed
       value on the objectives screen itself
- [ ] **K18** "No-payload" save: open Workforce Capacity
  Forecasting (K26's reserved trio; read-only here — do
  not drag any slider) with no slider moved off its
  `data-initial-value`. PASS if the `Save` button stays
  disabled and no new baseline-score pairs are written
  under `projects/.../objective-baseline-scores` (pair
  count unchanged via console).
  Pin: exploratory — the no-payload guard has no CLI or
       browser test; `postProjectBaselineScoring` is
       tested only with a non-empty payload
       (tests/adapters-project-scoring.test.ts)

### K19–K23 — Inline actual measurement + Archive

- [ ] **K19** Open Smart Inventory Optimization (now
  `approved`, K16). PASS if the objective rows'
  `.actual-slider`s are editable inline (there is no Log
  measurement modal), pre-filled from each objective's
  baseline (none has an actual yet — the seed scores
  actuals only for projects it seeds `approved` or
  `archived`, and this one was seeded `sent_back`).
  Pin: tests/presenter-project-objectives.test.ts
       'actual sliders enabled while approved for
       baseline-scored objectives'; exploratory — the
       live prefill from the baseline specifically
- [ ] **K20** Drag the "Cut costs" actual slider (K3's
  rename of "Lower expenses"); click `Save`. PASS if the
  row's actual value updates (persisted via
  `postProjectActualMeasurement`) and the Save button
  re-disables. This mints the FIRST live score event for
  this objective since K3's rename — K30 reads it back.
  Pin: tests/adapters-project-scoring.test.ts
       'postProjectActualMeasurement appends via GET
       scores'; exploratory — the live drag and the
       re-disable
- [ ] **K21** Re-render the page; PASS if the moved
  actual slider pre-fills with its latest actual value.
  Then score every remaining unscored actual slider and
  Save so every active objective carries an actual (K22
  needs full actual coverage to enable Archive).
  Pin: tests/adapters-project-publish.test.ts
       'archival validator: not ready when actuals
       missing' (decides full-actual coverage gates
       Archive — the reason this step scores the rest,
       not the PASS line itself); exploratory — the live
       re-render prefill onto the slider's `value`
       attribute specifically ('shows latest actual with
       sign' does not decide this: its assertion,
       `html.includes('−10') || html.includes('-10')`,
       is unscoped over the whole blob — the U+2212 form
       renders only in `.slider-value`/the gauge tooltip,
       never in the ASCII `value="${actValue}"` attribute
       the slider itself uses, and the ASCII form is a
       tautology against the static `min="-100"` every
       slider carries regardless of any data; mutation-
       checked)
- [ ] **K22** The terminal action is `Archive`, not
  "Complete", and the terminal state is `archived`, not
  `completed` — there is no `completed` value in
  `PROJECT_STATES`. Click Archive; PASS if a confirmation
  dialog opens.
  Pin: tests/presenter-project-action-bar.test.ts
       'approved with full actuals: Archive enabled';
       exploratory — the live confirmation dialog
- [ ] **K23** Confirm the archive. PASS if status flips
  to `archived` and the action bar reflects the archived
  project.
  Pin: tests/adapters-project-publish.test.ts
       'postProjectArchival moves state to archived';
       exploratory — the live action-bar reflect

### K24–K26 — Projects list Projected Impact column

- [ ] **K24** Open Projects list; PASS if the Projected
  Impact column renders a value for each row — Employee
  Training Assistant (zero baselines, still reserved for
  K26) shows "—"; scored projects show a signed value.
  NOTE: the column header carries no visible text label
  (the "Projected Impact" name is not rendered in the
  header row), so identify the column by its
  position/content, not header text.
  Pin: tests/presenter-projects-list-column.test.ts
       'projected impact column renders for each
       project'; tests/presenter-projects-list-column.test.ts
       'missing score renders absent and sorts last';
       exploratory — the live header's absent text label
- [ ] **K25** Sort by Projected Impact descending; PASS
  if rows re-order accordingly (most-positive first).
  Pin: tests/presenter-projects-list-column.test.ts
       'applyProjectSortToggle orders by projected impact
       descending with no-score last'; exploratory — the
       live sort-control click and re-order
- [ ] **K26** Filter to `under_review` status + sort by
  Projected Impact descending. Three seeded `under_review`
  mock projects, high first: Workforce Capacity
  Forecasting, Predictive Maintenance System, Employee
  Training Assistant. PASS if those three rows render,
  ranked high first — the "review queue ranked by impact"
  workflow we designed.
  Pin: tests/presenter-projects-list-column.test.ts
       'applyProjectSortToggle orders by projected impact
       descending with no-score last' (decides the
       descending-with-absent-last ordering mechanism);
       exploratory — the live filter-to-`under_review`,
       and that these three seeded projects rank in this
       order (a seed-data fact, not a product covenant a
       unit test should pin)

### K27–K29 — Dashboard Impact + Aggregates

- [ ] **K27** Open dashboard; PASS if four surfaces
  render: three arc-gauge cards sharing one card shell
  (Time and Cost are ratio arc-gauges; Impact is a
  bipolar arc) and an Objectives box (below the grid, one
  gauge column wide; card title "Objectives").
  Pin: tests/adapters-dashboard.test.ts
       'getDashboardGauges returns the three sibling
       gauges'; tests/adapters-dashboard.test.ts
       'getDashboardGauges marks Time and Cost as ratio';
       tests/adapters-dashboard.test.ts
       'getDashboardGauges marks Impact as bipolar';
       tests/presenter-dashboard-objective-aggregates.test.ts
       'card chassis matches Time/Cost/Impact pattern';
       tests/presenter-dashboard-objective-aggregates.test.ts
       'heading reads "Objectives"';
       tests/objectives-card-width.test.ts 'the
       Objectives card is one gauge column wide';
       exploratory — the live grid placement below the
       three gauge cards
- [ ] **K28** Inspect the Impact gauge. PASS if:
  - The arc has muted background visible at all values
  - For a net-positive portfolio (the mock seed's Stark
    Impact baseline is positive), value arcs sweep right
    and use green tones
  - For a net-negative portfolio, value arcs sweep left
    and use red tones
  - The "actual" tick is visually distinct from the
    baseline area (thinner / different opacity)
  Pin: tests/adapters-dashboard-mock-seed.test.ts 'mock
       seed produces portfolio Impact baseline +50'
       (establishes the live portfolio is net-positive,
       so only the right-sweep/green half is observable
       live); tests/presenter-misc.test.ts 'GaugePresenter
       bipolar at positive draws the RIGHT half only'
       (a scoped SVG path-`d` regex — decides the sweep
       direction only); tests/presenter-misc.test.ts
       'GaugePresenter bipolar at negative draws the LEFT
       half only' (same scoping, the net-negative half a
       healthy live seed cannot show); exploratory — the
       always-visible muted track, the actual-tick's
       visual distinctness, AND the green-for-positive /
       red-for-negative tone binding itself ('GaugePresenter
       bipolar declares the red-amber-green tri-gradient
       stops' only asserts that all three stop-colors
       appear somewhere in a blob rendering both halves —
       swapping which side gets which color leaves it
       green; mutation-tested)
- [ ] **K29** By this point Smart Inventory Optimization
  is `archived` (K23) and its Save button is gone — use
  Market Sentiment Analyzer instead (approved by AA24a
  earlier in this walk, baseline-scored, no actual yet).
  From another tab (same cookie jar), drag one of its
  actual sliders and Save. PASS if the Objectives box
  updates within ~1 second (BroadcastChannel
  `fusion-angle:data` + `subscribeProjectScoreChanges`);
  the three arc-gauge cards refresh only on full page
  load.
  Pin: exploratory — `subscribeProjectScoreChanges` /
       `notifyProjectScoreChange` in
       web-app/app/adapters/project-scoring.ts carry no
       CLI or browser test

### K30 + K7 — Project history modal & temporal name resolution

K7 runs last, after K30, so it can name the SAME rename
K30 only describes.

- [ ] **K30** Open Smart Inventory Optimization's View
  history modal (archived since K23 — View history stays
  available once archived). PASS if:
  - Events render in chronological order
  - Each row shows date, event kind, objective name (as
    it was at the event's moment), and detail
  - The seed's original "Lower expenses" baseline (dated
    before K3's rename) still displays "Lower expenses";
    K20's live actual (dated after K3's rename) displays
    "Cut costs"
  - Baseline revisions appear as their own event rows
    (not collapsed)
  Pin: tests/presenter-project-score-history.test.ts
       'merges all four streams chronologically';
       tests/presenter-project-score-history.test.ts
       'resolves historical objective name at each event'
       (decides the presenter places each score under the
       name correct for its own timestamp, GIVEN a
       resolver — the production resolver is inline,
       unexported glue in web-app/projects/detail.ts and
       carries no test of its own); exploratory — the
       live pre-/post-rename split on this specific
       project
- [ ] **K7** Reopen Smart Inventory Optimization's
  history modal (same as K30). PASS if events dated
  before K3's edit display the OLD objective name
  ("Lower expenses"), not "Cut costs" — decided directly,
  since K3 already ran earlier in this same document-order
  walk (no cross-agent wait). If K3's rename did not land
  (e.g., K3 itself FAILed as driven), mark K7 DEFERRED —
  its prerequisite did not produce what this case needs.
  Pin: tests/presenter-project-score-history.test.ts
       'resolves historical objective name at each event';
       exploratory — the live confirmation against K3's
       own edit

---

## R. Records

- [ ] **R1** Sidebar shows a Records entry; click navigates
  to `records/`. PASS: under the active org (Stark, org 1)
  the list renders Customer Profile; Project Brief is
  seeded under org 2 and is correctly hidden here.
  Pin: exploratory — the sidebar entry, the live
       navigation, and the org-scoped list contents
- [ ] **R2** Click "Add Record" (desktop) / "New Record"
  (mobile) → navigates to a create page
  (`records/create.html`) with Name and Description
  fields (not a dialog). Type values, click "Create Record".
  PASS: new Record appears at the bottom of the list and the
  app navigates to its detail page.
  Pin: tests/adapters-records.test.ts 'postRecordChange
       create writes the row and the initial state
       event'; exploratory — the create page's fields,
       the live navigation, and the new card's position
       at the bottom of the list
- [ ] **R3** Open Customer Profile detail. PASS: read mode
  shows name + description + attribute table sorted by
  sort_order + Bound flows (Customer Onboarding, Lead-to-
  Close) + Work orders using this Record list.
  Pin: tests/adapters-record-attributes.test.ts
       'getRecordAttributesByRecord returns rows in
       sortOrder ascending';
       tests/adapters-flow-records.test.ts
       'getFlowSummariesForRecord returns id and name
       for every flow bound to a record';
       tests/adapters-flow-records.test.ts
       'getWorkOrdersForRecord walks flow_records →
       flow_work_orders → work_orders correctly for a
       record bound to multiple flows';
       tests/mock-data-records.test.ts 'at least one
       seeded Record is bound to multiple flows via
       flow_records'; exploratory — the rendered
       read-mode layout
- [ ] **R4** Click Edit. PASS: edit mode renders name input,
  description textarea, and one editable row per attribute
  with name input, type picker, options textarea (for
  select-typed), and constraint editor.
  Pin: exploratory — the whole edit-mode form;
       `RecordDetailEditPresenter` carries no CLI test
       today
- [ ] **R5** Type a name into the pending-attribute input,
  then click "+ Add Attribute". PASS: a row is appended with
  default type `text`; an empty-name click is a no-op.
  Pin: exploratory — the live add-attribute interaction
       and the empty-name no-op
- [ ] **R6** Change a text attribute to `select`. PASS: the
  options textarea appears; the constraint picker offers
  only kinds applicable to `select` (i.e. nothing in the
  toy).
  Pin: exploratory — the live type-change reveal and
       the constraint picker's filtered options
- [ ] **R6a** Add an attribute and change its type to
  `radio`. PASS: the type picker offers `radio` alongside
  text/number/select/date/checkbox, and selecting it
  reveals the same "Options (one per line)" textarea that
  `select` shows; `checkbox` and the scalar types show no
  options field.
  Pin: exploratory — the type picker's live options and
       the textarea reveal
- [ ] **R6b** Give a `select` or `radio` attribute zero
  options and click Save. PASS: the save is rejected — a
  "Failed to save Record" toast appears and the editor
  stays open, because the API validator requires at least
  one option for choice fields (the gate, not merely a
  disabled button). Add one or more options and Save;
  PASS: it persists and read mode shows the attribute's
  type.
  Pin: tests/validators.test.ts
       'validateRecordAttributeEntity rejects a select
       with zero options'; tests/validators.test.ts
       'validateRecordAttributeEntity rejects a radio
       with zero options'; exploratory — the toast text,
       the editor staying open, and the live persisted
       save
- [ ] **R7** Add a `regex` constraint on a text attribute,
  set the pattern. PASS: constraint row appears with the
  pattern editable; the picker no longer offers `regex`
  for that attribute (toy implementation may always offer
  it — accept).
  Pin: exploratory — the constraint editor's row and
       the picker's post-add filtering
- [ ] **R8** Open record edit. PASS: each
  `.record-attribute-edit-row` has no
  `.drag-handle`. Attribute drag-reorder is
  later work (TODO.md), not a driver limit.
  Do not score BLOCKED. Do not attempt a
  synthetic DataTransfer here.
  Pin: exploratory — the absence of a drag-handle on
       each attribute row
- [ ] **R9** Remove an attribute via its trash button.
  PASS: row removed from the editor; not persisted until
  Save.
  Pin: exploratory — the live remove interaction and
       the unsaved-editor state
- [ ] **R10** Click Save. PASS: returns to read mode; the
  list reflects the new attribute set and constraint
  summaries.
  Pin: tests/adapters-records.test.ts 'postRecordChange
       edit replaces removed attributes with new ones';
       tests/adapters-records.test.ts 'putRecord
       overwrites an existing row'; exploratory — the
       live return to read mode and the rendered
       constraint summaries
- [ ] **R10a** Save a Record edit and watch the toast.
  PASS: exactly one "Record saved" toast appears — never
  a stack — and re-entrant saves are guarded (clicking
  Save repeatedly does not fire multiple saves or stack
  toasts). NOTE: the original 5-stacked-toast defect
  needed a slow save to open the race; the multi-attribute
  write is now a single batched table write, so the window
  is effectively closed and exercising the race
  deterministically may require artificially throttling
  storage.
  Pin: exploratory — the live toast count and the
       re-entrant-save guard
- [ ] **R11** Open a flow (Customer Onboarding). PASS: flow
  header shows `Record: Customer Profile` dropdown
  selected.
  Pin: tests/adapters-flow-records.test.ts 'putFlowRecord
       then getRecordForFlow round-trips the binding';
       exploratory — the painted header dropdown and its
       selection
- [ ] **R12** Open the Data Capture node panel. PASS: each
  ref row shows attribute name + Editable/Read-only picker
  + Required checkbox + remove (×) button; picker dropdown
  lists unreferenced attributes only.
  Pin: exploratory — the whole node-panel ref-row
       rendering; `buildAttributeRefRow` carries no CLI
       test today
- [ ] **R13** From workbox, open the gate-violation work
  order (`#gate0001`, `eOlNZpGQfmCdpSFWXGkzFQ`) at Data
  Capture, unbound. PASS: current node is Data Capture;
  the action screen shows Company Name and Contact Email
  inputs (fillable path); empty submit is blocked — the
  page-module empty-required pre-check toasts "Please fill
  all required attributes" before the POST. The typed
  gate (`validateRecordTransition` on CURRENT-node refs)
  is the durable covenant; CLI pins it; constraint
  failures still surface via
  `WorkboxDetailPresenter.buildViolations` banner. Only
  WO01 (`a7c3e1f9`) is instance-bound — do not bind
  `#gate0001` here (the seeded Customer Profile instance,
  Acme, already has values set), or the empty-submit toast
  can no longer be observed.
  Pin: tests/adapters-record-transitions.test.ts
       'validateRecordTransition returns a required
       violation when the CURRENT node has a required
       attribute with no stored value';
       tests/presenter-workbox-detail.test.ts
       'buildViolations names each failed attribute,
       phrasing range bounds by attribute type';
       tests/mock-data-records.test.ts 'the
       gate-violation work order has a current node
       with at least one required attribute with a
       null stored value'; exploratory — the action
       screen's rendered inputs and the pre-check
       toast text
- [ ] **R14** Fill Company Name + Contact Email, click
  submit. PASS: transition succeeds; work order advances
  to Review (does NOT demand Reviewer Notes — that is
  current-node only when leaving Review). The work order
  is still `#gate0001`; if it is still unbound, bind the
  seeded Customer Profile instance (Acme) via the bind
  picker — an existing instance, never a minted one.
  Pin: tests/adapters-record-transitions.test.ts
       'validateRecordTransition does not require
       TARGET-node attributes when the current node is
       clean'; exploratory — the live fill, submit, and
       bind-picker interactions
- [ ] **R14a** When a node references a `radio`-typed
  Record attribute, the workbox work-order detail renders
  it as a radio group — one `<input type="radio">` per
  option, all sharing the attribute name so only one is
  selectable — rather than a dropdown; selecting an option
  and transitioning records that value. NOTE: seeded mock
  data predates `radio`, so add a radio attribute,
  reference it Editable on a working node, and create a
  work order to exercise this.
  Pin: tests/presenter-workbox-detail.test.ts
       'buildAttributeInputHtml renders a radio group
       with one collectable input per option';
       exploratory — the live selection and the
       transition that records the value
- [ ] **R15** Open the R2-created Record's detail
  page — never Customer Profile (R16–R20 read it).
  Click Archive; confirm in the house dialog
  (`data-dialog-open="confirm-archive"`). PASS: a
  "Record archived" toast appears, the header badge
  reads Archived, and the Archive button is gone. On
  `records/` the card reads Archived, an Archived
  chip appears beside Active, and toggling the
  Active chip hides the card. There are no numeric
  counts on the chips.
  Pin: tests/presenter-record-detail.test.ts 'an
       archived record hides Archive and reads
       Archived'; tests/adapters-records.test.ts
       'postRecordStateChange records a new event
       without changing non-lifecycle entity fields
       on GET'; exploratory — the toast, the
       records/ card and chip rendering, and the
       chip's live toggle
- [ ] **R16** Open Customer Profile detail. PASS: an
  Instances section lists the seeded instances (id +
  readable values) — at least one seeded instance
  (Company Name "Acme Corp") — with a "New instance"
  control. The empty "No instances yet" state is a
  real UI branch the CLI pin below decides; Customer
  Profile is never empty on this seed, so the
  explorer will not see it live.
  Pin: tests/presenter-record-instances.test.ts
       'empty instances section shows empty state';
       tests/presenter-record-instances.test.ts
       'list renders instance id and projected
       values'; exploratory — the live section's
       rendering on Customer Profile
- [ ] **R17** Click "New instance". PASS: an identifier is
  minted, PATCH creates an empty instance (201, etag
  consumed; the adapter is `putRecordInstance`, the wire
  verb is PATCH), and the section enters edit mode with
  writable attribute inputs (readable non-writable
  attributes render read-only; unreadable omitted).
  Pin: tests/adapters-record-instances.test.ts 'instance
       create → list → patch → 412 → retry → delete →
       history'; tests/presenter-record-instances.test.ts
       'edit form: writable input, readonly text,
       unreadable omitted' (the writable/readonly
       halves); tests/presenter-record-instances.test.ts
       'projectInstanceFields drops unreadable and
       marks write vs read' (the omission itself — the
       edit-form test's own "unreadable omitted"
       assertion never supplies an unreadable field, so
       it cannot fail); exploratory — the live click
       and the minted identifier
- [ ] **R18** Fill a writable field and click Save. PASS:
  `patchRecordInstance` succeeds with the held etag; the
  section returns to list mode and the new value appears.
  Pin: tests/adapters-record-instances.test.ts 'instance
       create → list → patch → 412 → retry → delete →
       history'; exploratory — the live return to list
       mode and the rendered new value
- [ ] **R19** Concurrent-tab 412 recovery: open the same
  instance editor in two tabs; save a different value in
  tab B; then save in tab A. PASS: tab A surfaces "This
  instance changed underneath you — values refreshed;
  re-apply your edit", re-GETs fresh values + etag, and
  stays in edit so the operator can re-apply.
  Pin: tests/adapters-record-instances.test.ts 'instance
       create → list → patch → 412 → retry → delete →
       history'; tests/presenter-record-instances.test.ts
       'edit form surfaces 412 conflict notice' (decides
       that a supplied notice renders with warning tone
       while staying in edit — the test hardcodes its
       own literal rather than importing
       `INSTANCE_CONFLICT_NOTICE`, so it does not decide
       the exact wording); exploratory — the live
       two-tab race, the re-apply flow, and the notice's
       exact production text
- [ ] **R20** Click Delete on an instance; confirm in the
  house dialog (`data-dialog-open` /
  `confirm-delete-instance`). PASS: instance disappears
  from the list; reopening the address is not available
  (spent id).
  Pin: tests/adapters-record-instances.test.ts 'instance
       create → list → patch → 412 → retry → delete →
       history'; exploratory — the live confirm dialog
       and the list's removal
- [ ] **R21** ACL projection (member vs admin). The New
  instance form's per-attribute access
  (`data-access="writable"` / `"readonly"` / omitted)
  follows each attribute's `read_roles`/`write_roles`,
  with admin bypassing both. The mock seed sets no Record
  attribute's ACL away from the default
  (`['member','admin']` for both read and write), so on
  Customer Profile every attribute already renders
  identically for admin and member. As the demo admin,
  click New instance on Customer Profile: every field
  renders `data-access="writable"`. Sign in as Sarah Chen
  (`sarah.chen@company.com`, a Stark member) and open New
  instance: PASS if every field still renders
  `data-access="writable"` (the default-ACL case). Setting
  a restricted ACL (e.g. `read_roles: ['admin']`) is
  `PUT …/attributes/:id` only — no UI reaches it, and the
  explorer may not script the API — so the readonly/absent
  branches are not walk-driveable; BLOCKED (reason: no
  ACL-editing UI, API-only write) is correct if attempted,
  and the CLI pin below is the sole record of that branch.
  Pin: tests/presenter-record-instances.test.ts
       'projectInstanceFields drops unreadable and
       marks write vs read';
       tests/presenter-record-instances.test.ts
       'projectInstanceFields: admin bypasses ACL';
       tests/adapters-record-attributes.test.ts
       'getRecordAttributesByRecord maps storage rows
       to the camelCase domain shape'; exploratory —
       the live default-ACL comparison across the two
       sign-ins

## J. Teardown

J1–J3 are the master's: `## The walk` step 5 runs
them after K8, once the explorer has returned.

- [ ] **J1** Stop the `./crank` process started
  in A3 via the harness-native task stop (not
  `kill`). PASS: process terminates; the trap
  stopped `./serve`. Sandbox EPERM on `kill`
  is FAIL if the harness stop itself fails;
  do not score BLOCKED.
  Pin: exploratory — the live process actually
       terminating under the harness stop
- [ ] **J2** After J1 PASS, verify crank's temp
  bundle is gone (trap `rm -rf`). PASS:
  directory removed. DEFERRED only if crank
  is still up.
  Pin: exploratory — the temp directory's
       absence on disk after teardown
- [ ] **J3** Verify the ZIP file remains on
  `~/Desktop` for archival. PASS:
  `fusion-angle-server-${SHA}.zip` exists.
  Pin: exploratory — the ZIP file's presence on disk

## SV. Server (Node + Postgres)

This is the default origin, not a second ceremony —
A3 **is** SV1, on the same crank process every other
section already walked. B15 / B18 / B19 / B23 pin the
same cookie-session covenants on this process.

Operator prerequisites:

- A3 is crank; the explorer skips SV1 and does not
  re-seed.
- Credentials print once on **stdout**, never HTTP.

Named residual: the backend emits
`pg_notify('fusion_events', …)` inside the write
transaction. There is no LISTEN and no SSE client. A
second browser context looking stale until it
navigates is **PASS**, not FAIL. BroadcastChannel is
origin-scoped and reaches other tabs of the same
cookie jar (see SV8b) but not other browser contexts.
Do not file **SV10** as a regression.

### Browser against the real server

- [ ] **SV1** Satisfied by A3 — do not re-run.
  PASS if A3 passed (listen + stdout seed reveal).
  Pin: tests/pg-seed.test.ts 'mock-data seed
       prints every human sign-in' (the same event
       A3 cites); exploratory — confirming A3
       already passed
- [ ] **SV2** Open `http://localhost:8080/auth/index.html`
  (or follow the unsigned root hop to landing,
  then Sign In). Sign in as `demo@example.com`
  with the stdout password. PASS: the dashboard
  loads from this Node origin — pages and API are
  one process.
  Pin: tests/browser/sign-in.test.ts 'sign-in
       lands on the dashboard as the seeded
       admin'; exploratory — the one-process
       nature of pages plus API sharing this origin
- [ ] **SV3** After SV2, inspect DevTools. PASS:
  Application → Cookies shows `refresh_token` as
  HttpOnly, `Path=/api/authentication`,
  `SameSite=Strict`, `Secure` (always, including
  `http://localhost` and `http://127.0.0.1`);
  `localStorage` has no `fusion-angle:authorization`
  key and no `refresh_token`; the sign-in token
  response JSON has `access_token` and no
  `refresh_token`. Access is memory-only; refresh
  is the cookie.
  Pin: tests/api-authentication-token.test.ts 'token
       JSON has no refresh_token; Set-Cookie is
       HttpOnly'; exploratory — the `Secure`
       attribute over plain `http://`, and the
       DevTools `localStorage` inspection
- [ ] **SV4** On the signed-in dashboard, reload
  (Cmd-R). PASS: stays authenticated — no bounce
  to `auth`. Boot cookie-refreshes via
  `POST /api/authentication/token`
  (`grant_type=refresh`, `credentials: 'same-origin'`).
  Pin: tests/api-authentication-token.test.ts
       'refresh grant rotates from the Cookie, not
       the body'; exploratory — the live reload
       staying authenticated; `bootAuthGate`'s
       cookie-session branch carries no CLI test
       today

### Two identities, one database, one origin

Both SV6 and SV7 need two identities signed in at
once, not two tabs of one identity — the browser-use
plugin's two browser **contexts** (two cookie jars,
one Chrome) are how the walk now gets that. If the
driver offers no multi-context support, record
BLOCKED naming that reason; an honest BLOCKED costs
nothing.

- [ ] **SV6** Two browser contexts against the one
  crank origin (two cookie jars, one Chrome, one
  Postgres). In context A, sign in as
  `demo@example.com`. In context B, sign in as
  `sarah.chen@company.com` (stdout password; Sarah
  is Stark, same organization as the admin). PASS:
  both dashboards load; the sidebar member chips
  name different people; one Postgres, two
  sessions.
  Pin: tests/browser/two-jars.test.ts 'two contexts
       hold two identities on one origin';
       exploratory — the live two-context sign-in
       and the painted chip names
- [ ] **SV7** Continuing SV6's two contexts: in
  context A, create an idea with a unique title
  (Ideas → Create Idea → required fields → Submit
  Idea). In context B, navigate to `ideas/` (or
  reload if already there). PASS: Sarah's list
  includes A's new idea — two identities, one
  database.
  Pin: tests/browser/two-jars.test.ts 'two contexts
       hold two identities on one origin';
       exploratory — the live UI-driven create, as
       opposed to the pin's direct write

### Two tabs share the refresh cookie

Same origin, same browser context — one cookie jar,
two tabs — is ordinary explorer driving; no BLOCKED
applies here.

- [ ] **SV8** Same signed-in session, two tabs of
  the one browser context (they share its cookie).
  In tab A, stay signed in. Open
  `dashboard/index.html` in a new tab B of that
  context. PASS: tab B stays authenticated with no
  second sign-in — both tabs share the
  `refresh_token` cookie; boot cookie-refreshes.
  Pin: tests/browser/two-jars.test.ts 'two tabs
       share the cookie; sign-out in one bounces
       the other'; exploratory — the live open and
       the painted chip in tab B
- [ ] **SV8b** Two tabs of the one browser context,
  both on `ideas/`. Create an idea in tab A. PASS:
  tab B's list gains the card without a reload
  (BroadcastChannel `fusion-angle:data`).
  Pin: exploratory — the mock seed's ideas list is
       never empty, so this walks
       `onIdeasLoaded`'s populated-list subscription
       (`web-app/ideas/index.ts`'s direct
       `subscribeIdeaChanges` call), not the
       empty-list re-init branch
       tests/ideas-empty-subscribe.test.ts 'an empty
       initial ideas load still subscribes to
       cross-tab changes' decides; neither branch's
       test covers the other
- [ ] **SV9** In tab A, click Sign out. In tab B,
  navigate (sidebar click or reload). PASS: tab B
  lands on `auth` — logout cleared the shared
  cookie (`Set-Cookie` `Max-Age=0`); boot refresh
  cannot mint. (An already-painted tab B may still
  hold a live access token in memory until that
  navigation — that is the access-TTL covenant, not
  a failed cookie clear.)
  Pin: tests/browser/two-jars.test.ts 'two tabs
       share the cookie; sign-out in one bounces
       the other'; exploratory — the live
       in-memory-access-token nuance before
       navigation

### Named residual — stale-until-navigation

This residual is a **cross-jar** fact, not a
cross-tab one: SV8b just proved two tabs of one jar
DO refresh live via BroadcastChannel. Demonstrating
staleness needs two separate identities (two browser
contexts, as SV6/SV7 set up) — one jar's tabs cannot
show it. If the driver offers no multi-context
support, record BLOCKED naming that reason rather
than a case that would read as a FAIL.

- [ ] **SV10** Context B (Sarah Chen, from SV6/SV7)
  is still signed in and already sitting on
  `ideas/` — do not reload it. Context A was signed
  out in SV9; re-sign it as `demo@example.com`
  first (or open two fresh contexts if neither
  survived). In context A, create a distinctly
  titled idea. PASS / named
  residual: B's open list does not gain the new
  card until B navigates or reloads. There is no
  LISTEN and no SSE client; BroadcastChannel
  crosses tabs of one cookie jar (SV8b) but not
  separate browser contexts. A second context
  looking stale until navigation is **not FAIL**.
  After B navigates or reloads, the card from this
  write is present (same pin as SV7).
  Pin: exploratory — the pre-navigation staleness
       and the post-navigation appearance; no CLI
       or browser test decides the staleness
       itself, and this case's two-context setup is
       reused from SV6, not independently pinned
       here

---

## Summary Format

The run produces a single conversational summary in the
following format. This is the contract `## The walk`
references. The doc itself is NOT mutated by the run.

```
# Test Plan Run — <ISO-8601 timestamp, Zulu>

Build SHA: <git rev-parse --short HEAD>  (clean | dirty: N files)

## Automated (AT)
- AT1 tsc: PASS (0 diagnostics)
- AT2 ./test: PASS (N/N, 0 fail, Xs)
- AT3 ./validate: PASS (lint clean)
- AT4 ./test-postgres: PASS (0 fail)
- AT5 ./test-browser: PASS (0 fail)

## Manual Browser Regression
Total: <N> cases — PASS X · FAIL Y · BLOCKED Z · DEFERRED D · DRIFT R

| Section | Cases | Pass | Fail | Blocked | Deferred | Drift |
|---------|------:|-----:|-----:|--------:|---------:|------:|
| AT | 5 | | | | | |
| A | 5 | | | | | |
| AA | 46 | | | | | |
| B | 31 | | | | | |
| C | 7 | | | | | |
| D | 38 | | | | | |
| E | 12 | | | | | |
| F | 80 | | | | | |
| F2 | 31 | | | | | |
| FS | 9 | | | | | |
| G | 38 | | | | | |
| H | 2 | | | | | |
| I | 30 | | | | | |
| K | 29 (skip K8) | | | | | |
| R | 25 | | | | | |
| SV | 9 (A3=SV1) | | | | | |
| K8 | 1 | | | | | |
| J | 3 | | | | | |

## BLOCKED detail
- <case ID>: <the reason outside the product> | (none)

## FAIL detail
(none) | <case ID>: <one-line symptom>

Mitigation specs:
- <path> | (none)

## Drift Candidates
| Case | Symptom | Likely cause |
|------|---------|--------------|
(none) | ... | ...
```

The summary reports counts. FAIL rows become stubs; there
is no arithmetic to satisfy and no run is "fully green".
`BLOCKED` names a driver or environment limit; `DRIFT`
names a document that must change. Neither is a
regression, and neither blocks.

### Mitigation specs

After the walk, one markdown file per FAIL cluster under
`docs/superpowers/test-plan-mitigations/`. Product design
specs stay in `docs/superpowers/specs/`. Do not create the
directory until the first cluster exists. The master lists
paths in the summary. Dated stubs stay frozen. Implementing
those specs is tracked in `TODO.md`.

File name:
`YYYY-MM-DD-{section}-{first-case}.md`

```
# TEST-PLAN mitigation — {section}

- Section: {id}
- Cases: {comma-separated ids}
- Pin: {the case's Pin clause, copied}
- Expected: {from the case PASS line}
- Observed: {explorer note}
- Suspected layer:
  UI | adapter | API | seed | driver | doc
- Reproduced by:
  tests/{file}.test.ts '{test name}' red at {SHA}
  | not reproduced — {driver or environment reason}
  | doc — {the DRIFT correction}
```

**A product commit may cite a stub only when
`Reproduced by` names a red test.** The test sits at the
lowest layer that can express the covenant — a reducer,
presenter, or adapter pin at Layer 1, a CDP test at
Layer 2.
