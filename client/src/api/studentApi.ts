import { apiRequest } from '../lib/apiClient';

export type Student = {
  id: string;
  name: string;
  email?: string; // دانشجویی که خودش با کد عضویت ثبت‌نام کرده فعلاً ایمیل نداره
  username: string; // همون نام کاربری‌ای که با اون وارد سامانه می‌شه
};

// نکته‌ی مهم: سمت سرور مدل جدای Student وجود نداره - یه دانشجو همون User با
// role=Student ـه (server/src/routes/students.ts -> serializeStudent).
// username هم اونجا معادل email (یا اگه نبود phone، یا اگه اونم نبود id)
// محاسبه می‌شه، نه یه فیلد مستقل تو دیتابیس.

export function getStudents(): Promise<Student[]> {
  return apiRequest<Student[]>('/students');
}

export function deleteStudent(id: string): Promise<void> {
  return apiRequest<void>(`/students/${id}`, { method: 'DELETE' });
}

// سرور route ای برای ساخت/ویرایش مستقیم دانشجو نداره - دانشجو فقط از مسیر
// ثبت‌نام با کد عضویت (POST /auth/register) ساخته می‌شه. به همین خاطر اینجا
// addStudent/updateStudent عمداً وجود ندارن؛ StudentsPage هم useCrud رو بدون
// این دو تا فراخوانی می‌کنه (add/update توی CrudApi اختیاری هستن). اگه یه
// روز واقعاً لازم شد (مثلاً SuperAdmin بخواد دستی ویرایش کنه)، باید اول یه
// endpoint متناظر رو سمت سرور اضافه کرد و بعد این دو تابع رو اینجا برگردوند.
