import { useState, useEffect } from 'react';
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
import { HmiPanel } from './components/HmiPanel';
import { renderSymbol } from './components/LadderEditor/utils';
import './styles/ide.css';

function App() {
  const { state, actions } = useStudioController();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolboxOpen, setToolboxOpen] = useState(true);
  const [hmiOpen, setHmiOpen] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'toolbox' | 'properties'>('toolbox');

  // Touch Drag-and-Drop State
  const [touchDragging, setTouchDragging] = useState<{ kind: string; x: number; y: number } | null>(null);

  const handleTouchStart = (kind: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchDragging({ kind, x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragging) return;
    const touch = e.touches[0];
    setTouchDragging({ ...touchDragging, x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragging) return;
    
    // Find drop target at touch position
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropTarget = target?.closest('.matrix-wire-spacer, .ladder-block-wrapper');

    if (dropTarget) {
      const rungElement = target?.closest('.rung-card');
      const rungId = rungElement?.getAttribute('data-rung-id');
      
      if (rungId) {
        if (dropTarget.classList.contains('matrix-wire-spacer')) {
          actions.insertBlock(touchDragging.kind as any, rungId);
        } else {
          // It's a block wrapper, potentially a branch anchor
          const blockId = dropTarget.getAttribute('data-block-id');
          if (blockId) {
            actions.addBranch(rungId, blockId, touchDragging.kind as any);
          }
        }
      }
    }

    setTouchDragging(null);
  };

  // Auto-switch: clicking a Block opens Properties. Clicking a Rung or a Cell opens Toolbox.
  useEffect(() => {
    if (state.selectedBlock) {
      setRightPanelTab('properties');
      setToolboxOpen(true);
    } else if (state.selectedRungId || state.selectedBlockId?.startsWith('cell-')) {
      setRightPanelTab('toolbox');
      setToolboxOpen(true);
    }
  }, [state.selectedBlockId, state.selectedRungId, state.selectedBlock, state.selectedRung]);

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

  const hasFaults = state.projectIssues.some(i => i.severity === 'fault');
  const hasWarnings = state.projectIssues.some(i => i.severity === 'warning');

  const renderToolbox = () => (
    <div className="ide-toolbox">
      <div className="ide-toolbox-title">Inserir na Rung Selecionada</div>
      <div className="ide-toolbox-grid">
        <button className="ide-toolbox-btn" type="button" onClick={actions.addRung}>+ Rung</button>
        <button className="ide-toolbox-btn" type="button" onClick={() => actions.addBranch()}>
          {renderSymbol('branch-or')} Paralelo
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'contact-no')}
          onClick={() => actions.insertBlock('contact-no', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('contact-no')} Contato NA
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'contact-nc')}
          onClick={() => actions.insertBlock('contact-nc', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('contact-nc')} Contato NF
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'coil')}
          onClick={() => actions.insertBlock('coil', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('coil')} Bobina
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'timer-ton')}
          onClick={() => actions.insertBlock('timer-ton', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('timer-ton')} Timer TON
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'counter')}
          onClick={() => actions.insertBlock('counter', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('counter')} Contador
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'memory-contact-no')}
          onClick={() => actions.insertBlock('memory-contact-no', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('memory-contact-no')} Memória
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'compare-grt')}
          onClick={() => actions.insertBlock('compare-grt', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('compare-grt')} Maior que ({'>'})
        </button>
        <button 
          className="ide-toolbox-btn" type="button" draggable 
          onDragStart={(e) => e.dataTransfer.setData('endap/block', 'compare-les')}
          onClick={() => actions.insertBlock('compare-les', state.selectedRungId || state.project?.ladderProgram.rungs[0]?.id || '', state.selectedBlockId || undefined)}>
          {renderSymbol('compare-les')} Menor que ({'<'})
        </button>
      </div>
      <div className="ide-toolbox-title" style={{ marginTop: '16px' }}>Simulation & Project</div>
      <div className="ide-toolbox-grid">
        <button className="ide-toolbox-btn" type="button" onClick={actions.toggleRuntimeMode}>{state.runtimeMode === 'RUN' ? 'STOP' : 'RUN'}</button>
        <button className="ide-toolbox-btn" type="button" onClick={() => actions.runScanSimulation('manual')}>STEP</button>
        <button className="ide-toolbox-btn" type="button" onClick={actions.resetRuntimeState}>Limpar rt</button>
        <button className="ide-toolbox-btn" type="button" onClick={actions.undoProjectChange} disabled={state.undoStack.length === 0}>Undo</button>
        <button className="ide-toolbox-btn" type="button" onClick={actions.redoProjectChange} disabled={state.redoStack.length === 0}>Redo</button>
        <button className="ide-toolbox-btn" type="button" onClick={actions.resetProject}>Resetar</button>
      </div>
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', padding: '0 16px 16px' }}>
         <button className="ide-toolbox-btn" style={{flex: 1}} type="button" onClick={actions.handleExportProject}>Export</button>
         <button className="ide-toolbox-btn" style={{flex: 1}} type="button" onClick={() => state.fileInputRef.current?.click()}>Import</button>
         <input ref={state.fileInputRef} className="file-input" type="file" accept=".json,.endap.json,application/json" onChange={actions.handleImportProject} />
      </div>
    </div>
  );

  return (
    <main className={`ide-shell ${state.activeNavItem === 'Ladder' ? 'ladder-fullscreen' : ''}`}>
      {state.activeNavItem !== 'Ladder' && (
      <header className="ide-header">
        <div className="ide-header-left" style={{ position: 'relative' }}>
          <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>
          {menuOpen && (
            <div className="hamburger-dropdown" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {navItems.map(item => (
                 <div key={item} className={`dropdown-item ${state.activeNavItem === item ? 'active' : ''}`} onClick={() => { actions.navigateTo(item); setMenuOpen(false); }}>
                   {item === 'Dashboard' ? '📊 Home' :
                    item === 'Ladder' ? '📝 Lógica Ladder' :
                    item === 'Tags' ? '🗂️ Banco de Tags' :
                    item === 'Gateway' ? '🌐 Gateway' :
                    item === 'IO' ? '🔌 I/O' :
                    item === 'Diagnóstico' ? '🩺 Diagnóstico' :
                    item === 'Deploy' ? '🚀 Deploy / Flash' :
                    item === 'Integrações' ? '🤖 Integrações' :
                    item}
                 </div>
              ))}
            </div>
          )}
          <div className="ide-brand">ENDAP Studio</div>
          <div className="ide-project-name">{state.project.name || 'Projeto sem nome'}</div>
        </div>
        
        <div className="ide-header-right">
          <div className={`connection-pill ${state.runtimeMode === 'RUN' ? 'runtime-run' : ''}`}>
            <div className={`led-indicator ${
              hasFaults ? 'is-error' : 
              hasWarnings ? 'is-warning' : 
              state.runtimeMode === 'RUN' ? 'is-running' : ''
            }`} />
            {state.runtimeMode} · {state.project.ladderProgram.scanTimeMs}ms
          </div>
        </div>
      </header>
      )}

      {/* When in ladder full screen, we add our own header inside the workspace to emulate the "app" feel without sidebars */}
      {state.activeNavItem === 'Ladder' && (
      <header className="ladder-app-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--panel-strong)', borderBottom: '1px solid var(--line)', alignItems: 'center', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.2rem' }}>⚙️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>Simurelay App</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{state.project.name} - {state.project.ladderProgram.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className={`icon-btn ${hmiOpen ? 'active' : ''}`}
            onClick={() => setHmiOpen(!hmiOpen)}
            title="Simular Campo (HMI)"
            style={{ fontSize: '1.4rem' }}
          >
            🎮
          </button>
          <button 
            className={`icon-btn ${toolboxOpen ? 'active' : ''}`}
            onClick={() => setToolboxOpen(!toolboxOpen)}
            title={toolboxOpen ? "Recolher Ferramentas" : "Mostrar Ferramentas"}
          >
            🛠️
          </button>
          <div className={`connection-pill ${state.runtimeMode === 'RUN' ? 'runtime-run' : ''}`} style={{ marginRight: '8px' }}>
            <div className={`led-indicator ${state.runtimeMode === 'RUN' ? 'is-running' : ''}`} />
            {state.runtimeMode}
          </div>
          <button 
            className="primaryBtn"
            onClick={() => actions.navigateTo('Dashboard')} 
            style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>💾</span> Salvar e Sair (ESP)
          </button>
        </div>
      </header>
      )}

      {hmiOpen && (
        <div className="hmi-overlay-wrapper">
          <HmiPanel 
            project={state.project} 
            onToggleInput={(id) => actions.toggleIoPoint(id, 'state')} 
            onClose={() => setHmiOpen(false)}
            isMobile={window.matchMedia('(max-width: 768px)').matches}
          />
        </div>
      )}

      <div className={`ide-main-area ${state.activeNavItem !== 'Ladder' ? 'no-right-panel' : ''} ${!toolboxOpen && state.activeNavItem === 'Ladder' ? 'right-panel-collapsed' : ''}`}>
        
        {state.activeNavItem !== 'Ladder' && (
        <aside className="ide-sidebar">
          <div className="ide-tree-header">Project Tree</div>
          <div className="ide-tree-list">
            {navItems.map((item) => (
              <div
                className={`ide-tree-item ${item === state.activeNavItem ? 'active' : ''}`}
                key={item}
                onClick={() => actions.navigateTo(item)}
              >
                {item === 'Ladder' ? '📝 MainTask (Ladder)' : `📁 ${item}`}
              </div>
            ))}
          </div>
        </aside>
        )}

        <section className="ide-workspace">
          {state.activeNavItem !== 'Ladder' && (
          <div className="ide-workspace-header">
            <div className="ide-tab active">{state.activeNavItem}</div>
          </div>
          )}
          <div className={`ide-workspace-content ${state.activeNavItem === 'Ladder' ? 'no-padding' : ''}`}>
            {state.activeNavItem === 'Ladder' && (
              <LadderEditor
              project={state.project}
              runtimeMode={state.runtimeMode}
              selectedRungId={state.selectedRungId}
              selectedBlockId={state.selectedBlockId}
              actions={actions}
            />)}

            {state.activeNavItem === 'Tags' && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text)' }}>Banco de Variáveis (Tags)</h2>
                  <button className="ide-toolbox-btn" style={{ padding: '6px 12px', background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 2 }}>+ Nova Tag</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', border: '1px solid var(--line)', background: 'var(--panel)' }}>
                    <thead>
                      <tr style={{ background: 'var(--panel-strong)', textAlign: 'left' }}>
                        <th style={{ padding: 12, borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 13 }}>Endereço / Tag</th>
                        <th style={{ padding: 12, borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 13 }}>Tipo</th>
                        <th style={{ padding: 12, borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 13 }}>Dado</th>
                        <th style={{ padding: 12, borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 13 }}>Monitoramento (Live)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.project.tags?.map(tag => {
                        const value = tag.type === 'memory' ? state.memoryMap[tag.name] : 
                                      tag.type === 'input' || tag.type === 'output' ? state.project.io.find(io => io.id === tag.ioPointId)?.state :
                                      tag.value;
                        const isTrue = !!value;
                        
                        return (
                          <tr key={tag.id} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: 12, fontSize: 14, fontFamily: 'monospace', color: 'var(--cyan)' }}>{tag.name}</td>
                            <td style={{ padding: 12, fontSize: 13 }}>{tag.type.toUpperCase()}</td>
                            <td style={{ padding: 12, fontSize: 13 }}>{tag.dataType.toUpperCase()}</td>
                            <td style={{ padding: 12, fontSize: 13 }}>
                              <span style={{ 
                                display: 'inline-block', padding: '2px 8px', borderRadius: 2, 
                                background: isTrue ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: isTrue ? 'var(--green)' : 'var(--muted)'
                              }}>
                                {isTrue ? 'TRUE' : 'FALSE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {state.activeNavItem === 'Gateway' && (
              <GatewayContract settings={state.settings} onSettingsChange={actions.updateSettings} onGatewayResult={actions.handleGatewayResult} />
            )}

            {state.activeNavItem === 'Diagnóstico' && (
              <>
                <RuntimeTimeline />
                <ProjectHealthPanel issues={state.projectIssues} />
              </>
            )}

            {state.activeNavItem === 'Dashboard' && (
              <Dashboard project={state.project} />
            )}
            
            {state.activeNavItem === 'Integrações' && (
              <IntegrationStore 
                integrations={state.project.integrations || []} 
                onToggle={actions.toggleIntegration}
                onConfigure={actions.configureIntegration}
              />
            )}

            {state.activeNavItem === 'Deploy' && (
              <>
                <SnapshotPanel
                  snapshots={state.snapshots}
                  onCreateSnapshot={actions.createSnapshot}
                  onDeleteSnapshot={actions.removeSnapshot}
                  onRestoreSnapshot={actions.restoreSnapshot}
                />
                <DeploymentPanel issues={state.projectIssues} project={state.project} settings={state.settings} onDeployResult={actions.handleDeployResult} />
              </>
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
          </div>
        </section>

        {state.activeNavItem === 'Ladder' && (
          <aside className="ide-right-panel">
            <div className="ide-right-panel-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
              <button 
                style={{ flex: 1, padding: '12px', background: rightPanelTab === 'toolbox' ? 'var(--bg-soft)' : 'transparent', color: rightPanelTab === 'toolbox' ? 'var(--cyan)' : 'var(--muted)', border: 'none', borderBottom: rightPanelTab === 'toolbox' ? '2px solid var(--cyan)' : '2px solid transparent', fontWeight: 600 }}
                onClick={() => setRightPanelTab('toolbox')}
              >
                Toolbox
              </button>
              <button 
                style={{ flex: 1, padding: '12px', background: rightPanelTab === 'properties' ? 'var(--bg-soft)' : 'transparent', color: rightPanelTab === 'properties' ? 'var(--cyan)' : 'var(--muted)', border: 'none', borderBottom: rightPanelTab === 'properties' ? '2px solid var(--cyan)' : '2px solid transparent', fontWeight: 600 }}
                disabled={!state.selectedBlock && !state.selectedRungId}
                onClick={() => setRightPanelTab('properties')}
              >
                Propriedades {state.selectedBlock ? `(${state.selectedBlock.label})` : ''}
              </button>
              <button 
                style={{ flex: 0.5, padding: '12px', background: 'transparent', color: 'var(--red)', border: 'none', fontWeight: 600, borderBottom: '2px solid transparent' }}
                onClick={() => setToolboxOpen(false)}
              >
                ⏷ Ocultar
              </button>
            </div>

            {rightPanelTab === 'toolbox' && renderToolbox()}

            {rightPanelTab === 'properties' && (
              <div className="ide-properties">
                <PropertyPanel
                  project={state.project}
                  selectedBlock={state.selectedBlock}
                  selectedRung={state.selectedRung}
                  memoryMap={state.memoryMap}
                  watchItems={state.watchItems}
                  actions={actions}
                  onClose={() => setToolboxOpen(false)}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {state.activeNavItem !== 'Ladder' && (
      <footer className={`ide-bottom-panel ${!bottomPanelOpen ? 'collapsed' : ''}`}>
        <div className="ide-bottom-tabs">
          <div className="ide-bottom-tab active">Output / Status</div>
          <button className="panel-toggle-btn" onClick={() => setBottomPanelOpen(!bottomPanelOpen)}>
            {bottomPanelOpen ? '▼ Minimizar' : '▲ Expandir Status'}
          </button>
        </div>
        <div className="ide-bottom-content">
          <section className="status-grid">
            <article className="metric-card">
              <span>Gateway</span>
              <strong>{state.project.gateway.status}</strong>
              <small>{state.project.gateway.ipAddress}:{state.project.gateway.port}</small>
            </article>
            <article className="metric-card">
              <span>Scan Simulation</span>
              <strong>{state.project.ladderProgram.scanTimeMs} ms</strong>
              <small>{state.scanCount} ciclos executados</small>
            </article>
            <article className="metric-card">
              <span>Memórias Internas</span>
              <strong>{activeMemories} ativas</strong>
              <small>{Object.keys(state.memoryMap).length} tags registradas</small>
            </article>
            <article className="metric-card">
              <span>I/O Local</span>
              <strong>{state.project.io.length} pontos</strong>
              <small>{outputCount} saídas · {activeAlerts} alertas</small>
            </article>
          </section>
        </div>
      </footer>
      )}

      {/* Mobile Bottom Sheet for Properties/Toolbox */}
      {state.activeNavItem === 'Ladder' && (state.selectedBlock || state.selectedRung || state.selectedBlockId?.startsWith('cell-')) && state.selectedBlockId !== 'MINIMIZED' && (
        <div className="mobile-bottom-sheet">
          <div className="sheet-header">
            <strong>{state.selectedBlockId?.startsWith('cell-') ? 'Inserir Elemento' : (state.selectedBlock ? 'Editar Bloco' : 'Editar Rung')}</strong>
            <button className="icon-btn" onClick={() => { actions.setSelectedBlockId(null); actions.setSelectedRungId(null); }}>✕</button>
          </div>
          <div className="sheet-content">
            {state.selectedBlockId?.startsWith('cell-') ? (
              renderToolbox()
            ) : (
              <PropertyPanel
                project={state.project}
                selectedBlock={state.selectedBlock}
                selectedRung={state.selectedRung}
                memoryMap={state.memoryMap}
                watchItems={state.watchItems}
                actions={actions}
                onClose={() => {
                  actions.setSelectedBlockId(null);
                  actions.setSelectedRungId(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation or Ladder Toolbox */}
      <nav className="mobile-bottom-nav">
        {state.activeNavItem === 'Ladder' ? (
          <div 
            className="mobile-ladder-toolbox"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <button className="toolbox-item" onClick={actions.addRung}><span>➕</span><label>Rung</label></button>
            <button className="toolbox-item" 
              onTouchStart={(e) => handleTouchStart('contact-no', e)}
              onClick={() => actions.insertBlock('contact-no', state.selectedRungId || '', state.selectedBlockId || undefined)}>
              <span>{renderSymbol('contact-no')}</span><label>NA</label>
            </button>
            <button className="toolbox-item" 
              onTouchStart={(e) => handleTouchStart('contact-nc', e)}
              onClick={() => actions.insertBlock('contact-nc', state.selectedRungId || '', state.selectedBlockId || undefined)}>
              <span>{renderSymbol('contact-nc')}</span><label>NF</label>
            </button>
            <button className="toolbox-item" 
              onTouchStart={(e) => handleTouchStart('coil', e)}
              onClick={() => actions.insertBlock('coil', state.selectedRungId || '', state.selectedBlockId || undefined)}>
              <span>{renderSymbol('coil')}</span><label>Bobina</label>
            </button>
            <button className="toolbox-item" 
              onTouchStart={(e) => handleTouchStart('timer-ton', e)}
              onClick={() => actions.insertBlock('timer-ton', state.selectedRungId || '', state.selectedBlockId || undefined)}>
              <span>{renderSymbol('timer-ton')}</span><label>Timer</label>
            </button>
            <button className="toolbox-item" 
              onTouchStart={(e) => handleTouchStart('compare-grt', e)}
              onClick={() => actions.insertBlock('compare-grt', state.selectedRungId || '', state.selectedBlockId || undefined)}>
              <span>{renderSymbol('compare-grt')}</span><label>Comp</label>
            </button>
            <button className="toolbox-item" onClick={() => setHmiOpen(!hmiOpen)}><span>🎮</span><label>HMI</label></button>
            <button className="toolbox-item" onClick={() => actions.navigateTo('Dashboard')}><span>🔙</span><label>Sair</label></button>
          </div>
        ) : (
          <>
            <button 
              className={`mobile-nav-btn ${state.activeNavItem === 'Dashboard' ? 'active' : ''}`}
              onClick={() => actions.navigateTo('Dashboard')}
            >
              <span className="icon">📊</span>
              <span className="label">Home</span>
            </button>
            <button 
              className={`mobile-nav-btn ${state.activeNavItem === 'Ladder' ? 'active' : ''}`}
              onClick={() => actions.navigateTo('Ladder')}
            >
              <span className="icon">📝</span>
              <span className="label">Ladder</span>
            </button>
            <button 
              className={`mobile-nav-btn ${state.activeNavItem === 'Tags' ? 'active' : ''}`}
              onClick={() => actions.navigateTo('Tags')}
            >
              <span className="icon">🗂️</span>
              <span className="label">Tags</span>
            </button>
            <button 
              className={`mobile-nav-btn ${state.activeNavItem === 'IO' ? 'active' : ''}`}
              onClick={() => actions.navigateTo('IO')}
            >
              <span className="icon">🔌</span>
              <span className="label">I/O</span>
            </button>
            <button 
              className={`mobile-nav-btn ${state.activeNavItem === 'Diagnóstico' ? 'active' : ''}`}
              onClick={() => actions.navigateTo('Diagnóstico')}
            >
              <span className="icon">🩺</span>
              <span className="label">Diag</span>
            </button>
          </>
        )}
      </nav>

      {/* Touch Drag Ghost */}
      {touchDragging && (
        <div 
          className="touch-drag-ghost"
          style={{ 
            position: 'fixed', 
            left: touchDragging.x, 
            top: touchDragging.y, 
            transform: 'translate(-50%, -100%) scale(1.2)',
            pointerEvents: 'none',
            zIndex: 9999,
            background: 'var(--selection)',
            border: '2px solid var(--cyan)',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {renderSymbol(touchDragging.kind)}
        </div>
      )}
    </main>
  );
}

export default App;
