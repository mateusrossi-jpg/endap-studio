import { EndapProject } from '../types/endap';

const PROJECT_STORAGE_KEY = 'endap-studio:project';
const SETTINGS_STORAGE_KEY = 'endap-studio:settings';

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

export function saveProjectToStorage(project: EndapProject): void {
  window.localStorage.setItem(
    PROJECT_STORAGE_KEY,
    JSON.stringify({
      ...project,
      updatedAt: new Date().toISOString()
    })
  );
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
