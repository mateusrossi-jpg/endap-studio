import React, { ChangeEvent, useState } from 'react';
import { EndapLadderBlock, EndapLadderRung, EndapProject, EndapLadderBlockKind } from '../types/endap';
import { WatchItem, WatchTable } from './WatchTable';
import { ForceTarget, MemoryMap } from '../services/ladderRuntime';
import { blockKindLabel } from './LadderEditor/utils';
import { IoAddressSelector } from './IoAddressSelector';
import { FullScreenPanel } from './FullScreenPanel';
import { RungViewer } from './RungViewer';
import styles from './PropertyPanel.module.css';

export interface PropertyPanelProps {
  project: EndapProject;
  selectedBlock: EndapLadderBlock | null;
  selectedRung: EndapLadderRung | null;
  memoryMap: MemoryMap;
  watchItems: WatchItem[];
  actions: {
    recordUndo: (label: string) => void;
    updateSelectedRung: (patch: Partial<EndapLadderRung>) => void;
    moveSelectedRung: (dir: -1 | 1) => void;
    duplicateSelectedRung: () => void;
    deleteSelectedRung: () => void;
    updateSelectedBlock: (patch: Partial<EndapLadderBlock>) => void;
    handlePresetChange: (e: ChangeEvent<HTMLInputElement>) => void;
    handlePresetCountChange: (e: ChangeEvent<HTMLInputElement>) => void;
    resetSelectedCounter: () => void;
    duplicateSelectedBlock: () => void;
    moveSelectedBlock: (dir: -1 | 1) => void;
    deleteSelectedBlock: () => void;
    saveProjectToStorage: (p: EndapProject) => void;
    toggleIoPoint: (id: string, field: 'state' | 'manualMode' | 'testMode') => void;
    updateIoPoint: (id: string, patch: any) => void;
    toggleMemory: (addr: string) => void;
    toggleBlock: (block: EndapLadderBlock) => void;
    setForce: (addr: string, t: ForceTarget) => void;
    releaseForce: (addr: string) => void;
    addBlock?: (kind: EndapLadderBlockKind) => void;
    addBranch?: () => void;
  };
  onClose?: () => void;
}

