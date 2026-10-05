import { useEffect, useRef, useState } from 'react';
import { getExamById, publishExam, type Exam } from '../api/examApi';
import {
  addQuestion,
  addQuestionsBulk,
  addQuestionsFromBank,
  deleteQuestion,
  getQuestionsByExamId,
  updateQuestion,
  type Question,
} from '../api/questionApi';
import { ApiError } from '../lib/apiClient';

type Input = Pick<Question, 'text' | 'options' | 'correctOptionIndex'>;
export default function useExamQuestions(examId: string) {
  const [exam, setExam] = useState<Exam>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    Promise.all([getExamById(examId), getQuestionsByExamId(examId)])
      .then(([info, items]) => {
        if (!active) return;
        if (!info) {
          setLoadError('آزمون یافت نشد یا به آن دسترسی ندارید.');
          return;
        }
        setExam(info);
        setQuestions(items);
      })
      .catch((err) => {
        if (active)
          setLoadError(
            err instanceof ApiError
              ? err.message
              : 'دریافت آزمون ناموفق بود. دوباره تلاش کنید.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [examId, revision]);

  async function mutate<T>(
    action: () => Promise<T>,
    apply: (result: T) => void,
    message: string,
  ) {
    if (pending.current) return undefined;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      if (mounted.current) {
        apply(result);
        setNotice(message);
      }
      return result;
    } catch (err) {
      if (mounted.current) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'ذخیره انجام نشد؛ اطلاعات شما حفظ شده است. دوباره تلاش کنید.',
        );
        if (err instanceof ApiError && err.status === 409)
          setRevision((value) => value + 1);
      }
      return undefined;
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const append = (items: Question[]) =>
    setQuestions((current) => [...current, ...items]);
  return {
    exam,
    questions,
    loading,
    loadError,
    error,
    notice,
    busy,
    clearError: () => setError(''),
    retry: () => setRevision((value) => value + 1),
    addItem: (input: Input) =>
      mutate(
        () => addQuestion({ ...input, examId }),
        (item) => append([item]),
        'سؤال به آزمون اضافه شد.',
      ),
    addMany: (inputs: Input[]) =>
      mutate(
        () => addQuestionsBulk(inputs.map((input) => ({ ...input, examId }))),
        append,
        'سؤال‌های فایل به آزمون اضافه شدند.',
      ),
    fromBank: (ids: string[]) =>
      mutate(
        () => addQuestionsFromBank(examId, ids),
        append,
        'سؤال‌های انتخاب‌شده به آزمون اضافه شدند.',
      ),
    updateItem: (id: string, input: Input) =>
      mutate(
        () => updateQuestion(id, { ...input, examId }),
        (item) =>
          setQuestions((current) =>
            current.map((q) => (q.id === id ? item : q)),
          ),
        'تغییرات سؤال ذخیره شد.',
      ),
    remove: (id: string) =>
      mutate(
        async () => {
          await deleteQuestion(examId, id);
          return true;
        },
        () => setQuestions((current) => current.filter((q) => q.id !== id)),
        'سؤال حذف شد.',
      ),
    publish: () =>
      mutate(() => publishExam(examId), setExam, 'آزمون منتشر شد.'),
  };
}
