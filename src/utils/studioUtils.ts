import { WatchItem } from '../components/WatchTable';
import { EndapProject, EndapLadderBlock } from '../types/endap';
import { ForceState, MemoryMap, getAddress, getAllRungBlocks } from '../services/ladderRuntime';
import { ProjectIssue } from '../components/ProjectHealthPanel';
import { StudioSettings } from '../services/storage';

export function createWatchItems(project: EndapProject, memoryMap: MemoryMap, forceState: ForceState): WatchItem[] {
  const allBlocks = project.ladderProgram.rungs.flatMap(getAllRungBlocks);

  const timerItems = allBlocks
    .filter((block) => block.kind.startsWith('timer'))
    .map((block) => ({
      address: block.address ?? block.label,
      type: 'TIMER' as const,
      value: `${block.elapsedMs ?? 0}/${block.presetMs ?? 0} ms`,
      active: block.active,
      force: undefined,
      canToggle: false,
      canForce: false
    }));

  const counterItems = allBlocks
    .filter((block) => block.kind === 'counter')
    .map((block) => ({
      address: block.address ?? block.label,
      type: 'COUNTER' as const,
      value: `${block.accumulatedCount ?? 0}/${block.presetCount ?? 1}`,
      active: block.active,
      force: undefined,
      canToggle: false,
      canForce: false
    }));

  const coilItems = allBlocks
    .filter((block) => ['coil', 'coil-set', 'coil-reset'].includes(block.kind))
    .map((block) => ({
      address: block.address ?? block.label,
      type: 'COIL' as const,
      value: forceState[getAddress(block)] ? `FORCE ${forceState[getAddress(block)].target.toUpperCase()}` : block.active ? 'true' : 'false',
      active: forceState[getAddress(block)] ? forceState[getAddress(block)].target === 'on' : block.active,
      force: forceState[getAddress(block)]?.target,
      canToggle: false,
      canForce: true
    }));

  const memoryItems = Object.entries(memoryMap).map(([address, value]) => ({
    address,
    type: 'MEM' as const,
    value: forceState[address] ? `FORCE ${forceState[address].target.toUpperCase()}` : value ? 'true' : 'false',
    active: forceState[address] ? forceState[address].target === 'on' : value,
    force: forceState[address]?.target,
    canToggle: true,
    canForce: true
  }));

  return [...memoryItems, ...timerItems, ...counterItems, ...coilItems];
}

export function publishBooleanDiff(
  previous: MemoryMap,
  next: MemoryMap,
  publish: (address: string, value: boolean) => void
) {
  const addresses = new Set([...Object.keys(previous), ...Object.keys(next)]);
  addresses.forEach((address) => {
    if ((previous[address] ?? false) !== (next[address] ?? false)) publish(address, next[address] ?? false);
  });
}

export function resetRuntimeBlock(block: EndapLadderBlock): EndapLadderBlock {
  if (block.kind.startsWith('timer')) return { ...block, active: false, elapsedMs: 0 };
  if (block.kind === 'counter') return { ...block, active: false, accumulatedCount: 0, previousInput: false };
  if (['coil', 'coil-set', 'coil-reset', 'counter-reset', 'memory-contact-no', 'memory-contact-nc'].includes(block.kind)) return { ...block, active: false };
  return block;
}

export function validateProject(project: EndapProject, memoryMap: MemoryMap, forceState: ForceState, settings: StudioSettings): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const allBlocks = project.ladderProgram.rungs.flatMap(getAllRungBlocks);
  const addressCounts = new Map<string, number>();

  if (project.ladderProgram.rungs.length === 0) {
    issues.push({ id: 'program-empty', severity: 'fault', source: 'Ladder', message: 'Programa sem rungs.' });
  }

  project.ladderProgram.rungs.forEach((rung, index) => {
    if (rung.blocks.length === 0 && !rung.branches?.length) {
      issues.push({ id: `${rung.id}-empty`, severity: 'fault', source: `Rung ${index + 1}`, message: 'Rung sem blocos.' });
    }
    if (!getAllRungBlocks(rung).some((block) => ['coil', 'coil-set', 'coil-reset'].includes(block.kind))) {
      issues.push({ id: `${rung.id}-no-output`, severity: 'warning', source: `Rung ${index + 1}`, message: 'Rung sem bobina de saída.' });
    }
    if ((rung.branches ?? []).some((branch) => branch.blocks.length === 0)) {
      issues.push({ id: `${rung.id}-empty-branch`, severity: 'warning', source: `Rung ${index + 1}`, message: 'Branch OR vazia.' });
    }
  });

  allBlocks.forEach((block) => {
    const address = getAddress(block).trim();
    if (!block.label.trim()) {
      issues.push({ id: `${block.id}-label`, severity: 'fault', source: block.id, message: 'Bloco sem label.' });
    }
    if (!address) {
      issues.push({ id: `${block.id}-address`, severity: 'fault', source: block.label || block.id, message: 'Bloco sem endereço.' });
    }
    if (address) addressCounts.set(address, (addressCounts.get(address) ?? 0) + 1);
    if (block.kind.startsWith('timer') && (!block.presetMs || block.presetMs <= 0)) {
      issues.push({ id: `${block.id}-preset-ms`, severity: 'warning', source: block.label, message: 'Timer sem preset válido.' });
    }
    if (block.kind === 'counter' && (!block.presetCount || block.presetCount <= 0)) {
      issues.push({ id: `${block.id}-preset-count`, severity: 'warning', source: block.label, message: 'CTU sem preset de contagem válido.' });
    }
  });

  addressCounts.forEach((count, address) => {
    if (count > 1 && !address.startsWith('I')) {
      issues.push({ id: `dup-${address}`, severity: 'info', source: address, message: `${count} blocos usam o mesmo endereço.` });
    }
  });

  Object.keys(forceState).forEach((address) => {
    issues.push({ id: `force-${address}`, severity: 'warning', source: address, message: 'FORCE manual ativo na simulação.' });
  });

  if (settings.apiMode === 'gateway' && settings.gatewayBaseUrl.trim() === '') {
    issues.push({ id: 'gateway-url', severity: 'fault', source: 'Gateway', message: 'Modo gateway exige Base URL.' });
  }

  if (Object.keys(memoryMap).length === 0) {
    issues.push({ id: 'memory-empty', severity: 'info', source: 'Runtime', message: 'Nenhuma memória simulada registrada ainda.' });
  }

  return issues;
}

export const navItems = ['Ladder', 'Tags', 'IO', 'Gateway', 'Nós', 'Fail-safe', 'Diagnóstico', 'Dashboard', 'Integrações', 'Deploy'] as const;
export type NavItem = (typeof navItems)[number];

export function sectionIdForNavItem(item: NavItem) {
  const sectionByItem: Record<NavItem, string> = {
    Ladder: 'ladder-section',
    Tags: 'tags-section',
    IO: 'io-section',
    Gateway: 'gateway-section',
    Nós: 'nodes-section',
    'Fail-safe': 'failsafe-section',
    Diagnóstico: 'diagnostics-section',
    Dashboard: 'dashboard-section',
    Integrações: 'integrations-section',
    Deploy: 'snapshot-layout'
  };
  return sectionByItem[item];
}

export type ProjectHistoryEntry = {
  id: string;
  label: string;
  createdAt: string;
  project: EndapProject;
};

export function createHistoryEntry(project: EndapProject, label: string): ProjectHistoryEntry {
  return {
    id: `history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    createdAt: new Date().toISOString(),
    project
  };
}
