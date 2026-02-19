// ============================================
// FUSION AI — Snapshots Page
// Wipe, reload, upload/download snapshot operations.
// ============================================

import { getDbAdapter } from '../../../api/api';
import { seedData } from '../../../api/seed';
import { $, showToast, iconTrash, iconDownload, iconUpload, iconDatabase, iconInfo } from '../../site/script';

const BANNER_ID = 'empty-banner';

async function updateEmptyBanner(root: HTMLElement): Promise<void> {
  const users = await getDbAdapter().users.getAll();
  const existing = document.getElementById(BANNER_ID);
  if (users.length === 0) {
    if (!existing) {
      const banner = document.createElement('div');
      banner.id = BANNER_ID;
      banner.className = 'card';
      banner.style.cssText = 'padding:1rem 1.25rem;display:flex;align-items:center;gap:0.75rem;grid-column:1/-1;background:hsl(var(--primary)/0.06);border:1px solid hsl(var(--primary)/0.2)';
      banner.innerHTML = `<span style="color:hsl(var(--primary));flex-shrink:0">${iconInfo(20)}</span>
        <p class="text-sm" style="margin:0">Your database is empty. Load mock data or upload a snapshot to get started.</p>`;
      root.prepend(banner);
    }
  } else {
    existing?.remove();
  }
}

export async function init(): Promise<void> {
  const root = $('#snapshots-root');
  if (!root) return;

  root.innerHTML = `
    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--success)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--success))">${iconDownload(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Download Snapshot</h3>
          <p class="text-xs text-muted">Download all data as a snapshot file.</p>
        </div>
      </div>
      <button class="btn btn-outline" id="download-btn" style="border-color:hsl(var(--success));color:hsl(var(--success))">Download Snapshot</button>
    </div>

    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--success)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--success))">${iconUpload(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Upload Snapshot</h3>
          <p class="text-xs text-muted">Load data from a previously downloaded snapshot file.</p>
        </div>
      </div>
      <label class="btn btn-outline" style="cursor:pointer;text-align:center;border-color:hsl(var(--success));color:hsl(var(--success))">
        Upload Snapshot
        <input type="file" accept=".json" id="upload-input" style="display:none" />
      </label>
    </div>

    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--warning)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--warning))">${iconDatabase(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Reload Mock Data</h3>
          <p class="text-xs text-muted">Wipe and re-seed with default mock data.</p>
        </div>
      </div>
      <button class="btn btn-outline" id="reload-btn" style="border-color:hsl(var(--warning));color:hsl(var(--warning))">Reload Mock Data</button>
    </div>

    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--error)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--error))">${iconTrash(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Wipe All Data</h3>
          <p class="text-xs text-muted">Delete all records from every table.</p>
        </div>
      </div>
      <button class="btn btn-outline" id="wipe-btn" style="border-color:hsl(var(--error));color:hsl(var(--error))">Wipe Data</button>
    </div>
  `;

  // Show empty-state banner if DB has no data
  await updateEmptyBanner(root);

  // Wipe
  $('#wipe-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to wipe ALL data? This cannot be undone.')) return;
    try {
      await getDbAdapter().wipeAllData();
      showToast('All data wiped successfully.', 'success');
      await updateEmptyBanner(root);
    } catch (e) {
      showToast('Failed to wipe data.', 'error');
    }
  });

  // Reload mock
  $('#reload-btn')?.addEventListener('click', async () => {
    try {
      const db = getDbAdapter();
      await db.wipeAllData();
      await seedData(db);
      await db.flush();
      window.location.href = '../index.html';
    } catch (e) {
      showToast('Failed to reload mock data.', 'error');
    }
  });

  // Upload snapshot
  const importInput = document.getElementById('upload-input') as HTMLInputElement | null;
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const db = getDbAdapter();
      await db.importSnapshot(text);
      await db.flush();
      window.location.href = '../index.html';
    } catch (e) {
      showToast('Failed to upload snapshot. Check file format.', 'error');
    }
    importInput.value = '';
  });

  // Download snapshot
  $('#download-btn')?.addEventListener('click', async () => {
    try {
      const json = await getDbAdapter().exportSnapshot();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `fusion-ai-snapshot-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Snapshot downloaded successfully.', 'success');
    } catch (e) {
      showToast('Failed to download snapshot.', 'error');
    }
  });
}
