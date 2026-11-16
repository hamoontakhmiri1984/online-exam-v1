import { useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import {
  getRandomPracticeQuestions,
  type RandomPracticeCounts,
  type RandomPracticeQuestion,
} from '../../../api/practiceApi';
import type { QuestionBank } from '../../../api/questionBankApi';
import { difficultyLabels } from '../../../components/QuestionDifficultyBadge/QuestionDifficultyBadge';
import { ApiError } from '../../../lib/apiClient';
import { input, primary } from '../practiceUi';

const levels = ['Easy', 'Medium', 'Hard'] as const;

type Props = {
  banks: QuestionBank[];
  selectedIds: string[];
  disabled: boolean;
  busy: boolean;
  onSamplingChange: (busy: boolean) => void;
  onAdd: (questions: RandomPracticeQuestion[]) => void;
};

export default function PracticeRandomSelection({
  banks, selectedIds, disabled, busy, onSamplingChange, onAdd,
}: Props) {
  const [bankIds, setBankIds] = useState(() => banks.length ? [banks[0].id] : []);
  const [counts, setCounts] = useState<RandomPracticeCounts>({ Easy: 0, Medium: 0, Hard: 0 });
  const [error, setError] = useState('');
  const [added, setAdded] = useState(0);
  const pending = useRef(false);
  const total = levels.reduce((sum, level) => sum + counts[level], 0);

  async function sample() {
    if (pending.current || disabled) return;
    setAdded(0);
    if (!bankIds.length || !total) {
      setError('حداقل یک بانک و تعداد سؤال موردنظر را انتخاب کنید.');
      return;
    }
    if (levels.some(level => !Number.isInteger(counts[level]) || counts[level] < 0) || total + selectedIds.length > 100) {
      setError('تعداد هر سطح باید عدد صحیح و نامنفی باشد. حداکثر ۱۰۰ سؤال در هر تمرین مجاز است.');
      return;
    }
    pending.current = true;
    onSamplingChange(true);
    setError('');
    try {
      const questions = await getRandomPracticeQuestions({ bankIds, counts, excludeQuestionIds: selectedIds });
      onAdd(questions);
      setAdded(questions.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'انتخاب تصادفی انجام نشد. دوباره تلاش کنید.');
    } finally {
      pending.current = false;
      onSamplingChange(false);
    }
  }

  return (
    <details className="rounded-xl border border-violet-200 p-4 dark:border-violet-400/25">
      <summary className="cursor-pointer text-sm font-semibold text-brand-ink">انتخاب تصادفی از چند بانک</summary>
      <fieldset disabled={disabled || busy} className="mt-3 space-y-3">
        <legend className="sr-only">انتخاب تصادفی سؤال‌ها</legend>
        <p className="text-sm">بانک‌های سؤال برای انتخاب تصادفی</p>
        <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
          {banks.map(bank => (
            <label key={bank.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700">
              <input type="checkbox" checked={bankIds.includes(bank.id)} className="mt-1 shrink-0"
                onChange={() => setBankIds(ids => ids.includes(bank.id) ? ids.filter(id => id !== bank.id) : [...ids, bank.id])} />
              <span className="min-w-0 break-words">{bank.name}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {levels.map(level => (
            <label key={level} className="min-w-0 text-sm">
              {difficultyLabels[level]}
              <input type="number" min={0} max={100} step={1} value={counts[level]} className={`${input} mt-1 px-2`}
                onChange={event => setCounts(previous => ({ ...previous, [level]: Number(event.target.value) }))} />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primary} onClick={sample}>
            <Shuffle size={16} aria-hidden="true" />
            {busy ? 'در حال انتخاب…' : 'افزودن سؤال‌های تصادفی'}
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300">{total.toLocaleString('fa-IR')} سؤال درخواستی</span>
        </div>
        {error && <p role="alert" className="form-inline-error">{error}</p>}
        {added > 0 && <p role="status" className="text-sm text-brand-ink">{added.toLocaleString('fa-IR')} سؤال به تمرین اضافه شد.</p>}
      </fieldset>
    </details>
  );
}
