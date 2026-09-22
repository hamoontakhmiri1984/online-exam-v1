import { Router } from 'express';

import {
  otpSendLimiter,
  otpVerifyLimiter,
} from '../../../middleware/rateLimiters';

import {
  otpRequestSchema,
  otpVerifySchema,
} from '../../../validation/authSchemas';

import { asyncHandler } from '../../../lib/asyncHandler';
import { badRequest } from '../../../lib/errors';
import { setRefreshCookie } from '../../../lib/authTokens';

import {
  requestOtp,
  verifyOtpCode,
} from './otp.service';

const router = Router();

router.post(
  '/otp/request',
  otpSendLimiter,
  asyncHandler(async (req, res) => {
    const parsed =
      otpRequestSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]
          ?.message ??
          'اطلاعات درخواست کد نامعتبره',
      );
    }

    const result =
      await requestOtp(
        parsed.data,
        req.ip ?? 'unknown',
      );

    return res.json(result);
  }),
);

router.post(
  '/otp/verify',
  otpVerifyLimiter,
  asyncHandler(async (req, res) => {
    const parsed =
      otpVerifySchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      throw badRequest(
        parsed.error.issues[0]
          ?.message ??
          'اطلاعات کد تایید نامعتبره',
      );
    }

    const result =
      await verifyOtpCode(
        parsed.data,
      );

    if (result.type === 'reset') {
      return res.json({
        resetTicket:
          result.resetTicket,
      });
    }

    if (
      result.type === 'pending'
    ) {
      return res.json({
        pendingApproval: true,
        message: result.message,
      });
    }

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

export default router;