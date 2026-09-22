import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../api/authApi';
import { getExams, type Exam } from '../../api/examApi';
import { getStudents, type Student } from '../../api/studentApi';
import {
  getAttemptsForExams,
  getMyAttemptsForExams,
  type ExamAttempt,
} from '../../api/examAttemptApi';
import useGroups from '../../hooks/useGroups';
import useScope from '../../hooks/useScope';
import useAsyncData from '../../hooks/useAsyncData';

function useDashboardData() {
  const user = getCurrentUser();

  const {
    data: allExams,
    error: examsError,
    clearError: clearExamsError,
  } = useAsyncData(getExams, [] as Exam[], 'دریافت آزمون‌ها با خطا مواجه شد');
  // backend فقط SuperAdmin/Instructor رو برای GET /students قبول می‌کنه؛
  // Student اصلاً نباید این درخواست رو بزنه (وگرنه 403 می‌گیره و studentsError
  // بی‌خودی فعال می‌شه)
  const {
    data: allStudents,
    error: studentsError,
    clearError: clearStudentsError,
  } = useAsyncData(
    getStudents,
    [] as Student[],
    'دریافت دانشجویان با خطا مواجه شد',
    user?.role !== 'Student'
  );

  const { groups, visibleGroups, visibleGroupIds, currentUser } = useGroups();
  const { visibleItems: exams } = useScope(allExams, (exam) => exam.groupIds, {
    visibleGroupIds,
    currentUser,
  });

  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);

  // attempts فقط بعد از مشخص شدن لیست آزمون‌های قابل‌دیدن فچ می‌شه - چون
  // endpoint سراسری نیست، باید روی examId ها لوپ بزنیم. Student فقط تلاش
  // خودش رو هر آزمون می‌بینه (GET .../me)، Instructor/SuperAdmin همه‌ی
  // تلاش‌های اون آزمون رو (GET .../attempts)
  useEffect(() => {
    if (exams.length === 0) {
      setAttempts([]);
      return;
    }

    // بدون cancelled، اگه لیست آزمون‌ها وسط درخواست عوض می‌شد، جوابِ قدیمی‌تر
    // می‌تونست بعد از جدیدتر برسه و آمار غلط بمونه
    let cancelled = false;

    const examIds = exams.map((e) => e.id);
    const request =
      currentUser?.role === 'Student'
        ? getMyAttemptsForExams(examIds)
        : getAttemptsForExams(examIds);

    request
      .then((data) => {
        if (cancelled) return;
        setAttempts(data);
        setAttemptsError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setAttemptsError('دریافت نتایج آزمون‌ها با خطا مواجه شد');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [exams, currentUser?.role]);

  const error = examsError ?? studentsError ?? attemptsError;
  const clearError =
    examsError != null
      ? clearExamsError
      : studentsError != null
      ? clearStudentsError
      : () => setAttemptsError(null);

  const relevantGroups =
    currentUser?.role === 'SuperAdmin' ? groups : visibleGroups;

  const studentCount =
    currentUser?.role === 'SuperAdmin'
      ? allStudents.length
      : allStudents.filter((s) =>
          relevantGroups.some((g) => g.studentIds.includes(s.id))
        ).length;

  return { user, exams, attempts, studentCount, error, clearError };
}

export default useDashboardData;
