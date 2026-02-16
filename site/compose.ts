// ============================================
// FUSION AI — Build-time HTML Composition
// Combines site/layout.html with per-page page.html
// to produce standalone dashboard/index.html files.
// ============================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..');

// Page name → { folder, title, isActive patterns }
const dashboardPages: Record<string, { folder: string; title: string }> = {
  dashboard:      { folder: 'dashboard',      title: 'Dashboard' },
  ideas:          { folder: 'ideas',           title: 'Ideas' },
  projects:       { folder: 'projects',        title: 'Projects' },
  team:           { folder: 'team',            title: 'Teams' },
  edge:           { folder: 'edge',            title: 'Edge Definition' },
  'edge-list':    { folder: 'edge-list',       title: 'Edge List' },
  'project-detail':          { folder: 'project-detail',          title: 'Project Detail' },
  account:                   { folder: 'account',                  title: 'Account' },
  profile:                   { folder: 'profile',                  title: 'Profile' },
  'company-settings':        { folder: 'company-settings',         title: 'Company Settings' },
  'manage-users':            { folder: 'manage-users',             title: 'Manage Users' },
  'activity-feed':           { folder: 'activity-feed',            title: 'Activity Feed' },
  'notification-settings':   { folder: 'notification-settings',    title: 'Notification Settings' },
  'engineering-requirements': { folder: 'engineering-requirements', title: 'Engineering Requirements' },
  crunch:         { folder: 'crunch',          title: 'Crunch' },
  flow:           { folder: 'flow',            title: 'Flow' },
  'design-system': { folder: 'design-system',  title: 'Design System' },
  'idea-review-queue': { folder: 'idea-review-queue', title: 'Review Queue' },
};

function compose(): void {
  const layoutPath = join(ROOT, 'site', 'layout.html');
  const layout = readFileSync(layoutPath, 'utf-8');

  let composed = 0;

  for (const [pageName, { folder, title }] of Object.entries(dashboardPages)) {
    const pageHtmlPath = join(ROOT, folder, 'page.html');

    if (!existsSync(pageHtmlPath)) {
      console.warn(`  skip: ${folder}/page.html not found`);
      continue;
    }

    const pageContent = readFileSync(pageHtmlPath, 'utf-8');

    let html = layout
      .replace('{{PAGE_NAME}}', pageName)
      .replace('{{PAGE_TITLE}}', title)
      .replace('<!-- PAGE_CONTENT -->', pageContent);

    const outDir = join(ROOT, folder);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const outPath = join(outDir, 'index.html');
    writeFileSync(outPath, html, 'utf-8');
    composed++;
  }

  console.log(`Composed ${composed} dashboard pages.`);
}

compose();
