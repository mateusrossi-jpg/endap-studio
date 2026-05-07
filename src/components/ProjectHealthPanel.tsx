export type ProjectIssue = {
  id: string;
  severity: 'info' | 'warning' | 'fault';
  source: string;
  message: string;
};

type ProjectHealthPanelProps = {
  issues: ProjectIssue[];
};

export function ProjectHealthPanel({ issues }: ProjectHealthPanelProps) {
  const faultCount = issues.filter((issue) => issue.severity === 'fault').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const statusLabel = faultCount > 0 ? 'Bloqueios' : warningCount > 0 ? 'Atenção' : 'Pronto local';

  return (
    <section className="health-panel" aria-label="Validação do projeto">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Validação local</p>
          <strong>{statusLabel}</strong>
        </div>
        <span className={`health-badge ${faultCount > 0 ? 'severity-fault' : warningCount > 0 ? 'severity-warning' : 'severity-info'}`}>
          {faultCount} falhas · {warningCount} avisos
        </span>
      </div>

      {issues.length === 0 ? (
        <p className="empty-copy">Projeto sem problemas críticos para simulação mock.</p>
      ) : (
        <div className="health-list">
          {issues.map((issue) => (
            <article className={`health-row severity-${issue.severity}`} key={issue.id}>
              <span>{issue.severity}</span>
              <strong>{issue.source}</strong>
              <p>{issue.message}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
