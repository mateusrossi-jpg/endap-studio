import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { GatewayContract } from './components/GatewayContract';
import { RuntimeTimeline } from './components/RuntimeTimeline';
import { WatchItem, WatchTable } from './components/WatchTable';
import { getMockProject } from './services/mockEndapApi';
import {
  branchIsEnergized,
  collectBranchStates,
  collectCoilStates,
  collectCounterDoneStates,
  collectTimerDoneStates,
  createBlock,
  evaluateRung,
  ForceState,
  ForceTarget,
  getAddress,
  getAllRungBlocks,
  MemoryMap,
  rungIsEnergized
} from './services/ladderRuntime';
import {
  createGatewayEvent,
  createMemoryChangedEvent,
  createModeChangedEvent,
  createRuntimeInfoEvent,
  createRuntimeWarningEvent,
  createScanEvent
} from './services/runtimeEvents';
import {
  clearStoredProject,
  downloadProjectBackup,
  importProjectFromFile,
  loadStudioSettings,
  loadProjectFromStorage,
  saveProjectToStorage,
  saveStudioSettings,
  StudioSettings
} from './services/storage';
import { EndapLadderBlock, EndapLadderBlockKind, EndapLadderBranch, EndapProject } from './types/endap';

const navItems = ['Ladder', 'IO', 'Gateway', 'Nós', 'Fail-safe', 'Diagnóstico'];
const AUTO_SCAN_INTERVAL_MS = 200;
const STEP_SCAN_DELTA_MS = 100;

type RuntimeMode = 'STOP' | 'RUN';
function blockClass(block: EndapLadderBlock, selected: boolean) {
  const cssKind = block.kind.replace('timer-', 'timer-');
  return `ladder-block ${cssKind} ${block.active ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`;
}

function blockSymbol(block: EndapLadderBlock) {
  if (block.kind === 'contact-no') return '[ ]';
  if (block.kind === 'contact-nc') return '[/]';
  if (block.kind === 'memory-contact-no') return '[M]';
  if (block.kind === 'memory-contact-nc') return '[/M]';
  if (block.kind === 'timer-ton') return 'TON';
  if (block.kind === 'timer-tof') return 'TOF';
  if (block.kind === 'counter') return 'CTU';
  if (block.kind === 'coil-set') return '(S)';
  if (block.kind === 'coil-reset') return '(R)';
  return '( )';
}

function blockKindLabel(block: EndapLadderBlock) {
  if (block.kind === 'contact-no') return 'Contato normalmente aberto';
  if (block.kind === 'contact-nc') return 'Contato normalmente fechado';
  if (block.kind === 'memory-contact-no') return 'Contato de memória NA';
  if (block.kind === 'memory-contact-nc') return 'Contato de memória NF';
  if (block.kind === 'timer-ton') return 'Temporizador TON';
  if (block.kind === 'timer-tof') return 'Temporizador TOF';
  if (block.kind === 'counter') return 'Contador';
  if (block.kind === 'coil-set') return 'Bobina SET retentiva';
  if (block.kind === 'coil-reset') return 'Bobina RESET retentiva';
  return 'Bobina de saída';
}

function timerProgress(block: EndapLadderBlock) {
  if (!block.presetMs) return 0;
  return Math.min(100, Math.round(((block.elapsedMs ?? 0) / block.presetMs) * 100));
}

function counterProgress(block: EndapLadderBlock) {
  const presetCount = block.presetCount ?? 1;
  if (presetCount <= 0) return 0;
  return Math.min(100, Math.round(((block.accumulatedCount ?? 0) / presetCount) * 100));
}

