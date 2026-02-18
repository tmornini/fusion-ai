# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm install            # Install dependencies (sql.js)
./build                # Compile, bundle, minify, and create distribution ZIP
```

No test framework is configured.

## Architecture

**Vanilla TypeScript** with sql.js (SQLite WASM) as the only runtime browser dependency. This is an enterprise innovation management platform with modules for ideas, projects, teams, and analytics (Edge, Crunch, Flow). Every page is a standalone HTML file that works via HTTP server.

### Key Layers

- **HTML Composition**: A build step (`web-app/site/compose.ts`) merges `web-app/site/layout.html` (shared sidebar/header) with each page's `index.html` to produce standalone composed `index.html` files in a temp build directory. 8 standalone pages have hand-written `index.html` that are copied directly to the build output.
- **Navigation**: Standard `<a href>` links between pages. Parameterized pages use query strings (`?ideaId=1`). `navigateTo(page, params?)` helper constructs relative URLs for programmatic navigation.
- **Layout**: Dashboard pages share a layout template with sidebar, header, search, notifications, and theme toggle. Mobile layout uses CSS media queries (not JS) to swap between desktop sidebar and mobile drawer.
- **Page Detection**: `<html data-page="dashboard">` attribute is read by JS on `DOMContentLoaded` to dispatch to the correct page module's `init()`.
- **Auth**: Mock auth returning `demo@example.com`.
- **Data**: REST-style API layer (`api/`) backed by SQLite WASM. The `web-app/site/data.ts` file contains ~27 async adapter functions that call `GET()`/`PUT()` and convert normalized DB rows into the denormalized shapes pages expect.
- **Database**: SQLite WASM via sql.js, persisted to IndexedDB across page navigations. On first load, seed data is automatically populated. A db-admin page provides wipe, reload, import, and export operations.
- **State**: Simple module-level variables + pub-sub pattern for theme (persisted to localStorage), mobile detection (matchMedia), auth, and sidebar state.

### API Layer (`/api`)

The API layer is a set of TypeScript modules that provide a REST-style interface to the database:

- **`api/types.ts`** — Row types (snake_case) matching SQL schema, plus `snakeToCamel` utility
- **`api/schema.ts`** — SQL DDL (CREATE TABLE statements)
- **`api/db.ts`** — `DbAdapter` interface with `EntityStore<T>` and `SingletonStore<T>` patterns
- **`api/db-sqlite.ts`** — SQLite WASM implementation with IndexedDB persistence
- **`api/api.ts`** — `GET(resource)` / `PUT(resource, body)` URL routing
- **`api/seed.ts`** — Mock data seeding function

The `DbAdapter` interface is designed for easy migration to Postgres or other backends — implement the same interface and swap the import.

### Page Module Pattern

All page folders uniformly contain `index.ts` and `index.html`. Each `index.ts` exports:
- `init(): Promise<void>` — fetches data, populates DOM placeholders, binds event listeners

Dashboard pages have `index.html` containing page content that gets composed with the layout template. Standalone pages have a complete hand-written `index.html` with a `<div id="page-root">` that `init()` renders into.

### Dark Mode

CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark). Toggle persists to `localStorage` and carries across page navigation. Supports system preference detection via `prefers-color-scheme`.

## UI & Styling

### Component Library

All UI components are vanilla HTML/CSS with ARIA attributes, defined as CSS classes in `web-app/site/style.css` and helper functions in `web-app/site/script.ts`. No external component library.

### Design System

Full spec in `DESIGN-SYSTEM.md`. Key constraints:

- **Colors**: Primary Blue `#4B6CA1`, Primary Yellow `#FDD31D`. Never use pure black `#000` — all grays are blue-tinted. All colors defined as CSS custom properties.
- **Typography**: Display = IBM Plex Sans, Body = Inter, Mono = IBM Plex Mono. Self-hosted woff2 files in `web-app/site/fonts/`.
- **Spacing**: 8px grid system.
- **Icons**: ~80+ inline SVG functions in `web-app/site/script.ts`. Each returns an SVG string: `iconSparkles(size, cssClass)`.
- **Toasts**: `showToast(message, type)` function with auto-dismiss.
- **Charts**: SVG rendering functions in `web-app/site/charts.ts` (bar, line, donut, area).
- **Dark mode**: CSS custom properties with `data-theme` attribute.

