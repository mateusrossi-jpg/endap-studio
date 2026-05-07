import { useEffect, useState } from 'react';
import { getMockProject } from './services/mockEndapApi';
import { EndapLadderBlock, EndapProject } from './types/endap';

const navItems = ['Ladder', 'IO', 'Gateway', 'Nós', 'Fail-safe', 'Diagnóstico'];

function blockClass(block: EndapLadderBlock) {
  const cssKind = block.kind.replace('timer-', 'timer-');
  return `ladder-block ${cssKind} ${block.active ? 'is-active' : ''}`;
}

function blockSymbol(block: EndapLadderBlock) {
  if (block.kind === 'contact-no') return '[ ]';
  if (block.kind === 'contact-nc') return '[/]';
  if (block.kind === 'timer-ton') return 'TON';
  if (block.kind === 'timer-tof') return 'TOF';
  if (block.kind === 'counter') return 'CTU';
  return '( )';
}

function App() {
  const [project, setProject] = useState<EndapProject | null>(null);

  useEffect(() => {
    getMockProject().then(setProject);
  }, []);

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
                      <button className={blockClass(block)} key={block.id} type="button">
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
      </section>
    </main>
  );
}

export default App;
