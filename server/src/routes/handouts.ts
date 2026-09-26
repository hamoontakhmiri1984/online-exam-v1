import { Router } from 'express';

import handoutsRoutes from './handouts/handouts.routes';

const router = Router();

router.use('/', handoutsRoutes);

export default router;