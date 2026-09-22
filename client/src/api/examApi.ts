import type { Category } from '../constants/categories';
import { apiRequest, ApiError } from '../lib/apiClient';

export type Exam = {
  id: string;
  title: string;
  category: Category;
  groupIds: string[]; // این آزمون به کدوم گروه(ها) تعلق داره - همینا تعیین می‌کنن کی می‌بینتش
  date: string; // ISO date string
  participants: number;
  status: 'draft' | 'completed' | 'upcoming';
  durationMinutes: number;
  allowReview: boolean;
};

// شکل خروجی سرور (server/src/routes/exams.ts -> serializeExam) عمداً دقیقاً
// همین Exam ـه، برای همین توابع خوندن فقط wrapper نازک دور apiRequest ـن.
// تنها نکته: سمت نوشتن (create/update)، سرور اسم فیلد تاریخ رو
// `scheduledAt` می‌خواد نه `date` (server/src/validation/examSchemas.ts) -
// برای همین قبل از ارسال map می‌کنیم. فیلدهای participants/status هم
// سمت سرور محاسبه‌شدنی‌ان (نه قابل نوشتن)، پس لازم نیست بفرستیمشون.

type ExamWriteBody = {
  title: string;
  category: Category;
  groupIds: string[];
  scheduledAt: string;
  durationMinutes: number;
  allowReview: boolean;
};

function toWriteBody(exam: Omit<Exam, 'id'>): ExamWriteBody {
  return {
    title: exam.title,
    category: exam.category,
    groupIds: exam.groupIds,
    scheduledAt: exam.date,
    durationMinutes: exam.durationMinutes,
    allowReview: exam.allowReview,
  };
}

export function getExams(): Promise<Exam[]> {
  return apiRequest<Exam[]>('/exams');
}

export async function getExamById(id: string): Promise<Exam | undefined> {
  try {
    return await apiRequest<Exam>(`/exams/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return undefined;
    }
    throw err;
  }
}

export function addExam(exam: Omit<Exam, 'id'>): Promise<Exam> {
  return apiRequest<Exam>('/exams', {
    method: 'POST',
    body: toWriteBody(exam),
  });
}

export function updateExam(
  id: string,
  updated: Omit<Exam, 'id'>
): Promise<Exam> {
  return apiRequest<Exam>(`/exams/${id}`, {
    method: 'PUT',
    body: toWriteBody(updated),
  });
}

export function deleteExam(id: string): Promise<void> {
  return apiRequest<void>(`/exams/${id}`, { method: 'DELETE' });
}

// Draft → Published. سرور اگه آزمون هنوز سوال نداشته باشه 400 برمی‌گردونه
export function publishExam(id: string): Promise<Exam> {
  return apiRequest<Exam>(`/exams/${id}/publish`, { method: 'POST' });
}

// Published → Draft. سرور اگه دانشجویی از قبل شروع کرده باشه 400 برمی‌گردونه
export function unpublishExam(id: string): Promise<Exam> {
  return apiRequest<Exam>(`/exams/${id}/unpublish`, { method: 'POST' });
}
