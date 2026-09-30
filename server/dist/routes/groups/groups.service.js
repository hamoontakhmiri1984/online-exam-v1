"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withStudents = void 0;
exports.serializeGroup = serializeGroup;
exports.resolveStudentIds = resolveStudentIds;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
// شکل خروجی رو دقیقاً هم‌شکل Group تو client/src/api/groupApi.ts نگه می‌داریم
// (studentIds: string[] به‌جای آبجکت کامل کاربرها) تا وصل کردن فرانت به این
// روت‌ها بعداً فقط جایگزینی تابع باشه، نه تغییر تایپ‌ها
function serializeGroup(group) {
    return {
        id: group.id,
        name: group.name,
        category: group.category,
        instructorId: group.instructorId,
        joinCode: group.joinCode,
        studentIds: group.students.map((s) => s.id),
    };
}
exports.withStudents = { students: { select: { id: true } } };
// studentIds از بدنه‌ی درخواست میاد و مستقیم به connect/set می‌رفت - یعنی یه
// Instructor می‌تونست هر userId دلخواهی (Instructor/SuperAdmin دیگه، یا
// دانشجوی مدرس دیگه) رو به گروه خودش وصل کنه و بعد از GET /groups/:id لیستشون
// رو بخونه، یا با id ناموجود خطای ۵۰۰ بگیره. الان: همه‌ی idها باید واقعاً
// User با role=Student باشن، و برای Instructor فقط دانشجوهایی که از قبل عضو
// یکی از گروه‌های خودشن (عضویت جدید فقط با کد عضویت، POST /groups/join).
// پیام خطا عمداً یکسانه تا وجود/عدم وجود یه id لو نره.
async function resolveStudentIds(rawIds, role, instructorId) {
    const ids = [...new Set(rawIds)];
    if (ids.length === 0)
        return [];
    const valid = await prisma_1.prisma.user.count({
        where: {
            id: { in: ids },
            role: 'Student',
            ...(role === 'Instructor'
                ? { groupsMember: { some: { instructorId } } }
                : {}),
        },
    });
    if (valid !== ids.length) {
        throw (0, errors_1.badRequest)('لیست دانشجوها نامعتبره');
    }
    return ids.map((id) => ({ id }));
}
