# Data Adapter Layer

Async adapter functions that call `GET()`/`PUT()` from the API layer and convert normalized DB rows into the denormalized shapes that page modules expect.

## Organization

Domain modules with a barrel re-export (`index.ts`). All page modules import from `'../../site/data'` — with `moduleResolution: "bundler"`, this resolves to `data/index.ts` automatically.

| Module | Domain |
|--------|--------|
| `helpers.ts` | Shared utilities: `userName`, `getUserMap`, `parseJson`, `lookupUser` |
| `shared.ts` | Cross-cutting: `getCurrentUser`, `getNotifications` |
| `dashboard.ts` | Dashboard gauges, stats, quick actions, charts |
| `ideas.ts` | Idea listing, review queue, scoring, conversion, approval |
| `projects.ts` | Project listing, detail, engineering requirements |
| `teams.ts` | Team members, user listing |
| `edges.ts` | Edge definitions, outcomes, metrics |
| `tools.ts` | Crunch columns, Flow process data |
| `admin.ts` | Account, profile, company settings, notifications, activity |

## Conventions

- Each function is `async` and returns a typed interface (defined in the same module)
- DB row types are imported from `api/types.ts` (snake_case); adapter functions convert to camelCase interfaces
- `lookupUser(userMap, id, fallback)` replaces repeated user-name resolution patterns
- `toBool(val)` from `api/types.ts` normalizes localStorage int (0/1) vs JSON boolean