### Mobile Responsiveness

CSS media queries in `web-app/site/style.css` show/hide desktop vs mobile header and sidebar. Mobile sidebar uses Sheet (slide-in drawer) toggled by JS. Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px.

## Project Structure

```
package.json                  # Dependencies (sql.js)
build                         # Executable build script

api/
  types.ts                    # Row types (snake_case), snakeToCamel utility
  schema.ts                   # SQL DDL for all tables
  db.ts                       # DbAdapter interface (EntityStore, SingletonStore)
  db-sqlite.ts                # SQLite WASM implementation with IndexedDB persistence
  api.ts                      # GET/PUT URL routing
  seed.ts                     # Mock data seeding
  sql-js.d.ts                 # Type declarations for sql.js

web-app/
  index.html                  # Redirects to landing/index.html
  site/
    tsconfig.json             # TypeScript config
    layout.html               # Shared dashboard layout template (sidebar, header)
    compose.ts                # Build-time script: layout + page → composed index.html
    style.css                 # All CSS: tokens, components, layouts, utilities
    script.ts                 # Page dispatch, state, icons, navigation, layout behavior
    data.ts                   # ~27 async adapter functions (API → frontend shapes)
    charts.ts                 # SVG chart rendering (bar, line, donut, area)
    command-palette.ts        # Cmd+K search overlay with keyboard navigation
    favicon.ico               # Application favicon
    fonts/                    # Self-hosted woff2 files

  # Core pages — ideas, projects, and related workflows
  core/
    dashboard/                # Dashboard with gauge cards
    ideas/                    # Ideas list
    idea-create/              # Multi-step idea wizard (standalone)
    idea-scoring/             # AI scoring display (standalone)
    idea-convert/             # Idea-to-project conversion (standalone)
    idea-review-queue/        # Review queue
    approval-detail/          # Review decision page (standalone)
    projects/                 # Projects list
    project-detail/           # Project detail (tabbed)
    engineering-requirements/ # Engineering requirements

  # Tools — Edge, Crunch, Flow analytics
  tools/
    edge/                     # Edge definition (per-idea)
    edge-list/                # Edge list view
    crunch/                   # Data labeling tool
    flow/                     # Process documentation

  # Admin — account, team, and settings
  admin/
    team/                     # Team roster
    account/                  # Account overview
    profile/                  # Profile settings
    company-settings/         # Company settings
    manage-users/             # User administration
    activity-feed/            # Activity feed
    notification-settings/    # Notification preferences
    db-admin/                 # Database admin (wipe, reload, import, export)

  # Reference
  reference/
    design-system/            # Component gallery

  # Entry — public-facing pages
  entry/
    landing/                  # Landing page (standalone)
    auth/                     # Login/signup (standalone)
    onboarding/               # Welcome screen (standalone)

  # System
  system/
    not-found/                # 404 page (standalone)

DESIGN-SYSTEM.md              # Design system specification
TEST-PLAN.md                  # Human-executable test plan (146 cases)
```

Each page directory contains `index.ts` + `index.html`. Build output goes to a temp directory — no build artifacts in the repo.

## Build

The `build` script requires a clean git working directory (no uncommitted changes), then:
1. Composes HTML pages: runs `web-app/site/compose.ts` to merge `layout.html` with each dashboard page's `index.html`, producing 19 composed files in a temp build directory
2. Copies 8 standalone pages' `index.html` to the build directory
3. Bundles TypeScript into a single IIFE (`site/app.js`) via esbuild into the build directory
4. Copies static assets (`web-app/site/style.css`, `web-app/site/fonts/`, `web-app/site/favicon.ico`, `web-app/index.html`) to the build directory
5. Copies `sql-wasm.wasm` from node_modules to the build directory
6. Creates a distribution ZIP (`fusion-ai-<sha>.zip`) on `~/Desktop`

No build artifacts are created in the repo — everything is assembled in `/tmp/`.
