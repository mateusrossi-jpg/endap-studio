import { EndapProject } from '../types/endap';

const PROJECT_STORAGE_KEY = 'endap-studio:project';
const SETTINGS_STORAGE_KEY = 'endap-studio:settings';
const SNAPSHOTS_STORAGE_KEY = 'endap-studio:snapshots';
const FORCE_STATE_STORAGE_KEY = 'endap-studio:forceState';
const MAX_SNAPSHOTS = 12;

export type StudioSettings = {
  apiMode: 'mock' | 'gateway';
  gatewayBaseUrl: string;
  theme: 'dark' | 'light';
  autoSave: boolean;
};

export const defaultStudioSettings: StudioSettings = {
  apiMode: 'mock',
  gatewayBaseUrl: 'http://192.168.4.1',
  theme: 'dark',
  autoSave: true
};

export type StudioProjectSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  project: EndapProject;
};

export function saveProjectToStorage(project: EndapProject): void {
  window.localStorage.setItem(
    PROJECT_STORAGE_KEY,
    JSON.stringify({
      ...project,
      updatedAt: new Date().toISOString()
    })
  );
}

export function loadForceStateFromStorage(): Record<string, any> {
  const rawForce = window.localStorage.getItem(FORCE_STATE_STORAGE_KEY);
  if (!rawForce) return {};
  try {
    return JSON.parse(rawForce);
  } catch {
    window.localStorage.removeItem(FORCE_STATE_STORAGE_KEY);
    return {};
  }
}

export function saveForceStateToStorage(forceState: Record<string, any>): void {
  window.localStorage.setItem(FORCE_STATE_STORAGE_KEY, JSON.stringify(forceState));
}

export function loadProjectFromStorage(): EndapProject | null {
  const rawProject = window.localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!rawProject) return null;

  try {
    return JSON.parse(rawProject) as EndapProject;
  } catch {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    return null;
  }
}

export function clearStoredProject(): void {
  window.localStorage.removeItem(PROJECT_STORAGE_KEY);
}

export function loadProjectSnapshots(): StudioProjectSnapshot[] {
  const rawSnapshots = window.localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
  if (!rawSnapshots) return [];

  try {
    const parsedSnapshots = JSON.parse(rawSnapshots) as unknown;
    if (!Array.isArray(parsedSnapshots)) return [];
    return parsedSnapshots.filter(isProjectSnapshotShape);
  } catch {
    window.localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
    return [];
  }
}

export function saveProjectSnapshot(project: EndapProject, name?: string): StudioProjectSnapshot {
  const snapshots = loadProjectSnapshots();
  const snapshot: StudioProjectSnapshot = {
    id: `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name?.trim() || `${project.name} snapshot`,
    createdAt: new Date().toISOString(),
    project: {
      ...project,
      updatedAt: new Date().toISOString()
    }
  };

  window.localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify([snapshot, ...snapshots].slice(0, MAX_SNAPSHOTS)));
  return snapshot;
}

export function deleteProjectSnapshot(id: string): void {
  const snapshots = loadProjectSnapshots().filter((snapshot) => snapshot.id !== id);
  window.localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
}

export function saveStudioSettings(settings: StudioSettings): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function loadStudioSettings(): StudioSettings {
  const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!rawSettings) return defaultStudioSettings;

  try {
    const parsedSettings = JSON.parse(rawSettings) as Partial<StudioSettings>;
    return {
      apiMode: parsedSettings.apiMode === 'gateway' ? 'gateway' : 'mock',
      gatewayBaseUrl: parsedSettings.gatewayBaseUrl || defaultStudioSettings.gatewayBaseUrl,
      theme: parsedSettings.theme === 'light' ? 'light' : 'dark',
      autoSave: typeof parsedSettings.autoSave === 'boolean' ? parsedSettings.autoSave : true
    };
  } catch {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return defaultStudioSettings;
  }
}

export function exportProjectAsJson(project: EndapProject): string {
  return JSON.stringify(
    {
      ...project,
      updatedAt: new Date().toISOString()
    },
    null,
    2
  );
}

export function downloadProjectBackup(project: EndapProject): void {
  const json = exportProjectAsJson(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.endap.json`;
  anchor.click();

  URL.revokeObjectURL(url);
}

export async function importProjectFromFile(file: File): Promise<EndapProject> {
  const content = await file.text();
  const parsedProject = JSON.parse(content) as unknown;

  if (!isEndapProjectShape(parsedProject)) {
    throw new Error('Arquivo ENDAP inválido.');
  }

  return parsedProject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEndapProjectShape(value: unknown): value is EndapProject {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id.trim() === '') return false;
  if (typeof value.name !== 'string' || value.name.trim() === '') return false;
  if (!isRecord(value.gateway)) return false;
  if (!isRecord(value.ladderProgram)) return false;

  const ladderProgram = value.ladderProgram;
  if (!Array.isArray(ladderProgram.rungs)) return false;

  return ladderProgram.rungs.every((rung) => isRecord(rung) && typeof rung.id === 'string' && Array.isArray(rung.blocks));
}

function isProjectSnapshotShape(value: unknown): value is StudioProjectSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'string' &&
    isEndapProjectShape(value.project)
  );
}
