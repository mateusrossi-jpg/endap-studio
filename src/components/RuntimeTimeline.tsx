import { useEffect, useState } from 'react';
import { EndapRuntimeEvent, runtimeEventBus } from '../services/runtimeEvents';

function formatEventTime(timestamp: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(timestamp));
}

export function RuntimeTimeline() {
  const [events, setEvents] = useState<EndapRuntimeEvent[]>(() => runtimeEventBus.getHistory());

  useEffect(() => {
    return runtimeEventBus.subscribe(() => {
      setEvents(runtimeEventBus.getHistory());
    });
  }, []);

  function clearTimeline() {
    runtimeEventBus.clear();
    setEvents([]);
  }

  return (
    <section className="timeline-panel" aria-label="Runtime timeline">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Runtime timeline</p>
          <strong>{events.length} eventos</strong>
        </div>
        <button type="button" onClick={clearTimeline}>Limpar timeline</button>
      </div>

      {events.length === 0 ? (
        <p className="empty-copy">Eventos de runtime, memória, coils e gateway aparecerão aqui.</p>
      ) : (
        <div className="timeline-list">
          {events.slice(0, 80).map((event) => (
            <article className={`timeline-row severity-${event.severity}`} key={event.id}>
              <time>{formatEventTime(event.timestamp)}</time>
              <span>{event.type}</span>
              <strong>{event.source}</strong>
              <p>{event.message}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
