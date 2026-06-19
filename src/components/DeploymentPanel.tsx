import { importBackup } from '../services/endapApi';
import { StudioSettings } from '../services/storage';
import { EndapProject } from '../types/endap';
import { ProjectIssue } from './ProjectHealthPanel';
import { compileToBytecode } from '../engine/compiler';
import { useState } from 'react';

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

  const [isConnecting, setIsConnecting] = useState(false);
  const [bytecode, setBytecode] = useState('');

  const generateBytecode = () => {
    const compiled = compileToBytecode(project);
    setBytecode(JSON.stringify(compiled, null, 2));
  };

  async function connectSerial() {
    if (!('serial' in navigator)) {
      onDeployResult(false, 'Seu navegador não suporta a Web Serial API (Recomendamos Chrome ou Edge).');
      return;
    }

    try {
      setIsConnecting(true);
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      onDeployResult(true, 'Conectado à placa física (USB). Pronto para Flash.');
      // Na vida real, enviamos o bytecode binário ou JSON pela porta
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
      const writer = textEncoder.writable.getWriter();
      await writer.write(JSON.stringify(compileToBytecode(project)));
      await writer.close();
      onDeployResult(true, 'Bytecode Flashed successfully!');
    } catch (err) {
      onDeployResult(false, 'Falha ao comunicar com a porta USB.');
    } finally {
      setIsConnecting(false);
    }
  }

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
      onDeployResult(true, settings.apiMode === 'mock' ? 'Deploy mock validado localmente.' : 'Projeto enviado ao gateway OTA.');
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
          <span>Instruções (Bytecode)</span>
          <strong>{compileToBytecode(project).instructions.length}</strong>
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

      <div style={{ marginTop: 24, padding: 16, border: '1px solid var(--line)', background: 'var(--panel-strong)', borderRadius: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text)' }}>Hardware Deploy (Web Serial API)</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Conecte seu ESP32 via cabo USB e grave a lógica nativamente sem Arduino IDE.</p>
          </div>
          <button type="button" onClick={connectSerial} disabled={!canDeploy || isConnecting} style={{ background: 'var(--cyan)', color: '#000', padding: '8px 16px', fontWeight: 'bold' }}>
            {isConnecting ? 'Conectando...' : 'FLASH VIA USB'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
           <button type="button" className="secondaryBtn" onClick={generateBytecode} style={{ fontSize: 12, border: '1px solid var(--line)' }}>Ver Código de Máquina (Bytecode)</button>
        </div>

        {bytecode && (
          <pre style={{ marginTop: 12, background: '#0F172A', padding: 12, borderRadius: 4, maxHeight: 200, overflowY: 'auto', fontSize: 12, color: '#38bdf8' }}>
            {bytecode}
          </pre>
        )}
      </div>

      <div className="contract-status" style={{ marginTop: 16 }}>
        <span>Destino OTA</span>
        <strong>{settings.apiMode === 'mock' ? 'Runtime mock local' : `${settings.gatewayBaseUrl}/api/backup/import`}</strong>
      </div>
    </section>
  );
}
