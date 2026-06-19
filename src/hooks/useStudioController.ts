import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getMockProject } from '../services/mockEndapApi';
import {
  collectBranchStates,
  collectCoilStates,
  collectCounterDoneStates,
  collectTimerDoneStates,
  createBlock,
  evaluateRung,
  ForceState,
  ForceTarget,
  getAllRungBlocks,
  MemoryMap
} from '../services/ladderRuntime';
import {
  createGatewayEvent,
  createMemoryChangedEvent,
  createModeChangedEvent,
  createRuntimeInfoEvent,
  createRuntimeWarningEvent,
  createScanEvent,
  runtimeEventBus
} from '../services/runtimeEvents';
import { connectEvents } from '../services/endapApi';
import {
  clearStoredProject,
  downloadProjectBackup,
  importProjectFromFile,
  deleteProjectSnapshot,
  loadStudioSettings,
  loadProjectSnapshots,
  loadProjectFromStorage,
  loadForceStateFromStorage,
  saveForceStateToStorage,
  saveProjectSnapshot,
  saveProjectToStorage,
  saveStudioSettings,
  StudioProjectSnapshot,
  StudioSettings
} from '../services/storage';
import { EndapLadderBlock, EndapLadderBlockKind, EndapLadderBranch, EndapLadderRung, EndapProject } from '../types/endap';
import { ProjectHistoryEntry, createHistoryEntry, createWatchItems, NavItem, publishBooleanDiff, resetRuntimeBlock, sectionIdForNavItem, validateProject } from '../utils/studioUtils';

const AUTO_SCAN_INTERVAL_MS = 200;
const STEP_SCAN_DELTA_MS = 100;
const MAX_UNDO_HISTORY = 30;

export type RuntimeMode = 'STOP' | 'RUN';

