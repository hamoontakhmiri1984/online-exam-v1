import { Router } from 'express';

import attemptLifecycleRoutes from './examAttempts/attemptLifecycle.routes';
import attemptQueriesRoutes from './examAttempts/attemptQueries.routes';

const router = Router({ mergeParams: true });

router.use('/', attemptLifecycleRoutes);
router.use('/', attemptQueriesRoutes);

export default router;