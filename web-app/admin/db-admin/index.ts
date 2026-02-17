// ============================================
// FUSION AI — Database Admin Page
// Wipe, reload, import, export data operations.
// ============================================

import { getDbAdapter } from '../../../api/api';
import { seedData } from '../../../api/seed';
import { $, showToast, iconTrash, iconDownload, iconUpload, iconDatabase } from '../../site/script';

export async function init(): Promise<void> {
  const root = $('#db-admin-root');
  if (!root) return;

  root.innerHTML = `
    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--error)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--error))">${iconTrash(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Wipe All Data</h3>
          <p class="text-xs text-muted">Delete all records from every table.</p>
        </div>
      </div>
      <button class="btn btn-outline" id="db-wipe-btn" style="border-color:hsl(var(--error));color:hsl(var(--error))">Wipe Data</button>
    </div>

    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--primary)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--primary))">${iconDatabase(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Reload Mock Data</h3>
          <p class="text-xs text-muted">Wipe and re-seed with default mock data.</p>
        </div>
      </div>
      <button class="btn btn-primary" id="db-reload-btn">Reload Mock Data</button>
    </div>

    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--success)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--success))">${iconUpload(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Import Data Dump</h3>
          <p class="text-xs text-muted">Load data from a previously exported JSON file.</p>
        </div>
      </div>
      <label class="btn btn-outline" style="cursor:pointer;text-align:center">
        Choose File
        <input type="file" accept=".json" id="db-import-input" style="display:none" />
      </label>
    </div>

    <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:hsl(var(--warning)/0.1);display:flex;align-items:center;justify-content:center;color:hsl(var(--warning))">${iconDownload(20)}</div>
        <div>
          <h3 class="text-sm font-semibold">Export Data Dump</h3>
          <p class="text-xs text-muted">Download all data as a JSON file.</p>
        </div>
      </div>
      <button class="btn btn-outline" id="db-export-btn">Export Data</button>
    </div>
  `;

  // Wipe
  $('#db-wipe-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to wipe ALL data? This cannot be undone.')) return;
    try {
      await getDbAdapter().wipeAllData();
      showToast('All data wiped successfully.', 'success');
    } catch (e) {
      showToast('Failed to wipe data.', 'error');
    }
  });

  // Reload mock
  $('#db-reload-btn')?.addEventListener('click', async () => {
    try {
      const db = getDbAdapter();
      await db.wipeAllData();
      await seedData(db);
      showToast('Mock data reloaded successfully.', 'success');
    } catch (e) {
      showToast('Failed to reload mock data.', 'error');
    }
  });

  // Import
  const importInput = document.getElementById('db-import-input') as HTMLInputElement | null;
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await getDbAdapter().importDump(text);
      showToast('Data imported successfully.', 'success');
    } catch (e) {
      showToast('Failed to import data. Check file format.', 'error');
    }
    importInput.value = '';
  });

  // Export
  $('#db-export-btn')?.addEventListener('click', async () => {
    try {
      const json = await getDbAdapter().exportDump();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `fusion-ai-dump-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully.', 'success');
    } catch (e) {
      showToast('Failed to export data.', 'error');
    }
  });
}
