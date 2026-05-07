export type EndapConnectionStatus = 'online' | 'offline' | 'degraded' | 'mock';

export type EndapTransport = 'wifi' | 'ethernet' | 'esp-now' | 'rs485' | 'local' | 'unknown';

export type EndapNodeProfile = 'gateway' | 'field_node' | 'io_expander' | 'sensor_node' | 'actuator_node' | 'unknown';

export type EndapHealth = 'ok' | 'warning' | 'fault';

export type EndapGateway = {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  firmwareVersion: string;
  uptimeSeconds: number;
  status: EndapConnectionStatus;
  health: EndapHealth;
  transport: EndapTransport;
  nodeProfile: EndapNodeProfile;
};

export type EndapNode = {
  id: string;
  alias: string;
  profile: EndapNodeProfile;
  transport: EndapTransport;
  status: EndapConnectionStatus;
  approved: boolean;
  pending: boolean;
  lastHeartbeatSecondsAgo: number;
  health: EndapHealth;
};

export type EndapIoDirection = 'input' | 'output';

export type EndapIoPoint = {
  id: string;
  alias: string;
  address: string;
  gpio?: number;
  nodeId: string;
  direction: EndapIoDirection;
  state: boolean;
  reserved: boolean;
  manualMode: boolean;
  testMode: boolean;
};

export type EndapFailSafeAction = 'KEEP_LAST' | 'FORCE_OFF' | 'FORCE_ON' | 'SAFE_VALUE';

export type EndapRecoveryMode = 'MANUAL_RESET' | 'AUTO_RECOVER' | 'RESTORE_LAST_SAFE';

export type EndapFailSafePolicy = {
  id: string;
  outputId: string;
  enabled: boolean;
  bootAction: EndapFailSafeAction;
  communicationLossAction: EndapFailSafeAction;
  runtimeFaultAction: EndapFailSafeAction;
  safeValue: boolean;
  recoveryMode: EndapRecoveryMode;
  active: boolean;
  lastReason?: string;
};

export type EndapAlertSeverity = 'info' | 'warning' | 'fault';

export type EndapAlert = {
  id: string;
  severity: EndapAlertSeverity;
  source: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
};

export type EndapDiagnosticMetric = {
  id: string;
  label: string;
  value: string;
  status: EndapHealth;
  description?: string;
};

export type EndapAutomationMode =
  | 'FOLLOW'
  | 'PULSE_MS'
  | 'ON_DELAY_MS'
  | 'OFF_DELAY_MS'
  | 'TOGGLE'
  | 'FORCE_ON'
  | 'FORCE_OFF';

export type EndapAutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  mode: EndapAutomationMode;
  inputId?: string;
  outputId?: string;
  presetMs?: number;
  description?: string;
};

export type EndapLadderBlockKind =
  | 'contact-no'
  | 'contact-nc'
  | 'memory-contact-no'
  | 'memory-contact-nc'
  | 'timer-ton'
  | 'timer-tof'
  | 'counter'
  | 'coil'
  | 'coil-set'
  | 'coil-reset';

export type EndapLadderBlock = {
  id: string;
  kind: EndapLadderBlockKind;
  label: string;
  address?: string;
  active: boolean;
  presetMs?: number;
  elapsedMs?: number;
  presetCount?: number;
  accumulatedCount?: number;
  previousInput?: boolean;
};

export type EndapLadderBranch = {
  id: string;
  title?: string;
  blocks: EndapLadderBlock[];
};

export type EndapLadderRung = {
  id: string;
  title: string;
  description: string;
  blocks: EndapLadderBlock[];
  branches?: EndapLadderBranch[];
};

export type EndapLadderProgram = {
  id: string;
  name: string;
  mode: 'mock' | 'simulation' | 'gateway';
  scanTimeMs: number;
  rungs: EndapLadderRung[];
};

export type EndapBackup = {
  exportedAt: string;
  studioVersion: string;
  gateway: EndapGateway;
  nodes: EndapNode[];
  io: EndapIoPoint[];
  failSafePolicies: EndapFailSafePolicy[];
  automationRules: EndapAutomationRule[];
  ladderProgram: EndapLadderProgram;
};

export type EndapProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  gateway: EndapGateway;
  nodes: EndapNode[];
  io: EndapIoPoint[];
  failSafePolicies: EndapFailSafePolicy[];
  alerts: EndapAlert[];
  diagnostics: EndapDiagnosticMetric[];
  automationRules: EndapAutomationRule[];
  ladderProgram: EndapLadderProgram;
};
