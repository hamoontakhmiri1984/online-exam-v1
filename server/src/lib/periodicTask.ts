// Skip overlapping runs; stopping also waits for the active run to finish.
export function periodicTask(run: () => Promise<unknown>, intervalMs: number, onError: (error: unknown) => void) {
  let active: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (active) return;
    active = Promise.resolve().then(run).then(() => undefined, onError).finally(() => { active = undefined; });
  }, intervalMs);
  timer.unref();
  return async () => { clearInterval(timer); await active; };
}
