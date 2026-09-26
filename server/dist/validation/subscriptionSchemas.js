"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignPlanSchema = exports.checkoutSchema = exports.selectPlanSchema = void 0;
const zod_1 = require("zod");
const planIdSchema = zod_1.z.enum(['free', 'gold', 'platinum', 'vip']);
exports.selectPlanSchema = zod_1.z.object({
    planId: planIdSchema,
});
// همون planId رو می‌خواد - amount رو کلاینت نمی‌فرسته، سرور خودش از
// server/src/lib/plans.ts می‌خونه (تا کسی نتونه amount رو دستکاری کنه)
exports.checkoutSchema = zod_1.z.object({
    planId: planIdSchema,
});
exports.assignPlanSchema = zod_1.z.object({
    instructorId: zod_1.z.string().min(1),
    planId: planIdSchema,
});
