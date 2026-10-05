import type {
  PracticeAnswer,
  PracticeQuestion,
} from "../../../api/practiceApi";
import Difficulty from "../../../components/QuestionDifficultyBadge/QuestionDifficultyBadge";
import usePracticeAnswer from "../usePracticeAnswer";
import { panel, primary, secondary } from "../practiceUi";
type Props = {
  practiceId: string;
  question: PracticeQuestion;
  onSaved: (answer: PracticeAnswer) => void;
  onHistory: () => void;
};
export default function PracticeAnswerCard({
  practiceId,
  question,
  onSaved,
  onHistory,
}: Props) {
  const answer = usePracticeAnswer(
    practiceId,
    question.id,
    question.options.length,
    onSaved,
  );
  const stats = question.stats;
  return (
    <article className={panel}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-500">
          سؤال {(question.position + 1).toLocaleString("fa-IR")}
        </span>
        <Difficulty difficulty={question.difficulty} />
      </div>
      <h2 className="whitespace-pre-wrap break-words text-lg font-bold leading-9">
        {question.text}
      </h2>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void answer.submit();
        }}
      >
        <fieldset
          disabled={answer.busy || !!answer.feedback || answer.uncertain}
          className="space-y-3"
        >
          <legend className="sr-only">گزینهٔ پاسخ</legend>
          {question.options.map((option, index) => {
            const correct = answer.feedback?.correctOptionIndex === index;
            const wrong =
              !!answer.feedback &&
              answer.feedback.selectedOptionIndex === index &&
              !answer.feedback.isCorrect;
            return (
              <label
                key={index}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${correct ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : wrong ? "border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200" : answer.selected === index ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40" : "border-gray-200 hover:border-brand-300 dark:border-gray-700"}`}
              >
                <input
                  type="radio"
                  name={`answer-${question.id}`}
                  checked={answer.selected === index}
                  onChange={() => answer.setSelected(index)}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                />
                <span className="min-w-0 break-words text-sm leading-7">
                  {option}
                  {correct && (
                    <strong className="mr-2 text-xs">✓ پاسخ صحیح</strong>
                  )}
                  {wrong && <strong className="mr-2 text-xs">پاسخ شما</strong>}
                </span>
              </label>
            );
          })}
        </fieldset>
        {answer.error && (
          <p
            role="alert"
            className="mt-4 text-sm text-rose-600 dark:text-rose-300"
          >
            {answer.error}
          </p>
        )}
        {answer.uncertain && (
          <p className="mt-3 text-sm leading-7 text-amber-700 dark:text-amber-300">
            ثبت قبلی نیاز به بررسی دارد؛ «تلاش مجدد» همان پاسخ را پیگیری می‌کند
            و تلاش اضافه‌ای نمی‌سازد.
          </p>
        )}
        {answer.feedback ? (
          <div
            role="status"
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
          >
            <p
              className={
                answer.feedback.isCorrect
                  ? "font-bold text-emerald-700 dark:text-emerald-300"
                  : "font-bold text-rose-700 dark:text-rose-300"
              }
            >
              {answer.feedback.isCorrect
                ? "درست پاسخ دادید!"
                : "این پاسخ درست نبود؛ گزینهٔ صحیح مشخص شد."}
            </p>
            <button type="button" onClick={answer.repeat} className={secondary}>
              دوباره تمرین می‌کنم
            </button>
          </div>
        ) : (
          <button
            disabled={answer.busy || answer.selected === null}
            className={`${primary} mt-5 w-full sm:w-auto`}
          >
            {answer.busy
              ? "در حال ثبت…"
              : answer.uncertain
                ? "تلاش مجدد ثبت پاسخ"
                : "ثبت پاسخ و دیدن نتیجه"}
          </button>
        )}
      </form>
      <footer className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
        <h3 className="text-sm font-medium">سابقهٔ شما در این تمرین</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          {[
            ["دفعات پاسخ", stats?.attempts ?? 0],
            ["درست", stats?.correct ?? 0],
            ["غلط", stats?.incorrect ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-gray-50 p-3 dark:bg-gray-950"
            >
              <strong className="block text-lg">
                {Number(value).toLocaleString("fa-IR")}
              </strong>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
        {stats?.lastAttemptAt && (
          <p className="mt-3 text-xs leading-6 text-gray-500">
            آخرین پاسخ: {stats.lastCorrect ? "درست" : "غلط"} •{" "}
            {new Date(stats.lastAttemptAt).toLocaleString("fa-IR")}
          </p>
        )}
        <button
          onClick={onHistory}
          disabled={!stats?.attempts || answer.busy}
          className="mt-3 text-sm text-brand-600 underline disabled:opacity-40 dark:text-brand-300"
        >
          مشاهدهٔ سابقهٔ پاسخ‌ها
        </button>
      </footer>
    </article>
  );
}
