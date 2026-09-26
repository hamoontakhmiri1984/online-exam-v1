import { Router } from 'express';

import lessonSessionsRoutes from './lessonSessions/lessonSessions.routes';

const router = Router();

router.use('/', lessonSessionsRoutes);

export default router;