import { Router } from 'express';

import examQuestionsReadRoutes from './examQuestionsRead.routes';
import examQuestionsManageRoutes from './examQuestionsManage.routes';

const router = Router({
  mergeParams: true,
});

router.use('/', examQuestionsReadRoutes);
router.use('/', examQuestionsManageRoutes);

export default router;
