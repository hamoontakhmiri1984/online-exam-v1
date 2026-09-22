import { useCallback, useEffect, useState } from 'react';

import {
  createBankQuestion,
  deleteBankQuestion,
  getBankQuestions,
  updateBankQuestion,
  type BankQuestion,
  type BankQuestionInput,
} from '../api/questionBankApi';
import { ApiError } from '../lib/apiClient';

// پیام خطای سرور (مثلاً «سقف پلن پر شده») رو نشون می‌ده؛ برای خطای شبکه و
// بقیه، همون پیام پیش‌فرض
function errorMessageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function useBankQuestions(bankId?: string) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  // اگه bankId هست، از همون اول لودینگ باشه تا یه لحظه «هنوز سوالی وجود ندارد» چشمک نزنه
  const [loading, setLoading] = useState(Boolean(bankId));
  const [error, setError] = useState('');

  const loadQuestions = useCallback(async () => {
    if (!bankId) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getBankQuestions(bankId);
      setQuestions(data);
    } catch {
      setError('دریافت سوال‌های بانک با خطا مواجه شد');
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  // add/edit/remove خطا رو خودشون می‌گیرن و تو error می‌ذارن؛ موقع خطا
  // null (یا false برای حذف) برمی‌گردونن تا صفحه فرم رو پاک نکنه
  const addQuestion = async (input: BankQuestionInput) => {
    if (!bankId) return null;

    setError('');

    try {
      const created = await createBankQuestion(bankId, input);

      setQuestions((current) => [...current, created]);

      return created;
    } catch (err) {
      setError(errorMessageOf(err, 'افزودن سوال با خطا مواجه شد'));

      return null;
    }
  };

  const editQuestion = async (questionId: string, input: BankQuestionInput) => {
    if (!bankId) return null;

    setError('');

    try {
      const updated = await updateBankQuestion(bankId, questionId, input);

      setQuestions((current) =>
        current.map((question) =>
          question.id === questionId ? updated : question
        )
      );

      return updated;
    } catch (err) {
      setError(errorMessageOf(err, 'ذخیره‌ی سوال با خطا مواجه شد'));

      return null;
    }
  };

  const removeQuestion = async (questionId: string) => {
    if (!bankId) return false;

    setError('');

    try {
      await deleteBankQuestion(bankId, questionId);

      setQuestions((current) =>
        current.filter((question) => question.id !== questionId)
      );

      return true;
    } catch (err) {
      setError(errorMessageOf(err, 'حذف سوال با خطا مواجه شد'));

      return false;
    }
  };

  return {
    questions,
    loading,
    error,
    reload: loadQuestions,
    addQuestion,
    editQuestion,
    removeQuestion,
  };
}

export default useBankQuestions;
