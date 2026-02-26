export interface PageEntry {
  title: string;
  layout: 'dashboard' | 'standalone';
}

export const PAGE_REGISTRY: Record<string, PageEntry> = {
  dashboard:                  { title: 'Dashboard',                layout: 'dashboard' },
  ideas:                      { title: 'Ideas',                    layout: 'dashboard' },
  projects:                   { title: 'Projects',                 layout: 'dashboard' },
  'project-detail':           { title: 'Project Detail',           layout: 'dashboard' },
  'engineering-requirements':  { title: 'Engineering Requirements',  layout: 'dashboard' },
  'idea-review-queue':        { title: 'Review Queue',             layout: 'dashboard' },
  edge:                       { title: 'Edge Definition',          layout: 'dashboard' },
  'edge-list':                { title: 'Edge List',                layout: 'dashboard' },
  crunch:                     { title: 'Crunch',                   layout: 'dashboard' },
  flow:                       { title: 'Flow',                     layout: 'dashboard' },
  team:                       { title: 'Teams',                    layout: 'dashboard' },
  account:                    { title: 'Account',                  layout: 'dashboard' },
  profile:                    { title: 'Profile',                  layout: 'dashboard' },
  'company-settings':         { title: 'Company Settings',         layout: 'dashboard' },
  'manage-users':             { title: 'Manage Users',             layout: 'dashboard' },
  'activity-feed':            { title: 'Activity Feed',            layout: 'dashboard' },
  'notification-settings':    { title: 'Notification Settings',    layout: 'dashboard' },
  snapshots:                  { title: 'Snapshots',                layout: 'dashboard' },
  'design-system':            { title: 'Design System',            layout: 'dashboard' },
  'idea-create':              { title: 'Create Idea',              layout: 'standalone' },
  'idea-convert':             { title: 'Convert Idea',             layout: 'standalone' },
  'approval-detail':          { title: 'Approval Detail',          layout: 'standalone' },
  auth:                       { title: 'Authentication',           layout: 'standalone' },
  landing:                    { title: 'Landing',                  layout: 'standalone' },
  onboarding:                 { title: 'Onboarding',               layout: 'standalone' },
  'not-found':                { title: '404 Not Found',            layout: 'standalone' },
};
