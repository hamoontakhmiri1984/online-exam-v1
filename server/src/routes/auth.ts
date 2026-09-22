import { Router } from 'express';

import publicRoutes from './auth/public.routes';
import registerRoutes from './auth/register/register.routes';
import otpRoutes from './auth/otp/otp.routes';
import passwordRoutes from './auth/password/password.routes';
import sessionRoutes from './auth/session.routes';
import profileRoutes from './auth/profile.routes';
import googleRoutes from './auth/google/google.routes';

const router = Router();

router.use('/', publicRoutes);
router.use('/', registerRoutes);
router.use('/', otpRoutes);
router.use('/', passwordRoutes);
router.use('/', sessionRoutes);
router.use('/', profileRoutes);
router.use('/', googleRoutes);

export default router;