import { useState, useEffect, useRef } from 'react';
import { EndapProject } from '../../types/endap';
import { RuntimeMode } from '../../hooks/useStudioController';
import { LadderRung } from './LadderRung';

export interface LadderEditorProps {
  project: EndapProject;
  runtimeMode: RuntimeMode;
  selectedRungId: string | null;
  selectedBlockId: string | null;
  actions: any;
}

export function LadderEditor({ project, runtimeMode, selectedRungId, selectedBlockId, actions }: LadderEditorProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  // Try to sync focused index with selectedRungId if it exists, otherwise default to 0
  const initialIndex = selectedRungId 
    ? Math.max(0, project.ladderProgram.rungs.findIndex(r => r.id === selectedRungId))
    : 0;
  
  const [focusedRungIndex, setFocusedRungIndex] = useState(initialIndex);

  // Infinite Canvas State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update focused index if selectedRungId changes from outside
  useEffect(() => {
    if (selectedRungId && isMobile) {
      const idx = project.ladderProgram.rungs.findIndex(r => r.id === selectedRungId);
      if (idx !== -1) setFocusedRungIndex(idx);
    }
  }, [selectedRungId, isMobile, project.ladderProgram.rungs]);

  const rungsToRender = isMobile 
    ? [project.ladderProgram.rungs[focusedRungIndex]].filter(Boolean)
    : project.ladderProgram.rungs;

  const handlePrev = () => {
    const newIdx = Math.max(0, focusedRungIndex - 1);
    setFocusedRungIndex(newIdx);
    actions.setSelectedRungId(project.ladderProgram.rungs[newIdx]?.id || null);
  };

  const handleNext = () => {
    const newIdx = Math.min(project.ladderProgram.rungs.length - 1, focusedRungIndex + 1);
    setFocusedRungIndex(newIdx);
    actions.setSelectedRungId(project.ladderProgram.rungs[newIdx]?.id || null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.005;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.2, scale + delta), 3);
      setScale(newScale);
    } else {
      setPosition(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+LeftClick for panning
      e.preventDefault();
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPosition({
      x: e.clientX - startPanPos.current.x,
      y: e.clientY - startPanPos.current.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      startPanPos.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanning || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - startPanPos.current.x,
      y: e.touches[0].clientY - startPanPos.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };
  
  const resetCanvas = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <section className="ladder-panel" aria-label="Editor Ladder">
      {!isMobile ? (
        <div className="ladder-header" style={{ zIndex: 100, position: 'relative', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
          <div>
            <p className="eyebrow">Programa principal</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h2 style={{ color: 'var(--cyan)' }}>{project.ladderProgram.name}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={resetCanvas} style={{ background: 'var(--panel-strong)', border: '1px solid var(--line)', color: 'var(--text)', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Reset View</button>
                  <span style={{ color: 'var(--muted)', fontSize: 12, lineHeight: '22px' }}>{Math.round(scale * 100)}%</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={actions.addRung} className="primaryBtn" style={{ padding: '6px 16px', fontSize: 14 }}>+ Nova Rung</button>
            <span className={`status-badge ${runtimeMode === 'RUN' ? 'runtime-run' : ''}`}>Runtime {runtimeMode}</span>
          </div>
        </div>
      ) : (
        <div className="mobile-editor-header">
           <div className="header-left">
              <span className={`run-indicator ${runtimeMode === 'RUN' ? 'active' : ''}`} />
              <strong>{project.ladderProgram.name}</strong>
           </div>
           <div className="header-actions">
              <button onClick={actions.undoProjectChange}>↩</button>
              <button onClick={actions.redoProjectChange}>↪</button>
              <button className={runtimeMode === 'RUN' ? 'btn-stop' : 'btn-run'} onClick={actions.toggleRuntimeMode}>
                {runtimeMode === 'RUN' ? 'STOP' : 'RUN'}
              </button>
           </div>
        </div>
      )}

      <div 
        className="ladder-canvas-container"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          overflow: 'hidden', 
          flex: 1, 
          position: 'relative', 
          cursor: isPanning ? 'grabbing' : 'auto',
          background: 'var(--bg)',
          backgroundImage: 'radial-gradient(var(--line) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${position.x}px ${position.y}px`
        }}
      >
        <div 
          className="rung-list"
          style={{
             transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
             transformOrigin: '0 0',
             transition: isPanning ? 'none' : 'transform 0.1s ease',
             padding: isMobile ? '20px 20px 100px 20px' : '40px',
             width: 'fit-content',
             minWidth: '100%'
          }}
        >
        {isMobile && project.ladderProgram.rungs.length > 0 && (
          <div className="mobile-rung-floating-nav">
            <button onClick={handlePrev} disabled={focusedRungIndex === 0}>◀</button>
            <div className="nav-info">
              <span className="count">{focusedRungIndex + 1} / {project.ladderProgram.rungs.length}</span>
              <span className="label">RUNG</span>
            </div>
            <button onClick={handleNext} disabled={focusedRungIndex === project.ladderProgram.rungs.length - 1}>▶</button>
          </div>
        )}

        {rungsToRender.map((rung) => (
          <LadderRung
            key={`${rung.id}-${runtimeMode}`}
            rung={rung}
            index={isMobile ? focusedRungIndex : project.ladderProgram.rungs.indexOf(rung)}
            selectedRungId={selectedRungId}
            selectedBlockId={selectedBlockId}
            onSelectRung={actions.setSelectedRungId}
            onSelectBlock={(rungId, blockId) => {
              actions.setSelectedRungId(rungId);
              actions.setSelectedBlockId(blockId);
            }}
            onInsertBlock={actions.insertBlock}
            actions={actions}
            runtimeMode={runtimeMode}
          />
        ))}
        </div>
      </div>
    </section>
  );
}
