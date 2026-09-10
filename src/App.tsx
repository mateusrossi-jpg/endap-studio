import { useState } from 'react';
import { DeploymentPanel } from './components/DeploymentPanel';
import { Dashboard } from './components/Dashboard';
import { IntegrationStore } from './components/IntegrationStore';
import { FieldPanels } from './components/FieldPanels';
import { GatewayContract } from './components/GatewayContract';
import { ProjectHealthPanel } from './components/ProjectHealthPanel';
import { RuntimeTimeline } from './components/RuntimeTimeline';
import { SnapshotPanel } from './components/SnapshotPanel';
import { navItems } from './utils/studioUtils';
import { useStudioController } from './hooks/useStudioController';
import { PropertyPanel } from './components/PropertyPanel';
import { LadderEditor } from './components/LadderEditor/LadderEditor';

function App() {
  const { state, actions } = useStudioController();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!state.project) {
    return (
      <main className="loading-screen">
        <div className="brand-card compact">
          <span className="brand-mark">E</span>
          <div>
            <strong>ENDAP Studio</strong>
            <small>{state.storageStatus}</small>
          </div>
        </div>
      </main>
    );
  }

  const onlineNodes = state.project.nodes.filter((node) => node.status === 'online').length;
  const activeAlerts = state.project.alerts.filter((alert) => !alert.acknowledged).length;
  const outputCount = state.project.io.filter((point) => point.direction === 'output').length;
  const activeMemories = Object.entries(state.memoryMap).filter(([, value]) => value).length;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${isMobileMenuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
        <div className="brand-card">
          <span className="brand-mark">E</span>
          <div>
            <strong>ENDAP Studio</strong>
            <small>Ladder mobile-first</small>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Fechar menu">✕</button>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={item === state.activeNavItem ? 'nav-item active' : 'nav-item'}
              key={item}
              onClick={() => {
                actions.navigateTo(item);
                setIsMobileMenuOpen(false);
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <div className={`mobile-overlay ${isMobileMenuOpen ? 'is-open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Abrir menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div>
              <p className="eyebrow">Editor Escada / Automação ENDAP</p>
              <h1>Ladder touch-first para campo</h1>
            </div>
          </div>
          <div className={`connection-pill ${state.runtimeMode === 'RUN' ? 'runtime-run' : ''}`}>
            <span className="pulse" />
            {state.runtimeMode} · {state.storageStatus}
          </div>
        </header>

        <section className="status-grid" aria-label="Resumo operacional">
          <article className="metric-card">
            <span>Gateway</span>
            <strong>{state.project.gateway.status}</strong>
            <small>{state.project.gateway.ipAddress}:{state.project.gateway.port}</small>
          </article>
          <article className="metric-card">
            <span>Scan</span>
            <strong>{state.project.ladderProgram.scanTimeMs} ms</strong>
            <small>{state.scanCount} ciclos simulados</small>
          </article>
          <article className="metric-card warning">
            <span>Memórias</span>
            <strong>{activeMemories} ativas</strong>
            <small>{Object.keys(state.memoryMap).length} registradas</small>
          </article>
          <article className="metric-card">
            <span>I/O</span>
            <strong>{state.project.io.length} pontos</strong>
            <small>{outputCount} saídas · {activeAlerts} alerta</small>
          </article>
        </section>

        {state.activeNavItem === 'Ladder' && (
          <>
            <section className="ladder-toolbar" aria-label="Ferramentas Ladder">
              <button type="button" onClick={actions.addRung}>+ Rung</button>
              <button type="button" onClick={() => actions.addBlock('contact-no')}>+ Contato NA</button>
              <button type="button" onClick={() => actions.addBlock('contact-nc')}>+ Contato NF</button>
              <button type="button" onClick={() => actions.addBlock('memory-contact-no')}>+ Memória</button>
              <button type="button" onClick={actions.addBranch}>+ Branch OR</button>
              <button type="button" onClick={() => actions.addBlock('coil')}>+ Bobina</button>
              <button type="button" onClick={() => actions.addBlock('coil-set')}>+ SET</button>
              <button type="button" onClick={() => actions.addBlock('coil-reset')}>+ RESET</button>
              <button type="button" onClick={() => actions.addBlock('timer-ton')}>+ Timer</button>
              <button type="button" onClick={() => actions.addBlock('counter')}>+ CTU</button>
              <button type="button" onClick={() => actions.addBlock('counter-reset')}>+ RES</button>
              <button type="button" onClick={actions.undoProjectChange} disabled={state.undoStack.length === 0}>Undo</button>
              <button type="button" onClick={actions.redoProjectChange} disabled={state.redoStack.length === 0}>Redo</button>
              <button type="button" onClick={actions.toggleRuntimeMode}>
                {state.runtimeMode === 'RUN' ? 'STOP' : 'RUN'}
              </button>
              <button type="button" onClick={() => actions.runScanSimulation('manual')}>STEP</button>
              <button type="button" onClick={actions.resetRuntimeState}>Limpar runtime</button>
              <button type="button" onClick={actions.releaseAllForces}>Release forces</button>
              <button type="button" onClick={actions.handleExportProject}>Exportar</button>
              <button type="button" onClick={() => state.fileInputRef.current?.click()}>Importar</button>
              <button type="button" onClick={actions.resetProject}>Resetar</button>
              <input ref={state.fileInputRef} className="file-input" type="file" accept=".json,.endap.json,application/json" onChange={actions.handleImportProject} />
            </section>

            <section className="editor-layout" id="ladder-section">
              <LadderEditor
                project={state.project}
                runtimeMode={state.runtimeMode}
                selectedBlockId={state.selectedBlockId}
                selectedRungId={state.selectedRungId}
                actions={actions}
              />
              <PropertyPanel
                project={state.project}
                selectedBlock={state.selectedBlock}
                selectedRung={state.selectedRung}
                memoryMap={state.memoryMap}
                watchItems={state.watchItems}
                actions={actions}
              />
            </section>
          </>
        )}

        {state.activeNavItem === 'Gateway' && (
          <section className="observability-layout" id="gateway-section">
            <GatewayContract settings={state.settings} onSettingsChange={actions.updateSettings} onGatewayResult={actions.handleGatewayResult} />
          </section>
        )}

        {state.activeNavItem === 'Diagnóstico' && (
          <section className="observability-layout" id="diagnostics-section">
            <RuntimeTimeline />
            <ProjectHealthPanel issues={state.projectIssues} />
          </section>
        )}

        {state.activeNavItem === 'Dashboard' && (
          <section className="dashboard-layout" id="dashboard-section">
            <Dashboard project={state.project} />
          </section>
        )}
        {state.activeNavItem === 'Integrações' && (
          <section className="integrations-layout" id="integrations-section">
            <IntegrationStore 
              integrations={state.project.integrations || []} 
              onToggle={actions.toggleIntegration}
              onConfigure={actions.configureIntegration}
            />
          </section>
        )}

        {state.activeNavItem === 'Deploy' && (
          <section className="snapshot-layout" id="snapshot-layout">
            <SnapshotPanel
              snapshots={state.snapshots}
              onCreateSnapshot={actions.createSnapshot}
              onDeleteSnapshot={actions.removeSnapshot}
              onRestoreSnapshot={actions.restoreSnapshot}
            />
            <DeploymentPanel issues={state.projectIssues} project={state.project} settings={state.settings} onDeployResult={actions.handleDeployResult} />
          </section>
        )}

        {['IO', 'Nós', 'Fail-safe'].includes(state.activeNavItem) && (
          <FieldPanels
            activeTab={state.activeNavItem}
            diagnostics={state.project.diagnostics}
            failSafePolicies={state.project.failSafePolicies}
            io={state.project.io}
            nodes={state.project.nodes}
            onToggleIoManual={(id) => actions.toggleIoPoint(id, 'manualMode')}
            onToggleIoState={(id) => actions.toggleIoPoint(id, 'state')}
            onToggleIoTest={(id) => actions.toggleIoPoint(id, 'testMode')}
          />
        )}
      </section>
    </main>
  );
}

export default App;
