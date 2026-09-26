import { Router } from 'express';

import blogRoutes from './blog/blog.routes';

const router = Router();

router.use('/', blogRoutes);

export default router;