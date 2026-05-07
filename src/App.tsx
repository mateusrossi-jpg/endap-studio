import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getMockProject } from './services/mockEndapApi';
import {
  clearStoredProject,
  downloadProjectBackup,
  importProjectFromFile,
  loadProjectFromStorage,
  saveProjectToStorage
} from './services/storage';
import { EndapLadderBlock, EndapLadderBlockKind, EndapProject } from './types/endap';

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
  if (block.kind === 'timer-ton') return 'TON';
  if (block.kind === 'timer-tof') return 'TOF';
  if (block.kind === 'counter') return 'CTU';
  return '( )';
}

function blockKindLabel(block: EndapLadderBlock) {
  if (block.kind === 'contact-no') return 'Contato normalmente aberto';
  if (block.kind === 'contact-nc') return 'Contato normalmente fechado';
  if (block.kind === 'timer-ton') return 'Temporizador TON';
  if (block.kind === 'timer-tof') return 'Temporizador TOF';
  if (block.kind === 'counter') return 'Contador';
  return 'Bobina de saída';
}

function timerProgress(block: EndapLadderBlock) {
  if (!block.presetMs) return 0;
  return Math.min(100, Math.round(((block.elapsedMs ?? 0) / block.presetMs) * 100));
}

function createBlock(kind: EndapLadderBlockKind, index: number): EndapLadderBlock {
  const prefixByKind: Record<EndapLadderBlockKind, string> = {
    'contact-no': 'I',
    'contact-nc': 'I',
    'timer-ton': 'T',
    'timer-tof': 'T',
    counter: 'C',
    coil: 'Q'
  };

  const label = `${prefixByKind[kind]}${index}`;

  return {
    id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    label,
    address: label,
    active: false,
    presetMs: kind.startsWith('timer') ? 1000 : undefined,
    elapsedMs: kind.startsWith('timer') ? 0 : undefined
  };
}

function simulateBlocks(blocks: EndapLadderBlock[], deltaMs: number): EndapLadderBlock[] {
  let power = true;

  return blocks.map((block) => {
    if (block.kind === 'contact-no') {
      power = power && block.active;
      return block;
    }

    if (block.kind === 'contact-nc') {
      power = power && !block.active;
      return block;
    }

    if (block.kind === 'timer-ton') {
      const presetMs = block.presetMs ?? 1000;
      const elapsedMs = power ? Math.min(presetMs, (block.elapsedMs ?? 0) + deltaMs) : 0;
      const active = elapsedMs >= presetMs;
      power = power && active;
      return { ...block, elapsedMs, active };
    }

    if (block.kind === 'timer-tof') {
      const presetMs = block.presetMs ?? 1000;
      const elapsedMs = power ? 0 : Math.min(presetMs, (block.elapsedMs ?? 0) + deltaMs);
      const active = power || elapsedMs < presetMs;
      power = active;
      return { ...block, elapsedMs, active };
    }

    if (block.kind === 'counter') {
      const active = power;
      power = power && active;
      return { ...block, active };
    }

    if (block.kind === 'coil') {
      return { ...block, active: power };
    }

    return block;
  });
}

function rungIsEnergized(blocks: EndapLadderBlock[]) {
  return blocks.some((block) => block.kind === 'coil' && block.active);
}

