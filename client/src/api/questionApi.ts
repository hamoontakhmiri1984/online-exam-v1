import { apiRequest } from '../lib/apiClient';

export type Question = {
  id: string;
  examId: string;
  questionId?: string | null;
  text: string;
  options: string[];
  // Student responses omit the correct answer.
  correctOptionIndex: number;
};

export function getQuestionsByExamId(examId: string): Promise<Question[]> {
  return apiRequest<Question[]>(`/exams/${examId}/questions`);
}

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

// All questions in a bulk request must belong to the same exam.
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

export function deleteQuestion(examId: string, id: string): Promise<void> {
  return apiRequest<void>(`/exams/${examId}/questions/${id}`, {
    method: 'DELETE',
  });
}

// Keep bank identity on the server; copying via /bulk would consume quota again.
export function addQuestionsFromBank(examId: string, questionIds: string[]): Promise<Question[]> {
  return apiRequest<Question[]>(`/exams/${examId}/questions/from-bank`, {
    method: 'POST', body: { questionIds },
  });
}
