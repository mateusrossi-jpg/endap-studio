import { EndapLadderBlock } from '../../types/endap';
import { blockClass, blockSymbol, counterProgress, timerProgress } from './utils';

export interface LadderBlockProps {
  block: EndapLadderBlock;
  isSelected: boolean;
  onClick: () => void;
}

export function LadderBlock({ block, isSelected, onClick }: LadderBlockProps) {
  return (
    <button
      className={blockClass(block, isSelected)}
      onClick={onClick}
      type="button"
    >
      <span className="block-symbol">{blockSymbol(block)}</span>
      <strong>{block.label}</strong>
      {block.kind.startsWith('timer') && (
        <span className="timer-readout">
          ET {block.elapsedMs ?? 0} / PT {block.presetMs ?? 0} ms
          <span className="timer-track">
            <span className="timer-progress" style={{ width: `${timerProgress(block)}%` }} />
          </span>
        </span>
      )}
      {block.kind === 'counter' && (
        <span className="timer-readout">
          ACC {block.accumulatedCount ?? 0} / PV {block.presetCount ?? 1}
          <span className="timer-track">
            <span className="timer-progress" style={{ width: `${counterProgress(block)}%` }} />
          </span>
        </span>
      )}
    </button>
  );
}
