import { useEffect, useMemo, useState } from 'react';
import { getInstructorsByStatus, type AdminInstructor } from '../api/adminApi';
import { getGroups, type Group } from '../api/groupApi';
import { getStudents, type Student } from '../api/studentApi';

// این صفحه عمداً هیچ endpoint جدیدی نمی‌خواد - GET /groups و GET /students
// برای SuperAdmin از قبل همه‌ی رکوردهای سیستم رو برمی‌گردونن (نه فقط
// مالِ خودِ کاربر لاگین‌شده، برخلافِ Instructor)، برای همین کافیه این سه
// تا لیست رو این‌جا سمتِ کلاینت بر اساسِ instructorId به هم وصل کنیم -
// دقیقاً همون الگویی که useReportsData برای exams/students/attempts داره.
function useInstructorOverview() {
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([getInstructorsByStatus('Approved'), getGroups(), getStudents()])
      .then(([instructorsData, groupsData, studentsData]) => {
        if (cancelled) return;
        setInstructors(instructorsData);
        setGroups(groupsData);
        setStudents(studentsData);
      })
      .catch(() => {
        if (cancelled) return;
        setError('دریافتِ اطلاعاتِ مدرس‌ها با خطا مواجه شد');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const groupsByInstructor = useMemo(() => {
    const map = new Map<string, Group[]>();
    for (const group of groups) {
      const list = map.get(group.instructorId);
      if (list) list.push(group);
      else map.set(group.instructorId, [group]);
    }
    return map;
  }, [groups]);

  // تعدادِ دانشجوهای یکتا زیرِ یه مدرس (یه دانشجو ممکنه تو چند گروهِ
  // همون مدرس عضو باشه - نباید دوبار شمرده بشه)
  function uniqueStudentCount(instructorId: string): number {
    const ids = new Set<string>();
    for (const group of groupsByInstructor.get(instructorId) ?? []) {
      for (const id of group.studentIds) ids.add(id);
    }
    return ids.size;
  }

  return {
    instructors,
    groupsByInstructor,
    studentsById,
    uniqueStudentCount,
    loading,
    error,
    clearError: () => setError(null),
    expandedId,
    toggleExpanded: (id: string) =>
      setExpandedId((prev) => (prev === id ? null : id)),
  };
}

export default useInstructorOverview;
