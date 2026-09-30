"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const notifications_1 = require("../../lib/notifications");
const session_1 = require("../../lib/session");
const socket_1 = require("../../realtime/socket");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const instructors_service_1 = require("./instructors.service");
const router = (0, express_1.Router)();
// لیست مدرس‌ها بر اساس approvalStatus - پیش‌فرض Pending (صفِ تاییدِ اصلی)،
// با query ?status=Approved یا ?status=Rejected هم می‌شه بقیه رو دید
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const status = req.query.status || 'Pending';
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        throw (0, errors_1.badRequest)('status نامعتبره');
    }
    const instructors = await prisma_1.prisma.user.findMany({
        where: {
            role: 'Instructor',
            approvalStatus: status,
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(instructors.map(instructors_service_1.serializeInstructor));
}));
router.post('/:id/approve', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== 'Instructor') {
        throw (0, errors_1.notFound)('مدرس پیدا نشد');
    }
    // idempotent: کلیک/درخواست تکراری نباید اعلانِ تکراری بفرسته
    if (user.approvalStatus === 'Approved') {
        res.json((0, instructors_service_1.serializeInstructor)(user));
        return;
    }
    const updated = await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { approvalStatus: 'Approved' },
    });
    (0, notifications_1.notifyUser)(updated.id, 'حساب مدرسی‌ت تایید شد - می‌تونی وارد بشی', 'award').catch((err) => console.error('notifyUser failed:', err));
    res.json((0, instructors_service_1.serializeInstructor)(updated));
}));
router.post('/:id/reject', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role !== 'Instructor') {
        throw (0, errors_1.notFound)('مدرس پیدا نشد');
    }
    // باگ قبلی: وقتی approvalStatus از قبل Rejected بود، هندلر زودتر از
    // revokeSession برمی‌گشت. یعنی اگه دفعه‌ی قبلی درست بعد از آپدیتِ ردیف
    // (که همیشه موفق می‌شه) revokeSession به‌خاطر قطعیِ Redis خطا داده بود،
    // approvalStatus از قبل Rejected مونده بود ولی نشستِ ردیس هنوز زنده بود
    // - و retry بعدیِ ادمین هم چون همین شرط رو می‌دید، همون‌جا زودتر برمی‌گشت
    // و دیگه هیچ‌وقت دوباره تلاش نمی‌کرد ابطالِ نشست رو انجام بده.
    // الان آپدیتِ ردیف (اگه لازم بود) و ابطالِ نشست از هم جدا شدن: ابطالِ
    // نشست همیشه اجرا می‌شه (حتی روی retry بعد از خطای قبلی) چون idempotent
    // ـه - پاک‌کردنِ کلیدی که از قبل وجود نداره خطا نمی‌ده.
    const alreadyRejected = user.approvalStatus === 'Rejected';
    const updated = alreadyRejected
        ? user
        : await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { approvalStatus: 'Rejected' },
        });
    // با توکن قبلی (تا وقتی خودش logout نکنه) همچنان می‌تونست گروه/آزمون
    // بسازه، چون requireAuth فقط sessionId رو چک می‌کنه، نه approvalStatus
    // رو از دیتابیس. با revokeSession همین الان از سیستم پرت می‌شه بیرون.
    await (0, session_1.revokeSession)(updated.id);
    (0, socket_1.forceLogoutOtherSessions)(updated.id, undefined, 'account-rejected');
    if (!alreadyRejected) {
        (0, notifications_1.notifyUser)(updated.id, 'درخواست ثبت‌نام مدرسی‌ت رد شد', 'info').catch((err) => console.error('notifyUser failed:', err));
    }
    res.json((0, instructors_service_1.serializeInstructor)(updated));
}));
exports.default = router;
