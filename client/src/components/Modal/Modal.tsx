import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
  wide?: boolean;
};

// Backdrop clicks must not discard an unfinished form.
function Modal({ isOpen, onClose, children, label = 'پنجرهٔ گفتگو', wide = false }: ModalProps) {
  const container = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(container.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0);
    (focusable()[0] ?? container.current)?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); container.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={container}
      tabIndex={-1}
      aria-label={label}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
    >
      <div className={`w-full min-w-0 max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto rounded-2xl border border-violet-200/30 bg-white p-5 shadow-2xl dark:border-violet-400/15 dark:bg-gray-900 sm:p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-200/60 text-slate-400 outline-none transition hover:bg-violet-50 hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-violet-400 dark:border-violet-400/20 dark:hover:bg-violet-500/10"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
