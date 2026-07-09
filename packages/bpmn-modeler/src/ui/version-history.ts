import { getDiagramVersions, saveDiagramVersion } from '../services/firestoreService';
import { loadDiagramInNewTab } from '../state/tab-manager';
import { state } from '../state';
import { getDiagramXml } from '../services/xml-service';
import { Toast } from '@atlas/ui';
import { on } from '@atlas/ui';

let container: HTMLElement | null = null;
let currentDiagramId: string | null = null;

export function initVersionHistory() {
  container = document.createElement('div');
  container.className = 'version-history-panel';
  container.innerHTML = `
    <div class="version-history-header">
      <h3>Version History</h3>
      <button id="btn-save-version" class="btn btn-primary btn-sm">Save Version</button>
    </div>
    <div class="version-history-list" id="version-list">
      <div class="empty-state">No versions saved yet.</div>
    </div>
  `;

  // We can attach it to a sidebar or a modal, but for now we'll append to the body or a specific UI container.
  // We will assume there's a `.sidebar` or we can just append to `.app-container`.
  // Wait, let's look at how other UI components are attached.

  // Let's hide it by default and toggle it
  container.style.display = 'none';
  container.style.position = 'absolute';
  container.style.right = '0';
  container.style.top = '50px';
  container.style.width = '300px';
  container.style.bottom = '0';
  container.style.backgroundColor = 'var(--surface)';
  container.style.borderLeft = '1px solid var(--border)';
  container.style.zIndex = '100';
  container.style.padding = '1rem';
  container.style.overflowY = 'auto';
  container.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.1)';

  document.body.appendChild(container);

  on(document.getElementById('btn-save-version')!, 'click', async () => {
    if (!state.modeler || !state.activeTabId) return;
    const label = prompt('Enter a label for this version:');
    if (label === null) return; // cancelled

    const xml = await getDiagramXml(state.modeler);
    try {
      await saveDiagramVersion(state.activeTabId, xml, label || 'Auto-saved version');
      Toast.show('Version saved successfully', 'success');
      await refreshVersions();
    } catch (e) {
      console.error(e);
      Toast.show('Error saving version', 'error');
    }
  });
}

export function toggleVersionHistory() {
  if (!container) return;
  if (container.style.display === 'none') {
    container.style.display = 'block';
    refreshVersions();
  } else {
    container.style.display = 'none';
  }
}

export async function refreshVersions() {
  if (!state.activeTabId) return;
  currentDiagramId = state.activeTabId;
  const listEl = document.getElementById('version-list');
  if (!listEl) return;

  listEl.innerHTML = '<div class="loading">Loading versions...</div>';

  try {
    const versions = await getDiagramVersions(currentDiagramId);
    if (versions.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No versions saved yet.</div>';
      return;
    }

    listEl.innerHTML = versions
      .map((v) => {
        const dateStr = v.created_at?.toDate
          ? v.created_at.toDate().toLocaleString()
          : new Date().toLocaleString();
        return `
      <div class="version-item" style="padding: 10px; border-bottom: 1px solid var(--border); margin-bottom: 5px;">
        <div style="font-weight: 500;">${v.label || 'Untitled Version'}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</div>
        <button class="btn btn-secondary btn-sm restore-btn" data-id="${v.id}" style="margin-top: 5px;">Restore</button>
      </div>
    `;
      })
      .join('');

    listEl.querySelectorAll('.restore-btn').forEach((btn) => {
      on(btn as HTMLElement, 'click', async (e) => {
        const id = (e.target as HTMLElement).getAttribute('data-id');
        const version = versions.find((v) => v.id === id);
        if (version) {
          if (
            confirm(
              'Are you sure you want to restore this version? Current unsaved changes will be lost.'
            )
          ) {
            await loadDiagramInNewTab(
              state,
              version.xml,
              `Restored ${version.label || version.id}.bpmn`
            );
            toggleVersionHistory();
          }
        }
      });
    });
  } catch (e) {
    console.error(e);
    listEl.innerHTML = '<div class="error">Failed to load versions from Firebase Firestore.</div>';
  }
}
