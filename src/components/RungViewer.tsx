// src/components/RungViewer.tsx
import React, { useRef, useState, MouseEvent, TouchEvent } from 'react';
import { EndapLadderRung } from '../types/endap';
import styles from './RungViewer.module.css';

interface RungViewerProps {
  rungs: EndapLadderRung[];
  onAddParallel: (rungId: string) => void;
  onAddComponent: (rungId: string) => void;
  onClose: () => void;
}

export const RungViewer: React.FC<RungViewerProps> = ({ rungs, onAddParallel, onAddComponent, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);

  const handleMouseDown = (e: MouseEvent) => {
    setDragStart(e.clientX);
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (dragStart !== null) {
      const delta = e.clientX - dragStart;
      setOffsetX((prev) => prev + delta);
      setDragStart(e.clientX);
    }
  };
  const handleMouseUp = () => setDragStart(null);

  const handleTouchStart = (e: TouchEvent) => {
    setDragStart(e.touches[0].clientX);
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (dragStart !== null) {
      const delta = e.touches[0].clientX - dragStart;
      setOffsetX((prev) => prev + delta);
      setDragStart(e.touches[0].clientX);
    }
  };
  const handleTouchEnd = () => setDragStart(null);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.header}>
        <h2 className={styles.title}>Rungs</h2>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar visualizador">✕</button>
      </div>
      <div
        className={styles.viewer}
        ref={containerRef}
        style={{ transform: `translateX(${offsetX}px)` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {rungs.map((rung) => (
          <div key={rung.id} className={styles.rungLine}>
            <span className={styles.rungLabel}>{rung.title || `Rung ${rung.id}`}</span>
            <div className={styles.actions}>
              <button className={styles.actionBtn} onClick={() => onAddParallel(rung.id)} aria-label={`Adicionar paralelo ao ${rung.title}`}>+ Paralelo</button>
              <button className={styles.actionBtn} onClick={() => onAddComponent(rung.id)} aria-label={`Adicionar componente ao ${rung.title}`}>+ Componente</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
