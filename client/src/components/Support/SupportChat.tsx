import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
export type Thread = {
  id: string;
  status: string;
  updatedAt: string;
  user?: { name: string | null; username: string | null };
};
type Message = {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: string;
};
const formatMessageDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
};
const formatMessageTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date);
};
export const statusLabel: Record<string, string> = {
  waiting: 'منتظر پاسخ پشتیبان',
  replied: 'پشتیبان پاسخ داده',
  closed: 'گفت‌وگو بسته شده',
};
export default function SupportChat({
  threadId,
  staff = false,
}: {
  threadId?: string;
  staff?: boolean;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pending = useRef<{ body: string; clientId: string } | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const latestRenderedMessageRef = useRef<string | null>(null);
  useEffect(() => {
    if (staff || loading || messages.length === 0) return;
    const latest = messages[messages.length - 1].id;
    if (latestRenderedMessageRef.current !== latest) {
      const list = messageListRef.current;
      if (list) list.scrollTop = list.scrollHeight;
      latestRenderedMessageRef.current = latest;
    }
  }, [staff, loading, messages]);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = threadId
        ? { id: threadId, status: '', updatedAt: '' }
        : await apiRequest<Thread | null>('/support/mine', { signal });
      const items = current
        ? await apiRequest<Message[]>(`/support/${current.id}/messages`, {
            signal,
          })
        : [];
      if (!signal?.aborted) {
        setThread(current);
        setMessages(items);
        setLoading(false);
      }
    },
    [threadId],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        await load(controller.signal);
        setError('');
      } catch {
        if (!controller.signal.aborted) {
          setError('دریافت پیام‌ها ممکن نشد؛ اتصال را بررسی کنید.');
          setLoading(false);
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(tick, 10000);
    };
    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [load]);
  async function send() {
    if (!draft.trim() || busy) return;
    const body = draft.trim();
    if (pending.current?.body !== body)
      pending.current = { body, clientId: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/support/${threadId || 'mine'}/messages`, {
        method: 'POST',
        body: pending.current,
      });
      pending.current = null;
      setDraft('');
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'ارسال ناموفق؛ دوباره تلاش کنید.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (!staff) {
    return (
      <section dir="rtl" className="support-modern flex min-h-0 flex-col">
        <div className="support-modern-notice flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-white/10 sm:px-6">
          <span className="text-xs text-slate-500 dark:text-slate-400">پیام‌ها در همین گفتگو ذخیره می‌شوند.</span>
          {thread?.status && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">{statusLabel[thread.status] ?? thread.status}</span>}
        </div>
        <div ref={messageListRef} role="log" aria-label="پیام‌های پشتیبانی" className="support-modern-messages min-h-0 overflow-y-auto px-4 py-5 sm:px-7">
          {loading ? <p className="py-12 text-center text-sm text-slate-500">در حال دریافت پیام‌ها…</p> : !messages.length ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-200">هنوز پیامی ثبت نشده است</p>
              <p className="mt-1 text-xs text-slate-500">اولین پیام خود را از کادر پایین ارسال کنید.</p>
            </div>
          ) : null}
          {messages.length === 100 && <p className="mb-4 text-center text-xs text-slate-500">۱۰۰ پیام آخر نمایش داده می‌شود.</p>}
        {messages.map((m, index) => {
          const mine = staff ? m.fromStaff : !m.fromStaff;
          const day = formatMessageDate(m.createdAt);
          const showDate = index === 0 || day !== formatMessageDate(messages[index - 1].createdAt);
          const previous = messages[index - 1];
          const showSender = showDate || !previous || previous.fromStaff !== m.fromStaff;
          return (
            <div key={m.id}>
              {showDate && <div className="support-chat-day" role="separator"><span>{day}</span></div>}
              <article className={`support-message-bubble ${mine ? 'support-message-own' : 'support-message-other'} ${m.fromStaff ? 'support-message-staff' : 'support-message-user'}`}>
                {showSender && <div className="support-message-sender">{m.fromStaff ? 'پشتیبان' : 'کاربر'}</div>}
                <p className="support-message-text whitespace-pre-wrap break-words text-sm">{m.body}</p>
                <time dateTime={m.createdAt} className="support-message-time" title={new Date(m.createdAt).toLocaleString('fa-IR')}>{formatMessageTime(m.createdAt)}</time>
              </article>
            </div>
          );
        })}
        </div>
        {error && <p role="alert" className="mx-5 my-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <form onSubmit={e => { e.preventDefault(); void send(); }} className="support-modern-compose border-t border-slate-100 bg-white/75 px-5 py-4 dark:border-white/10 dark:bg-slate-900/40 sm:px-6">
          <label htmlFor="support-message" className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">پیام جدید</label>
          <textarea
            id="support-message"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            disabled={busy}
            maxLength={2000}
            rows={2}
            placeholder="پیامتان را اینجا بنویسید…"
            className="support-modern-input block w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="max-w-[65%] text-[11px] leading-5 text-slate-400 dark:text-slate-500">رمز عبور، کد تأیید یا اطلاعات بانکی ارسال نکنید.</p>
            <button type="submit" disabled={busy || !draft.trim()} className="support-modern-send inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? 'در حال ارسال…' : 'ارسال پیام'}
            </button>
          </div>
        </form>
      </section>
    );
  }
  return (
    <section dir="rtl" className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {staff
          ? 'پاسخ شما در حساب کاربر نمایش داده می‌شود.'
          : 'پیام‌ها ذخیره می‌شوند؛ پاسخ فوری تضمین نمی‌شود. رمز، کد تأیید یا اطلاعات بانکی نفرستید.'}
      </p>
      {thread?.status && (
        <p className="text-sm font-bold">{statusLabel[thread.status]}</p>
      )}
      <div
        role="log"
        aria-label="پیام‌های پشتیبانی"
        className="max-h-[58dvh] min-h-56 space-y-3 overflow-y-auto rounded-2xl bg-gray-50 p-4 sm:p-5 dark:bg-gray-800"
      >
        {loading ? (
          <p>در حال دریافت پیام‌ها…</p>
        ) : (
          !messages.length && <p>هنوز پیامی ثبت نشده است.</p>
        )}
        {messages.length === 100 && <p>۱۰۰ پیام آخر نمایش داده می‌شود.</p>}
        {messages.map((m, index) => {
          const mine = staff ? m.fromStaff : !m.fromStaff;
          const day = formatMessageDate(m.createdAt);
          const showDate = index === 0 || day !== formatMessageDate(messages[index - 1].createdAt);
          const previous = messages[index - 1];
          const showSender = showDate || !previous || previous.fromStaff !== m.fromStaff;
          return (
            <div key={m.id}>
              {showDate && <div className="support-chat-day" role="separator"><span>{day}</span></div>}
              <article className={`support-message-bubble ${mine ? 'support-message-own' : 'support-message-other'} ${m.fromStaff ? 'support-message-staff' : 'support-message-user'}`}>
                {showSender && <div className="support-message-sender">{m.fromStaff ? 'پشتیبان' : 'کاربر'}</div>}
                <p className="support-message-text whitespace-pre-wrap break-words text-sm">{m.body}</p>
                <time dateTime={m.createdAt} className="support-message-time" title={new Date(m.createdAt).toLocaleString('fa-IR')}>{formatMessageTime(m.createdAt)}</time>
              </article>
            </div>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="space-y-2"
      >
        <label htmlFor="support-message" className="block text-sm">
          پیام به {staff ? 'کاربر' : 'پشتیبان'}
        </label>
        <textarea
          id="support-message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          maxLength={2000}
          rows={4}
          className="min-h-28 w-full resize-y rounded-2xl border border-violet-200 bg-white/70 p-4 text-sm leading-7 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 dark:border-violet-400/25 dark:bg-gray-800/70"
        />
        <button
          disabled={busy || !draft.trim()}
          className="ui-purple-gradient rounded-xl px-4 py-2 font-semibold text-white transition-[filter,box-shadow] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'در حال ارسال…' : 'ارسال پیام'}
        </button>
      </form>
    </section>
  );
}
