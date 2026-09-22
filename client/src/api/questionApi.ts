import { apiRequest } from '../lib/apiClient';

export type Question = {
  id: string;
  examId: string;
  text: string;
  options: string[];
  // نکته: سرور این فیلد رو برای نقش Student اصلاً برنمی‌گردونه (امنیت
  // نمره‌دهی، سمت questions.ts). این تایپ برای مصرف instructor/superadmin
  // دقیقه؛ صفحه‌ی دانشجو نباید بهش تکیه کنه - همون مشکل #۲ که تو فاز
  // ExamAttempt/useExamAnswers جدا حلش می‌کنیم.
  correctOptionIndex: number;
};

export function getQuestionsByExamId(examId: string): Promise<Question[]> {
  return apiRequest<Question[]>(`/exams/${examId}/questions`);
}

// فقط تعداد سوال‌ها - برای صفحه‌ی شروع آزمون؛ خودِ سوال‌ها (برای دانشجو) فقط
// بعد از start از getQuestionsByExamId میان
export function getQuestionCountByExamId(examId: string): Promise<number> {
  return apiRequest<{ count: number }>(`/exams/${examId}/questions/count`).then(
    (res) => res.count
  );
}

export function addQuestion(question: Omit<Question, 'id'>): Promise<Question> {
  return apiRequest<Question>(`/exams/${question.examId}/questions`, {
    method: 'POST',
    body: {
      text: question.text,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
    },
  });
}

// همه‌ی سوال‌های bulk باید متعلق به یه examId باشن (call site فعلی هم
// همینه) - examId رو از اولین آیتم می‌گیریم
export function addQuestionsBulk(
  newQuestions: Omit<Question, 'id'>[]
): Promise<Question[]> {
  if (newQuestions.length === 0) return Promise.resolve([]);
  const examId = newQuestions[0].examId;
  return apiRequest<Question[]>(`/exams/${examId}/questions/bulk`, {
    method: 'POST',
    body: newQuestions.map((q) => ({
      text: q.text,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
    })),
  });
}

export function updateQuestion(
  id: string,
  updated: Omit<Question, 'id'>
): Promise<Question> {
  return apiRequest<Question>(`/exams/${updated.examId}/questions/${id}`, {
    method: 'PUT',
    body: {
      text: updated.text,
      options: updated.options,
      correctOptionIndex: updated.correctOptionIndex,
    },
  });
}

// برخلاف نسخه‌ی mock، حذف هم زیرمجموعه‌ی examId ـه - پس امضا عوض شد
// (call siteـش تو useQuestionBank.ts هم باید عوض بشه، پایین‌تر)
export function deleteQuestion(examId: string, id: string): Promise<void> {
  return apiRequest<void>(`/exams/${examId}/questions/${id}`, {
    method: 'DELETE',
  });
}
