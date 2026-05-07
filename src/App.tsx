import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { getMockProject } from './services/mockEndapApi';
import { EndapLadderBlock, EndapProject } from './types/endap';

const navItems = ['Ladder', 'IO', 'Gateway', 'Nós', 'Fail-safe', 'Diagnóstico'];

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

function App() {
  const [project, setProject] = useState<EndapProject | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    getMockProject().then((loadedProject) => {
      setProject(loadedProject);
      setSelectedBlockId(loadedProject.ladderProgram.rungs[0]?.blocks[0]?.id ?? null);
    });
  }, []);

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

  function handlePresetChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value;
    const presetMs = rawValue.trim() === '' ? undefined : Number(rawValue);
    updateSelectedBlock({ presetMs: Number.isNaN(presetMs) ? undefined : presetMs });
  }

  if (!project) {
    return (
      <main className="loading-screen">
        <div className="brand-card compact">
          <span className="brand-mark">E</span>
          <div>
            <strong>ENDAP Studio</strong>
            <small>Carregando projeto local...</small>
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
          <div className="connection-pill">
            <span className="pulse" />
            {project.gateway.name} {project.gateway.status}
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
            <small>programa em {project.ladderProgram.mode}</small>
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
          <button type="button">+ Rung</button>
          <button type="button">+ Contato</button>
          <button type="button">+ Bobina</button>
          <button type="button">+ Timer</button>
          <button type="button">Simular</button>
        </section>

        <section className="editor-layout">
          <section className="ladder-panel" aria-label="Editor Ladder">
            <div className="ladder-header">
              <div>
                <p className="eyebrow">Programa principal</p>
                <h2>{project.ladderProgram.name}</h2>
              </div>
              <span className="status-badge">Modo {project.ladderProgram.mode}</span>
            </div>

            <div className="rung-list">
              {project.ladderProgram.rungs.map((rung, index) => (
                <article className="rung-card" key={rung.id}>
                  <div className="rung-meta">
                    <strong>Rung {index + 1}</strong>
                    <span>{rung.title}</span>
                    <small>{rung.description}</small>
                  </div>

                  <div className="ladder-canvas" role="group" aria-label={rung.title}>
                    <div className="rail left" />
                    <div className="rail right" />
                    <div className="wire" />

                    <div className="block-row">
                      {rung.blocks.map((block) => (
                        <button
                          className={blockClass(block, selectedBlockId === block.id)}
                          key={block.id}
                          onClick={() => setSelectedBlockId(block.id)}
                          type="button"
                        >
                          <span className="block-symbol">{blockSymbol(block)}</span>
                          <strong>{block.label}</strong>
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
                  <button type="button">Salvar mock</button>
                  <button type="button">Duplicar</button>
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
