// Operational logs: never pass request bodies, tokens or environment objects here.
function clean(value: string): string {
  return value.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+(?::[^\s/@]*)?@/gi, '$1[redacted]@');
}
export function logEvent(level: 'info' | 'warn' | 'error', event: string, error?: unknown) {
  const detail = error instanceof Error ? {
    name: error.name,
    message: clean(error.message),
    code: 'code' in error ? String(error.code) : undefined,
    stack: error.stack ? clean(error.stack) : undefined,
  } : error === undefined ? undefined : { message: 'Non-Error rejection' };
  const line = JSON.stringify({ time: new Date().toISOString(), level, event: clean(event), error: detail });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}
