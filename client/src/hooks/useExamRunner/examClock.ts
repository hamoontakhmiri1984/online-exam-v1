// Estimate clock offset at the request midpoint so device clock skew does not change the countdown.

export type ClockSample = {
  expiresAt: string;
  serverNow: string;

  requestStartedAtMs: number;
  responseReceivedAtMs: number;
};

// Return a local-clock deadline, or null when the sample is invalid.
export function computeDeadlineLocalMs(sample: ClockSample): number | null {
  const expiresMs = Date.parse(sample.expiresAt);
  const serverMs = Date.parse(sample.serverNow);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(serverMs)) return null;

  const { requestStartedAtMs, responseReceivedAtMs } = sample;
  // Reject samples when the device clock moves during the request.
  if (responseReceivedAtMs < requestStartedAtMs) return null;

  const localMidpointMs = (requestStartedAtMs + responseReceivedAtMs) / 2;
  const offsetMs = serverMs - localMidpointMs;
  return expiresMs - offsetMs;
}

export function remainingSecondsUntil(
  deadlineLocalMs: number,
  nowMs: number = Date.now()
): number {
  return Math.max(0, Math.round((deadlineLocalMs - nowMs) / 1000));
}
