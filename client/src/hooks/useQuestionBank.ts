import { useEffect, useState } from 'react';
import {
  getQuestionsByExamId,
  addQuestion,
  addQuestionsBulk,
  updateQuestion,
  deleteQuestion,
  type Question,
} from '../api/questionApi';
import { ApiError } from '../lib/apiClient';

type QuestionInput = Omit<Question, 'id' | 'examId'>;

// پیام خطای سرور (مثلاً «سقف پلن پر شده» یا «آزمون شروع شده») رو نشون می‌ده؛
// برای خطای شبکه و بقیه، همون پیام پیش‌فرض
function errorMessageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback;
}

function useQuestionBank(examId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // QuestionsPage وقتی examId نداره '' پاس می‌ده؛ نباید /exams//questions
    // زده بشه
    if (!examId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getQuestionsByExamId(examId)
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch(() => {
        if (!cancelled) setError('دریافت سوال‌ها با خطا مواجه شد');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examId]);

  async function addItem(input: QuestionInput) {
    try {
      const newQuestion = await addQuestion({ ...input, examId });
      setQuestions((prev) => [...prev, newQuestion]);
      return newQuestion;
    } catch (err) {
      setError(errorMessageOf(err, 'افزودن سوال با خطا مواجه شد'));
      return undefined;
    }
  }

  async function addMany(inputs: QuestionInput[]) {
    try {
      const withExamId = inputs.map((input) => ({ ...input, examId }));
      const created = await addQuestionsBulk(withExamId);
      setQuestions((prev) => [...prev, ...created]);
      return created;
    } catch (err) {
      setError(errorMessageOf(err, 'ایمپورت سوال‌ها با خطا مواجه شد'));
      return undefined;
    }
  }

  async function updateItem(id: string, input: QuestionInput) {
    try {
      const updated = await updateQuestion(id, { ...input, examId });
      setQuestions((prev) =>
        prev.map((question) => (question.id === id ? updated : question))
      );
      return updated;
    } catch (err) {
      setError(errorMessageOf(err, 'ذخیره سوال با خطا مواجه شد'));
      return undefined;
    }
  }

  async function deleteItem(id: string) {
    try {
      await deleteQuestion(examId, id);
      setQuestions((prev) => prev.filter((question) => question.id !== id));
    } catch (err) {
      setError(errorMessageOf(err, 'حذف سوال با خطا مواجه شد'));
    }
  }

  return {
    questions,
    loading,
    error,
    clearError: () => setError(null),
    addItem,
    addMany,
    updateItem,
    deleteItem,
  };
}

export default useQuestionBank;
