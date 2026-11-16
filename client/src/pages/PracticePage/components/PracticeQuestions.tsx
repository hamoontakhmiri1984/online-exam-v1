import Spinner from '../../../components/Spinner/Spinner';
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  getPracticeQuestions,
  type PracticeFilters,
  type PracticeQuestion,
} from "../../../api/practiceApi";
import usePagedList from "../../../hooks/usePagedList";
import ListPagination from "../../../components/ListPagination/ListPagination";
import Difficulty from "../../../components/QuestionDifficultyBadge/QuestionDifficultyBadge";
import PracticeAnswerCard from "./PracticeAnswerCard";
import PracticeHistory from "./PracticeHistory";
import { panel, primary, secondary } from "../practiceUi";
import UiSelect from "../../../components/UiSelect";
export default function PracticeQuestions({
  practiceId,
  learner,
}: {
  practiceId: string;
  learner: boolean;
}) {
  const [filters, setFilters] = useState<PracticeFilters>({ progress: "all" });
  const [selection, setSelection] = useState({ page: 1, index: 0 });
  const [history, setHistory] = useState<PracticeQuestion | null>(null);
  const list = usePagedList(
    (query) => getPracticeQuestions(practiceId, query, filters),
    JSON.stringify([practiceId, filters]),
  );
  const position = selection.page === list.page
    ? Math.max(0, Math.min(selection.index, list.items.length - 1))
    : 0;
  const active = list.items[position];
  const questionNumber = (list.page - 1) * list.pageSize + position + 1;

  function selectQuestion(page: number, index: number) {
    setSelection({ page, index });
    if (page !== list.page) list.setPage(page);
  }

  function moveQuestion(step: -1 | 1) {
    const index = position + step;
    if (index < 0) selectQuestion(list.page - 1, list.pageSize - 1);
    else if (index >= list.items.length) selectQuestion(list.page + 1, 0);
    else selectQuestion(list.page, index);
  }

  const navigation = (
    <nav
      aria-label="حرکت بین سؤال‌ها"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-violet-100 pt-4 dark:border-violet-400/20"
    >
      <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 sm:text-sm" aria-live="polite">
        سؤال {questionNumber.toLocaleString("fa-IR")} از {list.total.toLocaleString("fa-IR")}
      </span>
      <div className="ms-auto inline-flex items-center gap-2">
        <button
          type="button"
          aria-label="سؤال قبلی"
          className={`${secondary} min-h-11 px-2 text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:px-4`}
          disabled={questionNumber <= 1}
          onClick={() => moveQuestion(-1)}
        >
          <ArrowRight size={15} aria-hidden="true" />
          قبلی
        </button>
        <button
          type="button"
          aria-label="سؤال بعدی"
          className={`${primary} ui-primary-gradient min-h-11 px-2 sm:px-4`}
          disabled={questionNumber >= list.total}
          onClick={() => moveQuestion(1)}
        >
          بعدی
          <ArrowLeft size={15} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            سطح سؤال
            <UiSelect
              aria-label="سطح سؤال"
              className="mt-2 w-full"
              value={filters.difficulty ?? ""}
              onChange={(e) => {
                setSelection({ page: 1, index: 0 });
                setFilters((f) => ({
                  ...f,
                  difficulty:
                    (e.target.value as PracticeFilters["difficulty"]) ||
                    undefined,
                }));
              }}
            >
              <option value="">همهٔ سطح‌ها</option>
              <option value="Easy">آسان</option>
              <option value="Medium">متوسط</option>
              <option value="Hard">سخت</option>
            </UiSelect>
          </label>
          {learner && (
            <label className="text-sm">
              وضعیت تمرین
              <UiSelect
                aria-label="وضعیت تمرین"
                className="mt-2 w-full"
                value={filters.progress}
                onChange={(e) => {
                  setSelection({ page: 1, index: 0 });
                  setFilters((f) => ({
                    ...f,
                    progress: e.target.value as PracticeFilters["progress"],
                  }));
                }}
              >
                <option value="all">همهٔ سؤال‌ها</option>
                <option value="unanswered">هنوز پاسخ نداده‌ام</option>
                <option value="mistakes">قبلاً اشتباه پاسخ داده‌ام</option>
              </UiSelect>
            </label>
          )}
        </div>
        <ListPagination
          {...list}
          setPage={page => selectQuestion(page, 0)}
          setSearch={query => {
            setSelection({ page: 1, index: 0 });
            list.setSearch(query);
          }}
        />
      </section>
      {list.error ? (
        <div role="alert" className={panel}>
          {list.error}
          <button onClick={list.reload} className={secondary}>
            تلاش مجدد
          </button>
        </div>
      ) : list.loading ? (
        <Spinner label="در حال دریافت سؤال‌ها…" />
      ) : !active ? (
        <p className={`${panel} text-center`}>سؤالی با این فیلتر پیدا نشد.</p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <article className={`${panel} min-w-0`}>
            {learner ? (
              <PracticeAnswerCard
                key={active.id}
                practiceId={practiceId}
                question={active}
                onHistory={() => setHistory(active)}
                onSaved={(result) =>
                  list.patchItem({ ...active, stats: result.stats })
                }
              />
            ) : (
              <>
                <Difficulty difficulty={active.difficulty} />
                <h2 className="my-5 text-lg font-bold leading-8">
                  {active.text}
                </h2>
                <ol className="space-y-3">
                  {active.options.map((option, i) => (
                    <li
                      key={i}
                      className={`rounded-xl border p-3 text-sm ${i === active.correctOptionIndex ? "border-emerald-500 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700"}`}
                    >
                      {option}
                      {i === active.correctOptionIndex && " ✓ پاسخ صحیح"}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {navigation}
          </article>
          <aside className={panel}>
            <h2 className="mb-4 text-sm font-bold">سؤال‌های این صفحه</h2>
            <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
              {list.items.map((q, index) => (
                <button
                  key={q.id}
                  aria-label={`رفتن به سؤال ${q.position + 1}`}
                  aria-current={q.id === active.id ? "step" : undefined}
                  onClick={() => selectQuestion(list.page, index)}
                  className={`rounded-lg border py-2 text-sm ${q.id === active.id ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 dark:border-gray-700"}`}
                >
                  {(q.position + 1).toLocaleString("fa-IR")}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-gray-500">
              {learner
                ? "پاسخ‌ها پس از زدن «ثبت پاسخ» ذخیره می‌شوند. برای تکرار، «دوباره تمرین می‌کنم» را بزنید."
                : "این پیش‌نمایش مدرس است؛ پاسخ صحیح فقط برای شما نمایش داده می‌شود."}
            </p>
          </aside>
        </div>
      )}
      {history && (
        <PracticeHistory
          key={history.id}
          practiceId={practiceId}
          question={history}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  );
}
