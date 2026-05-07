type LadderBlock = {
  id: string;
  label: string;
  kind: 'contact-no' | 'contact-nc' | 'timer' | 'coil';
  active?: boolean;
};

type LadderRung = {
  id: string;
  title: string;
  description: string;
  blocks: LadderBlock[];
};

const rungs: LadderRung[] = [
  {
    id: 'rung-001',
    title: 'Partida da bomba',
    description: 'Entrada digital aciona saída com contato NA.',
    blocks: [
      { id: 'i0', label: 'I0', kind: 'contact-no', active: true },
      { id: 'q0', label: 'Q0', kind: 'coil', active: true }
    ]
  },
  {
    id: 'rung-002',
    title: 'Intertravamento simples',
    description: 'Contato NF bloqueia acionamento inseguro.',
    blocks: [
      { id: 'i1', label: 'I1', kind: 'contact-no', active: true },
      { id: 'i2', label: 'I2', kind: 'contact-nc', active: false },
      { id: 'q1', label: 'Q1', kind: 'coil', active: false }
    ]
  },
  {
    id: 'rung-003',
    title: 'Retardo de acionamento',
    description: 'Temporizador TON prepara saída após preset.',
    blocks: [
      { id: 'i3', label: 'I3', kind: 'contact-no', active: false },
      { id: 't0', label: 'TON 5s', kind: 'timer', active: false },
      { id: 'q2', label: 'Q2', kind: 'coil', active: false }
    ]
  }
];

const navItems = ['Ladder', 'IO', 'Gateway', 'Nós', 'Fail-safe', 'Diagnóstico'];

function blockClass(block: LadderBlock) {
  return `ladder-block ${block.kind} ${block.active ? 'is-active' : ''}`;
}

function App() {
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
            Gateway mock online
          </div>
        </header>

        <section className="status-grid" aria-label="Resumo operacional">
          <article className="metric-card">
            <span>Gateway</span>
            <strong>Online</strong>
            <small>192.168.4.1</small>
          </article>
          <article className="metric-card">
            <span>Scan</span>
            <strong>4.2 ms</strong>
            <small>sem overrun</small>
          </article>
          <article className="metric-card warning">
            <span>Alertas</span>
            <strong>1 ativo</strong>
            <small>nó pendente</small>
          </article>
          <article className="metric-card">
            <span>I/O</span>
            <strong>8 pontos</strong>
            <small>3 saídas</small>
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
              <h2>Controle local do gateway</h2>
            </div>
            <span className="status-badge">Modo mock</span>
          </div>

          <div className="rung-list">
            {rungs.map((rung, index) => (
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
                        <span className="block-symbol">
                          {block.kind === 'contact-no' && '[ ]'}
                          {block.kind === 'contact-nc' && '[/]'}
                          {block.kind === 'timer' && 'TON'}
                          {block.kind === 'coil' && '( )'}
                        </span>
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
