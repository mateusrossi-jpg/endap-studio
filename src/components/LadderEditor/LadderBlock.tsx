import { EndapLadderBlock } from '../../types/endap';
import { blockClass, counterProgress, timerProgress, renderSymbol } from './utils';

export interface LadderBlockProps {
  block: EndapLadderBlock;
  isSelected: boolean;
  onClick: (e?: React.MouseEvent) => void;
  actions?: any;
}

export function LadderBlock({ block, isSelected, onClick }: LadderBlockProps) {
  return (
    <button
      className={blockClass(block, isSelected)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      type="button"
    >
      <span className="block-symbol">{renderSymbol(block.kind)}</span>
      <strong>{block.label || '?'}</strong>
      {block.kind.startsWith('timer') && (
        <span className="timer-readout">
          {block.elapsedMs ?? 0} / {block.presetMs ?? 0} ms
        </span>
      )}
      {block.kind === 'counter' && (
        <span className="timer-readout">
          {block.accumulatedCount ?? 0} / {block.presetCount ?? 1}
        </span>
      )}
    </button>
  );
}
