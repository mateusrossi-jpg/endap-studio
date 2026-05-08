import { RuntimeObservabilitySnapshot } from '../services/runtimeObservability';

type Props = {
  snapshot: RuntimeObservabilitySnapshot;
};

function metricClass(severity: 'ok' | 'warning' | 'fault') {
  if (severity === 'fault') return 'observability-metric fault';
  if (severity === 'warning') return 'observability-metric warning';
  return 'observability-metric';
}

export function RuntimeObservabilityPanel({ snapshot }: Props) {
  return (
    <section className="runtime-observability-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Runtime Observability</p>
          <h3>Profiler e tracing local</h3>
        </div>
        <span className="status-badge runtime-run">
          {snapshot.scanTimeMs} ms · {snapshot.scanCount} scans
        </span>
      </div>

      <div className="observability-grid">
        {snapshot.metrics.map((metric) => (
          <article className={metricClass(metric.severity)} key={metric.id}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.description}</small>
          </article>
        ))}
      </div>

      <div className="rung-trace-panel">
        <div className="panel-header compact">
          <strong>Rung tracing</strong>
          <small>{snapshot.rungTraces.length} rungs analisadas</small>
        </div>

        <div className="rung-trace-list">
          {snapshot.rungTraces.map((trace) => (
            <div className={trace.energized ? 'rung-trace energized' : 'rung-trace'} key={trace.rungId}>
              <div>
                <strong>{trace.title}</strong>
                <small>
                  {trace.activeBlocks}/{trace.totalBlocks} blocos ativos
                </small>
              </div>

              <div className="rung-trace-metrics">
                <span>{trace.activeBranches}/{trace.totalBranches} branch</span>
                <span>{trace.estimatedCostMs} ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
