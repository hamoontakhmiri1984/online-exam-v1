"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const categories_1 = require("../lib/categories");
const categorySchemas_1 = require("../validation/categorySchemas");
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
// همه‌ی نقش‌ها (نه فقط Instructor) می‌تونن لیست رو بخونن - چون فرم‌های
// گروه/آزمون فقط برای Instructor باز می‌شن، ولی محدودش نمی‌کنیم که اگه
// یه‌روز SuperAdmin هم مستقیم از فرم‌های مشابه استفاده کرد، بشکنه
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sub } = req.user;
    res.json(await (0, categories_1.listCategoriesForInstructor)(sub));
}));
// پیشنهادِ دسته‌بندیِ جدید (idempotent - اگه از قبل بود همونو برمی‌گردونه).
// برخلافِ GET، اینجا فقط Instructor مجازه - چون proposedById/نوتیف‌های
// SuperAdmin و کل مدلِ داده فرض کرده پیشنهاددهنده مدرسه (لاگ باگ: قبلاً
// این روت هیچ requireRole نداشت و یه دانشجو هم می‌تونست صف تاییدِ ادمین
// رو با پیشنهادهای الکی اسپم کنه).
router.post('/', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = categorySchemas_1.proposeCategorySchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]?.message ?? 'ورودی نامعتبره');
    }
    const { sub } = req.user;
    const { category, created } = await (0, categories_1.proposeCategory)(sub, parsed.data.name);
    res.status(created ? 201 : 200).json(category);
}));
exports.default = router;
