import { useMemo } from 'react';
import type { User } from '../api/authApi';

type ScopeContext = {
  visibleGroupIds: string[];
  currentUser: User | null;
};

// یه آیتم (آزمون یا جلسه‌ی درس) رو فقط وقتی نشون می‌ده که حداقل با یکی از
// گروه‌های قابل‌مشاهده‌ی کاربر فعلی هم‌پوشانی داشته باشه. SuperAdmin همه‌چی
// رو می‌بینه، بدون فیلتر.
//
// scope (visibleGroupIds/currentUser) رو عمداً از بیرون می‌گیره، نه این‌که
// خودش useGroups() رو صدا بزنه: چون تقریباً همه‌ی صفحه‌هایی که از این هوک
// استفاده می‌کنن (Dashboard، Lessons، ...) به‌هرحال خودشون useGroups() رو
// یه‌بار صدا زدن (برای چیز دیگه‌ای، مثلاً لیستِ کامل گروه‌ها). اگه اینجا هم
// دوباره useGroups() صدا زده می‌شد - چون هوک‌ها نمی‌تونن شرطی صدا زده بشن،
// نمی‌شد فقط نتیجه‌شو نادیده گرفت - یعنی GET /groups دوبار برای همون داده
// می‌رفت، هر بار صفحه لود می‌شد.
function useScope<T>(
  items: T[],
  getGroupIds: (item: T) => string[],
  { visibleGroupIds, currentUser }: ScopeContext
) {
  const visibleItems = useMemo(() => {
    if (currentUser?.role === 'Instructor' || currentUser?.role === 'Student') {
      return items.filter((item) =>
        getGroupIds(item).some((groupId) => visibleGroupIds.includes(groupId))
      );
    }
    return items;
    // getGroupIds عمداً تو دیپندنسی‌آرایه نیست - توضیح کامل پایین فایل قبلی
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, visibleGroupIds, currentUser?.role]);

  return { currentUser, visibleItems };
}

export default useScope;
