"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/questions/examQuestions.routes.ts
const express_1 = require("express");
const examQuestionsRead_routes_1 = __importDefault(require("./examQuestionsRead.routes"));
const examQuestionsManage_routes_1 = __importDefault(require("./examQuestionsManage.routes"));
// خواندن (دانشجو + مدرس) و مدیریت (ایجاد/ویرایش/حذف، فقط مدرس/ادمین) قبلاً
// تو یه router بودن؛ کنترل دسترسیِ مشترک (loadExamOrThrow) و سریالایزِ
// سوال (serializeExamQuestion) به examQuestions.service.ts منتقل شدن تا
// دوباره‌نویسی نشن
const router = (0, express_1.Router)({
    mergeParams: true,
});
router.use('/', examQuestionsRead_routes_1.default);
router.use('/', examQuestionsManage_routes_1.default);
exports.default = router;
