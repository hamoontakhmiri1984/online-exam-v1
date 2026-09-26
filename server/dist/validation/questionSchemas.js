"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addBankQuestionsToExamSchema = exports.bulkQuestionsSchema = exports.updateQuestionSchema = exports.createQuestionSchema = void 0;
const zod_1 = require("zod");
exports.createQuestionSchema = zod_1.z
    .object({
    text: zod_1.z.string().min(2).max(5000),
    options: zod_1.z.array(zod_1.z.string().min(1).max(1000)).min(2).max(10),
    correctOptionIndex: zod_1.z.number().int().min(0),
    difficulty: zod_1.z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
})
    .refine((data) => data.correctOptionIndex < data.options.length, {
    message: 'correctOptionIndex باید به یکی از گزینه‌ها اشاره کنه',
    path: ['correctOptionIndex'],
});
exports.updateQuestionSchema = exports.createQuestionSchema;
exports.bulkQuestionsSchema = zod_1.z
    .array(exports.createQuestionSchema)
    .min(1)
    .max(500);
exports.addBankQuestionsToExamSchema = zod_1.z.object({
    questionIds: zod_1.z
        .array(zod_1.z.string().min(1))
        .min(1)
        .max(100)
        .refine((ids) => new Set(ids).size === ids.length, {
        message: 'سوال تکراری در انتخاب وجود دارد',
    }),
});
