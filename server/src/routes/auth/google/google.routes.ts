import { Router } from 'express';

import { prisma } from '../../../lib/prisma';

import { requireAuth } from '../../../middleware/requireAuth';

import { googleAuthSchema } from '../../../validation/authSchemas';

import { authLimiter } from '../../../middleware/rateLimiters';

import { asyncHandler } from '../../../lib/asyncHandler';

import { AppError, badRequest } from '../../../lib/errors';

import { setRefreshCookie } from '../../../lib/authTokens';

import { serializeMe } from '../auth.helpers';

import { linkGoogleAccount, loginWithGoogle } from './google.service';

const router = Router();

router.post(
  '/google/unlink',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({
      where: {
        id: req.user!.sub,
      },
    });

    if (!existing) {
      throw new AppError(401, 'کاربر پیدا نشد');
    }

    if (!existing.googleId) {
      throw badRequest('حساب گوگلی به این اکانت وصل نیست');
    }

    const user = await prisma.user.update({
      where: {
        id: req.user!.sub,
      },
      data: {
        googleId: null,
      },
    });

    res.json(serializeMe(user));
  })
);

router.post(
  '/google/link',
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = googleAuthSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    try {
      const user = await linkGoogleAccount(req.user!.sub, parsed.data.idToken);

      return res.json(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      return res.status(401).json({
        error: 'اتصال حساب گوگل ناموفق بود',
      });
    }
  })
);

router.post(
  '/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = googleAuthSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    try {
      const result = await loginWithGoogle(parsed.data.idToken);

      if (result.type === 'pending') {
        return res.json({
          pendingApproval: true,
          message: result.message,
        });
      }

      setRefreshCookie(res, result.refreshToken);

      return res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      return res.status(401).json({
        error: 'ورود با گوگل ناموفق بود',
      });
    }
  })
);

export default router;
