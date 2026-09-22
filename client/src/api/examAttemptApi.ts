import { apiRequest, ApiError } from '../lib/apiClient';

export type ExamAttempt = {
  id: string;
  examId: string;
  studentId: string;
  // questionId -> selectedOptionIndex. توجه: اگه allowReview آزمون false
  // باشه، سرور تو GET .../attempts/me این فیلد رو اصلاً برنمی‌گردونه
  answers: Record<string, number>;
  // شماره‌ی نسخه‌ی آخرین ذخیره‌ی خودکار روی سرور؛ بعد از رفرش، شمارنده‌ی
  // autosave از همین‌جا ادامه پیدا می‌کنه
  answersRevision?: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: string; // ISO timestamp
  // null یعنی attempt هنوز در حال انجامه (finish نشده)
  finishedAt: string | null;
  expiresAt: string; // ISO timestamp - مرجع سرور برای پایان آزمون
  endedByTimeout: boolean;
};

// برای جاهایی که فقط attempt های تموم‌شده معنی دارن (گزارش‌ها، میانگین نمره،
// نمودار پیشرفت و ...) - هم فیلتر می‌کنه و هم برای TypeScript ثابت می‌کنه که
// finishedAt دیگه null نیست، بدون نیاز به non-null assertion (!) پراکنده
export type FinishedExamAttempt = ExamAttempt & { finishedAt: string };

export function isFinishedAttempt(
  attempt: ExamAttempt
): attempt is FinishedExamAttempt {
  return attempt.finishedAt !== null;
}

export type StartedAttempt = {
  startedAt: string;
  expiresAt: string;
  // ساعت سرور موقع پاسخ - برای هم‌تراز کردن تایمر با سرور (examClock.ts)
  serverNow: string;
};

// برخلاف نسخه‌ی mock قبلی، سرور هیچ endpoint سراسری‌ای (روی همه‌ی آزمون‌ها یا
// همه‌ی دانشجوها) نداره - همه‌چی زیرِ یه examId خاصه:
//   POST  /exams/:examId/attempts/start    (Student - شروع attempt)
//   PATCH /exams/:examId/attempts/answers  (Student - autosave وسط آزمون)
//   POST  /exams/:examId/attempts/finish   (Student - ثبت پاسخ‌ها و پایان)
//   GET   /exams/:examId/attempts          (Instructor/SuperAdmin - تلاش‌های تموم‌شده)
//   GET   /exams/:examId/attempts/me       (Student - تلاش خودش رو این آزمون)
// توابع getAllAttempts/getAttemptsByStudent قبلی حذف شدن؛ به‌جاشون توابع
// زیر روی چند examId لوپ می‌زنن.

// startedAt/expiresAt رو سرور می‌سازه، نه کلاینت - همون چیزی که تایمر
// صفحه‌ی آزمون باید روش حساب کنه، نه exam.durationMinutes محلی
export function startAttempt(examId: string): Promise<StartedAttempt> {
  return apiRequest<StartedAttempt>(`/exams/${examId}/attempts/start`, {
    method: 'POST',
  });
}

// saved=false یعنی سرور یه ذخیره‌ی جدیدتر (یا هم‌شماره) از همین revision داره و
// این درخواست رد شده؛ revision همون شماره‌ی ذخیره‌شده‌ی سرور ـه
export type AutosaveResult = { saved: boolean; revision: number };

// ذخیره‌ی خودکار پاسخ‌ها وسط آزمون - برخلاف finishAttempt نمره‌ای حساب
// نمی‌شه و attempt همچنان در حال انجام می‌مونه؛ فقط جلوی از دست رفتن
// پاسخ‌ها با رفرش/قطعی رو می‌گیره. revision باید با هر ذخیره‌ی جدید بیشتر
// بشه؛ سرور ذخیره‌ی قدیمی‌تر رو (که ممکنه دیرتر برسه) رد می‌کنه
export function autosaveAnswers(
  examId: string,
  answers: Record<string, number>,
  revision: number
): Promise<AutosaveResult> {
  return apiRequest<AutosaveResult>(`/exams/${examId}/attempts/answers`, {
    method: 'PATCH',
    body: { answers, revision },
  });
}

export function finishAttempt(
  examId: string,
  answers: Record<string, number>
): Promise<ExamAttempt> {
  // correctCount/totalQuestions/finishedAt/endedByTimeout همه سمت سرور
  // محاسبه می‌شن - هرچی غیر از answers اینجا بفرستیم نادیده گرفته می‌شه
  return apiRequest<ExamAttempt>(`/exams/${examId}/attempts/finish`, {
    method: 'POST',
    body: { answers },
  });
}

export function getAttemptsByExam(examId: string): Promise<ExamAttempt[]> {
  return apiRequest<ExamAttempt[]>(`/exams/${examId}/attempts`);
}

// برای مدرس/سوپرادمین: تلاش‌های چند آزمون رو یکی می‌کنه. 403/404 (مثلاً
// آزمونی که دیگه بهش دسترسی نداره) رو نادیده می‌گیره، نه این‌که کل درخواست بترکه
export async function getAttemptsForExams(
  examIds: string[]
): Promise<ExamAttempt[]> {
  const results = await Promise.all(
    examIds.map((examId) =>
      getAttemptsByExam(examId).catch((err) => {
        if (
          err instanceof ApiError &&
          (err.status === 403 || err.status === 404)
        ) {
          return [] as ExamAttempt[];
        }
        throw err;
      })
    )
  );
  return results.flat();
}

// برای دانشجو: تلاش خودش رو یه آزمون خاص - اگه هنوز شرکت نکرده undefined
export async function getMyAttempt(
  examId: string
): Promise<ExamAttempt | undefined> {
  try {
    return await apiRequest<ExamAttempt>(`/exams/${examId}/attempts/me`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return undefined;
    }
    throw err;
  }
}

// برای دانشجو: تلاش‌های خودش رو چند آزمون (مثلاً همه‌ی آزمون‌های قابل‌دیدنش)
export async function getMyAttemptsForExams(
  examIds: string[]
): Promise<ExamAttempt[]> {
  const results = await Promise.all(examIds.map((id) => getMyAttempt(id)));
  return results.filter((a): a is ExamAttempt => a !== undefined);
}

// تلاشِ تمام‌شده + خلاصه‌ی آزمونش (عنوان/allowReview) - برای صفحه‌ی
// «نتایج من» که عنوانِ آزمون رو مستقل از این‌که هنوز تو GET /exams
// می‌بینتش یا نه لازم داره
export type FinishedAttemptWithExam = Omit<
  FinishedExamAttempt,
  'answers' | 'answersRevision'
> & {
  exam: {
    id: string;
    title: string;
    allowReview: boolean;
  };
};

// برای دانشجو: کل تاریخچه‌ی تلاش‌های تمام‌شده‌ش - مستقل از GET /exams
// (که فقط آزمون‌های قابل‌دسترسِ *فعلی*‌ش رو می‌ده)، پس اگه از گروهی که
// صاحبِ یه آزمونه حذف بشه، نتیجه‌ی قبلیِ اون آزمون همچنان اینجا می‌مونه
export function getMyResultsHistory(): Promise<FinishedAttemptWithExam[]> {
  return apiRequest<FinishedAttemptWithExam[]>('/attempts/me');
}