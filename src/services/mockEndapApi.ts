import {
  EndapAlert,
  EndapAutomationRule,
  EndapDiagnosticMetric,
  EndapFailSafePolicy,
  EndapGateway,
  EndapIoPoint,
  EndapLadderProgram,
  EndapNode,
  EndapProject
} from '../types/endap';

export const gateway: EndapGateway = {
  id: 'gateway-main',
  name: 'ENDAP Gateway',
  ipAddress: '192.168.4.1',
  port: 8080,
  firmwareVersion: '0.9.0-dev',
  uptimeSeconds: 482340,
  status: 'online',
  health: 'ok',
  transport: 'ethernet',
  nodeProfile: 'gateway'
};

export const nodes: EndapNode[] = [
  {
    id: 'node-01',
    alias: 'Painel principal',
    profile: 'field_node',
    transport: 'wifi',
    status: 'online',
    approved: true,
    pending: false,
    lastHeartbeatSecondsAgo: 1,
    health: 'ok'
  },
  {
    id: 'node-02',
    alias: 'Expansão remota',
    profile: 'io_expander',
    transport: 'esp-now',
    status: 'offline',
    approved: true,
    pending: false,
    lastHeartbeatSecondsAgo: 48,
    health: 'warning'
  },
  {
    id: 'node-03',
    alias: 'Novo nó pendente',
    profile: 'sensor_node',
    transport: 'wifi',
    status: 'degraded',
    approved: false,
    pending: true,
    lastHeartbeatSecondsAgo: 12,
    health: 'warning'
  }
];

export const ioPoints: EndapIoPoint[] = [
  {
    id: 'input-0',
    alias: 'Botão Start',
    address: 'I0',
    gpio: 18,
    nodeId: 'gateway-main',
    direction: 'input',
    state: true,
    reserved: false,
    manualMode: false,
    testMode: false
  },
  {
    id: 'input-1',
    alias: 'Sensor nível',
    address: 'I1',
    gpio: 19,
    nodeId: 'node-01',
    direction: 'input',
    state: false,
    reserved: false,
    manualMode: false,
    testMode: true
  },
  {
    id: 'output-0',
    alias: 'Bomba principal',
    address: 'Q0',
    gpio: 25,
    nodeId: 'gateway-main',
    direction: 'output',
    state: true,
    reserved: false,
    manualMode: true,
    testMode: false
  }
];

export const failSafePolicies: EndapFailSafePolicy[] = [
  {
    id: 'failsafe-01',
    outputId: 'output-0',
    enabled: true,
    bootAction: 'FORCE_OFF',
    communicationLossAction: 'SAFE_VALUE',
    runtimeFaultAction: 'FORCE_OFF',
    safeValue: false,
    recoveryMode: 'RESTORE_LAST_SAFE',
    active: false
  }
];

export const automationRules: EndapAutomationRule[] = [
  {
    id: 'rule-01',
    name: 'Partida direta',
    enabled: true,
    mode: 'FOLLOW',
    inputId: 'input-0',
    outputId: 'output-0',
    description: 'Entrada acompanha saída principal.'
  },
  {
    id: 'rule-02',
    name: 'Pulso iluminação',
    enabled: true,
    mode: 'PULSE_MS',
    presetMs: 1200,
    description: 'Pulso temporizado para iluminação técnica.'
  }
];

export const diagnostics: EndapDiagnosticMetric[] = [
  {
    id: 'diag-heap',
    label: 'Heap livre',
    value: '182 KB',
    status: 'ok',
    description: 'Memória operacional estável.'
  },
  {
    id: 'diag-jitter',
    label: 'Jitter',
    value: '12 us',
    status: 'ok'
  },
  {
    id: 'diag-overrun',
    label: 'Overrun',
    value: '0',
    status: 'ok'
  }
];

