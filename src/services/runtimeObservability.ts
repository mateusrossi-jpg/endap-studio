import { EndapProject } from '../types/endap';
import { ForceState, getAllRungBlocks, MemoryMap } from './ladderRuntime';
import { EndapRuntimeEvent } from './runtimeEvents';

export type RuntimeObservabilitySeverity = 'ok' | 'warning' | 'fault';

export type RuntimeObservabilityMetric = {
  id: string;
  label: string;
  value: string;
  severity: RuntimeObservabilitySeverity;
  description: string;
};

export type RungTraceSummary = {
  rungId: string;
  title: string;
  energized: boolean;
  activeBlocks: number;
  totalBlocks: number;
  activeBranches: number;
  totalBranches: number;
  estimatedCostMs: number;
};

export type RuntimeObservabilitySnapshot = {
  generatedAt: string;
  scanCount: number;
  scanTimeMs: number;
  activeMemories: number;
  forcedVariables: number;
  activeOutputs: number;
  activeTimers: number;
  activeCounters: number;
  activeBranches: number;
  projectIssues: number;
  recentFaultEvents: number;
  recentWarningEvents: number;
  metrics: RuntimeObservabilityMetric[];
  rungTraces: RungTraceSummary[];
};

function severityFromScanTime(scanTimeMs: number): RuntimeObservabilitySeverity {
  if (scanTimeMs >= 25) return 'fault';
  if (scanTimeMs >= 12) return 'warning';
  return 'ok';
}

function severityFromCount(count: number, warningAt: number, faultAt: number): RuntimeObservabilitySeverity {
  if (count >= faultAt) return 'fault';
  if (count >= warningAt) return 'warning';
  return 'ok';
}

function boolSeverity(value: boolean): RuntimeObservabilitySeverity {
  return value ? 'warning' : 'ok';
}

function formatBool(value: boolean): string {
  return value ? 'ativo' : 'normal';
}

function estimateRungCost(totalBlocks: number, totalBranches: number): number {
  return Number((0.18 + totalBlocks * 0.08 + totalBranches * 0.12).toFixed(2));
}

export function createRuntimeObservabilitySnapshot(params: {
  project: EndapProject;
  memoryMap: MemoryMap;
  forceState: ForceState;
  scanCount: number;
  events: EndapRuntimeEvent[];
  projectIssues: number;
}): RuntimeObservabilitySnapshot {
  const { project, memoryMap, forceState, scanCount, events, projectIssues } = params;
  const scanTimeMs = project.ladderProgram.scanTimeMs;
  const allBlocks = project.ladderProgram.rungs.flatMap(getAllRungBlocks);
  const activeMemories = Object.values(memoryMap).filter(Boolean).length;
  const forcedVariables = Object.keys(forceState).length;
  const activeOutputs = allBlocks.filter((block) => ['coil', 'coil-set', 'coil-reset'].includes(block.kind) && block.active).length;
  const activeTimers = allBlocks.filter((block) => block.kind.startsWith('timer') && block.active).length;
  const activeCounters = allBlocks.filter((block) => block.kind === 'counter' && block.active).length;
  const activeBranches = project.ladderProgram.rungs.reduce(
    (total, rung) => total + (rung.branches ?? []).filter((branch) => branch.blocks.some((block) => block.active)).length,
    0
  );
  const recentFaultEvents = events.slice(0, 80).filter((event) => event.severity === 'fault').length;
  const recentWarningEvents = events.slice(0, 80).filter((event) => event.severity === 'warning').length;

  const rungTraces = project.ladderProgram.rungs.map((rung) => {
    const blocks = getAllRungBlocks(rung);
    const activeBlocks = blocks.filter((block) => block.active).length;
    const totalBranches = rung.branches?.length ?? 0;
    const activeBranchCount = (rung.branches ?? []).filter((branch) => branch.blocks.some((block) => block.active)).length;

    return {
      rungId: rung.id,
      title: rung.title,
      energized: activeBlocks > 0,
      activeBlocks,
      totalBlocks: blocks.length,
      activeBranches: activeBranchCount,
      totalBranches,
      estimatedCostMs: estimateRungCost(blocks.length, totalBranches)
    };
  });

  const metrics: RuntimeObservabilityMetric[] = [
    {
      id: 'scan-time',
      label: 'Tempo de scan',
      value: `${scanTimeMs} ms`,
      severity: severityFromScanTime(scanTimeMs),
      description: 'Tempo simulado do último ciclo de execução Ladder.'
    },
    {
      id: 'forced-variables',
      label: 'Variáveis forçadas',
      value: String(forcedVariables),
      severity: boolSeverity(forcedVariables > 0),
      description: 'FORCE ativo deve ser visível e tratado como condição operacional especial.'
    },
    {
      id: 'project-issues',
      label: 'Alertas de projeto',
      value: String(projectIssues),
      severity: severityFromCount(projectIssues, 1, 4),
      description: 'Problemas detectados por validação local antes de deploy.'
    },
    {
      id: 'fault-events',
      label: 'Falhas recentes',
      value: String(recentFaultEvents),
      severity: severityFromCount(recentFaultEvents, 1, 3),
      description: 'Eventos fault recentes registrados na timeline runtime.'
    },
    {
      id: 'warning-events',
      label: 'Warnings recentes',
      value: String(recentWarningEvents),
      severity: severityFromCount(recentWarningEvents, 3, 8),
      description: 'Eventos warning recentes registrados na timeline runtime.'
    },
    {
      id: 'active-memory',
      label: 'Memórias ativas',
      value: String(activeMemories),
      severity: 'ok',
      description: 'Quantidade de memórias internas energizadas no runtime local.'
    },
    {
      id: 'active-branches',
      label: 'Branches ativos',
      value: String(activeBranches),
      severity: 'ok',
      description: 'Branches OR com caminho lógico ativo no scan atual.'
    },
    {
      id: 'runtime-output',
      label: 'Saídas ativas',
      value: String(activeOutputs),
      severity: 'ok',
      description: `Estado de saída runtime: ${formatBool(activeOutputs > 0)}.`
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    scanCount,
    scanTimeMs,
    activeMemories,
    forcedVariables,
    activeOutputs,
    activeTimers,
    activeCounters,
    activeBranches,
    projectIssues,
    recentFaultEvents,
    recentWarningEvents,
    metrics,
    rungTraces
  };
}
