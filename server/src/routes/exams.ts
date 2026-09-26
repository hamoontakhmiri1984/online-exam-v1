import { Router } from 'express';

import examsRoutes from './exams/exams.routes';

const router = Router();

router.use('/', examsRoutes);

export default router;