import React, { ReactNode } from 'react';
import styles from './FullScreenPanel.module.css';

interface FullScreenPanelProps {
  onClose?: () => void;
  children: ReactNode;
}

export const FullScreenPanel: React.FC<FullScreenPanelProps> = ({ onClose, children }) => {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.header}>
        <button
          className={styles.closeBtn}
          aria-label="Fechar painel"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
};
