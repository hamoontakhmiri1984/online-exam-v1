import { useCallback, useEffect, useState } from 'react';
import { getExamById, type Exam } from '../../api/examApi';
import {
  getQuestionCountByExamId,
  getQuestionsByExamId,
  type Question,
} from '../../api/questionApi';

// Poll unreleased question counts so scheduled exams become available without a reload.
const POLL_INTERVAL_MS = 5000;

// Fetch question content only after an attempt has started.
function useExamData(examId: string, hasStarted: boolean) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState<number>(0);

  const fetchData = useCallback(async () => {
    const [examData, count] = await Promise.all([
      getExamById(examId),
      getQuestionCountByExamId(examId),
    ]);
    return { examData: examData ?? null, count };
  }, [examId]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const { examData, count } = await fetchData();
        if (cancelled) return;

        setExam(examData);
        setQuestionCount(count);
        setError(null);
        setLoading(false);

        const notStartedYet =
          examData !== null && new Date(examData.date).getTime() > Date.now();
        if (count === 0 && notStartedYet) {
          timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch {
        if (cancelled) return;
        setError('بارگذاری اطلاعات آزمون با خطا مواجه شد');
        setLoading(false);
      }
    }

    setLoading(true);
    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchData, retryToken]);

  useEffect(() => {
    if (!hasStarted) return;
    let cancelled = false;

    getQuestionsByExamId(examId)
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch(() => {
        if (!cancelled) setError('بارگذاری سوال‌های آزمون با خطا مواجه شد');
      });

    return () => {
      cancelled = true;
    };
  }, [examId, hasStarted, retryToken]);

  const retry = useCallback(() => {
    setRetryToken((t) => t + 1);
  }, []);

  return { exam, questionCount, questions, loading, error, retry };
}

export default useExamData;
