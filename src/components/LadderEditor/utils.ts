import { EndapLadderBlock, EndapProject } from '../../types/endap';

export function blockClass(block: EndapLadderBlock, selected: boolean) {
  const cssKind = block.kind.replace('timer-', 'timer-');
  return `ladder-block ${cssKind} ${block.active ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`;
}

export function blockSymbol(block: EndapLadderBlock) {
  if (block.kind === 'contact-no') return '[ ]';
  if (block.kind === 'contact-nc') return '[/]';
  if (block.kind === 'memory-contact-no') return '[M]';
  if (block.kind === 'memory-contact-nc') return '[/M]';
  if (block.kind === 'timer-ton') return 'TON';
  if (block.kind === 'timer-tof') return 'TOF';
  if (block.kind === 'counter') return 'CTU';
  if (block.kind === 'coil-set') return '(S)';
  if (block.kind === 'coil-reset') return '(R)';
  if (block.kind === 'counter-reset') return '(RES)';
  return '( )';
}

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
