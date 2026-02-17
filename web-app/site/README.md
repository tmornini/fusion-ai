# Site Infrastructure

Shared code and assets used by all pages in the application.

## Files

| File | Purpose |
|------|---------|
| `script.ts` | Page dispatch, state management, 80+ SVG icon functions, navigation helpers, toast notifications, sidebar/mobile behavior |
| `data.ts` | ~27 async adapter functions that call `GET()`/`PUT()` and convert normalized DB rows into the denormalized shapes pages expect |
| `style.css` | All CSS: design tokens, component classes, layout utilities, responsive breakpoints, dark mode overrides |
| `charts.ts` | SVG chart rendering functions (bar, line, donut, area) |
| `command-palette.ts` | Cmd+K search overlay with keyboard navigation and result rendering |
| `compose.ts` | Build-time script that merges `layout.html` with each page's `index.html` to produce composed standalone pages |
| `layout.html` | Shared dashboard layout template (sidebar, header, search, notifications, theme toggle) |
| `tsconfig.json` | TypeScript compiler configuration |
| `favicon.ico` | Application favicon |
| `fonts/` | Self-hosted woff2 font files (IBM Plex Sans, Inter, IBM Plex Mono) |

## Build-Time Composition

`compose.ts` reads `layout.html` and each dashboard page's `index.html`, then:

1. Finds the `<!-- PAGE_CONTENT -->` placeholder in the layout
2. Inserts the page's HTML content
3. Writes the composed file to the build output directory

This produces 19 composed pages. The remaining 8 standalone pages are copied directly.

## Key Exports from `script.ts`

- **Icons** — `iconSparkles(size, cssClass)`, `iconPlus()`, etc. (~80+ functions)
- **Navigation** — `navigateTo(page, params?)` constructs relative URLs
- **State** — pub-sub for theme, mobile detection, auth, sidebar state
- **Toast** — `showToast(message, type)` with auto-dismiss
- **Page dispatch** — reads `data-page` attribute on `DOMContentLoaded` to call the correct module's `init()`
