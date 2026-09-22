import { useEffect, useState } from 'react';
import {
  getGroupsByStudent,
  joinGroupByCode,
  type Group,
} from '../api/groupApi';
import { ApiError } from '../lib/apiClient';

type UseGroupMembershipResult = {
  myGroups: Group[];
  groupsLoading: boolean;
  joinCode: string;
  setJoinCode: (value: string) => void;
  joining: boolean;
  joinError: string | null;
  setJoinError: (value: string | null) => void;
  joinSuccess: string | null;
  setJoinSuccess: (value: string | null) => void;
  handleJoinGroup: (event: React.FormEvent) => Promise<void>;
};

function useGroupMembership(
  studentId: string | undefined
): UseGroupMembershipResult {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(!!studentId);
  const [refreshKey, setRefreshKey] = useState(0);

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    setGroupsLoading(true);
    getGroupsByStudent(studentId)
      .then(setMyGroups)
      .catch(() => {
        // لیست خالی نشون داده می‌شه؛ مهم اینه که اسپینر برای همیشه نمونه
      })
      .finally(() => setGroupsLoading(false));
  }, [studentId, refreshKey]);

  async function handleJoinGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!studentId) return;

    const trimmed = joinCode.trim();
    if (!trimmed) {
      setJoinError('کد عضویت رو وارد کن');
      return;
    }

    setJoining(true);
    setJoinError(null);
    try {
      // سرور lookup و join رو تو یه endpoint اتمیک و idempotent انجام می‌ده،
      // برای همین برای پیام «قبلاً عضو هستی» باید از قبل (قبل از صدا زدن)
      // چک کنیم که این گروه تو لیست فعلی هست یا نه - چون خودِ پاسخ سرور فرقی
      // بین «تازه عضو شد» و «از قبل عضو بود» نمی‌ذاره
      const alreadyMemberIds = new Set(myGroups.map((g) => g.id));
      const group = await joinGroupByCode(trimmed);

      if (alreadyMemberIds.has(group.id)) {
        setJoinError(`قبلاً عضو «${group.name}» هستی`);
        return;
      }

      setJoinCode('');
      setJoinSuccess(`با موفقیت به «${group.name}» پیوستی`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setJoinError(
        err instanceof ApiError && err.status === 404
          ? 'کد عضویت وارد شده معتبر نیست'
          : 'پیوستن به گروه با خطا مواجه شد'
      );
    } finally {
      setJoining(false);
    }
  }

  return {
    myGroups,
    groupsLoading,
    joinCode,
    setJoinCode,
    joining,
    joinError,
    setJoinError,
    joinSuccess,
    setJoinSuccess,
    handleJoinGroup,
  };
}

export default useGroupMembership;
