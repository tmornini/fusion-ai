export interface PageEntry {
  title: string;
  layout: 'sidebar' | 'standalone';
  sourceDir?: string;
  sourceFile?: string;  // basename without extension; defaults to 'index'
}

export const PAGE_REGISTRY: Record<string, PageEntry> = {
  dashboard:                  { title: 'Dashboard',                layout: 'sidebar' },
  ideas:                      { title: 'Ideas',                    layout: 'sidebar' },
  'idea-detail':              { title: 'Idea Detail',              layout: 'sidebar',    sourceDir: 'ideas/detail' },
  projects:                   { title: 'Projects',                 layout: 'sidebar' },
  'project-detail':           { title: 'Project Detail',           layout: 'sidebar' },
  'engineering-requirements':  { title: 'Engineering Requirements',  layout: 'sidebar' },
  'idea-review-queue':        { title: 'Review Queue',             layout: 'sidebar',    sourceDir: 'ideas/review-queue' },
  edge:                       { title: 'Edge Definition',          layout: 'sidebar' },
  'edge-list':                { title: 'Edge List',                layout: 'sidebar',    sourceDir: 'edge', sourceFile: 'list' },
  crunch:                     { title: 'Crunch',                   layout: 'sidebar' },
  flow:                       { title: 'Flow',                     layout: 'sidebar' },
  'flow-detail':              { title: 'Flow Detail',              layout: 'sidebar' },
  team:                       { title: 'Teams',                    layout: 'sidebar' },
  account:                    { title: 'Account',                  layout: 'sidebar' },
  profile:                    { title: 'Profile',                  layout: 'sidebar' },
  settings:                   { title: 'Company Settings',         layout: 'sidebar' },
  'manage-users':             { title: 'Manage Users',             layout: 'sidebar' },
  'activity-feed':            { title: 'Activity Feed',            layout: 'sidebar' },
  snapshots:                  { title: 'Snapshots',                layout: 'sidebar' },
  'design-system':            { title: 'Design System',            layout: 'sidebar' },
  'idea-create':              { title: 'Create Idea',              layout: 'standalone', sourceDir: 'ideas/create' },
  'idea-convert':             { title: 'Convert Idea',             layout: 'standalone', sourceDir: 'ideas/convert' },
  'approval-detail':          { title: 'Approval Detail',          layout: 'standalone' },
  auth:                       { title: 'Authentication',           layout: 'standalone' },
  landing:                    { title: 'Landing',                  layout: 'standalone' },
  onboarding:                 { title: 'Onboarding',               layout: 'standalone' },
  'not-found':                { title: '404 Not Found',            layout: 'standalone' },
};
