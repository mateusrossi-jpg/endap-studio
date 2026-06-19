import React from 'react';
import { EndapLadderBlock, EndapProject } from '../../types/endap';

export function blockClass(block: EndapLadderBlock, selected: boolean) {
  const cssKind = block.kind.replace('timer-', 'timer-');
  return `ladder-block ${cssKind} ${block.active ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`;
}

export const renderSymbol = (kind: string) => {
  const isNO = kind.includes('contact-no');
  const isNC = kind.includes('contact-nc');
  const isCoil = kind.includes('coil') || kind.includes('reset');

  if (isNO) {
    return (
      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M0 16h12m16 0h12M12 6v20M28 6v20" />
        {kind.includes('memory') && <text x="20" y="21" fontSize="11" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">M</text>}
      </svg>
    );
  }
  if (isNC) {
    return (
      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M0 16h12m16 0h12M12 6v20M28 6v20M10 24l20-16" />
        {kind.includes('memory') && <text x="20" y="21" fontSize="11" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">M</text>}
      </svg>
    );
  }
  if (isCoil) {
    const isSet = kind.includes('set');
    const isReset = kind.includes('reset');
    return (
      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M0 16h10m20 0h10M14 6c-6 0-6 20 0 20m12-20c6 0 6 20 0 20" />
        {isSet && <text x="20" y="21" fontSize="11" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">S</text>}
        {isReset && <text x="20" y="21" fontSize="11" fontWeight="bold" textAnchor="middle" fill="currentColor" stroke="none">R</text>}
      </svg>
    );
  }
  if (kind.startsWith('timer') || kind === 'counter' || kind.startsWith('compare')) {
    let label = 'TON';
    if (kind === 'timer-tof') label = 'TOF';
    if (kind === 'counter') label = 'CTU';
    if (kind === 'compare-grt') label = 'GRT';
    if (kind === 'compare-les') label = 'LES';

    return (
      <svg width="48" height="36" viewBox="0 0 48 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="4" y="2" width="40" height="32" rx="2" strokeWidth="2.5" />
        <text x="24" y="22" fontSize="11" fontWeight="800" textAnchor="middle" fill="currentColor" stroke="none">
          {label}
        </text>
      </svg>
    );
  }
  
  if (kind === 'branch-or') {
    return (
      <svg width="40" height="32" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M4 16h6m20 0h6M10 8v16M30 8v16M10 8h20M10 24h20" />
      </svg>
    );
  }

  return null;
};

export function blockKindLabel(block: EndapLadderBlock) {
  if (block.kind === 'contact-no') return 'Contato normalmente aberto';
  if (block.kind === 'contact-nc') return 'Contato normalmente fechado';
  if (block.kind === 'memory-contact-no') return 'Contato de memória NA';
  if (block.kind === 'memory-contact-nc') return 'Contato de memória NF';
  if (block.kind === 'timer-ton') return 'Temporizador TON';
  if (block.kind === 'timer-tof') return 'Temporizador TOF';
  if (block.kind === 'counter') return 'Contador';
  if (block.kind === 'coil-set') return 'Bobina SET retentiva';
  if (block.kind === 'coil-reset') return 'Bobina RESET retentiva';
  if (block.kind === 'counter-reset') return 'Reset de Contador';
  if (block.kind === 'compare-grt') return 'Comparação: Maior que (GRT)';
  if (block.kind === 'compare-les') return 'Comparação: Menor que (LES)';
  return 'Bobina de saída';
}

export function timerProgress(block: EndapLadderBlock) {
  if (!block.presetMs) return 0;
  return Math.min(100, Math.round(((block.elapsedMs ?? 0) / block.presetMs) * 100));
}

export function counterProgress(block: EndapLadderBlock) {
  const presetCount = block.presetCount ?? 1;
  if (presetCount <= 0) return 0;
  return Math.min(100, Math.round(((block.accumulatedCount ?? 0) / presetCount) * 100));
}
