import { useEffect, useState } from 'react';
import {
  getQuestionBanks,
  getBankQuestionsPage,
  type QuestionBank,
} from '../../../api/questionBankApi';
import type { Question } from '../../../api/questionApi';
import usePagedList from '../../../hooks/usePagedList';
import Modal from './ExamQuestionDialog';
import ListPagination from '../../../components/ListPagination/ListPagination';
import Difficulty from '../../../components/QuestionDifficultyBadge/QuestionDifficultyBadge';

type Props = {
  existing: Question[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (ids: string[]) => Promise<unknown>;
};
export default function BankQuestionPicker({
  existing,
  busy,
  error,
  onClose,
  onConfirm,
}: Props) {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [bankId, setBankId] = useState('');
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankError, setBankError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const list = usePagedList(
    (query) => getBankQuestionsPage(bankId, query),
    bankId,
    !!bankId,
  );
  const existingIds = new Set(
    existing.map((q) => q.questionId).filter(Boolean),
  );
  useEffect(() => {
    let active = true;
    setLoadingBanks(true);
    setBankError('');
    getQuestionBanks()
      .then((items) => {
        if (active) setBanks(items);
      })
      .catch(() => {
        if (active) setBankError('دریافت بانک‌های سؤال ناموفق بود.');
      })
      .finally(() => {
        if (active) setLoadingBanks(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <Modal
      label="انتخاب از بانک سؤال"
      isOpen
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h2 className="text-lg font-bold dark:text-white">انتخاب از بانک سؤال</h2>
      <p className="my-3 text-sm leading-6 text-gray-500">
        سؤال‌ها به این آزمون کپی می‌شوند. ویرایش آن‌ها در آزمون، بانک را تغییر
        نمی‌دهد.
      </p>
      {loadingBanks ? (
        <p role="status">در حال دریافت بانک‌ها…</p>
      ) : bankError ? (
        <p role="alert">
          {bankError}{' '}
          <button onClick={() => setRevision((n) => n + 1)}>تلاش مجدد</button>
        </p>
      ) : banks.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800">
          هنوز بانک سؤال ندارید. برای ساخت آزمون نیازی به بانک نیست؛ از نوشتن
          سؤال یا ورود از اکسل استفاده کنید.
        </p>
      ) : (
        <label className="block text-sm dark:text-white">
          بانک سؤال
          <select
            value={bankId}
            disabled={busy}
            onChange={(event) => {
              setBankId(event.target.value);
              setSelected([]);
            }}
            className="my-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 [color-scheme:light] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"
          >
            <option value="" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">بانک را انتخاب کنید</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                {bank.name} ({bank.questionCount})
              </option>
            ))}
          </select>
        </label>
      )}
      {bankId && (
        <fieldset disabled={busy}>
          <ListPagination {...list} />
          {list.error && (
            <p role="alert">
              {list.error} <button onClick={list.reload}>تلاش مجدد</button>
            </p>
          )}
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {list.loading ? (
              <p role="status">در حال دریافت سؤال‌ها…</p>
            ) : !list.error && !list.items.length ? (
              <p>سؤالی پیدا نشد.</p>
            ) : (
              list.items.map((question) => {
                const added = existingIds.has(question.id);
                const checked = selected.includes(question.id);
                return (
                  <label
                    key={question.id}
                    className="flex gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700 dark:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={checked || added}
                      disabled={added || (!checked && selected.length >= 100)}
                      onChange={() =>
                        setSelected((ids) =>
                          checked
                            ? ids.filter((id) => id !== question.id)
                            : [...ids, question.id],
                        )
                      }
                    />
                    <span className="min-w-0 break-words">
                      {question.text}
                        <span className="my-2 block"><Difficulty difficulty={question.difficulty}/></span>
                        {question.usedInPractice && <span className="mb-2 block text-xs text-amber-700 dark:text-amber-300">قبلاً در تمرین منتشر شده؛ ممکن است کارآموز پاسخ را دیده باشد.</span>}
                      <span className="mt-1 block text-xs text-gray-500">
                        {added
                          ? 'قبلاً به آزمون اضافه شده'
                          : `پاسخ صحیح: ${question.options[question.correctOptionIndex]}`}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>
      )}
      <p className="my-3 text-xs text-gray-500">
        {selected.length.toLocaleString('fa-IR')} سؤال انتخاب شده • حداکثر ۱۰۰
        سؤال در هر بار
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger-600">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={onClose}
          className="rounded-xl border px-4 py-2 text-sm dark:text-white"
        >
          بازگشت
        </button>
        <button
          disabled={busy || !selected.length}
          onClick={async () => {
            if (await onConfirm(selected)) onClose();
          }}
          className="flex-1 rounded-xl bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy
            ? 'در حال افزودن…'
            : `افزودن ${selected.length.toLocaleString('fa-IR')} سؤال`}
        </button>
      </div>
    </Modal>
  );
}
