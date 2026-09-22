import { useCallback, useEffect, useState } from 'react';
import { getExams, type Exam } from '../api/examApi';
import { getStudents, type Student } from '../api/studentApi';
import { getAttemptsForExams, type ExamAttempt } from '../api/examAttemptApi';

type UseReportsDataResult = {
  exams: Exam[];
  students: Student[];
  attempts: ExamAttempt[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
};

function useReportsData(): UseReportsDataResult {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getExams(), getStudents()])
      .then(([examsData, studentsData]) =>
        // اگه هر کدوم از exams/students fail بشه، این‌جا try/catch جداگانه
        // فایده نداره - چون به examsData وابسته‌ایم، خودِ .catch پایینی هندلش می‌کنه
        getAttemptsForExams(examsData.map((e) => e.id)).then((attemptsData) => ({
          examsData,
          studentsData,
          attemptsData,
        }))
      )
      .then(({ examsData, studentsData, attemptsData }) => {
        if (cancelled) return;
        setExams(examsData);
        setStudents(studentsData);
        setAttempts(attemptsData);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // به جای گیر کردن روی Spinner، به کاربر خطا نشون می‌دیم و اجازه می‌دیم
        // با هر داده‌ای که موفق شده صفحه لود بشه (بقیه [] می‌مونن)
        setError('دریافت اطلاعات گزارش‌ها با خطا مواجه شد');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { exams, students, attempts, loading, error, clearError };
}

export default useReportsData;
