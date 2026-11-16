import { useLayoutEffect, useRef, useState } from 'react';
import { Clock3, ChevronDown } from 'lucide-react';
import UiSelect from '../UiSelect';

type Props = { value: string; onChange: (value: string) => void; invalid?: boolean };
const pad = (value: number) => String(value).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

export default function TimePicker({ value, onChange, invalid = false }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'24' | '12'>('24');
  const triggerRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function positionPopup() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(mode === '12' ? 304 : 260, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const popupHeight = 190;
      const fitsBelow = window.innerHeight - rect.bottom >= popupHeight + 12;
      const top = fitsBelow ? rect.bottom + 8 : Math.max(12, rect.top - popupHeight - 8);
      setPopupPosition({ top, left, width });
    }
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    positionPopup();
    window.addEventListener('resize', positionPopup);
    window.addEventListener('scroll', positionPopup, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', positionPopup);
      window.removeEventListener('scroll', positionPopup, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, mode]);
  const parsed = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(value);
  const hour = parsed ? Number(parsed[1]) : 0;
  const minute = parsed ? parsed[2] : '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = pad(hour % 12 || 12);


  function setHour(next: string) {
    const converted = mode === '24' ? Number(next) : Number(next) % 12 + (period === 'PM' ? 12 : 0);
    onChange(`${pad(converted)}:${minute}`);
  }

  return (
    <div className="relative min-w-0" ref={triggerRef}>
      <div className={`flex min-h-11 items-center gap-2 rounded-xl border bg-gray-50 px-3 dark:bg-gray-700 ${invalid ? 'border-rose-500' : 'border-gray-200 dark:border-gray-600'}`}>
        <button type="button" aria-label="انتخاب ساعت و دقیقه" aria-expanded={open} onClick={() => setOpen(v => !v)} className="shrink-0 rounded-lg p-1 text-violet-600 hover:bg-violet-100 dark:text-violet-300">
          <Clock3 size={18}/><ChevronDown size={12} className="mx-auto"/>
        </button>
        <input
          type="text"
          dir="ltr"
          aria-label="ساعت برگزاری به صورت HH:mm"
          aria-invalid={invalid}
          inputMode="numeric"
          placeholder="14:30"
          value={value}
          maxLength={5}
          onChange={e => onChange(e.target.value.replace(/[^0-9:]/g, '').slice(0,5))}
          className="min-w-0 w-full bg-transparent py-2 text-center text-sm tabular-nums text-gray-800 outline-none dark:text-white"
        />
      </div>
      {open && (
        <div style={popupPosition ?? { top: -9999, left: 0, width: 304 }} className="fixed z-[100] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-violet-200/70 bg-white p-2.5 shadow-xl shadow-violet-600/10 dark:border-violet-400/30 dark:bg-gray-900">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">انتخاب زمان</span>
            <div className="inline-flex rounded-lg bg-violet-50 p-1 dark:bg-violet-500/10" role="group" aria-label="قالب ساعت">
              <button type="button" onClick={() => setMode('24')} aria-pressed={mode === '24'} className={`rounded-md px-2 py-1 text-xs ${mode === '24' ? 'bg-violet-600 text-white' : 'text-violet-700 dark:text-violet-200'}`}>۲۴ ساعته</button>
              <button type="button" onClick={() => setMode('12')} aria-pressed={mode === '12'} className={`rounded-md px-2 py-1 text-xs ${mode === '12' ? 'bg-violet-600 text-white' : 'text-violet-700 dark:text-violet-200'}`}>۱۲ ساعته</button>
            </div>
          </div>
          <div className={`grid min-w-0 items-center gap-1.5 ${mode === '12' ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}`} dir="ltr">
            <UiSelect aria-label="ساعت" value={mode === '24' ? pad(hour) : twelveHour} onChange={e => setHour(e.target.value)} className="min-w-0 [&_.ui-select-trigger]:!px-2 [&_.ui-select-trigger]:!bg-sky-50/80 dark:[&_.ui-select-trigger]:!bg-sky-950/30">
              {(mode === '24' ? HOURS : HOURS.slice(1,13)).map(h => <option value={h} key={h}>{h}</option>)}
            </UiSelect>
            <UiSelect aria-label="دقیقه" value={minute} onChange={e => onChange(`${pad(hour)}:${e.target.value}`)} className="min-w-0 [&_.ui-select-trigger]:!px-2 [&_.ui-select-trigger]:!bg-sky-50/80 dark:[&_.ui-select-trigger]:!bg-sky-950/30">
              {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
            </UiSelect>
            {mode === '12' && <UiSelect aria-label="قبل یا بعد از ظهر" value={period} onChange={e => onChange(`${pad((hour % 12) + (e.target.value === 'PM' ? 12 : 0))}:${minute}`)} className="min-w-0 [&_.ui-select-trigger]:!px-2 [&_.ui-select-trigger]:!bg-sky-50/80 dark:[&_.ui-select-trigger]:!bg-sky-950/30">
              <option value="AM">AM</option><option value="PM">PM</option>
            </UiSelect>}
          </div>
          <button type="button" onClick={() => { if (!parsed) onChange('09:00'); setOpen(false); }} className="ui-primary-gradient mt-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold">تأیید زمان</button>
        </div>
      )}
    </div>
  );
}
