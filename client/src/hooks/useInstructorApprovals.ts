import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getInstructorsByStatus,
  approveInstructor,
  rejectInstructor,
  type AdminInstructor,
  type InstructorApprovalStatus,
} from '../api/adminApi';

function useInstructorApprovals() {
  const [status, setStatus] = useState<InstructorApprovalStatus>('Pending');
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // چون تایید/رد هرکدوم روی یه ردیف مشخص عمل می‌کنه، به‌جای یه لودینگ
  // سراسری فقط همون دکمه‌ی همون ردیف غیرفعال می‌شه
  const [actioningId, setActioningId] = useState<string | null>(null);
  // شماره‌ی آخرین درخواستِ لیست: جوابِ دیررسیده‌ی تبِ قبلی نباید لیستِ تبِ
  // فعلی رو بازنویسی کنه (وگرنه دکمه‌ی «تایید» رو ردیفِ تبِ اشتباه می‌افته)
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    const isLatest = () => requestId === requestIdRef.current;
    setLoading(true);
    getInstructorsByStatus(status)
      .then((data) => {
        if (isLatest()) setInstructors(data);
      })
      .catch(() => {
        if (isLatest()) setError('دریافت لیست مدرس‌ها با خطا مواجه شد');
      })
      .finally(() => {
        if (isLatest()) setLoading(false);
      });
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // بعد از تایید/رد، ردیف از همون تب حذف می‌شه (چون وضعیتش دیگه با تب فعلی
  // یکی نیست) - به‌جای رفرش کامل لیست از سرور
  async function handleApprove(id: string) {
    setActioningId(id);
    try {
      await approveInstructor(id);
      setInstructors((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('تایید مدرس با خطا مواجه شد');
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(id: string) {
    setActioningId(id);
    try {
      await rejectInstructor(id);
      setInstructors((prev) => prev.filter((i) => i.id !== id));
    } catch {
      setError('رد کردن مدرس با خطا مواجه شد');
    } finally {
      setActioningId(null);
    }
  }

  return {
    status,
    setStatus,
    instructors,
    loading,
    error,
    clearError: () => setError(null),
    actioningId,
    handleApprove,
    handleReject,
    refresh: load,
  };
}

export default useInstructorApprovals;