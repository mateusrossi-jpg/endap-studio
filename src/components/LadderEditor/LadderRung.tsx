import { EndapLadderRung } from '../../types/endap';
import { LadderBlock } from './LadderBlock';
import { buildRungMatrix } from './matrixBuilder';
import { renderSymbol } from './utils';
import './ladderGrid.css';

export interface LadderRungProps {
  rung: EndapLadderRung;
  index: number;
  selectedRungId: string | null;
  selectedBlockId: string | null;
  onSelectRung: (id: string) => void;
  onSelectBlock: (rungId: string, blockId: string) => void;
  onInsertBlock: (kind: string, rungId: string, targetBlockId?: string) => void;
  actions: any;
  runtimeMode: string;
}

export function LadderRung({ rung, index, selectedRungId, selectedBlockId, onSelectRung, onSelectBlock, onInsertBlock, actions, runtimeMode }: LadderRungProps) {
  const COLS = 10;
  const matrix = buildRungMatrix(rung, COLS);

  const handleWireDrop = (e: React.DragEvent, cellId: string, anchorBlockId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const kind = e.dataTransfer.getData('endap/block');
    if (kind) {
      if (anchorBlockId) {
        actions.addBranch(rung.id, anchorBlockId, kind);
      } else {
        onInsertBlock(kind, rung.id, undefined);
      }
    }
  };

  const handleBlockDrop = (e: React.DragEvent, anchorBlockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const kind = e.dataTransfer.getData('endap/block');
    if (kind) {
      actions.addBranch(rung.id, anchorBlockId, kind);
    }
  };

  const renderQuickToolbar = (targetId: string, isBlock: boolean) => (
    <div className="block-quick-toolbar" onClick={(e) => e.stopPropagation()}>
      <button title="Contato NA" onClick={() => onInsertBlock('contact-no', rung.id, isBlock ? targetId : undefined)}>{renderSymbol('contact-no')}</button>
      <button title="Contato NF" onClick={() => onInsertBlock('contact-nc', rung.id, isBlock ? targetId : undefined)}>{renderSymbol('contact-nc')}</button>
      <button title="Bobina" onClick={() => onInsertBlock('coil', rung.id, isBlock ? targetId : undefined)}>{renderSymbol('coil')}</button>
      <button title="Timer" onClick={() => onInsertBlock('timer-ton', rung.id, isBlock ? targetId : undefined)}>{renderSymbol('timer-ton')}</button>
      {isBlock && (
        <button className="delete-btn" title="Remover" onClick={() => actions.removeBlock(rung.id, targetId)}>🗑️</button>
      )}
    </div>
  );

  return (
    <article className={`rung-card ${selectedRungId === rung.id ? 'is-rung-selected' : ''}`} data-rung-id={rung.id}>
      <button className="rung-meta" onClick={() => onSelectRung(rung.id)} type="button">
        <strong>Rung {index + 1}</strong>
        <span>{rung.title || 'Sem título'}</span>
      </button>

      {rung.description && (
        <div className="rung-comment">
          {rung.description}
        </div>
      )}

      <div className="rung-matrix-scroller">
        <div className="rung-matrix-grid" style={{ '--cols': COLS } as React.CSSProperties}>
          {matrix.map((row, rIdx) => (
            row.map((cell, cIdx) => {
              const isSelectedCell = selectedBlockId === cell.id;
              const classNames = [
                'matrix-cell',
                `type-${cell.type}`,
                cell.isBranchStart ? 'branch-start' : '',
                cell.isBranchEnd ? 'branch-end' : '',
                cell.isEnergized ? 'energized-cell' : ''
              ].filter(Boolean).join(' ');

              return (
                <div 
                  key={cell.id} 
                  className={classNames}
                  style={{ '--row-offset': rIdx } as React.CSSProperties}
                >
                  {/* Horizontal wire passing through */}
                  {(cell.type === 'wire-h' || cell.type === 'block' || (rIdx === 0 && cell.type === 'empty' && cIdx < COLS - 1)) && (
                    <div className={`matrix-wire-h ${cell.isEnergized ? 'energized' : ''}`} />
                  )}

                  {/* If it's a wire or empty, it's a drop target for new blocks */}
                  {(cell.type === 'wire-h' || cell.type === 'empty') && rIdx === 0 && (
                    <div 
                      className={`matrix-wire-spacer ${isSelectedCell ? 'is-selected-cell' : ''}`}
                      onClick={() => {
                        onSelectBlock(rung.id, cell.id);
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                      onDrop={(e) => handleWireDrop(e, cell.id)}
                    >
                      {isSelectedCell && renderQuickToolbar(cell.id, false)}
                    </div>
                  )}

                  {/* The Block itself */}
                  {cell.type === 'block' && cell.block && (
                    <div 
                      className="ladder-block-wrapper"
                      data-block-id={cell.block.id}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                      onDrop={(e) => handleBlockDrop(e, cell.block!.id)}
                    >
                      <LadderBlock
                        block={cell.block}
                        isSelected={selectedBlockId === cell.block.id}
                        onClick={() => {
                          if (runtimeMode === 'RUN') {
                            actions.toggleBlock(cell.block!);
                          } else {
                            onSelectBlock(rung.id, cell.block!.id);
                          }
                        }}
                        actions={actions}
                      />
                      {selectedBlockId === cell.block.id && renderQuickToolbar(cell.block.id, true)}
                    </div>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
    </article>
  );
}
