import { prisma } from '../../lib/prisma';
import { badRequest } from '../../lib/errors';
import type { Role } from '../../lib/jwt';

// شکل خروجی رو دقیقاً هم‌شکل Group تو client/src/api/groupApi.ts نگه می‌داریم
// (studentIds: string[] به‌جای آبجکت کامل کاربرها) تا وصل کردن فرانت به این
// روت‌ها بعداً فقط جایگزینی تابع باشه، نه تغییر تایپ‌ها
export function serializeGroup(group: {
  id: string;
  name: string;
  category: string;
  instructorId: string;
  joinCode: string;
  students: { id: string }[];
}) {
  return {
    id: group.id,
    name: group.name,
    category: group.category,
    instructorId: group.instructorId,
    joinCode: group.joinCode,
    studentIds: group.students.map((s) => s.id),
  };
}

export const withStudents = { students: { select: { id: true } } } as const;

// studentIds از بدنه‌ی درخواست میاد و مستقیم به connect/set می‌رفت - یعنی یه
// Instructor می‌تونست هر userId دلخواهی (Instructor/SuperAdmin دیگه، یا
// دانشجوی مدرس دیگه) رو به گروه خودش وصل کنه و بعد از GET /groups/:id لیستشون
// رو بخونه، یا با id ناموجود خطای ۵۰۰ بگیره. الان: همه‌ی idها باید واقعاً
// User با role=Student باشن، و برای Instructor فقط دانشجوهایی که از قبل عضو
// یکی از گروه‌های خودشن (عضویت جدید فقط با کد عضویت، POST /groups/join).
// پیام خطا عمداً یکسانه تا وجود/عدم وجود یه id لو نره.
export async function resolveStudentIds(
  rawIds: string[],
  role: Role,
  instructorId: string
): Promise<{ id: string }[]> {
  const ids = [...new Set(rawIds)];
  if (ids.length === 0) return [];

  const valid = await prisma.user.count({
    where: {
      id: { in: ids },
      role: 'Student',
      ...(role === 'Instructor'
        ? { groupsMember: { some: { instructorId } } }
        : {}),
    },
  });
  if (valid !== ids.length) {
    throw badRequest('لیست دانشجوها نامعتبره');
  }
  return ids.map((id) => ({ id }));
}