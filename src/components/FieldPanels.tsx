import { EndapDiagnosticMetric, EndapFailSafePolicy, EndapIoPoint, EndapNode } from '../types/endap';

type FieldPanelsProps = {
  activeTab: string;
  diagnostics: EndapDiagnosticMetric[];
  failSafePolicies: EndapFailSafePolicy[];
  io: EndapIoPoint[];
  nodes: EndapNode[];
  onToggleIoManual: (id: string) => void;
  onToggleIoState: (id: string) => void;
  onToggleIoTest: (id: string) => void;
};

export function FieldPanels({
  activeTab,
  diagnostics,
  failSafePolicies,
  io,
  nodes,
  onToggleIoManual,
  onToggleIoState,
  onToggleIoTest
}: FieldPanelsProps) {
  return (
    <section className="field-layout" aria-label="Campo e diagnóstico local">
      {activeTab === 'IO' && (
        <section className="field-panel" id="io-section" aria-label="I/O local">
          <div className="panel-header">
            <div>
              <p className="eyebrow">I/O local</p>
              <strong>{io.length} pontos</strong>
            </div>
          </div>
          <div className="io-list">
            {io.map((point) => (
              <article className={`io-row ${point.state ? 'is-active' : ''}`} key={point.id}>
                <span className={`led-indicator ${point.state ? 'is-running' : ''}`} style={{ animation: 'none' }} />
                <div>
                  <strong>{point.address}</strong>
                  <p>{point.alias}</p>
                </div>
                <small>{point.direction.toUpperCase()}</small>
                <code>{point.nodeId}</code>
                <div className="watch-actions">
                  <button type="button" onClick={() => onToggleIoState(point.id)}>Alternar</button>
                  <button type="button" onClick={() => onToggleIoManual(point.id)}>{point.manualMode ? 'Manual OFF' : 'Manual ON'}</button>
                  <button type="button" onClick={() => onToggleIoTest(point.id)}>{point.testMode ? 'Teste OFF' : 'Teste ON'}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'Nós' && (
        <section className="field-panel" id="nodes-section" aria-label="Nós ENDAP">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Nós</p>
              <strong>{nodes.filter((node) => node.status === 'online').length}/{nodes.length} online</strong>
            </div>
          </div>
          <div className="compact-list">
            {nodes.map((node) => (
              <article className={`compact-row health-${node.health}`} key={node.id}>
                <strong>{node.alias}</strong>
                <span>{node.profile}</span>
                <small>{node.status} · {node.transport}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'Fail-safe' && (
        <section className="field-panel" id="failsafe-section" aria-label="Fail-safe">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Fail-safe</p>
              <strong>{failSafePolicies.length} políticas</strong>
            </div>
          </div>
          <div className="compact-list">
            {failSafePolicies.map((policy) => (
              <article className={`compact-row ${policy.active ? 'health-warning' : 'health-ok'}`} key={policy.id}>
                <strong>{policy.outputId}</strong>
                <span>{policy.enabled ? 'Ativa' : 'Desligada'}</span>
                <small>Boot {policy.bootAction} · Loss {policy.communicationLossAction}</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
