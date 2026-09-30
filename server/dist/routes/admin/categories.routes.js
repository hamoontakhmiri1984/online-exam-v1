"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const categories_1 = require("../../lib/categories");
const categorySchemas_1 = require("../../validation/categorySchemas");
const router = (0, express_1.Router)();
// لیستِ کاملِ دسته‌بندی‌ها برای پنلِ ادمین. پیش‌فرض همون صفِ Pending (که
// نیازِ اصلیِ رسیدگیه)، با ?status=Approved یا بدونِ status هم می‌شه بقیه/همه
// رو دید - هم‌الگو با /admin/instructors
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const status = req.query.status;
    if (status && !['Pending', 'Approved'].includes(status)) {
        throw (0, errors_1.badRequest)('status نامعتبره');
    }
    res.json(await (0, categories_1.listCategoriesForAdmin)(status));
}));
// اضافه‌کردنِ مستقیمِ یه دسته توسط SuperAdmin - همون لحظه Approved می‌شه
router.post('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = categorySchemas_1.proposeCategorySchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }
    res.status(201).json(await (0, categories_1.adminCreateCategory)(parsed.data.name));
}));
router.post('/:id/approve', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json(await (0, categories_1.approveCategory)(req.params.id));
}));
// تغییرِ نامِ یه دسته - با cascade رویِ گروه/آزمون/جلسه‌هایی که ازش استفاده
// کردن (جزئیات تو lib/categories.ts -> renameCategory)
router.patch('/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = categorySchemas_1.renameCategorySchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }
    res.json(await (0, categories_1.renameCategory)(req.params.id, parsed.data.name));
}));
// رد کردنِ یه پیشنهادِ Pending یا حذفِ یه دسته‌ی Approved که دیگه جایی
// استفاده نمی‌شه
router.delete('/:id', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await (0, categories_1.deleteOrRejectCategory)(req.params.id);
    res.status(204).send();
}));
exports.default = router;
