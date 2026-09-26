import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/requireAuth';
import instructorsRoutes from './admin/instructors.routes';
import categoriesRoutes from './admin/categories.routes';

const router = Router();
// فقط SuperAdmin به این route ها دسترسی داره
router.use(requireAuth, requireRole('SuperAdmin'));

router.use('/instructors', instructorsRoutes);
router.use('/categories', categoriesRoutes);

export default router;