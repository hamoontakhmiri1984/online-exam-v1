import type { Category } from '../constants/categories';
import { apiRequest, ApiError } from '../lib/apiClient';

export type Group = {
  id: string;
  name: string;
  category: Category; // فقط یه برچسب موضوعی برای دسته‌بندی/فیلتر، نه ابزار دسترسی
  instructorId: string; // مدرسی که این گروه رو ساخته و مالکشه
  studentIds: string[]; // دانشجوهای عضو این گروه
  joinCode: string; // کد عضویت - دانشجو با این کد از صفحه‌ی ثبت‌نام مستقیم عضو این گروه می‌شه
};

// شکل خروجی سرور (server/src/routes/groups.ts -> serializeGroup) عمداً دقیقاً
// همین Group ـه، برای همین این فایل فقط یه wrapper نازک دور apiRequest ـه.

export function getGroups(): Promise<Group[]> {
  return apiRequest<Group[]>('/groups');
}

// سرور دسترسی رو خودش چک می‌کنه (403 اگه نه مالک/عضو/SuperAdmin باشی) - اینجا
// هم 404 هم 403 رو به undefined تبدیل می‌کنیم چون از دید این تابع «قابل‌دیدن
// نیست» با «وجود نداره» فرقی نداره؛ خطاهای دیگه (شبکه/500) بالا می‌رن
export async function getGroupById(id: string): Promise<Group | undefined> {
  try {
    return await apiRequest<Group>(`/groups/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return undefined;
    }
    throw err;
  }
}

// توجه: GET /groups سمت سرور خودش بر اساس نقشِ کاربرِ لاگین‌شده فیلتر می‌کنه
// (Instructor فقط گروه‌های خودش، Student فقط گروه‌هایی که عضوشونه، SuperAdmin
// همه). پارامتر instructorId/studentId اینجا دیگه به سرور فرستاده نمی‌شه -
// فقط برای این نگه داشته شده که call siteهای فعلی (که همیشه با id خودِ کاربر
// لاگین‌شده صداش می‌زنن) عوض نشن. اگه یه روز لازم شد یه SuperAdmin گروه‌های
// یه مدرسِ دیگه رو ببینه، این فرض دیگه درست نیست و باید سرور یه query param
// جدا (مثلاً ?instructorId=) پشتیبانی کنه.
export function getGroupsByInstructor(_instructorId: string): Promise<Group[]> {
  return apiRequest<Group[]>('/groups');
}

export function getGroupsByStudent(_studentId: string): Promise<Group[]> {
  return apiRequest<Group[]>('/groups');
}

// موقع ساخت گروه، joinCode توسط خود سرور تولید می‌شه و instructorId هم از
// روی توکن گرفته می‌شه (نه از بدنه‌ی درخواست) - برای همین این دو فیلد از
// ورودی گرفته می‌شن (برای سازگاری با useCrud/useGroupFormModal فعلی) ولی
// به سرور فرستاده نمی‌شن
export function addGroup(group: Omit<Group, 'id' | 'joinCode'>): Promise<Group> {
  return apiRequest<Group>('/groups', {
    method: 'POST',
    body: {
      name: group.name,
      category: group.category,
      studentIds: group.studentIds,
    },
  });
}

// ویرایش گروه (اسم/دسته‌بندی/لیست دانشجوها) - joinCode دست‌نخورده می‌مونه،
// برای عوض کردنش از regenerateJoinCode استفاده کن
export function updateGroup(
  id: string,
  updated: Omit<Group, 'id' | 'joinCode'>
): Promise<Group> {
  return apiRequest<Group>(`/groups/${id}`, {
    method: 'PUT',
    body: {
      name: updated.name,
      category: updated.category,
      studentIds: updated.studentIds,
    },
  });
}

// دانشجوی لاگین‌شده با کد عضویت به یه گروه می‌پیونده. برخلاف نسخه‌ی قبلی
// (mock) که lookup و join دو تابع جدا بودن (getGroupByJoinCode +
// addStudentToGroup)، سرور اینا رو تو یه endpoint اتمیک ادغام کرده - چون
// joinCode->group فقط برای همین یه کاربرد رو داشت. idempotent ـه (اگه از
// قبل عضو بود دوباره خطا نمی‌ده). دانشجو هم همیشه خودِ کاربر لاگین‌شده‌ست،
// نه یه پارامتر جدا.
export function joinGroupByCode(code: string): Promise<Group> {
  return apiRequest<Group>('/groups/join', {
    method: 'POST',
    body: { joinCode: code.trim() },
  });
}

// کد قدیمی رو باطل و یه کد جدید می‌سازه - فقط مالک گروه یا SuperAdmin
export function regenerateJoinCode(groupId: string): Promise<Group> {
  return apiRequest<Group>(`/groups/${groupId}/regenerate-join-code`, {
    method: 'POST',
  });
}

export function deleteGroup(id: string): Promise<void> {
  return apiRequest<void>(`/groups/${id}`, { method: 'DELETE' });
}
