import {
  getPracticeHistory,
  type PracticeQuestion,
} from "../../../api/practiceApi";
import usePagedList from "../../../hooks/usePagedList";
import Dialog from "../../QuestionsPage/components/ExamQuestionDialog";
import { secondary } from "../practiceUi";
export default function PracticeHistory({
  practiceId,
  question,
  onClose,
}: {
  practiceId: string;
  question: PracticeQuestion;
  onClose: () => void;
}) {
  const list = usePagedList(
    (query) => getPracticeHistory(practiceId, question.id, query),
    question.id,
  );
  return (
    <Dialog label="سابقهٔ پاسخ‌ها" isOpen onClose={onClose}>
      <h2 className="text-lg font-bold">سابقهٔ پاسخ‌های شما</h2>
      <p className="my-4 break-words text-sm leading-7 text-gray-500">
        {question.text}
      </p>
      {list.error ? (
        <p role="alert">
          {list.error}
          <button onClick={list.reload} className={secondary}>
            تلاش مجدد
          </button>
        </p>
      ) : list.loading ? (
        <p role="status">در حال دریافت سابقه…</p>
      ) : (
        <ol className="space-y-3">
          {list.items.map((attempt) => (
            <li
              key={attempt.id}
              className="rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-700"
            >
              <span
                className={
                  attempt.isCorrect
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }
              >
                {attempt.isCorrect ? "✓ درست" : "✕ غلط"}
              </span>
              <p className="my-2 break-words">
                پاسخ شما: {question.options[attempt.selectedOptionIndex]}
              </p>
              <time
                className="text-xs text-gray-500"
                dateTime={attempt.createdAt}
              >
                {new Date(attempt.createdAt).toLocaleString("fa-IR")}
              </time>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          className={secondary}
          disabled={list.loading || list.page === 1}
          onClick={() => list.setPage(list.page - 1)}
        >
          قبلی
        </button>
        <span className="text-xs">
          {list.total.toLocaleString("fa-IR")} پاسخ
        </span>
        <button
          className={secondary}
          disabled={list.loading || list.page * list.pageSize >= list.total}
          onClick={() => list.setPage(list.page + 1)}
        >
          بعدی
        </button>
      </div>
    </Dialog>
  );
}
