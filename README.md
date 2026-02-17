# Fusion AI

Enterprise innovation management platform for capturing ideas, defining business cases, and tracking projects through approval and execution.

## Overview

Vanilla TypeScript with SQLite WASM (sql.js) for in-browser data persistence. Every page is a standalone HTML file served via any HTTP server.

### Modules

- **Ideas** — submit, score, and review innovation ideas
- **Edge** — define business outcomes, metrics, and expected impact
- **Crunch** — data labeling and evidence gathering
- **Flow** — process documentation and workflow management
- **Projects** — track approved ideas through execution
- **Teams** — team roster and assignments
- **Account** — organization settings, users, billing, and activity
- **DB Admin** — database management (wipe, reload, import, export)

## Getting Started

```sh
git clone <repo-url>
cd fusion-ai
npm install
```

Preview locally:

```sh
python3 -m http.server 8080
# then open http://localhost:8080/landing/index.html
```

## Build

```sh
./build
```

Requires a clean git working directory. The build:
1. Composes dashboard pages by merging `web-app/site/layout.html` with each page's `index.html`
2. Bundles TypeScript via esbuild into a single JS file
3. Copies sql-wasm.wasm for SQLite WASM support
4. Produces a distribution ZIP named `fusion-ai-<sha>.zip`

## Tech Stack

- TypeScript (vanilla, no framework)
- SQLite WASM (sql.js) with IndexedDB persistence
- REST-style API layer (`api/`) with `DbAdapter` interface
- Build-time HTML composition (shared layout + per-page content)
- CSS custom properties with light/dark theme support
- Standard `<a href>` navigation between standalone HTML pages
- SVG charts (bar, line, donut, area)
- 80+ inline SVG icons
- Self-hosted IBM Plex Sans, Inter, and IBM Plex Mono fonts

## Architecture

```
api/          # Database abstraction, SQLite implementation, REST routing, seed data
web-app/      # Frontend pages, styles, scripts, layout templates
  site/       # Shared CSS, TypeScript, HTML layout, fonts
  core/       # Ideas, projects, and related workflows
  tools/      # Edge, Crunch, Flow analytics
  admin/      # Account, team, settings, db-admin
  entry/      # Landing, auth, onboarding
```
