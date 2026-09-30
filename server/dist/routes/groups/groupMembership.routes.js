"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const requireAuth_1 = require("../../middleware/requireAuth");
const joinCode_1 = require("../../lib/joinCode");
const notifications_1 = require("../../lib/notifications");
const asyncHandler_1 = require("../../lib/asyncHandler");
const groupSchemas_1 = require("../../validation/groupSchemas");
const rateLimiters_1 = require("../../middleware/rateLimiters");
const groups_service_1 = require("./groups.service");
const router = (0, express_1.Router)();
// دانشجو با کد عضویت، خودش رو به گروه اضافه می‌کنه - idempotent (اگه از
// قبل عضو بود، خطا نمی‌ده و همون گروه رو برمی‌گردونه)
router.post('/join', (0, requireAuth_1.requireRole)('Student'), rateLimiters_1.joinGroupLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = groupSchemas_1.joinGroupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });
    const normalizedCode = parsed.data.joinCode.trim().toUpperCase();
    const group = await prisma_1.prisma.group.findUnique({
        where: { joinCode: normalizedCode },
        include: groups_service_1.withStudents,
    });
    if (!group)
        return res.status(404).json({ error: 'کد عضویت نامعتبره' });
    const alreadyMember = group.students.some((s) => s.id === req.user.sub);
    if (!alreadyMember) {
        await prisma_1.prisma.group.update({
            where: { id: group.id },
            data: { students: { connect: { id: req.user.sub } } },
        });
        // اعلان برای خودِ دانشجو - دقیقاً معادل notifyStudentAddedToGroup تو mock
        // (client/src/api/notificationApi.ts) که از addStudentToGroup صدا زده می‌شد
        await (0, notifications_1.notifyUser)(req.user.sub, `به گروه «${group.name}» اضافه شدی`, 'people');
        // به‌علاوه: به مدرس هم خبر بده که یه دانشجوی جدید پیوست (چیزی که mock
        // نداشت ولی برای مدرس مفیده)
        await (0, notifications_1.notifyUser)(group.instructorId, `یه دانشجوی جدید به گروه «${group.name}» پیوست`, 'people');
    }
    const updated = await prisma_1.prisma.group.findUnique({
        where: { id: group.id },
        include: groups_service_1.withStudents,
    });
    res.json((0, groups_service_1.serializeGroup)(updated));
}));
// کد قدیمی رو باطل و یه کد جدید می‌سازه - فقط مالک گروه یا SuperAdmin
router.post('/:id/regenerate-join-code', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    if (req.user.role === 'Instructor' &&
        existing.instructorId !== req.user.sub) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    const joinCode = await (0, joinCode_1.generateUniqueJoinCode)();
    const group = await prisma_1.prisma.group.update({
        where: { id: req.params.id },
        data: { joinCode },
        include: groups_service_1.withStudents,
    });
    res.json((0, groups_service_1.serializeGroup)(group));
}));
exports.default = router;
