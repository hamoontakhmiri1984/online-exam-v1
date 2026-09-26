import { Router } from 'express';

import { requireAuth } from '../middleware/requireAuth';
import groupsRoutes from './groups/groups.routes';
import groupMembershipRoutes from './groups/groupMembership.routes';

const router = Router();

router.use(requireAuth);
router.use('/', groupsRoutes);
router.use('/', groupMembershipRoutes);

export default router;