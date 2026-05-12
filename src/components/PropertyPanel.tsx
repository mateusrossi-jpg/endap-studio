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
    deleteSelectedRung: () => void;
    updateSelectedBlock: (patch: Partial<EndapLadderBlock>) => void;
    handlePresetChange: (e: ChangeEvent<HTMLInputElement>) => void;
    handlePresetCountChange: (e: ChangeEvent<HTMLInputElement>) => void;
    resetSelectedCounter: () => void;
    duplicateSelectedBlock: () => void;
    moveSelectedBlock: (dir: -1 | 1) => void;
    deleteSelectedBlock: () => void;
    saveProjectToStorage: (p: EndapProject) => void;
    toggleMemory: (addr: string) => void;
    setForce: (addr: string, t: ForceTarget) => void;
    releaseForce: (addr: string) => void;
    addBlock?: (kind: EndapLadderBlockKind) => void; // optional for RungViewer
    addBranch?: () => void; // optional for RungViewer
  };
}

export function PropertyPanel({ project, selectedBlock, selectedRung, memoryMap, watchItems, actions }: PropertyPanelProps) {
  const isTimer = selectedBlock?.kind.startsWith('timer');
  const isCounter = selectedBlock?.kind === 'counter';
  const isContact = selectedBlock?.kind.includes('contact');
  const isCoil = selectedBlock?.kind.includes('coil') && selectedBlock?.kind !== 'counter-reset';

  const [showRungViewer, setShowRungViewer] = useState(false);

  const closePanel = () => {
    // Caso seja necessário fechar o panel a partir de fora, implementar lógica aqui.
  };

  return (
    <FullScreenPanel onClose={closePanel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{selectedBlock ? selectedBlock.label : 'Nenhum bloco'}</h2>
        <button className={styles.primaryBtn} onClick={() => setShowRungViewer(true)}>
          Visualizar Rungs
        </button>
      </div>

      {showRungViewer && (
        <RungViewer
          rungs={project.ladderProgram.rungs}
          onAddParallel={(rungId) => actions.addBranch && actions.addBranch()}
          onAddComponent={(rungId) => actions.addBlock && actions.addBlock('contact-no')}
          onClose={() => setShowRungViewer(false)}
        />
      )}

      {/* Área de propriedades */}
      <div className={styles.cardSection}>
        {selectedRung && (
          <section className={styles.card}>
            <label className={styles.field}>
              <span>Rung</span>
              <input
                value={selectedRung.title}
                onFocus={() => actions.recordUndo('Editar rung')}
                onChange={(e) => actions.updateSelectedRung({ title: e.target.value })}
                placeholder="Ex: Partida da bomba"
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span>Descrição</span>
              <input
                value={selectedRung.description}
                onFocus={() => actions.recordUndo('Editar descrição da rung')}
                onChange={(e) => actions.updateSelectedRung({ description: e.target.value })}
                placeholder="Explique o que esta lógica faz..."
                className={styles.input}
              />
            </label>
            <div className={styles.actionRow}>
              <button className={styles.secondaryBtn} onClick={() => actions.moveSelectedRung(-1)}>Subir</button>
              <button className={styles.secondaryBtn} onClick={() => actions.moveSelectedRung(1)}>Descer</button>
              <button className={styles.dangerBtn} onClick={actions.deleteSelectedRung}>Remover</button>
            </div>
          </section>
        )}

        {selectedBlock && (
          <section className={styles.card}>
            <h3 className={styles.groupTitle}>Identificação</h3>
            <label className={styles.field}>
              <span>Label</span>
              <input
                value={selectedBlock.label}
                onFocus={() => actions.recordUndo('Editar bloco')}
                onChange={(e) => actions.updateSelectedBlock({ label: e.target.value })}
                placeholder="Ex: Sensor_A"
                className={styles.input}
              />
            </label>
            <IoAddressSelector
              project={project}
              selectedBlock={selectedBlock}
              currentAddress={selectedBlock?.address ?? ''}
              onChange={(addr) => actions.updateSelectedBlock({ address: addr })}
            />
          </section>
        )}

        {selectedBlock && isTimer && (
          <section className={styles.card}>
            <h3 className={styles.groupTitle}>Configuração de Tempo</h3>
            <label className={styles.field}>
              <span>Preset (Milissegundos)</span>
              <div className={styles.inputWithHint}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={selectedBlock.presetMs ?? ''}
                  onFocus={() => actions.recordUndo('Editar preset')}
                  onChange={actions.handlePresetChange}
                  placeholder="1000"
                  className={styles.input}
                />
                <small className={styles.hint}>
                  {((selectedBlock.presetMs ?? 0) / 1000).toFixed(2)} segundos
                </small>
              </div>
            </label>
            <div className={styles.progressStatus}>
              <span>
                Decorrido: <strong>{selectedBlock.elapsedMs ?? 0} ms</strong>
              </span>
              <div className={styles.miniProgress}>
                <div
                  className={styles.bar}
                  style={{ width: `${(selectedBlock.elapsedMs ?? 0) / (selectedBlock.presetMs ?? 1) * 100}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {selectedBlock && isCounter && (
          <section className={styles.card}>
            <h3 className={styles.groupTitle}>Configuração do Contador</h3>
            <label className={styles.field}>
              <span>Preset de Contagem</span>
              <input
                type="number"
                inputMode="numeric"
                value={selectedBlock.presetCount ?? 1}
                onFocus={() => actions.recordUndo('Editar preset CTU')}
                onChange={actions.handlePresetCountChange}
                className={styles.input}
              />
            </label>
            <div className={styles.progressStatus}>
              <span>
                Acumulado: <strong>{selectedBlock.accumulatedCount ?? 0}</strong>
              </span>
              <div className={styles.miniProgress}>
                <div
                  className={styles.barCounter}
                  style={{ width: `${(selectedBlock.accumulatedCount ?? 0) / (selectedBlock.presetCount ?? 1) * 100}%` }}
                />
              </div>
            </div>
            <button className={styles.secondaryBtn} onClick={actions.resetSelectedCounter}>
              Zerar Contador
            </button>
          </section>
        )}

        {selectedBlock && (
          <section className={styles.card}>
            <h3 className={styles.groupTitle}>Status e Testes</h3>
            <div className={styles.statusRow}>
              <div className={styles.statusItem}>
                <span>Energizado</span>
                <strong className={selectedBlock.active ? styles.active : ''}>
                  {selectedBlock.active ? 'SIM' : 'NÃO'}
                </strong>
              </div>
              <div className={styles.statusItem}>
                <span>Memória</span>
                <strong>{memoryMap[selectedBlock.address ?? selectedBlock.label] ? 'ON' : 'OFF'}</strong>
              </div>
            </div>
            <button
              className={`${styles.testToggle} ${selectedBlock.active ? styles.isOn : ''}`}
              onClick={() => {
                actions.recordUndo('Alternar bloco');
                actions.updateSelectedBlock({ active: !selectedBlock.active });
              }}
            >
              {selectedBlock.active ? 'Desenergizar (Manual)' : 'Energizar (Manual)'}
            </button>
          </section>
        )}

        {selectedBlock && (
          <section className={styles.cardFooter}>
            <div className={styles.actionRow}>
              <button className={styles.secondaryBtn} onClick={() => actions.saveProjectToStorage(project)}>
                Salvar
              </button>
              <button className={styles.secondaryBtn} onClick={actions.duplicateSelectedBlock}>
                Duplicar
              </button>
            </div>
            <div className={styles.actionRow}>
              <button className={styles.secondaryBtn} onClick={() => actions.moveSelectedBlock(-1)}>
                Esquerda
              </button>
              <button className={styles.secondaryBtn} onClick={() => actions.moveSelectedBlock(1)}>
                Direita
              </button>
              <button className={styles.dangerBtn} onClick={actions.deleteSelectedBlock}>
                Remover
              </button>
            </div>
          </section>
        )}
      </div>

      <WatchTable
        items={watchItems}
        onToggleMemory={actions.toggleMemory}
        onForce={actions.setForce}
        onReleaseForce={actions.releaseForce}
      />
    </FullScreenPanel>
  );
}
