import React from 'react';
import { EndapProject, EndapIoPoint } from '../types/endap';
import styles from './HmiPanel.module.css';

interface HmiPanelProps {
  project: EndapProject;
  onToggleInput: (id: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function HmiPanel({ project, onToggleInput, onClose, isMobile }: HmiPanelProps) {
  const inputs = project.io.filter(p => p.direction === 'input');
  const outputs = project.io.filter(p => p.direction === 'output');

  return (
    <div className={`${styles.hmiContainer} ${isMobile ? styles.isMobile : ''}`}>
      <div className={styles.hmiHeader}>
        <strong>Simulação de Campo (HMI)</strong>
        {onClose && <button onClick={onClose} className={styles.closeBtn}>✕</button>}
      </div>
      
      <div className={styles.hmiBody}>
        <div className={styles.section}>
          <p className={styles.label}>Entradas (Sensores/Botões)</p>
          <div className={styles.grid}>
            {inputs.map(io => (
              <div key={io.id} className={styles.component}>
                <span className={styles.ioAddress}>{io.address}</span>
                <button 
                  className={`${styles.switch} ${io.state ? styles.isOn : ''} ${io.interactionMode === 'pulse' ? styles.isPulse : ''}`}
                  onClick={() => onToggleInput(io.id)}
                >
                  <div className={styles.knob} />
                </button>
                <span className={styles.ioAlias}>{io.alias}</span>
                <small className={styles.modeHint}>{io.interactionMode === 'pulse' ? 'PULSE' : 'SWITCH'}</small>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.label}>Saídas (Atuadores/Cargas)</p>
          <div className={styles.grid}>
            {outputs.map(io => (
              <div key={io.id} className={styles.component}>
                <span className={styles.ioAddress}>{io.address}</span>
                <div className={`${styles.lamp} ${io.state ? styles.lampOn : ''}`}>
                  <div className={styles.lampGlow} />
                </div>
                <span className={styles.ioAlias}>{io.alias}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.hmiFooter}>
        <small>Interaja com os inputs para testar a lógica em tempo real.</small>
      </div>
    </div>
  );
}
