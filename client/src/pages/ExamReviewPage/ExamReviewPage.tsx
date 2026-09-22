import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import { getExamById, type Exam } from '../../api/examApi';
import { getMyAttempt, type ExamAttempt } from '../../api/examAttemptApi';
import { getQuestionsByExamId, type Question } from '../../api/questionApi';

function ExamReviewPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | undefined>(undefined);
  const [attempt, setAttempt] = useState<ExamAttempt | undefined>(undefined);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);
  const [retryToken, setRetryToken] = useState<number>(0);

  useEffect(() => {
    // قبلاً: بدون catch، با هر خطای شبکه/سرور اسپینر برای همیشه می‌موند؛ و
    // بدون examId هم loading هیچ‌وقت false نمی‌شد
    if (!examId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    Promise.all([
      getExamById(examId),
      getMyAttempt(examId),
      getQuestionsByExamId(examId),
    ])
      .then(([examData, attemptData, questionsData]) => {
        if (cancelled) return;
        setExam(examData);
        setAttempt(attemptData);
        setQuestions(questionsData);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examId, retryToken]);

  if (loading) {
    return (
      <AppLayout title="مرور آزمون">
        <Spinner />
      </AppLayout>
    );
  }

  if (loadFailed) {
    return (
      <AppLayout title="مرور آزمون">
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          <p className="mb-4">دریافت اطلاعات مرور با خطا مواجه شد.</p>
          <button
            type="button"
            onClick={() => setRetryToken((token) => token + 1)}
            className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            تلاش دوباره
          </button>
        </div>
      </AppLayout>
    );
  }

  // یا آزمون پیدا نشد، یا این دانشجو اصلاً شرکت نکرده، یا هنوز تمومش نکرده
  if (!exam || !attempt || !attempt.finishedAt) {
    return (
      <AppLayout title="مرور آزمون">
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          نتیجه‌ای برای مرور پیدا نشد.
        </div>
      </AppLayout>
    );
  }

  // سرور correctOptionIndex رو فقط وقتی برمی‌گردونه که allowReview آزمون
  // فعال باشه (server/src/routes/questions/examQuestions.routes.ts). اگه
  // غیرفعال باشه، به‌جای صفحه‌ی گمراه‌کننده (بدون مشخص بودن جواب درست) این
  // پیام رو نشون می‌دیم
  const canReview =
    exam.allowReview &&
    questions.length > 0 &&
    questions.every((q) => typeof q.correctOptionIndex === 'number');

  if (!canReview) {
    // سرور پاسخنامه رو تا پایان عمومی آزمون (+ مهلت ارسال) برای دانشجوها
    // نگه می‌داره؛ تو این بازه allowReview فعاله ولی جواب صحیح هنوز نیومده
    const answerKeyPending = exam.allowReview && questions.length > 0;
    return (
      <AppLayout title={exam.title}>
        <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
          {answerKeyPending
            ? 'پاسخنامه بعد از پایان زمان آزمون برای همه‌ی شرکت‌کنندگان نمایش داده می‌شود. کمی بعد دوباره سر بزن.'
            : 'مرورِ پاسخ‌ها برای این آزمون فعال نیست.'}
        </div>
      </AppLayout>
    );
  }

  const percent = Math.round(
    (attempt.correctCount / (attempt.totalQuestions || 1)) * 100
  );

  return (
    <AppLayout title={exam.title}>
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate('/my-results')}
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowRight size={15} />
          بازگشت به نتایج من
        </button>

        <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {exam.title}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {attempt.correctCount.toLocaleString('fa-IR')} از{' '}
              {attempt.totalQuestions.toLocaleString('fa-IR')} پاسخ درست
            </p>
          </div>
          <span className="rounded-full bg-brand-500/10 px-4 py-1.5 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
            {percent.toLocaleString('fa-IR')}٪
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((question, index) => {
            // answers اگه allowReview خاموش باشه اصلاً از سرور نمیاد
            const selectedIndex = attempt.answers?.[question.id];
            const correctIndex = question.correctOptionIndex;
            const wasAnswered = selectedIndex !== undefined;
            const wasCorrect = wasAnswered && selectedIndex === correctIndex;

            return (
              <div
                key={question.id}
                className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    {(index + 1).toLocaleString('fa-IR')}. {question.text}
                  </h2>
                  {wasCorrect ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success-600 dark:text-success-500">
                      <CheckCircle2 size={14} />
                      درست
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-danger-600 dark:text-danger-400">
                      <XCircle size={14} />
                      {wasAnswered ? 'غلط' : 'بی‌پاسخ'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {question.options.map((option, optIndex) => {
                    const isCorrectOption = optIndex === correctIndex;
                    const isSelectedOption = optIndex === selectedIndex;

                    let classes =
                      'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200';
                    if (isCorrectOption) {
                      classes =
                        'border-success-500 bg-success-500/10 text-success-700 dark:text-success-400';
                    } else if (isSelectedOption) {
                      classes =
                        'border-danger-500 bg-danger-500/10 text-danger-700 dark:text-danger-400';
                    }

                    return (
                      <div
                        key={optIndex}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${classes}`}
                      >
                        <span>{option}</span>
                        {isCorrectOption && (
                          <CheckCircle2 size={15} className="shrink-0" />
                        )}
                        {isSelectedOption && !isCorrectOption && (
                          <XCircle size={15} className="shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

export default ExamReviewPage;
