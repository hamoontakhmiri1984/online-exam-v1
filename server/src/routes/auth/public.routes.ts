import { Router } from 'express';

import { createCaptcha } from '../../lib/captcha';
import {
  normalizeUsername,
  validateUsernameFormat,
  isUsernameTaken,
  suggestUsernameAlternatives,
} from '../../lib/username';

import {
  captchaLimiter,
  usernameCheckLimiter,
} from '../../middleware/rateLimiters';

import { asyncHandler } from '../../lib/asyncHandler';

const router = Router();

router.get(
  '/username-available',
  usernameCheckLimiter,
  asyncHandler(async (req, res) => {
    const raw =
      typeof req.query.username === 'string'
        ? req.query.username
        : '';

    const formatCheck =
      validateUsernameFormat(raw);

    if (!formatCheck.valid) {
      return res.json({
        available: false,
        reason:
          formatCheck.error ??
          'نام کاربری نامعتبره',
      });
    }

    const username =
      normalizeUsername(raw);

    const taken =
      await isUsernameTaken(
        username,
      );

    if (taken) {
      const suggestions =
        await suggestUsernameAlternatives(
          raw,
        );

      return res.json({
        available: false,
        reason:
          'این نام کاربری قبلاً گرفته شده',
        suggestions,
      });
    }

    return res.json({
      available: true,
    });
  }),
);

router.get(
  '/captcha',
  captchaLimiter,
  asyncHandler(async (_req, res) => {
    const {
      captchaId,
      svg,
    } = await createCaptcha();

    return res.json({
      captchaId,
      svg,
    });
  }),
);

export default router;