import type { Exam } from '../../api/examApi';
import { isFinishedAttempt, type ExamAttempt } from '../../api/examAttemptApi';

export function getTodayJalali(): string {
  const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  return `${get('weekday')}، ${get('day')} ${get('month')} ${get('year')}`;
}

function jalaliMonthInfo(iso: string): { label: string; sortKey: number } {
  const date = new Date(iso);
  const longParts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    month: 'long',
  }).formatToParts(date);
  const numericParts = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);

  const label = longParts.find((p) => p.type === 'month')?.value ?? '';
  const year = Number(numericParts.find((p) => p.type === 'year')?.value ?? 0);
  const month = Number(
    numericParts.find((p) => p.type === 'month')?.value ?? 0
  );

  return { label, sortKey: year * 100 + month };
}

// فقط تلاش‌های تموم‌شده: برای دانشجو، GET .../attempts/me تلاشِ «در حال
// انجام» رو هم برمی‌گردونه (correctCount=۰) که نباید جزو شرکت‌کننده یا
// میانگین نمره حساب بشه
export function countParticipants(
  attempts: ExamAttempt[],
  examId: string
): number {
  const uniqueStudents = new Set(
    attempts
      .filter((a) => a.examId === examId && isFinishedAttempt(a))
      .map((a) => a.studentId)
  );
  return uniqueStudents.size;
}

export function buildAverageScorePercent(attempts: ExamAttempt[]): number {
  const finished = attempts.filter(isFinishedAttempt);
  if (finished.length === 0) return 0;

  // totalQuestions=۰ (آزمونی که سوالش پاک شده) قبلاً NaN می‌داد و «NaN٪»
  // نمایش داده می‌شد
  return Math.round(
    (finished.reduce(
      (sum, a) => sum + a.correctCount / (a.totalQuestions || 1),
      0
    ) /
      finished.length) *
      100
  );
}

export function buildRecentExams(exams: Exam[], limit = 5): Exam[] {
  return [...exams]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function buildTopExamsData(
  exams: Exam[],
  attempts: ExamAttempt[],
  limit = 5
): { label: string; participants: number }[] {
  return exams
    .map((exam) => ({
      label: exam.title,
      participants: countParticipants(attempts, exam.id),
    }))
    .filter((point) => point.participants > 0)
    .sort((a, b) => b.participants - a.participants)
    .slice(0, limit);
}

export function buildProgressData(
  attempts: ExamAttempt[],
  monthsToShow = 6
): { label: string; averageScore: number }[] {
  const monthBuckets = new Map<
    number,
    { label: string; sumRatio: number; count: number }
  >();

  attempts.filter(isFinishedAttempt).forEach((a) => {
    const { label, sortKey } = jalaliMonthInfo(a.finishedAt);
    const bucket = monthBuckets.get(sortKey) ?? {
      label,
      sumRatio: 0,
      count: 0,
    };
    bucket.sumRatio += a.correctCount / (a.totalQuestions || 1);
    bucket.count += 1;
    monthBuckets.set(sortKey, bucket);
  });

  return Array.from(monthBuckets.entries())
    .sort(([a], [b]) => a - b)
    .slice(-monthsToShow)
    .map(([, bucket]) => ({
      label: bucket.label,
      averageScore: Math.round((bucket.sumRatio / bucket.count) * 100),
    }));
}
