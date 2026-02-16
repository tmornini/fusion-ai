# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
./build              # Compile, bundle, minify, and create distribution ZIP
```

To preview locally, open `index.html` directly in a browser (file://) or serve via any HTTP server:

```bash
python3 -m http.server 8080
```

No test framework is configured.

## Architecture

**Vanilla TypeScript** with zero runtime browser dependencies. This is an enterprise innovation management platform with modules for ideas, projects, teams, and analytics (Edge, Crunch, Flow). Every page is a standalone HTML file that works via both HTTP server and `file://` (double-click any `index.html`).

### Key Layers

- **HTML Composition**: A build step (`site/compose.ts`) merges `site/layout.html` (shared sidebar/header) with each page's `page.html` to produce standalone `index.html` files. 8 pages (landing, auth, onboarding, etc.) have hand-written `index.html` instead.
- **Navigation**: Standard `<a href>` links between pages. Parameterized pages use query strings (`?ideaId=1`). `navigateTo(page, params?)` helper constructs relative URLs for programmatic navigation.
- **Layout**: Dashboard pages share a layout template with sidebar, header, search, notifications, and theme toggle. Mobile layout uses CSS media queries (not JS) to swap between desktop sidebar and mobile drawer.
- **Page Detection**: `<html data-page="dashboard">` attribute is read by JS on `DOMContentLoaded` to dispatch to the correct page module's `init()`.
- **Auth**: Mock auth returning `demo@example.com`.
- **Data**: All mock data is in `site/data.ts` with ~27 async functions returning Promises — ready for API replacement.
- **State**: Simple module-level variables + pub-sub pattern for theme (persisted to localStorage), mobile detection (matchMedia), auth, and sidebar state.

### Page Module Pattern

Dashboard page folders contain `page.ts` and `page.html` — paired files where `page.ts` exports:
- `init(): Promise<void>` — fetches data, populates DOM placeholders, binds event listeners

Standalone page folders contain `index.ts` and a hand-written `index.html` with a `<div id="page-root">` that `init()` renders into.

### Dark Mode

CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark). Toggle persists to `localStorage` and carries across page navigation. Supports system preference detection via `prefers-color-scheme`.

## UI & Styling

### Component Library

All UI components are vanilla HTML/CSS with ARIA attributes, defined as CSS classes in `site/style.css` and helper functions in `site/script.ts`. No external component library.

### Design System

Full spec in `DESIGN_SYSTEM.md`. Key constraints:

- **Colors**: Primary Blue `#4B6CA1`, Primary Yellow `#FDD31D`. Never use pure black `#000` — all grays are blue-tinted. All colors defined as CSS custom properties.
- **Typography**: Display = IBM Plex Sans, Body = Inter, Mono = IBM Plex Mono. Self-hosted woff2 files in `fonts/`.
- **Spacing**: 8px grid system.
- **Icons**: ~80+ inline SVG functions in `site/script.ts` (replaces Lucide React). Each returns an SVG string: `iconSparkles(size, cssClass)`.
- **Toasts**: `showToast(message, type)` function with auto-dismiss.
- **Charts**: SVG rendering functions in `site/charts.ts` (bar, line, donut, area).
- **Dark mode**: CSS custom properties with `data-theme` attribute.

### Mobile Responsiveness

CSS media queries in `site/style.css` show/hide desktop vs mobile header and sidebar. Mobile sidebar uses Sheet (slide-in drawer) toggled by JS. Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px.

## Project Structure

```
index.html                    # Redirects to landing/index.html
site/
  layout.html                 # Shared dashboard layout template (sidebar, header)
  compose.ts                  # Build-time script: layout.html + page.html → index.html
  style.css                   # All CSS: tokens, components, layouts, utilities
  script.ts                   # Page dispatch, state, icons, navigation, layout behavior
  data.ts                     # ~27 async mock data functions + all interfaces
  charts.ts                   # SVG chart rendering (bar, line, donut, area)

# Dashboard pages (layout composed at build time from page.html + layout.html)
dashboard/                    # page.html + page.ts — Dashboard with gauge cards
ideas/                        # page.html + page.ts — Ideas list
projects/                     # page.html + page.ts — Projects list
project-detail/               # page.html + page.ts — Project detail (tabbed)
edge/                         # page.html + page.ts — Edge definition (per-idea)
edge-list/                    # page.html + page.ts — Edge list view
idea-review-queue/            # page.html + page.ts — Review queue
team/                         # page.html + page.ts — Team roster
crunch/                       # page.html + page.ts — Data labeling tool
flow/                         # page.html + page.ts — Process documentation
engineering-requirements/     # page.html + page.ts — Engineering requirements
account/                      # page.html + page.ts — Account overview
profile/                      # page.html + page.ts — Profile settings
company-settings/             # page.html + page.ts — Company settings
manage-users/                 # page.html + page.ts — User administration
activity-feed/                # page.html + page.ts — Activity feed
notification-settings/        # page.html + page.ts — Notification preferences
design-system/                # page.html + page.ts — Component gallery

# Standalone pages (hand-written index.html, no shared layout)
landing/                      # index.html + index.ts — Landing page
auth/                         # index.html + index.ts — Login/signup
onboarding/                   # index.html + index.ts — Welcome screen
idea-create/                  # index.html + index.ts — Multi-step idea wizard
idea-scoring/                 # index.html + index.ts — AI scoring display
idea-convert/                 # index.html + index.ts — Idea-to-project conversion
approval-detail/              # index.html + index.ts — Review decision page
not-found/                    # index.html + index.ts — 404

fonts/                        # Self-hosted woff2 files
build                         # Executable build script
tsconfig.json                 # TypeScript config
DESIGN_SYSTEM.md              # Design system specification
```

## Build

The `build` script requires a clean git working directory (no uncommitted changes), then:
1. Composes HTML pages: runs `site/compose.ts` to merge `layout.html` with each `page.html`, producing 18 `index.html` files
2. Bundles TypeScript into a single IIFE (`site/app.js`) via esbuild
3. Creates a distribution ZIP (`fusion-ai-<sha>.zip`) containing all `index.html` files, `site/style.css`, `site/app.js`, and `fonts/`

The composed `index.html` files and `site/app.js` are build artifacts (gitignored).
