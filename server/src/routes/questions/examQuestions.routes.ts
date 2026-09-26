// server/src/routes/questions/examQuestions.routes.ts
import { Router } from 'express';

import examQuestionsReadRoutes from './examQuestionsRead.routes';
import examQuestionsManageRoutes from './examQuestionsManage.routes';

// خواندن (دانشجو + مدرس) و مدیریت (ایجاد/ویرایش/حذف، فقط مدرس/ادمین) قبلاً
// تو یه router بودن؛ کنترل دسترسیِ مشترک (loadExamOrThrow) و سریالایزِ
// سوال (serializeExamQuestion) به examQuestions.service.ts منتقل شدن تا
// دوباره‌نویسی نشن
const router = Router({
  mergeParams: true,
});

router.use('/', examQuestionsReadRoutes);
router.use('/', examQuestionsManageRoutes);

export default router;