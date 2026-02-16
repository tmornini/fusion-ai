# Fusion AI

Enterprise innovation management platform for capturing ideas, defining business cases, and tracking projects through approval and execution.

## Overview

Vanilla TypeScript single-page application with zero runtime browser dependencies. Works via any HTTP server or by opening `index.html` directly in a browser.

### Modules

- **Ideas** — submit, score, and review innovation ideas
- **Edge** — define business outcomes, metrics, and expected impact
- **Crunch** — data labeling and evidence gathering
- **Flow** — process documentation and workflow management
- **Projects** — track approved ideas through execution
- **Teams** — team roster and assignments
- **Account** — organization settings, users, billing, and activity

## Getting Started

```sh
git clone <repo-url>
cd fusion-ai
npm install
```

Preview locally:

```sh
python3 -m http.server 8080
```

Or open `index.html` directly in a browser.

## Build

```sh
./build
```

Requires a clean git working directory. Compiles TypeScript via esbuild into a single bundled JS file and produces a distribution ZIP named `fusion-ai-<sha>.zip`.

## Tech Stack

- TypeScript (vanilla, no framework)
- CSS custom properties with light/dark theme support
- Hash-based client-side routing
- SVG charts (bar, line, donut, area)
- 80+ inline SVG icons
- Self-hosted IBM Plex Sans, Inter, and IBM Plex Mono fonts
