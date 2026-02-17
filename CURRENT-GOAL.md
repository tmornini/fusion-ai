# GOAL

Plan an in-app (method call per API endpoint) REST API for application state.

Take your time and really think this through step-by-step as this is a very critical piece of infrastructure so get this right!

Use JSON bodies with PUT and GET nouns.

Focus on basic entity storage and retrieval, not on specialized per-page optimized endpoints.

Move these into /web-app:
  /admin
  /core
  /entry
  /reference
  /site
  /system
  /tools
  index.html

Move tsconfig.json into /web-app/site/

Update build, CLAUDE.md, DESIGN-SYSTEM.md, README.md and anything else you believe should be updated.

Analyze which JSON entity names and forms fit this system.

Analyze ideal API URLS to locate those entities.

Put the code in /api.

Store the data in SQLite WASM

Provide a db-admin page to the site to 1) wipe all exisitng data, 2) reload currently mocked data, 3) refresh data from uploaded data dump, and 4) download a data dump file that contains all current entities.

We'll want to graduate to Postgres, so make it trivial to swap in a different DB external DB later.
