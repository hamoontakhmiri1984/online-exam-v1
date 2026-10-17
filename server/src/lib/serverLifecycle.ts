import type { Server, ServerResponse, IncomingMessage } from 'http';
import { logEvent } from './logger';

export function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const failed = (error: Error) => { server.removeListener('listening', ready); reject(error); };
    const ready = () => { server.removeListener('error', failed); resolve(); };
    server.once('error', failed);
    server.once('listening', ready);
    server.listen(port);
  });
}

// The global deadline prevents stuck HTTP, workers or dependencies from hanging deploys.
export function createShutdown(cleanup: () => Promise<void>, exit = (code: number) => process.exit(code), timeoutMs = 10_000) {
  let task: Promise<void> | undefined;
  return (reason: string, code = 0): Promise<void> => {
    if (task) return task;
    logEvent('info', `shutdown:${reason}`);
    const timer = setTimeout(() => { logEvent('error', 'shutdown_timeout'); exit(1); }, timeoutMs);
    task = Promise.resolve().then(cleanup).then(
      () => { clearTimeout(timer); exit(code); },
      error => { clearTimeout(timer); logEvent('error', 'shutdown_failed', error); exit(1); },
    );
    return task;
  };
}

// Observe accepted responses from the start, including ones active at shutdown.
export function httpDrainer(server: Server) {
  let closing = false;
  server.on('request', (_req: IncomingMessage, res: ServerResponse) => {
    res.once('finish', () => { if (closing) setImmediate(() => server.closeIdleConnections()); });
  });
  return () => new Promise<void>((resolve, reject) => {
    closing = true;
    if (!server.listening) { resolve(); return; }
    server.close(error => error ? reject(error) : resolve());
    server.closeIdleConnections();
  });
}
