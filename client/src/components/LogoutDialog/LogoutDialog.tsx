import { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

type Props = { open: boolean; onCancel: () => void; onConfirm: () => void };

export default function LogoutDialog({ open, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    cancel.current?.focus();
    return () => {
      element.close();
      previous?.focus();
    };
  }, [open]);

  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onCancel(); }}
      aria-labelledby="logout-title" aria-describedby="logout-description"
      className="glass-logout-dialog fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border p-7 text-gray-900 backdrop:bg-slate-950/45 dark:text-white">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200/70 bg-violet-500/10 text-brand-ink dark:border-violet-300/20 dark:bg-violet-400/15"><LogOut size={22} aria-hidden="true" /></div>
      <h2 id="logout-title" className="text-lg font-bold">از حساب خارج می‌شوید؟</h2>
      <p id="logout-description" className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">برای استفاده دوباره از پنل، باید وارد حساب شوید.</p>
      <div className="mt-6 flex gap-3">
        <button ref={cancel} type="button" onClick={onCancel} className="glass-logout-cancel flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-violet-500">انصراف</button>
        <button type="button" onClick={onConfirm} className="glass-logout-confirm flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-violet-500">خروج از حساب</button>
      </div>
    </dialog>
  );
}
