"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameCategorySchema = exports.proposeCategorySchema = void 0;
const zod_1 = require("zod");
exports.proposeCategorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'نام دسته‌بندی الزامیه').max(50),
});
exports.renameCategorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'نام دسته‌بندی الزامیه').max(50),
});
