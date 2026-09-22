// منطقِ بدون‌وابستگی‌به‌React ذخیره‌ی خودکارِ پاسخ‌ها (تا جدا از UI قابل‌تست
// باشه). useExamAutosave فقط یه لایه‌ی نازک دورشه.
//
// قرارداد:
//  - حداکثر یک درخواست هم‌زمان؛ تغییرهای بین‌راهی جمع می‌شن و بعد از برگشتنِ
//    درخواست، *آخرین* وضعیت فرستاده می‌شه
//  - هر ذخیره یه revision صعودی داره؛ سرور قدیمی‌تر رو رد می‌کنه (saved=false)
//  - خطای شبکه/سرور: dirty می‌مونه، وضعیت error می‌شه و با backoff تکرار می‌شه
//  - خطای تعارض (۴۰۹: آزمون ثبت شده/زمان تموم شده): دیگه ذخیره نمی‌کنیم

export type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export type AnswersMap = Record<string, number>;

export type AutosaveController = {
  // شروع/توقف: بعد از stop هیچ درخواستی نمی‌ره و نتیجه‌ی درخواست‌های در راه نادیده‌ست
  start(): void;
  stop(): void;
  // آخرین پاسخ‌ها رو ثبت می‌کنه بدون این‌که ذخیره‌ای رو زمان‌بندی کنه (مثلاً seed اولیه)
  setLatest(answers: AnswersMap): void;
  // کاربر چیزی رو عوض کرده: dirty می‌شه و بعد از debounce ذخیره می‌شه
  markChanged(answers: AnswersMap): void;
  // بی‌انتظار برای debounce همین الان بفرست (تب مخفی شد / اینترنت برگشت)
  flushNow(): void;
  // دکمه‌ی «تلاش دوباره»
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
            // سرور نسخه‌ی جدیدتر/هم‌شماره داره؛ شمارنده رو جلو می‌بریم و آخرین
            // وضعیت همین کلاینت رو دوباره می‌فرستیم
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
      // اگه خطا داریم، وضعیت خطا می‌مونه تا ذخیره‌ی موفق
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
