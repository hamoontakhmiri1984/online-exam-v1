import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../Modal/Modal';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/apiClient';
function Assistant() {
  const [remote, setRemote] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<{ text: string; bot: boolean }[]>(
    [],
  );
  useEffect(() => {
    let active = true;
    apiRequest<{ remote: boolean }>('/support/assistant')
      .then((x) => {
        if (active) setRemote(x.remote);
      })
      .catch(() => {
        if (active) setError('راهنما فعلاً در دسترس نیست.');
      });
    return () => {
      active = false;
    };
  }, []);
  async function ask(text: string) {
    if (busy || remote === null || (remote && !consent) || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ answer: string; mode: string }>(
        '/support/assistant',
        { method: 'POST', body: { message: text.trim(), consent } },
      );
      setMessages((old) => [
        ...old.slice(-18),
        { text, bot: false },
        { text: result.answer, bot: true },
      ]);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'پاسخ دریافت نشد.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="support-assistant space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {remote
          ? 'دستیار هوش مصنوعی؛ پاسخ ممکن است اشتباه باشد. فقط متن سؤال شما و راهنمای عمومی سایت ارسال می‌شود.'
          : 'راهنمای رایگان موقت؛ پاسخ‌ها از راهنمای داخلی سایت هستند و مدل زبانی فعال نیست.'}{' '}
        رمز یا اطلاعات خصوصی نفرستید.
      </p>
      {remote && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          با ارسال متن سؤال به سرویس هوش مصنوعی موافقم.
        </label>
      )}
      <div className="support-suggestions flex flex-wrap gap-2">
        {['ثبت‌نام', 'کد تأیید', 'پرداخت', 'آزمون'].map((text) => (
          <button
            key={text}
            disabled={busy || remote === null || (remote && !consent)}
            onClick={() => void ask(text)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-violet-500/15"
          >
            {text}
          </button>
        ))}
      </div>
      <div
        role="log"
        aria-label="گفت‌وگو با راهنما"
        className="max-h-[35dvh] space-y-3 overflow-y-auto"
      >
        {messages.map((m, i) => (
          <div key={i} className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
            <p className="text-xs font-bold">{m.bot ? 'راهنما' : 'شما'}</p>
            <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="space-y-2"
      >
        <label htmlFor="assistant-question" className="block text-sm">
          سؤال شما
        </label>
        <textarea
          id="assistant-question"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          disabled={busy}
          className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800/70"
        />
        <button
          disabled={
            busy || !input.trim() || remote === null || (remote && !consent)
          }
          className="ui-primary-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:text-white dark:disabled:bg-slate-700"
        >
          {busy ? 'در حال پاسخ…' : 'پرسیدن سؤال'}
        </button>
      </form>
    </section>
  );
}
export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'assistant' | 'support'>('assistant');
  const { user, isSessionReady } = useAuth();
  return (
    <div dir="rtl">
      <button
        onClick={() => setOpen(true)}
        className="ui-primary-gradient fixed bottom-5 left-4 z-40 rounded-full px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-colors hover:bg-violet-700"
        aria-haspopup="dialog"
      >
        راهنما و پشتیبانی
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        label="راهنما و پشتیبانی"
      >
        <h2 className="mb-4 text-xl font-bold">چطور کمکتان کنیم؟</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {(['assistant', 'support'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${tab === t ? 'ui-primary-gradient border-violet-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {t === 'assistant' ? 'دستیار راهنما' : 'گفت‌وگو با پشتیبان'}
            </button>
          ))}
        </div>
        {tab === 'assistant' ? (
          <Assistant />
        ) : user && isSessionReady ? (
          <div className="rounded-2xl border border-violet-200/50 bg-violet-50/40 p-5 text-center dark:border-violet-400/20 dark:bg-violet-500/10">
            <p className="mb-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              هر درخواست پشتیبانی به‌صورت تیکت مستقل با کد رهگیری، درجه اهمیت و وضعیت ثبت می‌شود.
            </p>
            <Link to="/support" onClick={() => setOpen(false)} className="ui-primary-gradient inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white">
              مشاهده و ثبت تیکت‌ها
            </Link>
          </div>
        ) : (
          <p>
            برای ثبت و پیگیری امن پیام‌ها،{' '}
            <Link
              className="text-blue-700 underline dark:text-blue-300"
              to="/login"
            >
              وارد حساب شوید
            </Link>
            . پس از ورود از بخش پشتیبانی پیام بدهید.
          </p>
        )}
      </Modal>
    </div>
  );
}
