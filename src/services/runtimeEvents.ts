export type EndapRuntimeEventType =
  | 'runtime.scan'
  | 'runtime.mode_changed'
  | 'ladder.block_changed'
  | 'ladder.branch_changed'
  | 'memory.changed'
  | 'timer.changed'
  | 'coil.changed'
  | 'io.changed'
  | 'diagnostic.changed'
  | 'failsafe.triggered'
  | 'cluster.node_changed'
  | 'gateway.connected'
  | 'gateway.disconnected'
  | 'alert.created';

export type EndapRuntimeEventSeverity = 'info' | 'warning' | 'fault';

export type EndapRuntimeEvent = {
  id: string;
  type: EndapRuntimeEventType;
  severity: EndapRuntimeEventSeverity;
  timestamp: string;
  source: string;
  message: string;
  payload?: Record<string, unknown>;
};

export type RuntimeEventSubscriber = (event: EndapRuntimeEvent) => void;

const MAX_EVENT_HISTORY = 250;

function createEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class RuntimeEventBus {
  private subscribers = new Set<RuntimeEventSubscriber>();
  private history: EndapRuntimeEvent[] = [];

  publish(event: Omit<EndapRuntimeEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): EndapRuntimeEvent {
    const runtimeEvent: EndapRuntimeEvent = {
      id: event.id ?? createEventId(),
      timestamp: event.timestamp ?? new Date().toISOString(),
      type: event.type,
      severity: event.severity,
      source: event.source,
      message: event.message,
      payload: event.payload
    };

    this.history = [runtimeEvent, ...this.history].slice(0, MAX_EVENT_HISTORY);
    this.subscribers.forEach((subscriber) => subscriber(runtimeEvent));
    return runtimeEvent;
  }

  subscribe(subscriber: RuntimeEventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  getHistory(): EndapRuntimeEvent[] {
    return this.history;
  }

  clear(): void {
    this.history = [];
  }
}

export const runtimeEventBus = new RuntimeEventBus();

export function createScanEvent(scanTimeMs: number, scanCount: number): EndapRuntimeEvent {
  return runtimeEventBus.publish({
    type: 'runtime.scan',
    severity: 'info',
    source: 'studio-runtime',
    message: `Scan ${scanCount} executado em ${scanTimeMs} ms`,
    payload: {
      scanTimeMs,
      scanCount
    }
  });
}

export function createModeChangedEvent(mode: 'RUN' | 'STOP'): EndapRuntimeEvent {
  return runtimeEventBus.publish({
    type: 'runtime.mode_changed',
    severity: 'info',
    source: 'studio-runtime',
    message: `Runtime alterado para ${mode}`,
    payload: {
      mode
    }
  });
}

export function createMemoryChangedEvent(address: string, value: boolean): EndapRuntimeEvent {
  return runtimeEventBus.publish({
    type: 'memory.changed',
    severity: 'info',
    source: address,
    message: `${address} = ${value ? 'true' : 'false'}`,
    payload: {
      address,
      value
    }
  });
}

export function createGatewayEvent(connected: boolean, gatewayBaseUrl?: string): EndapRuntimeEvent {
  return runtimeEventBus.publish({
    type: connected ? 'gateway.connected' : 'gateway.disconnected',
    severity: connected ? 'info' : 'warning',
    source: 'endap-gateway',
    message: connected ? 'Gateway ENDAP conectado' : 'Gateway ENDAP desconectado',
    payload: {
      gatewayBaseUrl
    }
  });
}