function createWatchItems(project: EndapProject, memoryMap: MemoryMap, forceState: ForceState): WatchItem[] {
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

function publishBooleanDiff(
  previous: MemoryMap,
  next: MemoryMap,
  publish: (address: string, value: boolean) => void
) {
  const addresses = new Set([...Object.keys(previous), ...Object.keys(next)]);
  addresses.forEach((address) => {
    if ((previous[address] ?? false) !== (next[address] ?? false)) publish(address, next[address] ?? false);
  });
}

function App() {
  const [project, setProject] = useState<EndapProject | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRungId, setSelectedRungId] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState('Carregando projeto local...');
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('STOP');
  const [scanCount, setScanCount] = useState(0);
  const [memoryMap, setMemoryMap] = useState<MemoryMap>({});
  const [forceState, setForceState] = useState<ForceState>({});
  const [settings, setSettings] = useState<StudioSettings>(() => loadStudioSettings());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const runtimeModeReadyRef = useRef(false);
  const memoryMapRef = useRef<MemoryMap>({});
  const forceStateRef = useRef<ForceState>({});
  const scanCountRef = useRef(0);

  useEffect(() => {
    const storedProject = loadProjectFromStorage();

    if (storedProject) {
      setProject(storedProject);
      setSelectedRungId(storedProject.ladderProgram.rungs[0]?.id ?? null);
      setSelectedBlockId(storedProject.ladderProgram.rungs[0]?.blocks[0]?.id ?? null);
      setStorageStatus('Projeto restaurado do navegador');
      return;
    }

    getMockProject().then((loadedProject) => {
      setProject(loadedProject);
      setSelectedRungId(loadedProject.ladderProgram.rungs[0]?.id ?? null);
      setSelectedBlockId(loadedProject.ladderProgram.rungs[0]?.blocks[0]?.id ?? null);
      setStorageStatus('Projeto mock carregado');
    });
  }, []);

  useEffect(() => {
    if (!project) return;
    if (!settings.autoSave) {
      setStorageStatus(runtimeMode === 'RUN' ? 'RUN ativo - auto-save desligado' : 'Auto-save desligado');
      return;
    }
    saveProjectToStorage(project);
    setStorageStatus(runtimeMode === 'RUN' ? 'RUN ativo — salvando localmente' : 'Salvo localmente');
  }, [project, runtimeMode, settings.autoSave]);

  useEffect(() => {
    saveStudioSettings(settings);
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  useEffect(() => {
    memoryMapRef.current = memoryMap;
  }, [memoryMap]);

  useEffect(() => {
    forceStateRef.current = forceState;
  }, [forceState]);

  useEffect(() => {
    scanCountRef.current = scanCount;
  }, [scanCount]);

  useEffect(() => {
    if (!runtimeModeReadyRef.current) {
      runtimeModeReadyRef.current = true;
      return;
    }
    createModeChangedEvent(runtimeMode);
  }, [runtimeMode]);

  useEffect(() => {
    if (runtimeMode !== 'RUN') return;
    const interval = window.setInterval(() => {
      runScanSimulation('auto', AUTO_SCAN_INTERVAL_MS);
    }, AUTO_SCAN_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [runtimeMode]);

  const selectedBlock = useMemo(() => {
    if (!project || !selectedBlockId) return null;
    return project.ladderProgram.rungs.flatMap(getAllRungBlocks).find((block) => block.id === selectedBlockId) ?? null;
  }, [project, selectedBlockId]);

  const watchItems = useMemo(() => (project ? createWatchItems(project, memoryMap, forceState) : []), [project, memoryMap, forceState]);

  function updateSelectedBlock(patch: Partial<EndapLadderBlock>) {
    if (!selectedBlockId) return;

    setProject((currentProject) => {
      if (!currentProject) return currentProject;

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: currentProject.ladderProgram.rungs.map((rung) => ({
            ...rung,
            blocks: rung.blocks.map((block) => (block.id === selectedBlockId ? { ...block, ...patch } : block)),
            branches: rung.branches?.map((branch) => ({
              ...branch,
              blocks: branch.blocks.map((block) => (block.id === selectedBlockId ? { ...block, ...patch } : block))
            }))
          }))
        }
      };
    });

    createRuntimeInfoEvent('ladder.block_changed', selectedBlockId, 'Bloco Ladder atualizado', patch as Record<string, unknown>);
  }

  function addBlock(kind: EndapLadderBlockKind) {
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const targetRungId = selectedRungId ?? currentProject.ladderProgram.rungs[0]?.id;
      if (!targetRungId) return currentProject;

      const nextIndex = currentProject.ladderProgram.rungs.reduce((total, rung) => total + getAllRungBlocks(rung).length, 0) + 1;
      const newBlock = createBlock(kind, nextIndex);
      setSelectedBlockId(newBlock.id);
      setSelectedRungId(targetRungId);

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: currentProject.ladderProgram.rungs.map((rung) =>
            rung.id === targetRungId ? { ...rung, blocks: [...rung.blocks, newBlock] } : rung
          )
        }
      };
    });
  }

  function addBranch() {
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const targetRungId = selectedRungId ?? currentProject.ladderProgram.rungs[0]?.id;
      if (!targetRungId) return currentProject;

      const nextIndex = currentProject.ladderProgram.rungs.reduce((total, rung) => total + getAllRungBlocks(rung).length, 0) + 1;
      const branchBlock = createBlock('memory-contact-no', nextIndex);
      const branch: EndapLadderBranch = {
        id: `branch-${Date.now()}`,
        title: 'OR branch',
        blocks: [branchBlock]
      };

      setSelectedBlockId(branchBlock.id);
      setSelectedRungId(targetRungId);
      createRuntimeInfoEvent('ladder.branch_changed', targetRungId, 'Branch OR adicionada');

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: currentProject.ladderProgram.rungs.map((rung) =>
            rung.id === targetRungId ? { ...rung, branches: [...(rung.branches ?? []), branch] } : rung
          )
        }
      };
    });

  }

  function addRung() {
    const newBlock = createBlock('contact-no', (project?.ladderProgram.rungs.length ?? 0) + 10);
    const newRungId = `rung-${Date.now()}`;

    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const nextNumber = currentProject.ladderProgram.rungs.length + 1;
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: [
            ...currentProject.ladderProgram.rungs,
            {
              id: newRungId,
              title: `Nova lógica ${nextNumber}`,
              description: 'Rung criada no editor mobile-first.',
              blocks: [newBlock]
            }
          ]
        }
      };
    });

    setSelectedRungId(newRungId);
    setSelectedBlockId(newBlock.id);
  }

  function duplicateSelectedBlock() {
    if (!selectedBlockId) return;

    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      let duplicatedBlock: EndapLadderBlock | null = null;
      let duplicatedBlockId: string | null = null;

      const rungs = currentProject.ladderProgram.rungs.map((rung) => {
        const blockIndex = rung.blocks.findIndex((block) => block.id === selectedBlockId);
        if (blockIndex !== -1) {
          duplicatedBlock = {
            ...rung.blocks[blockIndex],
            id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            label: `${rung.blocks[blockIndex].label}_copy`
          };
          duplicatedBlockId = duplicatedBlock.id;

          const blocks = [...rung.blocks];
          blocks.splice(blockIndex + 1, 0, duplicatedBlock);
          setSelectedRungId(rung.id);
          return { ...rung, blocks };
        }

        return {
          ...rung,
          branches: rung.branches?.map((branch) => {
            const branchBlockIndex = branch.blocks.findIndex((block) => block.id === selectedBlockId);
            if (branchBlockIndex === -1) return branch;
            duplicatedBlock = {
              ...branch.blocks[branchBlockIndex],
              id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              label: `${branch.blocks[branchBlockIndex].label}_copy`
            };
            duplicatedBlockId = duplicatedBlock.id;
            const blocks = [...branch.blocks];
            blocks.splice(branchBlockIndex + 1, 0, duplicatedBlock);
            setSelectedRungId(rung.id);
            return { ...branch, blocks };
          })
        };
      });

      if (duplicatedBlockId) setSelectedBlockId(duplicatedBlockId);

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs
        }
      };
    });
  }

  function runScanSimulation(mode: 'manual' | 'auto' = 'manual', deltaMs = STEP_SCAN_DELTA_MS) {
    const scanStartedAt = performance.now();
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const previousMemory = memoryMapRef.current;
      const previousCoils = collectCoilStates(currentProject);
      const previousTimers = collectTimerDoneStates(currentProject);
      const previousCounters = collectCounterDoneStates(currentProject);
      const previousBranches = collectBranchStates(currentProject);
      let nextMemory = previousMemory;
      const simulatedRungs = currentProject.ladderProgram.rungs.map((rung) => {
        const result = evaluateRung(rung, deltaMs, nextMemory, forceStateRef.current);
        nextMemory = result.memory;
        return result.rung;
      });

      setMemoryMap(nextMemory);

      const nextProject = {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          scanTimeMs: Number((3.8 + Math.random() * 1.6).toFixed(2)),
          rungs: simulatedRungs
        }
      };

      publishBooleanDiff(previousMemory, nextMemory, createMemoryChangedEvent);
      publishBooleanDiff(previousCoils, collectCoilStates(nextProject), (address, value) => {
        createRuntimeInfoEvent('coil.changed', address, `${address} ${value ? 'energizada' : 'desenergizada'}`, { address, value });
      });
      publishBooleanDiff(previousTimers, collectTimerDoneStates(nextProject), (address, value) => {
        createRuntimeInfoEvent('timer.changed', address, `${address} ${value ? 'completou preset' : 'reiniciou'}`, { address, done: value });
      });
      publishBooleanDiff(previousCounters, collectCounterDoneStates(nextProject), (address, value) => {
        createRuntimeInfoEvent('ladder.block_changed', address, `${address} ${value ? 'atingiu preset' : 'abaixo do preset'}`, { address, done: value });
      });
      publishBooleanDiff(previousBranches, collectBranchStates(nextProject), (address, value) => {
        createRuntimeInfoEvent('ladder.branch_changed', address, `${address} ${value ? 'ativada' : 'desativada'}`, { branchId: address, active: value });
      });

      return nextProject;
    });
    const nextScanCount = scanCountRef.current + 1;
    if (mode === 'manual') {
      createRuntimeInfoEvent('runtime.scan', 'studio-runtime', 'STEP executado', { scanCount: nextScanCount, deltaMs });
    } else if (nextScanCount % 25 === 0) {
      createScanEvent(Math.round(performance.now() - scanStartedAt), nextScanCount);
    }
    setScanCount(nextScanCount);
    setStorageStatus(mode === 'auto' ? 'RUN executando scans' : 'STEP executado');
  }

  function resetProject() {
    setRuntimeMode('STOP');
    setScanCount(0);
    setMemoryMap({});
    setForceState({});
    clearStoredProject();
    getMockProject().then((loadedProject) => {
      const refreshedProject = { ...loadedProject, updatedAt: new Date().toISOString() };
      setProject(refreshedProject);
      setSelectedRungId(refreshedProject.ladderProgram.rungs[0]?.id ?? null);
      setSelectedBlockId(refreshedProject.ladderProgram.rungs[0]?.blocks[0]?.id ?? null);
      setStorageStatus('Projeto reiniciado');
      createRuntimeWarningEvent('project.changed', 'studio-project', 'Projeto resetado para mock local');
    });
  }

  async function handleImportProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedProject = await importProjectFromFile(file);
      setRuntimeMode('STOP');
      setMemoryMap({});
      setForceState({});
      setProject({ ...importedProject, updatedAt: new Date().toISOString() });
      setSelectedRungId(importedProject.ladderProgram.rungs[0]?.id ?? null);
      setSelectedBlockId(importedProject.ladderProgram.rungs[0]?.blocks[0]?.id ?? null);
      setStorageStatus('Projeto importado');
      createRuntimeInfoEvent('project.changed', 'studio-project', `Projeto importado: ${importedProject.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao importar projeto';
      setStorageStatus(message);
      createRuntimeWarningEvent('project.changed', 'studio-project', message);
    } finally {
      event.target.value = '';
    }
  }

  function handleExportProject() {
    if (!project) return;
    downloadProjectBackup(project);
    createRuntimeInfoEvent('project.changed', 'studio-project', `Projeto exportado: ${project.name}`);
  }

  function toggleRuntimeMode() {
    setRuntimeMode((current) => (current === 'RUN' ? 'STOP' : 'RUN'));
  }

  function updateSettings(patch: Partial<StudioSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function toggleMemory(address: string) {
    setMemoryMap((current) => {
      const nextValue = !(current[address] ?? false);
      createMemoryChangedEvent(address, nextValue);
      return { ...current, [address]: nextValue };
    });
  }

  function setForce(address: string, target: ForceTarget) {
    setForceState((current) => ({
      ...current,
      [address]: { target, source: 'manual', updatedAt: new Date().toISOString() }
    }));
    createRuntimeWarningEvent('memory.changed', address, `${address} em FORCE ${target.toUpperCase()}`, { address, force: target });
  }

  function releaseForce(address: string) {
    setForceState((current) => {
      const next = { ...current };
      delete next[address];
      return next;
    });
    createRuntimeInfoEvent('memory.changed', address, `${address} liberado do FORCE`, { address });
  }

  function handleGatewayResult(connected: boolean, message: string) {
    createGatewayEvent(connected, settings.gatewayBaseUrl);
    createRuntimeInfoEvent(connected ? 'gateway.connected' : 'gateway.disconnected', 'gateway-contract', message, {
      mode: settings.apiMode,
      gatewayBaseUrl: settings.gatewayBaseUrl
    });
  }

  function handlePresetChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value;
    const presetMs = rawValue.trim() === '' ? undefined : Number(rawValue);
    updateSelectedBlock({ presetMs: Number.isNaN(presetMs) ? undefined : presetMs, elapsedMs: 0 });
  }

  function handlePresetCountChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value;
    const presetCount = rawValue.trim() === '' ? undefined : Number(rawValue);
    updateSelectedBlock({
      presetCount: Number.isNaN(presetCount) ? undefined : Math.max(1, Math.floor(presetCount ?? 1)),
      accumulatedCount: 0,
      previousInput: false
    });
  }

  function resetSelectedCounter() {
    updateSelectedBlock({ accumulatedCount: 0, previousInput: false, active: false });
  }

  if (!project) {
    return (
      <main className="loading-screen">
        <div className="brand-card compact">
          <span className="brand-mark">E</span>
          <div>
            <strong>ENDAP Studio</strong>
            <small>{storageStatus}</small>
          </div>
        </div>
      </main>
    );
  }

  const onlineNodes = project.nodes.filter((node) => node.status === 'online').length;
  const activeAlerts = project.alerts.filter((alert) => !alert.acknowledged).length;
  const outputCount = project.io.filter((point) => point.direction === 'output').length;
  const activeMemories = Object.entries(memoryMap).filter(([, value]) => value).length;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-card">
          <span className="brand-mark">E</span>
          <div>
            <strong>ENDAP Studio</strong>
            <small>Ladder mobile-first</small>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button className={item === 'Ladder' ? 'nav-item active' : 'nav-item'} key={item} type="button">
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Editor Escada / Automação ENDAP</p>
            <h1>Ladder touch-first para campo</h1>
          </div>
          <div className={`connection-pill ${runtimeMode === 'RUN' ? 'runtime-run' : ''}`}>
            <span className="pulse" />
            {runtimeMode} · {storageStatus}
          </div>
        </header>

        <section className="status-grid" aria-label="Resumo operacional">
          <article className="metric-card">
            <span>Gateway</span>
            <strong>{project.gateway.status}</strong>
            <small>{project.gateway.ipAddress}:{project.gateway.port}</small>
          </article>
          <article className="metric-card">
            <span>Scan</span>
            <strong>{project.ladderProgram.scanTimeMs} ms</strong>
            <small>{scanCount} ciclos simulados</small>
          </article>
          <article className="metric-card warning">
            <span>Memórias</span>
            <strong>{activeMemories} ativas</strong>
            <small>{Object.keys(memoryMap).length} registradas</small>
          </article>
          <article className="metric-card">
            <span>I/O</span>
            <strong>{project.io.length} pontos</strong>
            <small>{outputCount} saídas · {activeAlerts} alerta</small>
          </article>
        </section>

        <section className="ladder-toolbar" aria-label="Ferramentas Ladder">
          <button type="button" onClick={addRung}>+ Rung</button>
          <button type="button" onClick={() => addBlock('contact-no')}>+ Contato NA</button>
          <button type="button" onClick={() => addBlock('contact-nc')}>+ Contato NF</button>
          <button type="button" onClick={() => addBlock('memory-contact-no')}>+ Memória</button>
          <button type="button" onClick={addBranch}>+ Branch OR</button>
          <button type="button" onClick={() => addBlock('coil')}>+ Bobina</button>
          <button type="button" onClick={() => addBlock('coil-set')}>+ SET</button>
          <button type="button" onClick={() => addBlock('coil-reset')}>+ RESET</button>
          <button type="button" onClick={() => addBlock('timer-ton')}>+ Timer</button>
          <button type="button" onClick={() => addBlock('counter')}>+ CTU</button>
          <button type="button" onClick={toggleRuntimeMode}>
            {runtimeMode === 'RUN' ? 'STOP' : 'RUN'}
          </button>
          <button type="button" onClick={() => runScanSimulation('manual')}>STEP</button>
          <button type="button" onClick={handleExportProject}>Exportar</button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>Importar</button>
          <button type="button" onClick={resetProject}>Resetar</button>
          <input ref={fileInputRef} className="file-input" type="file" accept=".json,.endap.json,application/json" onChange={handleImportProject} />
        </section>

        <section className="editor-layout">
          <section className="ladder-panel" aria-label="Editor Ladder">
            <div className="ladder-header">
              <div>
                <p className="eyebrow">Programa principal</p>
                <h2>{project.ladderProgram.name}</h2>
              </div>
              <span className={`status-badge ${runtimeMode === 'RUN' ? 'runtime-run' : ''}`}>Runtime {runtimeMode}</span>
            </div>

            <div className="rung-list">
              {project.ladderProgram.rungs.map((rung, index) => (
                <article className={`rung-card ${selectedRungId === rung.id ? 'is-rung-selected' : ''}`} key={rung.id}>
                  <button className="rung-meta" onClick={() => setSelectedRungId(rung.id)} type="button">
                    <strong>Rung {index + 1}</strong>
                    <span>{rung.title}</span>
                    <small>{rung.description}</small>
                    {!!rung.branches?.length && <small>{rung.branches.length} branch OR</small>}
                  </button>

                  <div className={`ladder-canvas ${rungIsEnergized(getAllRungBlocks(rung)) ? 'is-energized' : ''}`} role="group" aria-label={rung.title}>
                    <div className="rail left" />
                    <div className="rail right" />
                    <div className="wire" />

                    <div className="block-row">
                      {rung.blocks.map((block) => (
                        <button
                          className={blockClass(block, selectedBlockId === block.id)}
                          key={block.id}
                          onClick={() => {
                            setSelectedRungId(rung.id);
                            setSelectedBlockId(block.id);
                          }}
                          type="button"
                        >
                          <span className="block-symbol">{blockSymbol(block)}</span>
                          <strong>{block.label}</strong>
                          {block.kind.startsWith('timer') && (
                            <span className="timer-readout">
                              ET {block.elapsedMs ?? 0} / PT {block.presetMs ?? 0} ms
                              <span className="timer-track">
                                <span className="timer-progress" style={{ width: `${timerProgress(block)}%` }} />
                              </span>
                            </span>
                          )}
                          {block.kind === 'counter' && (
                            <span className="timer-readout">
                              ACC {block.accumulatedCount ?? 0} / PV {block.presetCount ?? 1}
                              <span className="timer-track">
                                <span className="timer-progress" style={{ width: `${counterProgress(block)}%` }} />
                              </span>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {!!rung.branches?.length && (
                      <div className="branch-stack">
                        {rung.branches.map((branch) => (
                          <div className={`branch-path ${branchIsEnergized(branch) ? 'is-branch-energized' : ''}`} key={branch.id}>
                            <span className="branch-label">{branch.title ?? 'OR'}</span>
                            <div className="branch-wire" />
                            <div className="branch-blocks">
                              {branch.blocks.map((block) => (
                                <button
                                  className={blockClass(block, selectedBlockId === block.id)}
                                  key={block.id}
                                  onClick={() => {
                                    setSelectedRungId(rung.id);
                                    setSelectedBlockId(block.id);
                                  }}
                                  type="button"
                                >
                                  <span className="block-symbol">{blockSymbol(block)}</span>
                                  <strong>{block.label}</strong>
                                  {block.kind === 'counter' && (
                                    <span className="timer-readout">
                                      ACC {block.accumulatedCount ?? 0} / PV {block.presetCount ?? 1}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="property-panel" aria-label="Propriedades do bloco selecionado">
            <div className="property-header">
              <p className="eyebrow">Propriedades</p>
              <h2>{selectedBlock ? selectedBlock.label : 'Nenhum bloco'}</h2>
            </div>

            {selectedBlock ? (
              <div className="property-list">
                <label>
                  <span>Tipo</span>
                  <input readOnly value={blockKindLabel(selectedBlock)} />
                </label>
                <label>
                  <span>Label</span>
                  <input value={selectedBlock.label} onChange={(event) => updateSelectedBlock({ label: event.target.value })} />
                </label>
                <label>
                  <span>Endereço</span>
                  <input value={selectedBlock.address ?? ''} onChange={(event) => updateSelectedBlock({ address: event.target.value })} />
                </label>
                <label>
                  <span>Estado</span>
                  <input readOnly value={selectedBlock.active ? 'Ativo / Energizado' : 'Inativo'} />
                </label>
                <label>
                  <span>Memória atual</span>
                  <input readOnly value={memoryMap[selectedBlock.address ?? selectedBlock.label] ? 'SET / true' : 'RESET / false'} />
                </label>
                <label>
                  <span>Elapsed ms</span>
                  <input readOnly value={selectedBlock.elapsedMs ?? 0} />
                </label>
                <label>
                  <span>Preset ms</span>
                  <input inputMode="numeric" value={selectedBlock.presetMs ?? ''} onChange={handlePresetChange} />
                </label>
                {selectedBlock.kind === 'counter' && (
                  <>
                    <label>
                      <span>Preset contagem</span>
                      <input inputMode="numeric" value={selectedBlock.presetCount ?? 1} onChange={handlePresetCountChange} />
                    </label>
                    <label>
                      <span>Acumulado</span>
                      <input readOnly value={selectedBlock.accumulatedCount ?? 0} />
                    </label>
                    <div className="state-toggle">
                      <span>Contador</span>
                      <button type="button" onClick={resetSelectedCounter}>
                        Resetar acumulado
                      </button>
                    </div>
                  </>
                )}

                <div className="state-toggle">
                  <span>Simulação</span>
                  <button type="button" onClick={() => updateSelectedBlock({ active: !selectedBlock.active })}>
                    {selectedBlock.active ? 'Desenergizar' : 'Energizar'}
                  </button>
                </div>

                <div className="property-actions">
                  <button type="button" onClick={() => saveProjectToStorage(project)}>Salvar local</button>
                  <button type="button" onClick={duplicateSelectedBlock}>Duplicar</button>
                </div>
              </div>
            ) : (
              <p className="empty-copy">Toque em um contato, timer ou bobina para editar.</p>
            )}

            <WatchTable
              items={watchItems}
              onToggleMemory={toggleMemory}
              onForce={setForce}
              onReleaseForce={releaseForce}
            />
          </aside>
        </section>

        <section className="observability-layout" aria-label="Observabilidade e gateway">
          <RuntimeTimeline />
          <GatewayContract settings={settings} onSettingsChange={updateSettings} onGatewayResult={handleGatewayResult} />
        </section>
      </section>
    </main>
  );
}

export default App;
