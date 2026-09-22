import { Router } from 'express';

import { registerSchema } from '../../../validation/authSchemas';
import { otpSendLimiter } from '../../../middleware/rateLimiters';
import { asyncHandler } from '../../../lib/asyncHandler';
import { badRequest } from '../../../lib/errors';

import { registerUser } from './register.service';

const router = Router();

router.post(
  '/register',
  otpSendLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]
          ?.message ??
          'اطلاعات ثبت‌نام نامعتبره',
      );
    }

    const result =
      await registerUser(
        parsed.data,
        req.ip ?? 'unknown',
      );

    if (
      result.status ===
      'username_taken'
    ) {
      return res.status(409).json({
        error: result.message,
        suggestions:
          result.usernameSuggestions,
      });
    }

    return res.status(201).json({
      message:
        'کد تایید ارسال شد',
      identifier:
        result.identifier,
    });
  }),
);

export default router;