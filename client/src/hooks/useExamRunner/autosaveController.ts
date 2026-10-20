// Serialize writes and coalesce pending changes into the latest snapshot.
// Revisions increase monotonically; retry failures with backoff and stop on 409.

export type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export type AnswersMap = Record<string, number>;

export type AutosaveController = {
  // After stop, send no new writes and ignore in-flight responses.
  start(): void;
  stop(): void;
  // Seed answers without scheduling a write.
  setLatest(answers: AnswersMap): void;

  markChanged(answers: AnswersMap): void;

  flushNow(): void;

  retry(): void;
  raiseRevision(revision: number): void;
  getRevision(): number;
};

type Options = {
  save: (
    answers: AnswersMap,
    revision: number
  ) => Promise<{ saved: boolean; revision: number }>;
  isConflict: (err: unknown) => boolean;
  onStatus: (status: AutosaveStatus) => void;
  initialRevision?: number;
  debounceMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  maxStaleRetries?: number;
};

export function createAutosaveController(opts: Options): AutosaveController {
  const debounceMs = opts.debounceMs ?? 2000;
  const retryBaseMs = opts.retryBaseMs ?? 2000;
  const retryMaxMs = opts.retryMaxMs ?? 15000;
  const maxStaleRetries = opts.maxStaleRetries ?? 3;

  let latest: AnswersMap = {};
  let revision = opts.initialRevision ?? 0;
  let dirty = false;
  let inFlight = false;
  let stopped = true;
  let failures = 0;
  let staleStreak = 0;
  let status: AutosaveStatus = 'idle';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function setStatus(next: AutosaveStatus) {
    if (next === status) return;
    status = next;
    opts.onStatus(next);
  }

  function clearTimers() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (retryTimer) clearTimeout(retryTimer);
    debounceTimer = null;
    retryTimer = null;
  }

  function scheduleRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    const delay = Math.min(
      retryBaseMs * 2 ** Math.max(0, failures - 1),
      retryMaxMs
    );
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void flush();
    }, delay);
  }

  async function flush(): Promise<void> {
    if (inFlight || stopped || !dirty) return;
    inFlight = true;

    try {
      while (dirty && !stopped) {
        const snapshot = latest;
        const nextRevision = revision + 1;
        dirty = false;
        setStatus('saving');

        try {
          const result = await opts.save(snapshot, nextRevision);
          if (stopped) return;

          failures = 0;
          if (result.saved) {
            revision = nextRevision;
            staleStreak = 0;
          } else {
            // Advance past the server revision before resending the latest local answers.
            revision = Math.max(revision, result.revision);
            dirty = true;
            staleStreak += 1;
            if (staleStreak > maxStaleRetries) {
              setStatus('error');
              scheduleRetry();
              return;
            }
          }
        } catch (err) {
          if (stopped) return;

          if (opts.isConflict(err)) {
            stopped = true;
            dirty = false;
            clearTimers();
            setStatus('idle');
            return;
          }

          dirty = true;
          failures += 1;
          setStatus('error');
          scheduleRetry();
          return;
        }
      }

      if (!stopped) setStatus(dirty ? 'unsaved' : 'saved');
    } finally {
      inFlight = false;
    }
  }

  return {
    start() {
      stopped = false;
    },
    stop() {
      stopped = true;
      clearTimers();
    },
    setLatest(answers) {
      latest = answers;
    },
    markChanged(answers) {
      latest = answers;
      if (stopped) return;
      dirty = true;
      // Keep the error visible until a save succeeds.
      if (status !== 'error') setStatus('unsaved');
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void flush();
      }, debounceMs);
    },
    flushNow() {
      if (!dirty) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = null;
      void flush();
    },
    retry() {
      failures = 0;
      staleStreak = 0;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      if (stopped) return;
      dirty = true;
      void flush();
    },
    raiseRevision(next) {
      revision = Math.max(revision, next);
    },
    getRevision() {
      return revision;
    },
  };
}
