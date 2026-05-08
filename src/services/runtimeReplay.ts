import { EndapRuntimeEvent } from './runtimeEvents';

export type RuntimeReplayFrame = {
  id: string;
  timestamp: string;
  relativeMs: number;
  eventType: string;
  message: string;
  severity: 'info' | 'warning' | 'fault';
};

export type RuntimeReplaySession = {
  createdAt: string;
  durationMs: number;
  frameCount: number;
  frames: RuntimeReplayFrame[];
};

function toTimestampMs(timestamp: string): number {
  return new Date(timestamp).getTime();
}

export function createReplaySession(events: EndapRuntimeEvent[]): RuntimeReplaySession {
  const ordered = [...events].reverse();

  if (ordered.length === 0) {
    return {
      createdAt: new Date().toISOString(),
      durationMs: 0,
      frameCount: 0,
      frames: []
    };
  }

  const firstTimestamp = toTimestampMs(ordered[0].timestamp);
  const lastTimestamp = toTimestampMs(ordered[ordered.length - 1].timestamp);

  const frames = ordered.map((event) => ({
    id: event.id,
    timestamp: event.timestamp,
    relativeMs: toTimestampMs(event.timestamp) - firstTimestamp,
    eventType: event.type,
    message: event.message,
    severity: event.severity
  }));

  return {
    createdAt: new Date().toISOString(),
    durationMs: Math.max(0, lastTimestamp - firstTimestamp),
    frameCount: frames.length,
    frames
  };
}

export function getReplayFramesInWindow(
  session: RuntimeReplaySession,
  currentMs: number,
  windowMs = 2500
): RuntimeReplayFrame[] {
  return session.frames.filter(
    (frame) => frame.relativeMs <= currentMs && frame.relativeMs >= Math.max(0, currentMs - windowMs)
  );
}