export function useStudioController() {
  const [project, setProject] = useState<EndapProject | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRungId, setSelectedRungId] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState('Carregando projeto local...');
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('STOP');
  const [scanCount, setScanCount] = useState(0);
  const [memoryMap, setMemoryMap] = useState<MemoryMap>({});
  const [forceState, setForceState] = useState<ForceState>(() => loadForceStateFromStorage());
  const [settings, setSettings] = useState<StudioSettings>(() => loadStudioSettings());
  const [activeNavItem, setActiveNavItem] = useState<NavItem>('Dashboard');
  const [snapshots, setSnapshots] = useState<StudioProjectSnapshot[]>(() => loadProjectSnapshots());
  const [undoStack, setUndoStack] = useState<ProjectHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectHistoryEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const runtimeModeReadyRef = useRef(false);
  const memoryMapRef = useRef<MemoryMap>({});
  const forceStateRef = useRef<ForceState>({});
  const scanCountRef = useRef(0);

  useEffect(() => {
    const storedProject = loadProjectFromStorage();

    if (storedProject) {
      setProject(storedProject);
      setSelectedRungId(null);
      setSelectedBlockId(null);
      setStorageStatus('Projeto restaurado do navegador');
      return;
    }

    getMockProject().then((loadedProject) => {
      setProject(loadedProject);
      setSelectedRungId(null);
      setSelectedBlockId(null);
      setStorageStatus('Projeto mock carregado');
    });
  }, []);

  useEffect(() => {
    if (!project) return;
    
    // Sincroniza o mapa de memória inicial com o estado do projeto
    setMemoryMap(current => {
      const initialMemory: MemoryMap = { ...current };
      
      // Carrega estados dos I/Os
      project.io.forEach(io => {
        if (initialMemory[io.address] === undefined) {
          initialMemory[io.address] = io.state;
        }
      });
      
      // Carrega estados iniciais dos blocos (timers, contadores, memórias)
      project.ladderProgram.rungs.forEach(rung => {
        getAllRungBlocks(rung).forEach(block => {
          const addr = block.address || block.label;
          if (addr && (initialMemory[addr] === undefined)) {
            initialMemory[addr] = block.active;
          }
        });
      });
      
      memoryMapRef.current = initialMemory;
      return initialMemory;
    });
  }, [project?.id]); // Só executa quando o projeto muda (load/reset)

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
    saveForceStateToStorage(forceState);
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

  const selectedRung = useMemo(() => {
    if (!project || !selectedRungId) return null;
    return project.ladderProgram.rungs.find((rung) => rung.id === selectedRungId) ?? null;
  }, [project, selectedRungId]);

  const watchItems = useMemo(() => (project ? createWatchItems(project, memoryMap, forceState) : []), [project, memoryMap, forceState]);
  const projectIssues = useMemo(
    () => (project ? validateProject(project, memoryMap, forceState, settings) : []),
    [forceState, memoryMap, project, settings]
  );

  useEffect(() => {
    if (settings.apiMode !== 'gateway') return;

    let ws: WebSocket | null = null;
    try {
      ws = connectEvents({ mode: settings.apiMode, gatewayBaseUrl: settings.gatewayBaseUrl });
    } catch {
      // Ignora erro de conexão inicial
    }

    if (!ws) return;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type && payload.severity && payload.source && payload.message) {
          runtimeEventBus.publish(payload);
        }
      } catch {
        // Ignora payload inválido
      }
    };

    const unsubscribe = runtimeEventBus.subscribe((event) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });

    return () => {
      unsubscribe();
      ws?.close();
    };
  }, [settings.apiMode, settings.gatewayBaseUrl]);

  function recordUndo(label: string) {
    if (!project) return;
    setUndoStack((current) => [createHistoryEntry(project, label), ...current].slice(0, MAX_UNDO_HISTORY));
    setRedoStack([]);
  }

  function restoreProjectFromHistory(entry: ProjectHistoryEntry, direction: 'undo' | 'redo') {
    if (!project) return;
    const currentEntry = createHistoryEntry(project, direction === 'undo' ? 'Antes do undo' : 'Antes do redo');
    if (direction === 'undo') {
      setUndoStack((current) => current.slice(1));
      setRedoStack((current) => [currentEntry, ...current].slice(0, MAX_UNDO_HISTORY));
    } else {
      setRedoStack((current) => current.slice(1));
      setUndoStack((current) => [currentEntry, ...current].slice(0, MAX_UNDO_HISTORY));
    }

    setRuntimeMode('STOP');
    setProject({ ...entry.project, updatedAt: new Date().toISOString() });
    setSelectedRungId(null);
    setSelectedBlockId(null);
    setStorageStatus(direction === 'undo' ? `Undo: ${entry.label}` : `Redo: ${entry.label}`);
    createRuntimeInfoEvent('project.changed', 'history', direction === 'undo' ? `Undo aplicado: ${entry.label}` : `Redo aplicado: ${entry.label}`);
  }

  function undoProjectChange() {
    const entry = undoStack[0];
    if (!entry) return;
    restoreProjectFromHistory(entry, 'undo');
  }

  function redoProjectChange() {
    const entry = redoStack[0];
    if (!entry) return;
    restoreProjectFromHistory(entry, 'redo');
  }

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target;
      const tagName = target instanceof HTMLElement ? target.tagName : '';
      const isEditingText = ['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName);
      if (isEditingText) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoProjectChange();
        else undoProjectChange();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redoProjectChange();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        runScanSimulation('manual');
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
        event.preventDefault();
        toggleRuntimeMode();
      }
    }

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [project, redoStack, runtimeMode, undoStack]);

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
    recordUndo(`Adicionar ${kind}`);
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const targetRungId = selectedRungId ?? currentProject.ladderProgram.rungs[0]?.id;
      if (!targetRungId) return currentProject;

      const nextIndex = currentProject.ladderProgram.rungs.reduce((total, rung) => total + getAllRungBlocks(rung).length, 0) + 1;
      const newBlock = createBlock(kind, nextIndex);
      // Removida auto-seleção para não abrir propriedades automaticamente
      // setSelectedBlockId(newBlock.id);
      // setSelectedRungId(targetRungId);

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

  function insertBlock(kind: EndapLadderBlockKind, targetRungId: string, targetBlockId?: string) {
    recordUndo(`Inserir ${kind}`);
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      
      const nextIndex = currentProject.ladderProgram.rungs.reduce((total, rung) => total + getAllRungBlocks(rung).length, 0) + 1;
      const newBlock = createBlock(kind, nextIndex);
      // Removida auto-seleção
      // setSelectedBlockId(newBlock.id);
      // setSelectedRungId(targetRungId);

      const isOutputBlockToAdd = kind.includes('coil') || kind.includes('reset');

      let targetCol: number | undefined;
      let targetBranchIndex: number | undefined;
      let isMainPath = false;
      
      if (!isOutputBlockToAdd && targetBlockId && targetBlockId.startsWith('cell-')) {
         const cellId = targetBlockId.replace(`cell-${targetRungId}-`, ''); 
         if (cellId.startsWith('main-wire-')) {
           targetCol = parseInt(cellId.replace('main-wire-', ''), 10);
           isMainPath = true;
         } else if (cellId.startsWith('branch-')) {
           const match = cellId.match(/branch-(\d+)-wire-(\d+)/);
           if (match) {
             targetBranchIndex = parseInt(match[1], 10) - 1; 
             targetCol = parseInt(match[2], 10);
           }
         }
      }

      if (targetCol !== undefined && !Number.isNaN(targetCol)) {
         newBlock.col = targetCol;
      }

      const sortBlocks = (blocks: EndapLadderBlock[]) => {
        return [...blocks].sort((a, b) => {
          const aOut = a.kind.includes('coil') || a.kind.includes('reset');
          const bOut = b.kind.includes('coil') || b.kind.includes('reset');
          if (aOut && !bOut) return 1;
          if (!aOut && bOut) return -1;
          return (a.col ?? 99) - (b.col ?? 99);
        });
      };

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: currentProject.ladderProgram.rungs.map((rung) => {
            if (rung.id !== targetRungId) return rung;
            
            if (isOutputBlockToAdd) {
              return { ...rung, blocks: sortBlocks([...rung.blocks, newBlock]) };
            }

            if (targetCol !== undefined && !Number.isNaN(targetCol)) {
              if (isMainPath) {
                return { ...rung, blocks: sortBlocks([...rung.blocks, newBlock]) };
              } else if (targetBranchIndex !== undefined && rung.branches) {
                const newBranches = [...rung.branches];
                if (targetBranchIndex >= 0 && targetBranchIndex < newBranches.length) {
                  newBranches[targetBranchIndex] = {
                    ...newBranches[targetBranchIndex],
                    blocks: sortBlocks([...newBranches[targetBranchIndex].blocks, newBlock])
                  };
                }
                return { ...rung, branches: newBranches };
              }
            }

            if (!targetBlockId || targetBlockId.startsWith('cell-')) {
              return { ...rung, blocks: sortBlocks([...rung.blocks, newBlock]) };
            }

            const blockIndex = rung.blocks.findIndex(b => b.id === targetBlockId);
            if (blockIndex !== -1) {
              const newBlocks = [...rung.blocks];
              newBlock.col = (newBlocks[blockIndex].col ?? blockIndex) + 1;
              newBlocks.splice(blockIndex + 1, 0, newBlock); 
              return { ...rung, blocks: sortBlocks(newBlocks) };
            }

            if (rung.branches) {
              const newBranches = rung.branches.map(branch => {
                const bIdx = branch.blocks.findIndex(b => b.id === targetBlockId);
                if (bIdx !== -1) {
                  const newBranchBlocks = [...branch.blocks];
                  newBlock.col = (newBranchBlocks[bIdx].col ?? bIdx) + 1;
                  newBranchBlocks.splice(bIdx + 1, 0, newBlock);
                  return { ...branch, blocks: sortBlocks(newBranchBlocks) };
                }
                return branch;
              });
              if (newBranches !== rung.branches) { 
                 return { ...rung, branches: newBranches };
              }
            }

            return { ...rung, blocks: sortBlocks([...rung.blocks, newBlock]) };
          })
        }
      };
    });
  }

  function addBranch(explicitRungId?: string, anchorBlockId?: string, kind: EndapLadderBlockKind = 'contact-no') {
    recordUndo('Adicionar branch OR');
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const targetRungId = explicitRungId || selectedRungId || currentProject.ladderProgram.rungs[0]?.id;
      if (!targetRungId) return currentProject;

      const rung = currentProject.ladderProgram.rungs.find(r => r.id === targetRungId);
      if (!rung) return currentProject;

      let finalAnchorId = anchorBlockId;

      // Se não veio por drag and drop (veio por clique de botão na Toolbox)
      if (!finalAnchorId && selectedBlockId && !selectedBlockId.startsWith('cell-')) {
         // Só pode ancorar num bloco existente
         finalAnchorId = selectedBlockId;
      }

      const nextIndex = currentProject.ladderProgram.rungs.reduce((total, rung) => total + getAllRungBlocks(rung).length, 0) + 1;
      const branchBlock = createBlock(kind, nextIndex); 

      const branch: EndapLadderBranch = {
        id: `branch-${Date.now()}`,
        title: 'OR branch',
        anchorBlockId: finalAnchorId, // Pode ser indefinido (legacy global OR)
        blocks: [branchBlock]
      };

      // Removida auto-seleção
      // setSelectedBlockId(branchBlock.id);
      // setSelectedRungId(targetRungId);
      createRuntimeInfoEvent('ladder.branch_changed', targetRungId, 'Branch OR adicionada');

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: currentProject.ladderProgram.rungs.map((r) =>
            r.id === targetRungId ? { ...r, branches: [...(r.branches ?? []), branch] } : r
          )
        }
      };
    });
  }

  function updateSelectedRung(patch: Partial<NonNullable<typeof selectedRung>>) {
    if (!selectedRungId) return;
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: currentProject.ladderProgram.rungs.map((rung) => (rung.id === selectedRungId ? { ...rung, ...patch } : rung))
        }
      };
    });
    createRuntimeInfoEvent('project.changed', selectedRungId, 'Rung atualizada', patch as Record<string, unknown>);
  }

  function addRung() {
    recordUndo('Adicionar rung');
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

  function moveSelectedRung(direction: -1 | 1) {
    if (!selectedRungId) return;
    recordUndo('Mover rung');
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const currentIndex = currentProject.ladderProgram.rungs.findIndex((rung) => rung.id === selectedRungId);
      const targetIndex = currentIndex + direction;
      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentProject.ladderProgram.rungs.length) return currentProject;
      const rungs = [...currentProject.ladderProgram.rungs];
      const [selected] = rungs.splice(currentIndex, 1);
      rungs.splice(targetIndex, 0, selected);
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs
        }
      };
    });
    createRuntimeInfoEvent('project.changed', selectedRungId, `Rung movida ${direction < 0 ? 'para cima' : 'para baixo'}`);
  }

  function deleteSelectedRung() {
    if (!selectedRungId) return;
    recordUndo('Remover rung');
    setProject((currentProject) => {
      if (!currentProject || currentProject.ladderProgram.rungs.length <= 1) return currentProject;
      const nextRungs = currentProject.ladderProgram.rungs.filter((rung) => rung.id !== selectedRungId);
      setSelectedRungId(nextRungs[0]?.id ?? null);
      setSelectedBlockId(nextRungs[0]?.blocks[0]?.id ?? null);
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs: nextRungs
        }
      };
    });
    createRuntimeWarningEvent('project.changed', selectedRungId, 'Rung removida do projeto');
  }

  function duplicateSelectedRung() {
    if (!selectedRungId) return;
    recordUndo('Duplicar rung');
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const rungs = [...currentProject.ladderProgram.rungs];
      const index = rungs.findIndex(r => r.id === selectedRungId);
      if (index === -1) return currentProject;

      const original = rungs[index];
      const cloneBlock = (b: EndapLadderBlock): EndapLadderBlock => ({
        ...b,
        id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        active: false,
        elapsedMs: b.kind.startsWith('timer') ? 0 : b.elapsedMs,
        accumulatedCount: b.kind === 'counter' ? 0 : b.accumulatedCount,
        previousInput: b.kind === 'counter' ? false : b.previousInput
      });

      const duplicatedRung: EndapLadderRung = {
        ...original,
        id: `rung-${Date.now()}`,
        title: `${original.title} (Cópia)`,
        blocks: original.blocks.map(cloneBlock),
        branches: original.branches?.map(br => ({
          ...br,
          id: `branch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          blocks: br.blocks.map(cloneBlock)
        }))
      };

      rungs.splice(index + 1, 0, duplicatedRung);
      setSelectedRungId(duplicatedRung.id);
      setSelectedBlockId(duplicatedRung.blocks[0]?.id || duplicatedRung.branches?.[0]?.blocks[0]?.id || null);

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

  function duplicateSelectedBlock() {
    if (!selectedBlockId) return;
    recordUndo('Duplicar bloco');

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

  function moveSelectedBlock(direction: -1 | 1) {
    if (!selectedBlockId) return;
    recordUndo('Mover bloco');
    setProject((currentProject) => {
      if (!currentProject) return currentProject;

      const rungs = currentProject.ladderProgram.rungs.map((rung) => {
        const mainIndex = rung.blocks.findIndex((block) => block.id === selectedBlockId);
        if (mainIndex !== -1) {
          const targetIndex = mainIndex + direction;
          if (targetIndex < 0 || targetIndex >= rung.blocks.length) return rung;
          const blocks = [...rung.blocks];
          const [selected] = blocks.splice(mainIndex, 1);
          blocks.splice(targetIndex, 0, selected);
          return { ...rung, blocks };
        }

        return {
          ...rung,
          branches: rung.branches?.map((branch) => {
            const branchIndex = branch.blocks.findIndex((block) => block.id === selectedBlockId);
            if (branchIndex === -1) return branch;
            const targetIndex = branchIndex + direction;
            if (targetIndex < 0 || targetIndex >= branch.blocks.length) return branch;
            const blocks = [...branch.blocks];
            const [selected] = blocks.splice(branchIndex, 1);
            blocks.splice(targetIndex, 0, selected);
            return { ...branch, blocks };
          })
        };
      });

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs
        }
      };
    });
    createRuntimeInfoEvent('ladder.block_changed', selectedBlockId, `Bloco movido ${direction < 0 ? 'para esquerda' : 'para direita'}`);
  }

  function deleteSelectedBlock() {
    if (!selectedBlockId) return;
    recordUndo('Remover bloco');
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      let nextSelectedBlockId: string | null = null;

      const rungs = currentProject.ladderProgram.rungs.map((rung) => {
        const blocks = rung.blocks.filter((block) => block.id !== selectedBlockId);
        const branches = rung.branches
          ?.map((branch) => ({ ...branch, blocks: branch.blocks.filter((block) => block.id !== selectedBlockId) }))
          .filter((branch) => branch.blocks.length > 0);

        if (rung.id === selectedRungId) {
          nextSelectedBlockId = blocks[0]?.id ?? branches?.[0]?.blocks[0]?.id ?? null;
        }

        return { ...rung, blocks, branches };
      });

      setSelectedBlockId(nextSelectedBlockId);
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          rungs
        }
      };
    });
    createRuntimeWarningEvent('ladder.block_changed', selectedBlockId, 'Bloco removido do Ladder');
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
      
      let nextMemory = { ...previousMemory };

      // Phase 1: Read Inputs (and Manual Overrides) from Project I/O
      currentProject.io.forEach(io => {
        // Se for entrada ou se estiver em modo manual, o estado do I/O manda na memória
        if (io.direction === 'input' || io.manualMode) {
          nextMemory[io.address] = io.state;
        }
      });

      // Phase 2: Execute Ladder logic
      const simulatedRungs = currentProject.ladderProgram.rungs.map((rung) => {
        const result = evaluateRung(rung, deltaMs, nextMemory, forceStateRef.current);
        nextMemory = result.memory;
        return result.rung;
      });

      // Phase 3: Write Outputs back to Project I/O (if not in manual mode)
      const nextIo = currentProject.io.map(io => {
        let nextState = io.state;
        if (io.direction === 'output' && !io.manualMode) {
          nextState = nextMemory[io.address] as boolean ?? io.state;
        }
        
        // Auto-reset pulse inputs after one scan
        if (io.direction === 'input' && io.interactionMode === 'pulse' && io.state === true) {
          nextState = false;
        }
        
        return { ...io, state: nextState };
      });

      setMemoryMap(nextMemory);
      memoryMapRef.current = nextMemory;

      const nextProject = {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        io: nextIo,
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
    scanCountRef.current = nextScanCount;
    if (mode === 'manual') {
      createRuntimeInfoEvent('runtime.scan', 'studio-runtime', 'STEP executado', { scanCount: nextScanCount, deltaMs });
    } else if (nextScanCount % 25 === 0) {
      createScanEvent(Math.round(performance.now() - scanStartedAt), nextScanCount);
    }
    setScanCount(nextScanCount);
    setStorageStatus(mode === 'auto' ? 'RUN executando scans' : 'STEP executado');
  }

  function resetProject() {
    recordUndo('Resetar projeto');
    setRuntimeMode('STOP');
    setScanCount(0);
    setMemoryMap({});
    setForceState({});
    clearStoredProject();
    getMockProject().then((loadedProject) => {
      const refreshedProject = { ...loadedProject, updatedAt: new Date().toISOString() };
      setProject(refreshedProject);
      setSelectedRungId(null);
      setSelectedBlockId(null);
      setStorageStatus('Projeto reiniciado');
      createRuntimeWarningEvent('project.changed', 'studio-project', 'Projeto resetado para mock local');
    });
  }

  function resetRuntimeState() {
    recordUndo('Limpar runtime');
    setRuntimeMode('STOP');
    setScanCount(0);
    setMemoryMap({});
    setForceState({});
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          scanTimeMs: 0,
          rungs: currentProject.ladderProgram.rungs.map((rung) => ({
            ...rung,
            blocks: rung.blocks.map(resetRuntimeBlock),
            branches: rung.branches?.map((branch) => ({
              ...branch,
              blocks: branch.blocks.map(resetRuntimeBlock)
            }))
          }))
        }
      };
    });
    setStorageStatus('Runtime local limpo');
    createRuntimeWarningEvent('runtime.scan', 'studio-runtime', 'Estado do runtime local foi limpo');
  }

  function releaseAllForces() {
    const count = Object.keys(forceStateRef.current).length;
    setForceState({});
    createRuntimeInfoEvent('memory.changed', 'watch-table', `${count} FORCE(s) liberados`);
  }

  async function handleImportProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedProject = await importProjectFromFile(file);
      recordUndo('Importar projeto');
      setRuntimeMode('STOP');
      setMemoryMap({});
      setForceState({});
      setProject({ ...importedProject, updatedAt: new Date().toISOString() });
      setSelectedRungId(null);
      setSelectedBlockId(null);
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

  function createSnapshot() {
    if (!project) return;
    const snapshot = saveProjectSnapshot(project, `${project.name} · ${new Date().toLocaleString('pt-BR')}`);
    setSnapshots(loadProjectSnapshots());
    createRuntimeInfoEvent('project.changed', 'studio-snapshot', `Snapshot salvo: ${snapshot.name}`);
  }

  function restoreSnapshot(snapshot: StudioProjectSnapshot) {
    recordUndo('Restaurar snapshot');
    const restoredProject = { ...snapshot.project, updatedAt: new Date().toISOString() };
    setRuntimeMode('STOP');
    setScanCount(0);
    setMemoryMap({});
    setForceState({});
    setProject(restoredProject);
    setSelectedRungId(null);
    setSelectedBlockId(null);
    setStorageStatus('Snapshot restaurado');
    createRuntimeWarningEvent('project.changed', 'studio-snapshot', `Snapshot restaurado: ${snapshot.name}`);
  }

  function removeSnapshot(id: string) {
    deleteProjectSnapshot(id);
    setSnapshots(loadProjectSnapshots());
    createRuntimeInfoEvent('project.changed', 'studio-snapshot', 'Snapshot local removido');
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
      const nextMap = { ...current, [address]: nextValue };
      memoryMapRef.current = nextMap; // Sync update for the simulation loop
      return nextMap;
    });
  }

  function toggleBlock(block: EndapLadderBlock) {
    const address = block.address || block.label;
    if (!address) return;

    // Timers e contadores são automáticos
    if (block.kind.startsWith('timer') || block.kind === 'counter') return;

    // Procura se é um I/O real para alternar o estado do I/O (que o scan lê)
    const ioPoint = project?.io.find((io) => io.address === address);
    if (ioPoint) {
      toggleIoPoint(ioPoint.id, 'state');
    } else {
      toggleMemory(address);
    }
  }

  function setForce(address: string, target: ForceTarget) {
    setForceState((current) => {
      const next = {
        ...current,
        [address]: { target, source: 'manual', updatedAt: new Date().toISOString() as string } as any
      };
      forceStateRef.current = next;
      return next;
    });
    createRuntimeWarningEvent('memory.changed', address, `${address} em FORCE ${target.toUpperCase()}`, { address, force: target });
  }

  function releaseForce(address: string) {
    setForceState((current) => {
      const next = { ...current };
      delete next[address];
      forceStateRef.current = next;
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

  function handleDeployResult(ok: boolean, message: string) {
    if (ok) {
      createRuntimeInfoEvent('gateway.connected', 'deploy', message, { mode: settings.apiMode });
      setStorageStatus(message);
      return;
    }

    createRuntimeWarningEvent('gateway.disconnected', 'deploy', message, { mode: settings.apiMode });
    setStorageStatus(message);
  }

  function navigateTo(item: NavItem) {
    setActiveNavItem(item);
    window.requestAnimationFrame(() => {
      document.getElementById(sectionIdForNavItem(item))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function toggleIoPoint(id: string, field: 'state' | 'manualMode' | 'testMode') {
    recordUndo(`Alterar I/O ${field}`);
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const nextProject = {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        io: currentProject.io.map((point) => (point.id === id ? { ...point, [field]: !point[field] } : point))
      };
      const point = nextProject.io.find((item) => item.id === id);
      if (point) {
        createRuntimeInfoEvent('io.changed', point.address, `${point.address} ${field} = ${point[field] ? 'true' : 'false'}`, {
          id,
          field,
          value: point[field]
        });
      }
      return nextProject;
    });
  }

  function updateIoPoint(id: string, patch: any) {
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        io: currentProject.io.map((point) => (point.id === id ? { ...point, ...patch } : point))
      };
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
    recordUndo('Resetar contador');
    updateSelectedBlock({ accumulatedCount: 0, previousInput: false, active: false });
  }

  function toggleIntegration(id: string) {
    recordUndo('Alternar integração');
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        integrations: (currentProject.integrations || []).map((int) =>
          int.id === id ? { ...int, enabled: !int.enabled, status: !int.enabled ? 'connected' : 'idle' } : int
        )
      };
    });
  }

  function configureIntegration(id: string) {
    createRuntimeInfoEvent('project.changed', id, `Configurando integração ${id}`);
    // Placeholder for configuration UI/logic
  }

  return {
    state: {
      project,
      selectedBlockId,
      selectedRungId,
      storageStatus,
      runtimeMode,
      scanCount,
      memoryMap,
      forceState,
      settings,
      activeNavItem,
      snapshots,
      undoStack,
      redoStack,
      selectedBlock,
      selectedRung,
      watchItems,
      projectIssues,
      fileInputRef
    },
    actions: {
      recordUndo,
      undoProjectChange,
      redoProjectChange,
      updateSelectedBlock,
      addBlock,
      insertBlock,
      addBranch,
      updateSelectedRung,
      addRung,
      moveSelectedRung,
      duplicateSelectedRung,
      deleteSelectedRung,
      duplicateSelectedBlock,
      moveSelectedBlock,
      deleteSelectedBlock,
      runScanSimulation,
      resetProject,
      resetRuntimeState,
      releaseAllForces,
      handleImportProject,
      handleExportProject,
      createSnapshot,
      restoreSnapshot,
      removeSnapshot,
      toggleRuntimeMode,
      updateSettings,
      toggleMemory,
      toggleBlock,
      setForce,
      releaseForce,
      handleGatewayResult,
      handleDeployResult,
      navigateTo,
      toggleIoPoint,
      updateIoPoint,
      toggleIntegration,
      configureIntegration,
      handlePresetChange,
      handlePresetCountChange,
      resetSelectedCounter,
      setSelectedRungId,
      setSelectedBlockId,
      saveProjectToStorage
    }
  };
}
