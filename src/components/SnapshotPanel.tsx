import { StudioProjectSnapshot } from '../services/storage';

type SnapshotPanelProps = {
  snapshots: StudioProjectSnapshot[];
  onCreateSnapshot: () => void;
  onDeleteSnapshot: (id: string) => void;
  onRestoreSnapshot: (snapshot: StudioProjectSnapshot) => void;
};

function formatSnapshotTime(timestamp: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

export function SnapshotPanel({ snapshots, onCreateSnapshot, onDeleteSnapshot, onRestoreSnapshot }: SnapshotPanelProps) {
  return (
    <section className="snapshot-panel" aria-label="Snapshots locais">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Snapshots locais</p>
          <strong>{snapshots.length} versões</strong>
        </div>
        <button type="button" onClick={onCreateSnapshot}>Salvar snapshot</button>
      </div>

      {snapshots.length === 0 ? (
        <p className="empty-copy">Salve um snapshot antes de alterar lógica crítica.</p>
      ) : (
        <div className="snapshot-list">
          {snapshots.map((snapshot) => (
            <article className="snapshot-row" key={snapshot.id}>
              <div>
                <strong>{snapshot.name}</strong>
                <small>{formatSnapshotTime(snapshot.createdAt)} · {snapshot.project.ladderProgram.rungs.length} rungs</small>
              </div>
              <div className="watch-actions">
                <button type="button" onClick={() => onRestoreSnapshot(snapshot)}>Restaurar</button>
                <button type="button" onClick={() => onDeleteSnapshot(snapshot.id)}>Remover</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
