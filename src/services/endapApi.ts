import { getMockProject } from './mockEndapApi';
import {
  EndapAutomationRule,
  EndapDiagnosticMetric,
  EndapFailSafePolicy,
  EndapGateway,
  EndapIoPoint,
  EndapNode,
  EndapProject
} from '../types/endap';

export type EndapApiMode = 'mock' | 'gateway';

export type EndapApiClientOptions = {
  mode: EndapApiMode;
  gatewayBaseUrl?: string;
};

const DEFAULT_GATEWAY_BASE_URL = 'http://192.168.4.1';

async function requestJson<T>(path: string, options: EndapApiClientOptions): Promise<T> {
  if (options.mode === 'mock') {
    throw new Error(`Endpoint ${path} is not available in direct mock request mode.`);
  }

  const baseUrl = options.gatewayBaseUrl ?? DEFAULT_GATEWAY_BASE_URL;
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`ENDAP gateway request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function postJson<TBody, TResponse>(path: string, body: TBody, options: EndapApiClientOptions): Promise<TResponse> {
  if (options.mode === 'mock') {
    throw new Error(`Endpoint ${path} is not available in direct mock request mode.`);
  }

  const baseUrl = options.gatewayBaseUrl ?? DEFAULT_GATEWAY_BASE_URL;
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`ENDAP gateway request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function getSystemInfo(options: EndapApiClientOptions = { mode: 'mock' }): Promise<EndapGateway> {
  if (options.mode === 'mock') return (await getMockProject()).gateway;
  return requestJson<EndapGateway>('/api/system/info', options);
}

export async function getDiagnostics(options: EndapApiClientOptions = { mode: 'mock' }): Promise<EndapDiagnosticMetric[]> {
  if (options.mode === 'mock') return (await getMockProject()).diagnostics;
  return requestJson<EndapDiagnosticMetric[]>('/api/diagnostics', options);
}

export async function getNodes(options: EndapApiClientOptions = { mode: 'mock' }): Promise<EndapNode[]> {
  if (options.mode === 'mock') return (await getMockProject()).nodes;
  return requestJson<EndapNode[]>('/api/nodes', options);
}

export async function approveNode(id: string, options: EndapApiClientOptions = { mode: 'mock' }): Promise<{ ok: boolean }> {
  if (options.mode === 'mock') return { ok: true };
  return postJson(`/api/nodes/${id}/approve`, {}, options);
}

export async function revokeNode(id: string, options: EndapApiClientOptions = { mode: 'mock' }): Promise<{ ok: boolean }> {
  if (options.mode === 'mock') return { ok: true };
  return postJson(`/api/nodes/${id}/revoke`, {}, options);
}

export async function getIo(options: EndapApiClientOptions = { mode: 'mock' }): Promise<EndapIoPoint[]> {
  if (options.mode === 'mock') return (await getMockProject()).io;
  return requestJson<EndapIoPoint[]>('/api/io', options);
}

export async function saveIo(points: EndapIoPoint[], options: EndapApiClientOptions = { mode: 'mock' }): Promise<{ ok: boolean }> {
  if (options.mode === 'mock') return { ok: true };
  return postJson('/api/io/save', { points }, options);
}

export async function getFailSafePolicies(options: EndapApiClientOptions = { mode: 'mock' }): Promise<EndapFailSafePolicy[]> {
  if (options.mode === 'mock') return (await getMockProject()).failSafePolicies;
  return requestJson<EndapFailSafePolicy[]>('/api/failsafe/outputs', options);
}

export async function saveFailSafePolicy(
  policy: EndapFailSafePolicy,
  options: EndapApiClientOptions = { mode: 'mock' }
): Promise<{ ok: boolean }> {
  if (options.mode === 'mock') return { ok: true };
  return postJson('/api/failsafe/output/save', { policy }, options);
}

export async function resetFailSafeOutput(id: string, options: EndapApiClientOptions = { mode: 'mock' }): Promise<{ ok: boolean }> {
  if (options.mode === 'mock') return { ok: true };
  return postJson('/api/failsafe/output/reset', { id }, options);
}

export async function getAutomationRules(options: EndapApiClientOptions = { mode: 'mock' }): Promise<EndapAutomationRule[]> {
  if (options.mode === 'mock') return (await getMockProject()).automationRules;
  return requestJson<EndapAutomationRule[]>('/api/automation/rules', options);
}

export async function saveAutomationRule(
  rule: EndapAutomationRule,
  options: EndapApiClientOptions = { mode: 'mock' }
): Promise<{ ok: boolean }> {
  if (options.mode === 'mock') return { ok: true };
  return postJson('/api/automation/rules/save', { rule }, options);
}

export async function getLogs(options: EndapApiClientOptions = { mode: 'mock' }): Promise<string[]> {
  if (options.mode === 'mock') {
    const project = await getMockProject();
    return project.alerts.map((alert) => `${alert.createdAt} [${alert.severity}] ${alert.source}: ${alert.message}`);
  }
  return requestJson<string[]>('/api/logs', options);
}

export async function exportBackup(options: EndapApiClientOptions = { mode: 'mock' }): Promise<EndapProject> {
  if (options.mode === 'mock') return getMockProject();
  return requestJson<EndapProject>('/api/backup/export', options);
}

export async function importBackup(project: EndapProject, options: EndapApiClientOptions = { mode: 'mock' }): Promise<{ ok: boolean }> {
  if (options.mode === 'mock') return { ok: true };
  return postJson('/api/backup/import', project, options);
}

export function connectEvents(options: EndapApiClientOptions = { mode: 'mock' }): WebSocket | null {
  if (options.mode === 'mock') return null;

  const baseUrl = options.gatewayBaseUrl ?? DEFAULT_GATEWAY_BASE_URL;
  const websocketUrl = baseUrl.replace(/^http/, 'ws');
  return new WebSocket(`${websocketUrl}/api/events`);
}