function App() {
  const [project, setProject] = useState<EndapProject | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRungId, setSelectedRungId] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState('Carregando projeto local...');
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('STOP');
  const [scanCount, setScanCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    saveProjectToStorage(project);
    setStorageStatus(runtimeMode === 'RUN' ? 'RUN ativo — salvando localmente' : 'Salvo localmente');
  }, [project, runtimeMode]);

  useEffect(() => {
    if (runtimeMode !== 'RUN') return;
    const interval = window.setInterval(() => {
      runScanSimulation('auto', AUTO_SCAN_INTERVAL_MS);
    }, AUTO_SCAN_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [runtimeMode]);

  const selectedBlock = useMemo(() => {
    if (!project || !selectedBlockId) return null;
    return project.ladderProgram.rungs.flatMap((rung) => rung.blocks).find((block) => block.id === selectedBlockId) ?? null;
  }, [project, selectedBlockId]);

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
            blocks: rung.blocks.map((block) => (block.id === selectedBlockId ? { ...block, ...patch } : block))
          }))
        }
      };
    });
  }

  function addBlock(kind: EndapLadderBlockKind) {
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const targetRungId = selectedRungId ?? currentProject.ladderProgram.rungs[0]?.id;
      if (!targetRungId) return currentProject;

      const nextIndex = currentProject.ladderProgram.rungs.reduce((total, rung) => total + rung.blocks.length, 0) + 1;
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

      const rungs = currentProject.ladderProgram.rungs.map((rung) => {
        const blockIndex = rung.blocks.findIndex((block) => block.id === selectedBlockId);
        if (blockIndex === -1) return rung;

        duplicatedBlock = {
          ...rung.blocks[blockIndex],
          id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          label: `${rung.blocks[blockIndex].label}_copy`
        };

        const blocks = [...rung.blocks];
        blocks.splice(blockIndex + 1, 0, duplicatedBlock);
        setSelectedRungId(rung.id);
        return { ...rung, blocks };
      });

      if (duplicatedBlock) setSelectedBlockId(duplicatedBlock.id);

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
    setProject((currentProject) => {
      if (!currentProject) return currentProject;
      const simulatedRungs = currentProject.ladderProgram.rungs.map((rung) => ({
        ...rung,
        blocks: simulateBlocks(rung.blocks, deltaMs)
      }));

      return {
        ...currentProject,
        updatedAt: new Date().toISOString(),
        ladderProgram: {
          ...currentProject.ladderProgram,
          scanTimeMs: Number((3.8 + Math.random() * 1.6).toFixed(2)),
          rungs: simulatedRungs
        }
      };
    });
    setScanCount((current) => current + 1);
    setStorageStatus(mode === 'auto' ? 'RUN executando scans' : 'STEP executado');
  }

  function resetProject() {
    setRuntimeMode('STOP');
    setScanCount(0);
    clearStoredProject();
    getMockProject().then((loadedProject) => {
      const refreshedProject = { ...loadedProject, updatedAt: new Date().toISOString() };
      setProject(refreshedProject);
      setSelectedRungId(refreshedProject.ladderProgram.rungs[0]?.id ?? null);
      setSelectedBlockId(refreshedProject.ladderProgram.rungs[0]?.blocks[0]?.id ?? null);
      setStorageStatus('Projeto reiniciado');
    });
  }

  async function handleImportProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedProject = await importProjectFromFile(file);
      setRuntimeMode('STOP');
      setProject({ ...importedProject, updatedAt: new Date().toISOString() });
      setSelectedRungId(importedProject.ladderProgram.rungs[0]?.id ?? null);
      setSelectedBlockId(importedProject.ladderProgram.rungs[0]?.blocks[0]?.id ?? null);
      setStorageStatus('Projeto importado');
    } catch {
      setStorageStatus('Falha ao importar projeto');
    } finally {
      event.target.value = '';
    }
  }

  function handlePresetChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value;
    const presetMs = rawValue.trim() === '' ? undefined : Number(rawValue);
    updateSelectedBlock({ presetMs: Number.isNaN(presetMs) ? undefined : presetMs, elapsedMs: 0 });
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
            <span>Alertas</span>
            <strong>{activeAlerts} ativo</strong>
            <small>{project.nodes.length - onlineNodes} nó fora do normal</small>
          </article>
          <article className="metric-card">
            <span>I/O</span>
            <strong>{project.io.length} pontos</strong>
            <small>{outputCount} saídas</small>
          </article>
        </section>

        <section className="ladder-toolbar" aria-label="Ferramentas Ladder">
          <button type="button" onClick={addRung}>+ Rung</button>
          <button type="button" onClick={() => addBlock('contact-no')}>+ Contato NA</button>
          <button type="button" onClick={() => addBlock('contact-nc')}>+ Contato NF</button>
          <button type="button" onClick={() => addBlock('coil')}>+ Bobina</button>
          <button type="button" onClick={() => addBlock('timer-ton')}>+ Timer</button>
          <button type="button" onClick={() => setRuntimeMode((current) => (current === 'RUN' ? 'STOP' : 'RUN'))}>
            {runtimeMode === 'RUN' ? 'STOP' : 'RUN'}
          </button>
          <button type="button" onClick={() => runScanSimulation('manual')}>STEP</button>
          <button type="button" onClick={() => downloadProjectBackup(project)}>Exportar</button>
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
                  </button>

                  <div className={`ladder-canvas ${rungIsEnergized(rung.blocks) ? 'is-energized' : ''}`} role="group" aria-label={rung.title}>
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
                        </button>
                      ))}
                    </div>
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
                  <span>Elapsed ms</span>
                  <input readOnly value={selectedBlock.elapsedMs ?? 0} />
                </label>
                <label>
                  <span>Preset ms</span>
                  <input inputMode="numeric" value={selectedBlock.presetMs ?? ''} onChange={handlePresetChange} />
                </label>

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
          </aside>
        </section>
      </section>
    </main>
  );
}

export default App;
