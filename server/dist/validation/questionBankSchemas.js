"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuestionBankSchema = exports.createQuestionBankSchema = void 0;
const zod_1 = require("zod");
// category دقیقاً هم‌الگوی Group/Exam - رشته‌ی آزاد (نه enum، نه FK به
// مدل Category)، طبق همون تصمیم معماری که رو اون دوتا هم گرفته شده بود
exports.createQuestionBankSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    category: zod_1.z.string().min(1),
});
exports.updateQuestionBankSchema = exports.createQuestionBankSchema;
