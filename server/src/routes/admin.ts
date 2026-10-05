import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/requireAuth';
import instructorsRoutes from './admin/instructors.routes';
import categoriesRoutes from './admin/categories.routes';
import usersRoutes from './admin/users.routes';

import approvalPolicyRoutes from './admin/approvalPolicy.routes';
import groupApprovalsRoutes from './admin/groupApprovals.routes';

const router = Router();
// فقط SuperAdmin به این route ها دسترسی داره
router.use(requireAuth, requireRole('SuperAdmin'));

router.use('/instructors', instructorsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/users', usersRoutes);
router.use('/approval-policy', approvalPolicyRoutes);
router.use('/group-approvals', groupApprovalsRoutes);

export default router;