export function PropertyPanel({ project, selectedBlock, selectedRung, memoryMap, watchItems, actions, onClose }: PropertyPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const isTimer = selectedBlock?.kind.startsWith('timer');
  const isCounter = selectedBlock?.kind === 'counter';
  const isComparison = selectedBlock?.kind.startsWith('compare');
  const isContact = selectedBlock?.kind.includes('contact');
  const isCoil = selectedBlock?.kind.includes('coil') && selectedBlock?.kind !== 'counter-reset';

  const ioPoint = project.io.find(p => p.address === selectedBlock?.address);
  const isInput = ioPoint?.direction === 'input';

  return (
    <div className={styles.panel}>
      {/* Cabeçalho de Contexto */}
      <div className={styles.contextHeader}>
        <div className={styles.typeIcon}>
          {selectedBlock ? '🧩' : '🪜'}
        </div>
        <div>
          <h2 className={styles.mainTitle}>
            {selectedBlock ? blockKindLabel(selectedBlock) : `Rung ${project.ladderProgram.rungs.indexOf(selectedRung!) + 1}`}
          </h2>
          <span className={styles.subTitle}>
            {selectedBlock ? (selectedBlock.address || 'Sem endereço') : (selectedRung?.title || 'Lógica sem título')}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        {/* EDIÇÃO DE RUNG */}
        {selectedRung && !selectedBlock && (
          <section className={styles.focusGroup}>
            <div className={styles.fieldGroup}>
              <label>Título da Rung</label>
              <input
                value={selectedRung.title}
                onFocus={() => actions.recordUndo('Editar rung')}
                onChange={(e) => actions.updateSelectedRung({ title: e.target.value })}
                className={styles.input}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Documentação / Comentário</label>
              <textarea
                value={selectedRung.description}
                onFocus={() => actions.recordUndo('Editar descrição')}
                onChange={(e) => actions.updateSelectedRung({ description: e.target.value })}
                className={styles.textarea}
                rows={3}
              />
            </div>
          </section>
        )}

        {/* EDIÇÃO DE BLOCO (COMUM) */}
        {selectedBlock && (
          <section className={styles.focusGroup}>
            <div className={styles.fieldGroup}>
              <label>Nome Amigável (Label)</label>
              <input
                value={selectedBlock.label}
                onFocus={() => actions.recordUndo('Editar label')}
                onChange={(e) => actions.updateSelectedBlock({ label: e.target.value })}
                className={styles.input}
              />
            </div>
            
            <IoAddressSelector
              project={project}
              selectedBlock={selectedBlock}
              currentAddress={selectedBlock?.address ?? ''}
              onChange={(addr) => actions.updateSelectedBlock({ address: addr })}
            />
          </section>
        )}

        {/* COMPORTAMENTO DE ENTRADA (MOMENTÂNEO/RETENTIVO) */}
        {selectedBlock && isInput && ioPoint && (
          <section className={styles.focusGroup}>
            <label className={styles.sectionLabel}>Comportamento do Hardware</label>
            <div className={styles.segmentedControl}>
              <button 
                className={ioPoint.interactionMode === 'pulse' ? styles.activeSegment : ''} 
                onClick={() => actions.updateIoPoint(ioPoint.id, { interactionMode: 'pulse' })}
              >
                Pulsar
              </button>
              <button 
                className={(!ioPoint.interactionMode || ioPoint.interactionMode === 'switch') ? styles.activeSegment : ''} 
                onClick={() => actions.updateIoPoint(ioPoint.id, { interactionMode: 'switch' })}
              >
                Reter
              </button>
            </div>
          </section>
        )}

        {/* CONFIGURAÇÕES ESPECÍFICAS (TIMERS/COUNTERS/COMP) */}
        {selectedBlock && (isTimer || isCounter || isComparison) && (
          <section className={styles.focusGroup}>
            <label className={styles.sectionLabel}>Parâmetros Técnicos</label>
            {isTimer && (
              <div className={styles.fieldGroup}>
                <label>Tempo (ms)</label>
                <input
                  type="number"
                  value={selectedBlock.presetMs ?? ''}
                  onChange={actions.handlePresetChange}
                  className={styles.input}
                />
              </div>
            )}
            {(isCounter || isComparison) && (
              <div className={styles.fieldGroup}>
                <label>{isComparison ? 'Valor de Referência' : 'Preset de Contagem'}</label>
                <input
                  type="number"
                  value={selectedBlock.presetCount ?? 0}
                  onChange={actions.handlePresetCountChange}
                  className={styles.input}
                />
              </div>
            )}
            
            {/* Live Data Visual */}
            <div className={styles.liveStatus}>
               <div className={styles.liveInfo}>
                  <span>Estado Atual:</span>
                  <strong>{isTimer ? `${selectedBlock.elapsedMs}ms` : (isCounter || isComparison ? memoryMap[selectedBlock.address!] : (selectedBlock.active ? 'Ativo' : 'Inativo'))}</strong>
               </div>
               {(isTimer || isCounter) && (
                 <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${isTimer ? (selectedBlock.elapsedMs! / selectedBlock.presetMs! * 100) : (selectedBlock.accumulatedCount! / selectedBlock.presetCount! * 100)}%` }} />
                 </div>
               )}
            </div>
          </section>
        )}

        {/* FERRAMENTAS AVANÇADAS (DEBUG/FORCE) */}
        {selectedBlock && (
          <div className={styles.advancedToggle} onClick={() => setShowAdvanced(!showAdvanced)}>
             {showAdvanced ? '▼ Ocultar Debug' : '▶ Ferramentas de Debug (Force/Manual)'}
          </div>
        )}

        {selectedBlock && showAdvanced && (
          <section className={`${styles.focusGroup} ${styles.debugArea}`}>
            <div className={styles.actionRow}>
              <button 
                className={`${styles.manualBtn} ${selectedBlock.active ? styles.isOn : ''}`}
                onClick={() => actions.toggleBlock(selectedBlock)}
              >
                {selectedBlock.active ? 'Desligar Manual' : 'Ligar Manual'}
              </button>
            </div>
            <div className={styles.forceGrid}>
               <button onClick={() => actions.setForce(selectedBlock.address!, 'on')}>Force ON</button>
               <button onClick={() => actions.setForce(selectedBlock.address!, 'off')}>Force OFF</button>
               <button className={styles.releaseBtn} onClick={() => actions.releaseForce(selectedBlock.address!)}>Release</button>
            </div>
          </section>
        )}

        {/* AÇÕES GERAIS */}
        <section className={styles.actionSection}>
           <div className={styles.actionGrid}>
              {selectedRung && !selectedBlock && (
                <>
                  <button onClick={() => actions.moveSelectedRung(-1)}>Mover ⬆</button>
                  <button onClick={() => actions.moveSelectedRung(1)}>Mover ⬇</button>
                  <button onClick={actions.duplicateSelectedRung}>Duplicar</button>
                  <button className={styles.danger} onClick={actions.deleteSelectedRung}>Deletar Rung</button>
                </>
              )}
              {selectedBlock && (
                <>
                  <button onClick={() => actions.moveSelectedBlock(-1)}>⬅ Mover</button>
                  <button onClick={() => actions.moveSelectedBlock(1)}>Mover ➡</button>
                  <button onClick={actions.duplicateSelectedBlock}>Duplicar</button>
                  <button className={styles.danger} onClick={actions.deleteSelectedBlock}>Remover</button>
                </>
              )}
           </div>
        </section>
      </div>
    </div>
  );
}
