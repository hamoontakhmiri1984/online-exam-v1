import { useState } from "react";
import {
  getBankQuestionsPage,
  type BankQuestion,
  type QuestionBank,
} from "../../../api/questionBankApi";
import usePagedList from "../../../hooks/usePagedList";
import ListPagination from "../../../components/ListPagination/ListPagination";
import Difficulty from "../../../components/QuestionDifficultyBadge/QuestionDifficultyBadge";
import { input, panel } from "../practiceUi";
export type PickedQuestion = Pick<BankQuestion, "id" | "text" | "difficulty">;
type Props = {
  banks: QuestionBank[];
  selected: PickedQuestion[];
  onChange: (items: PickedQuestion[]) => void;
  disabled: boolean;
};
export default function PracticeQuestionPicker({
  banks,
  selected,
  onChange,
  disabled,
}: Props) {
  const [bankId, setBankId] = useState(banks[0]?.id ?? "");
  const list = usePagedList(
    (query) => getBankQuestionsPage(bankId, query),
    bankId,
    !!bankId,
  );
  const ids = new Set(selected.map((q) => q.id));
  return (
    <section className={panel}>
      <h2 className="mb-2 text-lg font-bold">۲. انتخاب سؤال‌ها</h2>
      <p className="mb-5 text-sm text-gray-500">
        حداکثر ۱۰۰ سؤال از بانک‌های خود انتخاب کنید؛ انتخاب‌ها هنگام جابه‌جایی
        بین بانک‌ها باقی می‌مانند.
      </p>
      {!banks.length ? (
        <p>ابتدا در بخش «بانک سؤال» سؤال بسازید یا فایل اکسل وارد کنید.</p>
      ) : (
        <fieldset
          disabled={disabled}
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]"
        >
          <div className="min-w-0">
            <label className="mb-4 block text-sm">
              بانک سؤال
              <select
                className={`${input} mt-2`}
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
              >
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </label>
            <ListPagination {...list} />
            {list.error ? (
              <p role="alert">
                {list.error}
                <button
                  type="button"
                  onClick={list.reload}
                  className="mr-2 underline"
                >
                  تلاش مجدد
                </button>
              </p>
            ) : list.loading ? (
              <p role="status">در حال دریافت سؤال‌ها…</p>
            ) : !list.items.length ? (
              <p>سؤالی پیدا نشد.</p>
            ) : (
              <div className="max-h-[32rem] space-y-3 overflow-y-auto">
                {list.items.map((q) => (
                  <label
                    key={q.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${ids.has(q.id) ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-gray-200 dark:border-gray-700"}`}
                  >
                    <input
                      type="checkbox"
                      checked={ids.has(q.id)}
                      disabled={!ids.has(q.id) && selected.length >= 100}
                      onChange={() =>
                        onChange(
                          ids.has(q.id)
                            ? selected.filter((item) => item.id !== q.id)
                            : [
                                ...selected,
                                {
                                  id: q.id,
                                  text: q.text,
                                  difficulty: q.difficulty,
                                },
                              ],
                        )
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <span className="min-w-0">
                      <span className="mb-2 block break-words text-sm leading-7">
                        {q.text}
                      </span>
                      <Difficulty difficulty={q.difficulty} />
                      <span className="mt-2 block text-xs text-gray-500">
                        پاسخ صحیح: {q.options[q.correctOptionIndex]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <aside className="rounded-xl bg-gray-50 p-4 dark:bg-gray-950">
            <h3 className="font-bold">
              انتخاب‌شده‌ها ({selected.length.toLocaleString("fa-IR")})
            </h3>
            <p className="my-3 text-xs leading-6 text-gray-500">
              ترتیب این فهرست، ترتیب سؤال‌های تمرین است.
            </p>
            <ol className="max-h-[32rem] space-y-3 overflow-y-auto">
              {selected.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 text-sm">
                  <span className="min-w-0 flex-1 break-words">
                    {(i + 1).toLocaleString("fa-IR")}. {q.text}
                  </span>
                  <button
                    type="button"
                    aria-label={`حذف سؤال ${i + 1} از انتخاب`}
                    onClick={() =>
                      onChange(selected.filter((item) => item.id !== q.id))
                    }
                    className="px-2 text-gray-500"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </fieldset>
      )}
    </section>
  );
}
