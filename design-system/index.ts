import {
  renderDashboardLayout, initDashboardLayout, $, escapeHtml,
  iconCheck, iconX, iconAlertTriangle, iconInfo, iconSearch, iconPlus,
  iconArrowRight, iconTrash, iconSun, iconMoon, iconMonitor,
} from '../site/script';

function colorSwatch(name: string, variable: string, style: string): string {
  return `<div style="display:flex;flex-direction:column;gap:0.5rem">
    <div style="height:4rem;width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));${style}"></div>
    <div class="text-sm font-medium">${name}</div>
    <code class="text-xs text-muted">${variable}</code>
  </div>`;
}

function typographyRow(label: string, cls: string, sample: string): string {
  return `<div style="display:flex;flex-direction:column;gap:0.25rem;padding:0.75rem 0;border-bottom:1px solid hsl(var(--border))">
    <code class="text-xs text-muted">${label}</code>
    <p class="${cls}">${sample}</p>
  </div>`;
}

export function render(): string {
  const content = `
    <div style="display:flex;flex-direction:column;gap:3rem;padding-bottom:4rem">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold font-display">Fusion AI Design System</h1>
        <p class="text-muted" style="margin-top:0.5rem">A production-ready design system for enterprise applications prioritizing clarity, trust, focus, and calm decision-making.</p>
      </div>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Brand Colors -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Brand Colors</h2><p class="text-muted mt-1">Primary brand colors for Fusion AI</p></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem" class="stats-grid">
          ${colorSwatch('Primary Blue', '--primary', 'background:hsl(var(--primary))')}
          ${colorSwatch('Primary Foreground', '--primary-foreground', 'background:hsl(var(--primary-foreground));border-width:2px')}
          ${colorSwatch('Accent Yellow', '--accent', 'background:hsl(var(--accent))')}
          ${colorSwatch('Accent Foreground', '--accent-foreground', 'background:hsl(var(--accent-foreground))')}
        </div>
      </section>

      <!-- Semantic Colors -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Semantic Colors</h2><p class="text-muted mt-1">Status and feedback colors (WCAG AA compliant)</p></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem" class="stats-grid">
          ${colorSwatch('Success', '--success', 'background:hsl(142 71% 45%)')}
          ${colorSwatch('Warning', '--warning', 'background:hsl(var(--warning))')}
          ${colorSwatch('Error', '--error', 'background:hsl(var(--error))')}
          ${colorSwatch('Info', '--info', 'background:hsl(var(--primary))')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem" class="stats-grid">
          ${colorSwatch('Success Soft', '--success-soft', 'background:hsl(var(--success-soft))')}
          ${colorSwatch('Warning Soft', '--warning-soft', 'background:hsl(var(--warning-soft))')}
          ${colorSwatch('Error Soft', '--error-soft', 'background:hsl(var(--error-soft))')}
          ${colorSwatch('Info Soft', '--info-soft', 'background:hsl(var(--primary)/0.1)')}
        </div>
      </section>

      <!-- UI Colors -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">UI Colors</h2><p class="text-muted mt-1">Background, surface, and border colors</p></div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:1.5rem" class="stats-grid">
          ${colorSwatch('Background', '--background', 'background:hsl(var(--background))')}
          ${colorSwatch('Foreground', '--foreground', 'background:hsl(var(--foreground))')}
          ${colorSwatch('Card', '--card', 'background:hsl(var(--card))')}
          ${colorSwatch('Muted', '--muted', 'background:hsl(var(--muted))')}
          ${colorSwatch('Border', '--border', 'background:hsl(var(--border))')}
          ${colorSwatch('Ring', '--ring', 'background:hsl(var(--ring))')}
        </div>
      </section>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Typography -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Typography</h2><p class="text-muted mt-1">IBM Plex Sans for display, Inter for body text</p></div>
        <div class="card" style="padding:1.5rem">
          ${typographyRow('text-4xl / font-display / font-bold', 'text-4xl font-display font-bold', 'Hero Headlines')}
          ${typographyRow('text-3xl / font-display / font-bold', 'text-3xl font-display font-bold', 'Page Titles')}
          ${typographyRow('text-2xl / font-semibold', 'text-2xl font-semibold', 'Section Headers')}
          ${typographyRow('text-xl / font-semibold', 'text-xl font-semibold', 'Subsection Headers')}
          ${typographyRow('text-lg / font-medium', 'text-lg font-medium', 'Card Titles')}
          ${typographyRow('text-base', 'text-base', 'Body text for general content and descriptions')}
          ${typographyRow('text-sm', 'text-sm', 'Dense body text for tables and lists')}
          ${typographyRow('text-xs', 'text-xs', 'Labels and helper text')}
          ${typographyRow('font-mono / text-sm', 'font-mono text-sm', "const code = 'monospace';")}
        </div>
      </section>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Buttons -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Buttons</h2><p class="text-muted mt-1">All button variants and sizes</p></div>
        <div class="card" style="padding:1.5rem">
          <h3 class="font-semibold mb-4">Variants</h3>
          <div class="flex flex-wrap gap-3 mb-4">
            <button class="btn btn-primary">Primary</button>
            <button class="btn btn-outline">Outline</button>
            <button class="btn btn-ghost">Ghost</button>
            <button class="btn btn-hero">Hero</button>
            <button class="btn btn-error">Error</button>
          </div>
          <div class="flex flex-wrap gap-3 mb-4">
            <button class="btn btn-primary" disabled>Disabled</button>
            <button class="btn btn-outline" disabled>Disabled Outline</button>
          </div>
          <h3 class="font-semibold mb-4">Sizes</h3>
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <button class="btn btn-primary btn-sm">Small</button>
            <button class="btn btn-primary">Default</button>
          </div>
          <h3 class="font-semibold mb-4">With Icons</h3>
          <div class="flex flex-wrap gap-3">
            <button class="btn btn-primary gap-2">${iconPlus(16)} Create</button>
            <button class="btn btn-outline gap-2">${iconSearch(16)} Search</button>
            <button class="btn btn-outline gap-2">Continue ${iconArrowRight(16)}</button>
            <button class="btn btn-error gap-2">${iconTrash(16)} Delete</button>
          </div>
        </div>
      </section>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Badges -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Badges</h2><p class="text-muted mt-1">Status indicators and labels</p></div>
        <div class="card" style="padding:1.5rem">
          <div class="flex flex-wrap gap-3 mb-4">
            <span class="badge badge-primary">Primary</span>
            <span class="badge badge-success">${iconCheck(12)} Approved</span>
            <span class="badge badge-warning">${iconAlertTriangle(12)} Pending</span>
            <span class="badge badge-error">${iconX(12)} Rejected</span>
            <span class="badge badge-default">Default</span>
          </div>
        </div>
      </section>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Form Elements -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Form Elements</h2><p class="text-muted mt-1">Input fields and text areas</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem" class="convert-grid">
          <div class="card" style="padding:1.5rem">
            <h3 class="font-semibold mb-4">Inputs</h3>
            <div style="display:flex;flex-direction:column;gap:1rem">
              <div><label class="label mb-1 text-sm">Default Input</label><input class="input" placeholder="Enter text..."/></div>
              <div><label class="label mb-1 text-sm">With Value</label><input class="input" value="Sample content"/></div>
              <div><label class="label mb-1 text-sm">Disabled</label><input class="input" disabled placeholder="Disabled input"/></div>
            </div>
          </div>
          <div class="card" style="padding:1.5rem">
            <h3 class="font-semibold mb-4">Textareas</h3>
            <div style="display:flex;flex-direction:column;gap:1rem">
              <div><label class="label mb-1 text-sm">Default Textarea</label><textarea class="textarea" placeholder="Enter longer text..."></textarea></div>
            </div>
          </div>
        </div>
      </section>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Cards -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Cards</h2><p class="text-muted mt-1">Content containers with consistent styling</p></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem" class="score-grid">
          <div class="card card-hover" style="padding:1.5rem">
            <h3 class="font-semibold mb-1">Interactive Card</h3>
            <p class="text-xs text-muted mb-2">With hover effect</p>
            <p class="text-sm text-muted">Hover over this card to see the subtle shadow effect.</p>
          </div>
          <div class="card" style="padding:1.5rem">
            <h3 class="font-semibold mb-1">Standard Card</h3>
            <p class="text-xs text-muted mb-2">No hover effect</p>
            <p class="text-sm text-muted">This card has no hover interaction, suitable for static content.</p>
          </div>
          <div class="card" style="padding:1.5rem;border:2px solid hsl(var(--primary)/0.2);background:hsl(var(--primary)/0.02)">
            <h3 class="font-semibold mb-1">Highlighted Card</h3>
            <p class="text-xs text-muted mb-2">With accent border</p>
            <p class="text-sm text-muted">Uses primary color border for emphasis.</p>
          </div>
        </div>
      </section>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Spacing -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Spacing System</h2><p class="text-muted mt-1">8pt grid for consistent spacing</p></div>
        <div class="card" style="padding:1.5rem">
          ${[
            { name: 'space-1', value: '4px', w: '0.25rem' },
            { name: 'space-2', value: '8px', w: '0.5rem' },
            { name: 'space-3', value: '12px', w: '0.75rem' },
            { name: 'space-4', value: '16px', w: '1rem' },
            { name: 'space-6', value: '24px', w: '1.5rem' },
            { name: 'space-8', value: '32px', w: '2rem' },
            { name: 'space-12', value: '48px', w: '3rem' },
            { name: 'space-16', value: '64px', w: '4rem' },
          ].map(s => `
            <div class="flex items-center gap-4" style="margin-bottom:0.75rem">
              <code class="text-xs text-muted" style="width:5rem">${s.name}</code>
              <div style="height:1rem;background:hsl(var(--primary));border-radius:0.25rem;width:${s.w}"></div>
              <span class="text-sm text-muted">${s.value}</span>
            </div>
          `).join('')}
        </div>
      </section>

      <hr style="border:none;border-top:1px solid hsl(var(--border))"/>

      <!-- Guidelines -->
      <section style="display:flex;flex-direction:column;gap:1.5rem">
        <div><h2 class="text-2xl font-semibold font-display">Usage Guidelines</h2><p class="text-muted mt-1">Do's and don'ts for the design system</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem" class="convert-grid">
          <div class="card" style="padding:1.5rem;border-color:hsl(142 71% 45%/0.3);background:hsl(var(--success-soft)/0.3)">
            <h3 class="font-semibold text-success flex items-center gap-2 mb-4">${iconCheck(20)} Do</h3>
            <div class="text-sm" style="display:flex;flex-direction:column;gap:0.5rem">
              <p>Use semantic color tokens, not raw hex values</p>
              <p>Maintain consistent spacing with the 8pt grid</p>
              <p>Ensure all interactive elements have focus states</p>
              <p>Use the proper typography scale for hierarchy</p>
              <p>Test contrast ratios for accessibility</p>
            </div>
          </div>
          <div class="card" style="padding:1.5rem;border-color:hsl(var(--error)/0.3);background:hsl(var(--error-soft)/0.3)">
            <h3 class="font-semibold text-error flex items-center gap-2 mb-4">${iconX(20)} Don't</h3>
            <div class="text-sm" style="display:flex;flex-direction:column;gap:0.5rem">
              <p>Use pure black (#000) for text</p>
              <p>Create custom colors outside the system</p>
              <p>Use decorative animations</p>
              <p>Skip focus states on interactive elements</p>
              <p>Mix typography scales inconsistently</p>
            </div>
          </div>
        </div>
      </section>
    </div>`;
  return renderDashboardLayout(content);
}

export function init(): void {
  initDashboardLayout();
}
