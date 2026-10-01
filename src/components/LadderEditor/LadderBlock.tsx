import { memo } from 'react';
import { EndapLadderBlock } from '../../types/endap';
import { blockClass, blockSymbol, counterProgress, timerProgress } from './utils';

export interface LadderBlockProps {
  block: EndapLadderBlock;
  isSelected: boolean;
}

// ⚡ Bolt: Wrapped small block components in React.memo with custom equality check.
// 🎯 Why: `evaluateRung` generates new block objects every 200ms scan cycle.
// 📊 Impact: Prevents massive re-render tree thrashing for identical blocks, saving significant CPU per cycle.
// Event delegation is used in LadderRung to handle clicks, avoiding stale closures.
export const LadderBlock = memo(function LadderBlock({ block, isSelected }: LadderBlockProps) {
  return (
    <button
      className={blockClass(block, isSelected)}
      data-block-id={block.id}
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
}, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.block.id === nextProps.block.id &&
    prevProps.block.active === nextProps.block.active &&
    prevProps.block.elapsedMs === nextProps.block.elapsedMs &&
    prevProps.block.accumulatedCount === nextProps.block.accumulatedCount &&
    prevProps.block.presetMs === nextProps.block.presetMs &&
    prevProps.block.presetCount === nextProps.block.presetCount &&
    prevProps.block.kind === nextProps.block.kind &&
    prevProps.block.label === nextProps.block.label
  );
});
