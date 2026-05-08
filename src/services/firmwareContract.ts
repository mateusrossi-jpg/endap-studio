export type FirmwareEndpointArea =
  | 'system'
  | 'diagnostics'
  | 'nodes'
  | 'io'
  | 'failsafe'
  | 'automation'
  | 'logs'
  | 'backup'
  | 'events';

export type FirmwareEndpointCriticality = 'required' | 'recommended' | 'future';

export type FirmwareEndpointContract = {
  id: string;
  area: FirmwareEndpointArea;
  method: 'GET' | 'POST' | 'WS';
  path: string;
  purpose: string;
  criticality: FirmwareEndpointCriticality;
  studioFeature: string;
  safetyNote?: string;
};

export const firmwareEndpointContracts: FirmwareEndpointContract[] = [
  {
    id: 'system-info',
    area: 'system',
    method: 'GET',
    path: '/api/system/info',
    purpose: 'Ler identificação, versão, uptime e saúde do gateway ENDAP.',
    criticality: 'required',
    studioFeature: 'Gateway Contract / Overview',
    safetyNote: 'Deve funcionar antes de qualquer operação real no gateway.'
  },
  {
    id: 'diagnostics',
    area: 'diagnostics',
    method: 'GET',
    path: '/api/diagnostics',
    purpose: 'Ler heap, jitter, scan, fieldbus, alertas técnicos e métricas runtime.',
    criticality: 'required',
    studioFeature: 'Diagnóstico / Observabilidade'
  },
  {
    id: 'nodes-list',
    area: 'nodes',
    method: 'GET',
    path: '/api/nodes',
    purpose: 'Listar nós conhecidos, pendentes, aprovados, offline e perfis.',
    criticality: 'required',
    studioFeature: 'Nós / Cluster / Comissionamento'
  },
  {
    id: 'nodes-approve',
    area: 'nodes',
    method: 'POST',
    path: '/api/nodes/:id/approve',
    purpose: 'Aprovar nó pendente no cluster.',
    criticality: 'recommended',
    studioFeature: 'Comissionamento',
    safetyNote: 'Exigir confirmação visual antes de aprovar nó real.'
  },
  {
    id: 'nodes-revoke',
    area: 'nodes',
    method: 'POST',
    path: '/api/nodes/:id/revoke',
    purpose: 'Revogar nó do cluster.',
    criticality: 'recommended',
    studioFeature: 'Comissionamento',
    safetyNote: 'Revogação deve ser explícita e rastreável na timeline.'
  },
  {
    id: 'io-list',
    area: 'io',
    method: 'GET',
    path: '/api/io',
    purpose: 'Ler entradas, saídas, aliases, estados e GPIOs reservados.',
    criticality: 'required',
    studioFeature: 'I/O / Watch Table'
  },
  {
    id: 'io-save',
    area: 'io',
    method: 'POST',
    path: '/api/io/save',
    purpose: 'Salvar configuração de I/O permitida pelo gateway.',
    criticality: 'recommended',
    studioFeature: 'I/O',
    safetyNote: 'Dry-run deve bloquear GPIO reservado antes de envio real.'
  },
  {
    id: 'failsafe-outputs',
    area: 'failsafe',
    method: 'GET',
    path: '/api/failsafe/outputs',
    purpose: 'Ler políticas fail-safe por saída.',
    criticality: 'required',
    studioFeature: 'Segurança Operacional'
  },
  {
    id: 'failsafe-save',
    area: 'failsafe',
    method: 'POST',
    path: '/api/failsafe/output/save',
    purpose: 'Salvar política fail-safe de uma saída.',
    criticality: 'recommended',
    studioFeature: 'Segurança Operacional',
    safetyNote: 'Não sobrescrever política crítica sem confirmação.'
  },
  {
    id: 'automation-rules',
    area: 'automation',
    method: 'GET',
    path: '/api/automation/rules',
    purpose: 'Listar regras de automação existentes no gateway.',
    criticality: 'recommended',
    studioFeature: 'Automação / Ladder bridge'
  },
  {
    id: 'logs',
    area: 'logs',
    method: 'GET',
    path: '/api/logs',
    purpose: 'Ler logs e alertas do gateway.',
    criticality: 'recommended',
    studioFeature: 'Runtime Timeline'
  },
  {
    id: 'events-ws',
    area: 'events',
    method: 'WS',
    path: '/api/events',
    purpose: 'Receber eventos vivos de runtime, cluster, diagnóstico e fail-safe.',
    criticality: 'future',
    studioFeature: 'Runtime Event Bus / Replay'
  }
];

export function getFirmwareEndpointsByArea(area: FirmwareEndpointArea): FirmwareEndpointContract[] {
  return firmwareEndpointContracts.filter((endpoint) => endpoint.area === area);
}

export function getRequiredFirmwareEndpoints(): FirmwareEndpointContract[] {
  return firmwareEndpointContracts.filter((endpoint) => endpoint.criticality === 'required');
}

export function formatEndpoint(endpoint: FirmwareEndpointContract): string {
  return `${endpoint.method} ${endpoint.path}`;
}
