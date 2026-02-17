# API Layer

REST-style in-process API backed by SQLite WASM (sql.js). Provides `GET(resource)` and `PUT(resource, body)` routing for all application data.

## Files

| File | Purpose |
|------|---------|
| `api.ts` | `GET()`/`PUT()` URL routing, `initApi()` entry point |
| `types.ts` | Row types (snake_case) matching SQL schema, `snakeToCamel` utility |
| `schema.ts` | SQL DDL (CREATE TABLE statements) for all 23 tables |
| `db.ts` | `DbAdapter` interface with `EntityStore<T>` and `SingletonStore<T>` patterns |
| `db-sqlite.ts` | SQLite WASM implementation with IndexedDB persistence |
| `seed.ts` | Mock data seeding for first-load population |
| `sql-js.d.ts` | Type declarations for the sql.js library |

## Architecture

The `DbAdapter` interface defines typed stores for every entity:

- **`EntityStore<T>`** — `getAll()`, `getById(id)`, `put(entity)`, `delete(id)` for multi-row tables
- **`SingletonStore<T>`** — `get()`, `put(entity)` for single-row config tables (account, company settings)

The SQLite WASM implementation (`db-sqlite.ts`) persists the database to IndexedDB so data survives page navigations.

## URL Routing

`GET()` and `PUT()` parse URL-style resource paths:

| Pattern | Example | Description |
|---------|---------|-------------|
| `/{collection}` | `GET("users")` | List all entities |
| `/{collection}/{id}` | `GET("ideas/abc")` | Single entity by ID |
| `/{parent}/{id}/{child}` | `GET("ideas/abc/scores")` | Nested resources |
| `/{collection}` | `PUT("users", body)` | Create or update entity |

## Database Tables (23)

users, ideas, idea_scores, projects, project_team, milestones, project_tasks, discussions, project_versions, edges, edge_outcomes, edge_metrics, activities, notifications, clarifications, crunch_columns, processes, process_steps, company_settings, notification_categories, notification_prefs, account_config, and 1 additional seeded table.

## Migration to Another Database

The `DbAdapter` interface is designed for easy migration to Postgres or other backends:

1. Implement the `DbAdapter` interface for the new database
2. Swap the import in `web-app/site/script.ts` from `db-sqlite` to the new implementation
3. All pages continue working unchanged — they only call `GET()`/`PUT()` through `data.ts`
