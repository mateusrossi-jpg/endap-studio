import { importBackup } from '../services/endapApi';
import { StudioSettings } from '../services/storage';
import { EndapProject } from '../types/endap';
import { ProjectIssue } from './ProjectHealthPanel';

type DeploymentPanelProps = {
  issues: ProjectIssue[];
  project: EndapProject;
  settings: StudioSettings;
  onDeployResult: (ok: boolean, message: string) => void;
};

export function DeploymentPanel({ issues, project, settings, onDeployResult }: DeploymentPanelProps) {
  const faultCount = issues.filter((issue) => issue.severity === 'fault').length;
  const canDeploy = faultCount === 0;
  const blockCount = project.ladderProgram.rungs.reduce((total, rung) => {
    return total + rung.blocks.length + (rung.branches ?? []).reduce((branchTotal, branch) => branchTotal + branch.blocks.length, 0);
  }, 0);

  async function deployProject() {
    if (!canDeploy) {
      onDeployResult(false, 'Deploy bloqueado por falhas de validação local.');
      return;
    }

    try {
      await importBackup(project, {
        mode: settings.apiMode,
        gatewayBaseUrl: settings.gatewayBaseUrl
      });
      onDeployResult(true, settings.apiMode === 'mock' ? 'Deploy mock validado localmente.' : 'Projeto enviado ao gateway.');
    } catch (error) {
      onDeployResult(false, error instanceof Error ? error.message : 'Falha ao enviar projeto ao gateway.');
    }
  }

  return (
    <section className="deployment-panel" aria-label="Deploy para gateway">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Deploy local/gateway</p>
          <strong>{canDeploy ? 'Pronto para envio' : 'Bloqueado'}</strong>
        </div>
        <button type="button" onClick={deployProject} disabled={!canDeploy}>
          {settings.apiMode === 'mock' ? 'Validar mock' : 'Enviar gateway'}
        </button>
      </div>

      <div className="deployment-grid">
        <article>
          <span>Modo</span>
          <strong>{settings.apiMode}</strong>
        </article>
        <article>
          <span>Rungs</span>
          <strong>{project.ladderProgram.rungs.length}</strong>
        </article>
        <article>
          <span>Blocos</span>
          <strong>{blockCount}</strong>
        </article>
        <article>
          <span>Falhas</span>
          <strong>{faultCount}</strong>
        </article>
      </div>

      <div className="contract-status">
        <span>Destino</span>
        <strong>{settings.apiMode === 'mock' ? 'Runtime mock local' : `${settings.gatewayBaseUrl}/api/backup/import`}</strong>
      </div>
    </section>
  );
}
