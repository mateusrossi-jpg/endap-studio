import { EndapProject } from '../types/endap';

const PROJECT_STORAGE_KEY = 'endap-studio:project';

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
  const parsedProject = JSON.parse(content) as EndapProject;

  if (!parsedProject.id || !parsedProject.gateway || !parsedProject.ladderProgram) {
    throw new Error('Arquivo ENDAP inválido.');
  }

  return parsedProject;
}
