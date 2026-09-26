import { Router } from 'express';

import banksRoutes from './questionBanks/banks.routes';
import bankQuestionsRoutes from './questionBanks/bankQuestions.routes';

const router = Router();

router.use('/', banksRoutes);
router.use('/', bankQuestionsRoutes);

export default router;
