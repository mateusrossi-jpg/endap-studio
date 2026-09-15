import { memo } from 'react';
import { EndapLadderRung } from '../../types/endap';
import { branchIsEnergized, getAllRungBlocks, rungIsEnergized } from '../../services/ladderRuntime';
import { LadderBlock } from './LadderBlock';

export interface LadderRungProps {
  rung: EndapLadderRung;
  index: number;
  selectedRungId: string | null;
  selectedBlockId: string | null;
  onSelectRung: (id: string) => void;
  onSelectBlock: (rungId: string, blockId: string) => void;
}

// Optimization: Memoize LadderRung to prevent cascading re-renders during cyclical simulation loop (runScanSimulation).
// Referential equality on the 'rung' prop is maintained by the simulation logic for unmodified paths.
export const LadderRung = memo(function LadderRung({ rung, index, selectedRungId, selectedBlockId, onSelectRung, onSelectBlock }: LadderRungProps) {
  return (
    <article className={`rung-card ${selectedRungId === rung.id ? 'is-rung-selected' : ''}`}>
      <button className="rung-meta" onClick={() => onSelectRung(rung.id)} type="button">
        <strong>Rung {index + 1}</strong>
        <span>{rung.title}</span>
        <small>{rung.description}</small>
        {!!rung.branches?.length && <small>{rung.branches.length} branch OR</small>}
      </button>

      <div className={`ladder-canvas ${rungIsEnergized(getAllRungBlocks(rung)) ? 'is-energized' : ''}`} role="group" aria-label={rung.title}>
        <div className="rail left" />
        <div className="rail right" />
        <div className="wire" />

        <div className="block-row">
          {rung.blocks.map((block) => (
            <LadderBlock
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              rungId={rung.id}
              onSelect={onSelectBlock}
            />
          ))}
        </div>

        {!!rung.branches?.length && (
          <div className="branch-stack">
            {rung.branches.map((branch) => (
              <div className={`branch-path ${branchIsEnergized(branch) ? 'is-branch-energized' : ''}`} key={branch.id}>
                <span className="branch-label">{branch.title ?? 'OR'}</span>
                <div className="branch-wire" />
                <div className="branch-blocks">
                  {branch.blocks.map((block) => (
                    <LadderBlock
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      rungId={rung.id}
                      onSelect={onSelectBlock}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});
