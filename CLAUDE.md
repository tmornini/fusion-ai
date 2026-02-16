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

**Vanilla TypeScript SPA** with zero runtime browser dependencies. This is an enterprise innovation management platform with modules for ideas, projects, teams, and analytics (Edge, Crunch, Flow). The app works via both HTTP server and `file://` (double-click `index.html`).

### Key Layers

- **Routing**: Hash-based (`#/dashboard`, `#/ideas/123/edge`). All routes defined in `site/script.ts` via `route()` calls. A `matchRoute()` function handles static paths and `:param` segments.
- **Layout**: Most pages use `renderDashboardLayout(content)` which provides sidebar, top header, search, notifications, and theme toggle. Mobile uses a Sheet-based drawer sidebar.
- **Auth**: Mock auth returning `demo@example.com`.
- **Data**: All mock data is in `site/data.ts` with async functions returning Promises — ready for API replacement.
- **State**: Simple module-level variables + pub-sub pattern for theme (persisted to localStorage), mobile detection (matchMedia), auth, and sidebar state.

### Page Module Pattern

Each page folder contains `index.ts` exporting:
- `render(params?): string` — returns HTML string for the page
- `init(params?): void` — binds event listeners after DOM insertion

### Dark Mode

CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark). Toggle persists to `localStorage`. Supports system preference detection via `prefers-color-scheme`.

## UI & Styling

### Component Library

All UI components are vanilla HTML/CSS with ARIA attributes, defined as CSS classes in `site/style.css` and helper functions in `site/script.ts`. No external component library.

### Design System

Full spec in `docs/DESIGN_SYSTEM.md`. Key constraints:

- **Colors**: Primary Blue `#4B6CA1`, Primary Yellow `#FDD31D`. Never use pure black `#000` — all grays are blue-tinted. All colors defined as CSS custom properties.
- **Typography**: Display = IBM Plex Sans, Body = Inter, Mono = IBM Plex Mono. Self-hosted woff2 files in `fonts/`.
- **Spacing**: 8px grid system.
- **Icons**: ~80+ inline SVG functions in `site/script.ts` (replaces Lucide React). Each returns an SVG string: `iconSparkles(size, cssClass)`.
- **Toasts**: `showToast(message, type)` function with auto-dismiss.
- **Charts**: SVG rendering functions in `site/charts.ts` (bar, line, donut, area).
- **Dark mode**: CSS custom properties with `data-theme` attribute.

### Mobile Responsiveness

`matchMedia('(max-width: 767px)')` listener in `site/script.ts` detects mobile. `renderDashboardLayout` renders different header/sidebar for mobile vs desktop. Mobile sidebar uses Sheet (slide-in drawer). Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px.

## Project Structure

```
index.html                    # Single entry point
site/
  style.css                   # All CSS: tokens, components, layouts, utilities
  script.ts                   # Router, state, icons, shared UI functions
  data.ts                     # Async mock data functions
  charts.ts                   # SVG chart rendering (bar, line, donut, area)
landing/index.ts              # Landing page
auth/index.ts                 # Login/signup
onboarding/index.ts           # Welcome screen
dashboard/index.ts            # Dashboard with gauge cards
ideas/index.ts                # Ideas list
idea-create/index.ts          # Multi-step idea wizard
idea-scoring/index.ts         # AI scoring display
edge/index.ts                 # Edge definition (per-idea)
edge-list/index.ts            # Edge list view
idea-convert/index.ts         # Idea-to-project conversion
idea-review-queue/index.ts    # Review queue
approval-detail/index.ts      # Review decision page
projects/index.ts             # Projects list
project-detail/index.ts       # Project detail (tabbed)
engineering-requirements/index.ts  # Engineering requirements
team/index.ts                 # Team roster
crunch/index.ts               # Data labeling tool
flow/index.ts                 # Process documentation
account/index.ts              # Account overview
profile/index.ts              # Profile settings
company-settings/index.ts     # Company settings
manage-users/index.ts         # User administration
activity-feed/index.ts        # Activity feed
notification-settings/index.ts # Notification preferences
design-system/index.ts        # Component gallery
not-found/index.ts            # 404
fonts/                        # Self-hosted woff2 files
build                         # Executable build script (esbuild)
tsconfig.json                 # TypeScript config
docs/                         # Design system documentation
```

## Build

The `build` script requires a clean git working directory (no uncommitted changes), then:
1. Compiles TypeScript and bundles all page modules into a single IIFE (`site/app.js`)
2. Creates a distribution ZIP (`fusion-ai-<sha>.zip`) containing `index.html`, `site/style.css`, `site/app.js`, and `fonts/`
