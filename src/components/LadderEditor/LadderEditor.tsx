import { useCallback } from 'react';
import { EndapProject } from '../../types/endap';
import { RuntimeMode } from '../../hooks/useStudioController';
import { LadderRung } from './LadderRung';

export interface LadderEditorProps {
  project: EndapProject;
  runtimeMode: RuntimeMode;
  selectedRungId: string | null;
  selectedBlockId: string | null;
  actions: {
    setSelectedRungId: (id: string | null) => void;
    setSelectedBlockId: (id: string | null) => void;
  };
}

export function LadderEditor({ project, runtimeMode, selectedRungId, selectedBlockId, actions }: LadderEditorProps) {
  const { setSelectedRungId, setSelectedBlockId } = actions;

  const handleSelectBlock = useCallback((rungId: string, blockId: string) => {
    setSelectedRungId(rungId);
    setSelectedBlockId(blockId);
  }, [setSelectedRungId, setSelectedBlockId]);

  return (
    <section className="ladder-panel" aria-label="Editor Ladder">
      <div className="ladder-header">
        <div>
          <p className="eyebrow">Programa principal</p>
          <h2>{project.ladderProgram.name}</h2>
        </div>
        <span className={`status-badge ${runtimeMode === 'RUN' ? 'runtime-run' : ''}`}>Runtime {runtimeMode}</span>
      </div>

      <div className="rung-list">
        {project.ladderProgram.rungs.map((rung, index) => (
          <LadderRung
            key={rung.id}
            rung={rung}
            index={index}
            selectedRungId={selectedRungId}
            selectedBlockId={selectedBlockId}
            onSelectRung={setSelectedRungId}
            onSelectBlock={handleSelectBlock}
          />
        ))}
      </div>
    </section>
  );
}
