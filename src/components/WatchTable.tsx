export type WatchItem = {
  address: string;
  type: 'MEM' | 'TIMER' | 'COIL';
  value: string;
  active: boolean;
  force?: 'on' | 'off';
  canToggle: boolean;
  canForce: boolean;
};

type WatchTableProps = {
  items: WatchItem[];
  onToggleMemory: (address: string) => void;
  onForce: (address: string, target: 'on' | 'off') => void;
  onReleaseForce: (address: string) => void;
};

export function WatchTable({ items, onToggleMemory, onForce, onReleaseForce }: WatchTableProps) {
  return (
    <div className="watch-panel">
      <div className="watch-header">
        <p className="eyebrow">Watch table</p>
        <strong>{items.length} variáveis</strong>
      </div>
      {items.length === 0 ? (
        <p className="empty-copy">Execute o runtime para popular memórias, timers e bobinas.</p>
      ) : (
        <div className="watch-list">
          {items.map((item) => (
            <div className={`watch-row ${item.force ? 'is-forced' : ''}`} key={`${item.type}-${item.address}`}>
              <span className={`watch-dot ${item.active ? 'is-active' : ''}`} />
              <strong>{item.address}</strong>
              <small>{item.type}</small>
              <code>{item.force ? `FORCE ${item.force.toUpperCase()}` : item.value}</code>
              <div className="watch-actions">
                {item.canToggle && (
                  <button type="button" onClick={() => onToggleMemory(item.address)}>
                    Alternar
                  </button>
                )}
                {item.canForce && (
                  <>
                    <button type="button" onClick={() => onForce(item.address, 'on')}>Force ON</button>
                    <button type="button" onClick={() => onForce(item.address, 'off')}>Force OFF</button>
                    <button type="button" onClick={() => onReleaseForce(item.address)}>Release</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
