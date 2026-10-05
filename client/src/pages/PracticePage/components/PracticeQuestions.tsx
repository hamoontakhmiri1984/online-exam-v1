import { useState } from "react";
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
import { input, panel, secondary } from "../practiceUi";
export default function PracticeQuestions({
  practiceId,
  learner,
}: {
  practiceId: string;
  learner: boolean;
}) {
  const [filters, setFilters] = useState<PracticeFilters>({ progress: "all" });
  const [activeId, setActiveId] = useState("");
  const [history, setHistory] = useState<PracticeQuestion | null>(null);
  const list = usePagedList(
    (query) => getPracticeQuestions(practiceId, query, filters),
    JSON.stringify([practiceId, filters]),
  );
  const active = list.items.find((q) => q.id === activeId) ?? list.items[0];
  const position = list.items.findIndex((q) => q.id === active?.id);
  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            سطح سؤال
            <select
              aria-label="سطح سؤال"
              className={`${input} mt-2`}
              value={filters.difficulty ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  difficulty:
                    (e.target.value as PracticeFilters["difficulty"]) ||
                    undefined,
                }))
              }
            >
              <option value="">همهٔ سطح‌ها</option>
              <option value="Easy">آسان</option>
              <option value="Medium">متوسط</option>
              <option value="Hard">سخت</option>
            </select>
          </label>
          {learner && (
            <label className="text-sm">
              وضعیت تمرین
              <select
                aria-label="وضعیت تمرین"
                className={`${input} mt-2`}
                value={filters.progress}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    progress: e.target.value as PracticeFilters["progress"],
                  }))
                }
              >
                <option value="all">همهٔ سؤال‌ها</option>
                <option value="unanswered">هنوز پاسخ نداده‌ام</option>
                <option value="mistakes">قبلاً اشتباه پاسخ داده‌ام</option>
              </select>
            </label>
          )}
        </div>
        <ListPagination {...list} />
      </section>
      {list.error ? (
        <div role="alert" className={panel}>
          {list.error}
          <button onClick={list.reload} className={secondary}>
            تلاش مجدد
          </button>
        </div>
      ) : list.loading ? (
        <p role="status" className="p-8 text-center">
          در حال دریافت سؤال‌ها…
        </p>
      ) : !active ? (
        <p className={`${panel} text-center`}>سؤالی با این فیلتر پیدا نشد.</p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 space-y-4">
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
              <article className={panel}>
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
              </article>
            )}
            <nav
              aria-label="حرکت بین سؤال‌ها"
              className="flex justify-between gap-3"
            >
              <button
                className={secondary}
                disabled={position <= 0}
                onClick={() => setActiveId(list.items[position - 1].id)}
              >
                سؤال قبلی
              </button>
              <button
                className={secondary}
                disabled={position >= list.items.length - 1}
                onClick={() => setActiveId(list.items[position + 1].id)}
              >
                سؤال بعدی
              </button>
            </nav>
          </div>
          <aside className={panel}>
            <h2 className="mb-4 text-sm font-bold">سؤال‌های این صفحه</h2>
            <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
              {list.items.map((q) => (
                <button
                  key={q.id}
                  aria-label={`رفتن به سؤال ${q.position + 1}`}
                  aria-current={q.id === active.id ? "step" : undefined}
                  onClick={() => setActiveId(q.id)}
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
