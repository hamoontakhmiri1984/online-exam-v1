"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const requireAuth_1 = require("../../middleware/requireAuth");
const joinCode_1 = require("../../lib/joinCode");
const asyncHandler_1 = require("../../lib/asyncHandler");
const groupSchemas_1 = require("../../validation/groupSchemas");
const quota_1 = require("../../lib/quota");
const groups_service_1 = require("./groups.service");
const router = (0, express_1.Router)();
// دسترسی به لیست گروه‌ها بسته به نقشه: SuperAdmin همه رو می‌بینه، Instructor
// فقط گروه‌های خودش، Student فقط گروه‌هایی که عضوشونه - دقیقاً معادل
// visibleGroups/useGroups تو فرانت
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { role, sub } = req.user;
    const where = role === 'SuperAdmin'
        ? {}
        : role === 'Instructor'
            ? { instructorId: sub }
            : { students: { some: { id: sub } } };
    const groups = await prisma_1.prisma.group.findMany({
        where,
        include: groups_service_1.withStudents,
    });
    res.json(groups.map(groups_service_1.serializeGroup));
}));
router.get('/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const group = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
        include: groups_service_1.withStudents,
    });
    if (!group)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    const { role, sub } = req.user;
    const isOwner = role === 'Instructor' && group.instructorId === sub;
    const isMember = role === 'Student' && group.students.some((s) => s.id === sub);
    if (role !== 'SuperAdmin' && !isOwner && !isMember) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    res.json((0, groups_service_1.serializeGroup)(group));
}));
// فقط مدرس گروه می‌سازه؛ joinCode همیشه سمت سرور تولید می‌شه، نه چیزی که
// از بدنه‌ی درخواست بیاد
router.post('/', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = groupSchemas_1.createGroupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });
    const studentConnect = await (0, groups_service_1.resolveStudentIds)(parsed.data.studentIds, req.user.role, req.user.sub);
    const joinCode = await (0, joinCode_1.generateUniqueJoinCode)();
    // محدودیت پلن - همون چیزی که PlanLimitModal سمت فرانت قبل از باز کردن فرم
    // چک می‌کنه؛ اینجا سمت سرور و *اتمیک با ساخت* اعمال می‌شه (چک و create
    // داخل یه تراکنش پشت قفل مدرس - lib/quota.ts). خطای ۴۰۳ همون شکل قبلی
    // {error, reason} رو داره (AppError → errorHandler)
    const group = await (0, quota_1.withQuotaLock)(req.user.sub, 'groups', 1, (db) => db.group.create({
        data: {
            name: parsed.data.name,
            category: parsed.data.category,
            instructorId: req.user.sub,
            joinCode,
            students: { connect: studentConnect },
        },
        include: groups_service_1.withStudents,
    }));
    res.status(201).json((0, groups_service_1.serializeGroup)(group));
}));
// ویرایش (اسم/دسته‌بندی/لیست دانشجوها) - joinCode دست‌نخورده می‌مونه، دقیقاً
// مثل updateGroup تو mock. فقط مالک گروه (یا SuperAdmin) اجازه داره.
router.put('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    if (req.user.role === 'Instructor' &&
        existing.instructorId !== req.user.sub) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    const parsed = groupSchemas_1.updateGroupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0].message });
    // برای SuperAdmin: هر Student معتبری؛ برای Instructor: طبق قاعده‌ی بالا
    // (دانشجوهای فعلیِ همین گروه هم عضو گروه خودش حساب می‌شن)
    const studentSet = await (0, groups_service_1.resolveStudentIds)(parsed.data.studentIds, req.user.role, existing.instructorId);
    const group = await prisma_1.prisma.group.update({
        where: { id: req.params.id },
        data: {
            name: parsed.data.name,
            category: parsed.data.category,
            students: { set: studentSet },
        },
        include: groups_service_1.withStudents,
    });
    res.json((0, groups_service_1.serializeGroup)(group));
}));
router.delete('/:id', (0, requireAuth_1.requireRole)('Instructor', 'SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.group.findUnique({
        where: { id: req.params.id },
    });
    if (!existing)
        return res.status(404).json({ error: 'گروه یافت نشد' });
    if (req.user.role === 'Instructor' &&
        existing.instructorId !== req.user.sub) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    await prisma_1.prisma.group.delete({ where: { id: req.params.id } });
    res.status(204).end();
}));
exports.default = router;
