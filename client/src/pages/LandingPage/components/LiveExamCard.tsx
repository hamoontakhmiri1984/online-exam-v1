import { useState } from 'react';
import { CheckCircle2, Clock3, Sparkles } from 'lucide-react';

const options = ['useEffect', 'useState', 'useRef', 'useMemo'];

export default function LiveExamCard() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="glass-exam-preview relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/50 bg-white/70 shadow-2xl dark:border-white/10 dark:bg-slate-900/70">
      <div className="flex items-center justify-between border-b border-violet-500/10 px-5 py-4 dark:border-white/10">
        <span className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-200"><Sparkles size={16} className="text-violet-500" />پیش‌نمایش آزمون</span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-700 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />آماده اجرا</span>
      </div>
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">سؤال ۳ از ۱۰</span>
          <span className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300"><Clock3 size={14} /> ۰۰:۴۸</span>
        </div>
        <p className="mb-5 text-sm font-bold leading-8 text-gray-900 dark:text-white">کدام هوک برای مدیریت وضعیت محلی در React استفاده می‌شود؟</p>
        <div className="space-y-2.5">
          {options.map((option, index) => (
            <button key={option} type="button" aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={`glass-answer flex w-full items-center justify-between rounded-xl border px-4 py-3 text-right text-xs transition-colors duration-200 ${selected === index ? 'border-violet-400 bg-violet-500/10 text-violet-700 dark:text-violet-200' : 'border-gray-200/70 bg-white/45 text-gray-600 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}`}>
              {option}
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected === index ? 'border-violet-500 bg-violet-500 text-white' : 'border-gray-300 dark:border-slate-500'}`}>{selected === index && <CheckCircle2 size={12} />}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-violet-500/10"><div className="h-full w-3/10 rounded-full bg-linear-to-l from-violet-500 to-cyan-400" /></div>
        <p className="mt-3 text-[11px] text-gray-400 dark:text-slate-400">نمونه تعاملی • یک گزینه را انتخاب کنید</p>
      </div>
    </div>
  );
}