export const alerts: EndapAlert[] = [
  {
    id: 'alert-01',
    severity: 'warning',
    source: 'Cluster',
    message: 'Nó node-02 está offline.',
    createdAt: new Date().toISOString(),
    acknowledged: false
  }
];

export const ladderProgram: EndapLadderProgram = {
  id: 'program-main',
  name: 'Controle principal',
  mode: 'mock',
  scanTimeMs: 4.2,
  rungs: [
    {
      id: 'rung-01',
      title: 'Partida da bomba',
      description: 'Contato NO aciona bobina principal.',
      blocks: [
        {
          id: 'block-01',
          kind: 'contact-no',
          label: 'I0',
          address: 'I0',
          active: true
        },
        {
          id: 'block-02',
          kind: 'coil',
          label: 'Q0',
          address: 'Q0',
          active: true
        }
      ]
    },
    {
      id: 'rung-02',
      title: 'Intertravamento',
      description: 'Contato NF bloqueia partida insegura.',
      blocks: [
        {
          id: 'block-03',
          kind: 'contact-no',
          label: 'I1',
          address: 'I1',
          active: true
        },
        {
          id: 'block-04',
          kind: 'contact-nc',
          label: 'I2',
          address: 'I2',
          active: false
        },
        {
          id: 'block-05',
          kind: 'coil',
          label: 'Q1',
          address: 'Q1',
          active: false
        }
      ]
    }
  ]
};

export const mockProject: EndapProject = {
  id: 'project-001',
  name: 'ENDAP Demo Plant',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  gateway,
  nodes,
  io: ioPoints,
  tags: [
    { id: 'tag-01', name: 'M0', type: 'memory', dataType: 'bool', value: false },
    { id: 'tag-02', name: 'M1', type: 'memory', dataType: 'bool', value: false },
    { id: 'tag-03', name: 'I0', type: 'input', dataType: 'bool', value: false },
    { id: 'tag-04', name: 'Q0', type: 'output', dataType: 'bool', value: false }
  ],
  failSafePolicies,
  alerts,
  diagnostics,
  automationRules,
  ladderProgram,
  integrations: [
    { id: 'int-modbus', name: 'Modbus TCP', category: 'protocol', description: 'Comunicação industrial padrão com PLCs e sensores.', icon: '🔌', enabled: true, status: 'connected' },
    { id: 'int-mqtt', name: 'MQTT Broker', category: 'cloud', description: 'Conectividade IoT para integração com dashboards externos.', icon: '☁️', enabled: false, status: 'idle' },
    { id: 'int-wifi', name: 'Wi-Fi Manager', category: 'connectivity', description: 'Gestão de redes sem fio e portal cativo.', icon: '📶', enabled: true, status: 'connected' },
    { id: 'int-rs485', name: 'RS485/RTU', category: 'connectivity', description: 'Barramento serial para dispositivos de campo.', icon: '📟', enabled: false, status: 'idle' },
    { id: 'int-hass', name: 'Home Assistant', category: 'platform', description: 'Integração nativa via MQTT Discovery.', icon: '🏠', enabled: false, status: 'idle' },
    { id: 'int-influx', name: 'InfluxDB', category: 'cloud', description: 'Armazenamento de séries temporais para análise.', icon: '📊', enabled: false, status: 'idle' },
    { id: 'int-i2c', name: 'I2C Bus', category: 'device', description: 'Suporte a expansores e sensores I2C.', icon: '🤖', enabled: true, status: 'connected' }
  ]
};

export async function getMockProject(): Promise<EndapProject> {
  return Promise.resolve(mockProject);
}

export async function getMockGateway(): Promise<EndapGateway> {
  return Promise.resolve(gateway);
}

export async function getMockNodes(): Promise<EndapNode[]> {
  return Promise.resolve(nodes);
}

export async function getMockIo(): Promise<EndapIoPoint[]> {
  return Promise.resolve(ioPoints);
}

export async function getMockLadderProgram(): Promise<EndapLadderProgram> {
  return Promise.resolve(ladderProgram);
}
