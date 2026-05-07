import { useState } from 'react';
import { getSystemInfo } from '../services/endapApi';
import { StudioSettings } from '../services/storage';

const expectedEndpoints = [
  'GET /api/system/info',
  'GET /api/diagnostics',
  'GET /api/nodes',
  'GET /api/io',
  'POST /api/io/save',
  'GET /api/failsafe/outputs',
  'GET /api/automation/rules',
  'GET /api/backup/export',
  'POST /api/backup/import',
  'WS /api/events'
];

type GatewayContractProps = {
  settings: StudioSettings;
  onSettingsChange: (patch: Partial<StudioSettings>) => void;
  onGatewayResult: (connected: boolean, message: string) => void;
};

export function GatewayContract({ settings, onSettingsChange, onGatewayResult }: GatewayContractProps) {
  const [status, setStatus] = useState('Aguardando teste');
  const [isTesting, setIsTesting] = useState(false);

  async function testConnection() {
    setIsTesting(true);
    setStatus('Testando conexão...');

    try {
      const gateway = await getSystemInfo({
        mode: settings.apiMode,
        gatewayBaseUrl: settings.gatewayBaseUrl
      });
      const message =
        settings.apiMode === 'mock'
          ? `Mock OK: ${gateway.name} ${gateway.firmwareVersion}`
          : `Gateway OK: ${gateway.name} ${gateway.firmwareVersion}`;
      setStatus(message);
      onGatewayResult(true, message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gateway não respondeu';
      setStatus(message);
      onGatewayResult(false, message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <section className="gateway-panel" aria-label="Gateway e contrato firmware">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Gateway / Firmware Contract</p>
          <strong>{settings.apiMode === 'mock' ? 'Modo mock local' : 'Modo gateway real'}</strong>
        </div>
        <button type="button" onClick={testConnection} disabled={isTesting}>
          {isTesting ? 'Testando...' : 'Testar conexão'}
        </button>
      </div>

      <div className="settings-grid">
        <label>
          <span>Modo</span>
          <select value={settings.apiMode} onChange={(event) => onSettingsChange({ apiMode: event.target.value === 'gateway' ? 'gateway' : 'mock' })}>
            <option value="mock">Mock local</option>
            <option value="gateway">Gateway</option>
          </select>
        </label>
        <label>
          <span>Base URL</span>
          <input value={settings.gatewayBaseUrl} onChange={(event) => onSettingsChange({ gatewayBaseUrl: event.target.value })} />
        </label>
        <label>
          <span>Tema</span>
          <select value={settings.theme} onChange={(event) => onSettingsChange({ theme: event.target.value === 'light' ? 'light' : 'dark' })}>
            <option value="dark">Dark industrial</option>
            <option value="light">Light preparado</option>
          </select>
        </label>
        <label className="checkbox-row">
          <input
            checked={settings.autoSave}
            type="checkbox"
            onChange={(event) => onSettingsChange({ autoSave: event.target.checked })}
          />
          <span>Auto-save local</span>
        </label>
      </div>

      <div className="contract-status">
        <span>Status</span>
        <strong>{status}</strong>
      </div>

      <div className="endpoint-list">
        {expectedEndpoints.map((endpoint) => (
          <code key={endpoint}>{endpoint}</code>
        ))}
      </div>
    </section>
  );
}
