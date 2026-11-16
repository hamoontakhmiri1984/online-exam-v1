import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, TimerOff, CheckCircle2, X, type LucideIcon } from 'lucide-react';

interface ToastProps {
  message: string;
  tone?: 'warning' | 'danger' | 'success';
  duration?: number;
  icon?: LucideIcon;
  onDismiss: () => void;
}

function ToastNotification({ message, tone = 'warning', duration = 3000, icon, onDismiss }: ToastProps) {
  const [show, setShow] = useState(false);
  const dismissed = useRef(false);
  const hasShown = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const lifetime = Number.isFinite(duration) ? Math.max(0, duration) : 3000;
  const exitDuration = 650;
  const progressDuration = Math.max(0, lifetime - exitDuration);
  const toneStyles = tone === 'danger' ? 'toast-danger' : tone === 'success' ? 'toast-success' : 'toast-warning';
  const Icon = icon ?? (tone === 'danger' ? TimerOff : tone === 'success' ? CheckCircle2 : AlertTriangle);

  useEffect(() => {
    // Add the 'show' class after the initial hidden frame so CSS transitions
    // handle both mounting and dismissing without JS-driven opacity changes.
    const frame = window.requestAnimationFrame(() => setShow(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (lifetime === 0) return;
    const timer = window.setTimeout(() => setShow(false), progressDuration);
    return () => window.clearTimeout(timer);
  }, [lifetime, progressDuration]);

  useEffect(() => {
    if (show) {
      hasShown.current = true;
      return;
    }
    if (!hasShown.current) return;
    const timer = window.setTimeout(() => {
      if (!dismissed.current) {
        dismissed.current = true;
        onDismissRef.current();
      }
    }, exitDuration);
    return () => window.clearTimeout(timer);
  }, [show]);

  return (
    <div
      className={`site-toast site-toast-css fixed bottom-6 left-4 right-4 z-50 overflow-hidden rounded-2xl text-sm font-semibold shadow-xl sm:left-6 sm:right-auto sm:w-[min(420px,calc(100%-3rem))] ${toneStyles} ${show ? 'show' : ''}`}
      dir="rtl"
    >
      <div className="flex items-start gap-2.5 px-4 py-3">
        {tone !== 'danger' && <Icon size={18} className="mt-1 shrink-0" aria-hidden="true" />}
        <p className="min-w-0 flex-1 break-words leading-6" role={tone === 'danger' ? 'alert' : 'status'}>{message}</p>
        <button
          type="button"
          aria-label="بستن اعلان"
          onClick={() => setShow(false)}
          disabled={!show}
          className="-mt-1 -me-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {lifetime > 0 && (
        <div className="site-toast-track toast-timer-track" aria-hidden="true">
          <div
            className="toast-timer-fill"
            style={{ animation: `toastTimerFill ${progressDuration}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
}

export default function Toast(props: ToastProps) {
  return <ToastNotification key={`${props.tone}:${props.duration}:${props.message}`} {...props} />;
}

/** Emit only after the server confirms a successful save. */
export function notifySaveSuccess(message = 'تغییرات با موفقیت ذخیره شد') {
  window.dispatchEvent(new CustomEvent<string>('app:save-success', { detail: message }));
}

/** Emit a save error for the global bottom-left notification. */
export function notifySaveError(message: string) {
  window.dispatchEvent(new CustomEvent<string>('app:save-error', { detail: message }));
}
