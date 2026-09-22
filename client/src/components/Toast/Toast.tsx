import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  TimerOff,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

interface ToastProps {
  message: string;
  tone?: 'warning' | 'danger' | 'success';
  duration?: number; // مدت نمایش قبل از محو شدن (میلی‌ثانیه)
  icon?: LucideIcon; // اگه ندی، بر اساس tone یه آیکون پیش‌فرض انتخاب می‌شه
  onDismiss: () => void;
}

function Toast({
  message,
  tone = 'warning',
  duration = 4500,
  icon,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showId = requestAnimationFrame(() => setVisible(true));
    const hideTimer = setTimeout(() => setVisible(false), duration);
    const removeTimer = setTimeout(onDismiss, duration + 300);

    return () => {
      cancelAnimationFrame(showId);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const toneStyles =
    tone === 'danger'
      ? 'bg-danger-600 shadow-danger-600/30'
      : tone === 'success'
      ? 'bg-success-600 shadow-success-600/30'
      : 'bg-accent-500 shadow-accent-500/30';

  const Icon =
    icon ??
    (tone === 'danger'
      ? TimerOff
      : tone === 'success'
      ? CheckCircle2
      : AlertTriangle);

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl transition-all duration-300 ${toneStyles} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <Icon size={18} className="shrink-0" />
      {message}
    </div>
  );
}

export default Toast;
