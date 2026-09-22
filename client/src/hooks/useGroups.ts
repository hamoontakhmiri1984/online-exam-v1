import { useEffect, useMemo, useState } from 'react';
import { getGroups, type Group } from '../api/groupApi';
import { getCurrentUser } from '../api/authApi';

// گروه‌های مرتبط با کاربر فعلی رو برمی‌گردونه:
// SuperAdmin همه‌ی گروه‌ها رو می‌بینه، Instructor فقط گروه‌های خودش،
// Student فقط گروه‌هایی که توشون عضوه
function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getGroups()
      .then(setGroups)
      .catch(() => {
        // پیام خطا رو صفحه‌های مصرف‌کننده از درخواست‌های خودشون نشون می‌دن؛
        // این‌جا فقط نباید لودینگ برای همیشه باز بمونه
      })
      .finally(() => setLoading(false));
  }, []);

  const currentUser = getCurrentUser();

  // useMemo لازمه چون بدون اون، visibleGroups/visibleGroupIds هر رندر یه
  // آرایه‌ی جدید (با رفرنس متفاوت) می‌سازن، حتی اگه محتواشون عوض نشده باشه.
  // مصرف‌کننده‌هایی مثل useScope/useDashboardData این خروجی رو تو
  // دیپندنسی‌آرایه‌ی useEffect می‌ذارن، پس رفرنس ناپایدار باعث اجرای
  // دوباره‌ی افکت هر رندر و در نتیجه حلقه‌ی بی‌نهایت رندر می‌شه.
  const visibleGroups = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SuperAdmin') return groups;
    if (currentUser.role === 'Instructor') {
      return groups.filter((g) => g.instructorId === currentUser.id);
    }
    return groups.filter((g) => g.studentIds.includes(currentUser.id));
  }, [groups, currentUser]);

  const visibleGroupIds = useMemo(
    () => visibleGroups.map((g) => g.id),
    [visibleGroups]
  );

  return { groups, visibleGroups, visibleGroupIds, loading, currentUser };
}

export default useGroups;
