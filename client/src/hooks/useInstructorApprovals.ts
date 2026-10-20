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

  const [actioningId, setActioningId] = useState<string | null>(null);
  // Ignore responses from superseded tabs or requests.
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
