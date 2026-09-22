import { Router } from 'express';

import {
  passwordLoginSchema,
  resetPasswordSchema,
} from '../../../validation/authSchemas';

import { authLimiter } from '../../../middleware/rateLimiters';
import { asyncHandler } from '../../../lib/asyncHandler';
import { badRequest } from '../../../lib/errors';

import {
  setRefreshCookie,
} from '../../../lib/authTokens';

import {
  loginWithPassword,
  resetPassword,
} from './password.service';

const router = Router();

router.post(
  '/login/password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed =
      passwordLoginSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]
          ?.message ??
          'اطلاعات ورود نامعتبره',
      );
    }

    const ip =
      req.ip ?? 'unknown';

    const result =
      await loginWithPassword(
        parsed.data,
        ip,
      );

    setRefreshCookie(
      res,
      result.refreshToken,
      result.rememberMe,
    );

    return res.json({
      accessToken:
        result.accessToken,

      user: result.user,
    });
  }),
);

router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed =
      resetPasswordSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]
          ?.message ??
          'اطلاعات نامعتبره',
      );
    }

    const result =
      await resetPassword(
        parsed.data.resetTicket,
        parsed.data.newPassword,
      );

    return res.json(result);
  }),
);

export default router;