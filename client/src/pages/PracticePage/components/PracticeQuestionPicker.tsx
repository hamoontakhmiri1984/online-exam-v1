import { useEffect, useState } from 'react';
import { Check, LibraryBig, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/Spinner/Spinner';
import UiSelect from '../../../components/UiSelect';
import {
  getBankQuestionsPage,
  type BankQuestion,
  type QuestionBank,
} from '../../../api/questionBankApi';
import usePagedList from '../../../hooks/usePagedList';
import ListPagination from '../../../components/ListPagination/ListPagination';
import { panel } from '../practiceUi';

export type PickedQuestion = Pick<BankQuestion, 'id' | 'text' | 'difficulty'>;

type Props = {
  banks: QuestionBank[];
  selected: PickedQuestion[];
  onChange: (items: PickedQuestion[]) => void;
  disabled: boolean;
};

export default function PracticeQuestionPicker({ banks, selected, onChange, disabled }: Props) {
  const [bankId, setBankId] = useState(banks[0]?.id ?? '');
  useEffect(() => {
    if (banks.length && !banks.some(bank => bank.id === bankId)) setBankId(banks[0].id);
  }, [banks, bankId]);

  const list = usePagedList(query => getBankQuestionsPage(bankId, query), bankId, !!bankId);
  const selectedIds = new Set(selected.map(question => question.id));

  function toggle(question: BankQuestion) {
    if (disabled) return;
    if (selectedIds.has(question.id)) {
      onChange(selected.filter(item => item.id !== question.id));
    } else if (selected.length < 100) {
      onChange([...selected, { id: question.id, text: question.text, difficulty: question.difficulty }]);
    }
  }

  return (
    <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><LibraryBig size={18} className="text-violet-600" /> سؤال‌های تمرین</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">بانک را انتخاب کنید و روی سؤال‌های موردنظر تیک بزنید.</p>
        </div>
        <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          {selected.length.toLocaleString('fa-IR')} سؤال انتخاب شده
        </span>
      </div>

      {!banks.length ? (
        <div className="rounded-xl border border-dashed border-violet-200 px-4 py-7 text-center text-sm text-slate-500 dark:border-violet-400/20">
          <p>هنوز بانک سؤال ندارید.</p>
          <Link className="mt-3 inline-block font-semibold text-violet-600 underline dark:text-violet-300" to="/question-banks">رفتن به بانک سؤال</Link>
        </div>
      ) : (
        <>
          <label className="block max-w-md text-sm font-semibold text-slate-700 dark:text-slate-200">
            بانک سؤال
            <UiSelect className="mt-2 w-full" aria-label="بانک سؤال" value={bankId} onChange={event => setBankId(event.target.value)}>
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
                      <input type="checkbox" checked={checked} disabled={disabled || (!checked && selected.length >= 100)}
                        onChange={() => toggle(question)} className="mt-1 h-4 w-4 shrink-0 accent-violet-600" />
                      <span className="min-w-0 flex-1 break-words text-sm leading-6 text-slate-700 dark:text-slate-200">{question.text}</span>
                      {checked && <Check size={16} aria-hidden="true" className="mt-1 shrink-0 text-violet-600" />}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <details className="group rounded-xl border border-violet-200/70 bg-violet-50/40 p-3 dark:border-violet-400/20 dark:bg-violet-500/5">
              <summary className="cursor-pointer text-sm font-semibold text-violet-700 dark:text-violet-200">
                مشاهده {selected.length.toLocaleString('fa-IR')} سؤال انتخاب‌شده
                <span className="mr-2 text-xs font-normal text-slate-500">(برای حذف سؤال، فهرست را باز کنید)</span>
              </summary>
              <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {selected.map((question, index) => (
                  <li key={question.id} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-800">
                    <span className="min-w-0 flex-1 break-words">{(index + 1).toLocaleString('fa-IR')}. {question.text}</span>
                    <button type="button" disabled={disabled} aria-label={`حذف سؤال ${index + 1} از انتخاب`}
                      onClick={() => onChange(selected.filter(item => item.id !== question.id))}
                      className="rounded-md p-1 text-rose-500 hover:bg-rose-50 disabled:opacity-40"><X size={15} /></button>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}
