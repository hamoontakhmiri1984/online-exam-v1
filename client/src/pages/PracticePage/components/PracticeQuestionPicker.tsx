import { useEffect, useState } from 'react';
import { Check, LibraryBig, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner/Spinner';
import QuestionDifficultyBadge from '../../../components/QuestionDifficultyBadge/QuestionDifficultyBadge';
import PracticeRandomSelection from './PracticeRandomSelection';
import UiSelect from '../../../components/UiSelect';
import {
  getBankQuestionsPage,
  type BankQuestion,
  type QuestionBank,
} from '../../../api/questionBankApi';
import usePagedList from '../../../hooks/usePagedList';
import ListPagination from '../../../components/ListPagination/ListPagination';
import { panel } from '../practiceUi';

export type PickedQuestion = Pick<BankQuestion, 'id' | 'text' | 'difficulty'> & { bankId?: string };

type Props = {
  banks: QuestionBank[];
  selected: PickedQuestion[];
  onChange: (items: PickedQuestion[]) => void;
  sampling: boolean;
  onSamplingChange: (busy: boolean) => void;
  disabled: boolean;
};

export default function PracticeQuestionPicker({ banks, selected, onChange, sampling, onSamplingChange, disabled }: Props) {
  const [bankId, setBankId] = useState(banks[0]?.id ?? '');
  useEffect(() => {
    if (banks.length && !banks.some(bank => bank.id === bankId)) setBankId(banks[0].id);
  }, [banks, bankId]);

  const list = usePagedList(query => getBankQuestionsPage(bankId, query), bankId, !!bankId);
  const selectedIds = new Set(selected.map(question => question.id));
  const bankNames = new Map(banks.map(bank => [bank.id, bank.name]));

  function toggle(question: BankQuestion) {
    if (disabled || sampling) return;
    if (selectedIds.has(question.id)) {
      onChange(selected.filter(item => item.id !== question.id));
    } else if (selected.length < 100) {
      onChange([...selected, { id: question.id, text: question.text, difficulty: question.difficulty, bankId: question.bankId }]);
    }
  }

  return (
    <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><LibraryBig size={18} className="text-brand-ink" /> سؤال‌های تمرین</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">برای انتخاب دستی، بانک‌ها را یکی‌یکی مرور کنید. انتخاب‌ها با عوض کردن بانک باقی می‌مانند.</p>
        </div>
        <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-brand-ink dark:bg-violet-500/20">
          {selected.length.toLocaleString('fa-IR')} سؤال انتخاب شده
        </span>
      </div>

      {!banks.length ? (
        <div className="rounded-xl border border-dashed border-violet-200 px-4 py-7 text-center text-sm text-slate-500 dark:border-violet-400/20">
          <p>هنوز بانک سؤال ندارید.</p>
          <Link className="mt-3 inline-block font-semibold text-brand-ink underline" to="/question-banks">رفتن به بانک سؤال</Link>
        </div>
      ) : (
        <>
          <PracticeRandomSelection
            banks={banks}
            selectedIds={[...selectedIds]}
            disabled={disabled}
            busy={sampling}
            onSamplingChange={onSamplingChange}
            onAdd={questions => onChange([...selected, ...questions])}
          />
          <label className="block max-w-md text-sm font-semibold text-slate-700 dark:text-slate-200">
            بانک سؤال
            <UiSelect className="mt-2 w-full" aria-label="بانک سؤال" disabled={disabled || sampling} value={bankId} onChange={event => setBankId(event.target.value)}>
              {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
            </UiSelect>
          </label>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <ListPagination {...list} />
            {list.error ? (
              <div role="alert" className="py-4 text-sm text-rose-600">
                {list.error} <button type="button" className="mr-2 underline" onClick={list.reload}>تلاش مجدد</button>
              </div>
            ) : list.loading ? (
              <Spinner label="در حال دریافت سؤال‌ها…" compact />
            ) : !list.items.length ? (
              <p className="py-6 text-center text-sm text-slate-500">در این بانک سؤالی پیدا نشد.</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {list.items.map(question => {
                  const checked = selectedIds.has(question.id);
                  return (
                    <label key={question.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${checked ? 'border-violet-400 bg-violet-50 dark:border-violet-400/40 dark:bg-violet-500/10' : 'border-slate-200 hover:border-violet-300 dark:border-slate-700'}`}>
                      <input type="checkbox" checked={checked} disabled={disabled || sampling || (!checked && selected.length >= 100)}
                        onChange={() => toggle(question)} className="mt-1 h-4 w-4 shrink-0 accent-violet-600" />
                      <span className="min-w-0 flex-1 break-words text-sm leading-6 text-slate-700 dark:text-slate-200">{question.text}</span>
                      <QuestionDifficultyBadge difficulty={question.difficulty} />
                      {checked && <Check size={16} aria-hidden="true" className="mt-1 shrink-0 text-brand-ink" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      {selected.length > 0 && (
        <details className="rounded-xl border border-violet-200/70 bg-violet-50/40 p-3 dark:border-violet-400/20 dark:bg-violet-500/5">
          <summary className="cursor-pointer text-sm font-semibold text-brand-ink">
            مشاهده {selected.length.toLocaleString('fa-IR')} سؤال انتخاب‌شده
          </summary>
          <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {selected.map((question, index) => (
              <li key={question.id} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-800">
                <div className="min-w-0 flex-1 break-words">
                  {(index + 1).toLocaleString('fa-IR')}. {question.text}
                  {question.bankId && <span className="block text-xs text-slate-500 dark:text-slate-400">{bankNames.get(question.bankId)}</span>}
                </div>
                <QuestionDifficultyBadge difficulty={question.difficulty} />
                <button type="button" disabled={disabled || sampling} aria-label={`حذف سؤال ${index + 1} از انتخاب`}
                  onClick={() => onChange(selected.filter(item => item.id !== question.id))}
                  className="rounded-md p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-300 dark:hover:bg-rose-950">
                  <X size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
