import { Router } from 'express';

import examQuestionsRoutes from './questions/examQuestions.routes';
import questionBankImportRoutes from './questions/questionBankImport.routes';

const router = Router({
  mergeParams: true,
});

router.use('/', examQuestionsRoutes);
router.use('/', questionBankImportRoutes);

export default router;