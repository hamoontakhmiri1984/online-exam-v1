import { logEvent } from '../../../lib/logger';
import { env } from '../../../config/env';
import { prisma } from '../../../lib/prisma';

import {
  createOtp,
  simulateOtpCreationCost,
  verifyOtp,
} from '../../../lib/otp';

import {
  assertOtpSendAllowed,
  assertOtpVerifyCaptcha,
} from '../../../lib/otpAbuseGuard';

import { sendOtp } from '../../../services/otpSender';

import { issueTokenPair, signResetTicket } from '../../../lib/authTokens';

import { forceLogoutOtherSessions } from '../../../realtime/socket';

import { AppError, badRequest, notFound } from '../../../lib/errors';

import {
  resolveIdentifier,
  instructorApprovalBlockMessage,
} from '../auth.helpers';

type OtpPurpose = 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD';

type RequestOtpData = {
  identifier: string;
  purpose: OtpPurpose;
  captchaId?: string;
  captchaAnswer?: string;
};

type VerifyOtpData = {
  identifier: string;
  purpose: OtpPurpose;
  code: string;
  rememberMe?: boolean;
  captchaId?: string;
  captchaAnswer?: string;
};

const OTP_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'کدی برای این شناسه پیدا نشد. دوباره درخواست بده',

  expired: 'کد منقضی شده. دوباره درخواست بده',

  too_many_attempts: 'تعداد تلاش‌ها بیش از حد مجازه. کد جدید بگیر',

  invalid_code: 'کد وارد شده اشتباهه',
};

export async function requestOtp(data: RequestOtpData, ip: string) {
  const resolved = resolveIdentifier(data.identifier);

  if (!resolved) {
    throw badRequest('ایمیل یا شماره موبایل نامعتبره');
  }

  const { value, channel, type } = resolved;

  await assertOtpSendAllowed({
    ip,
    identifier: value,
    captchaId: data.captchaId,
    captchaAnswer: data.captchaAnswer,
  });

  if (data.purpose !== 'REGISTER') {
    const where =
      type === 'EMAIL'
        ? {
            email: value,
          }
        : {
            phone: value,
          };

    const user = await prisma.user.findFirst({
      where,
    });

    // Use the same response and comparable work for existing and absent accounts.
    if (user) {
      const { code } = await createOtp({
        identifier: value,
        channel,
        purpose: data.purpose,
        userId: user.id,
      });

      if (env.NODE_ENV === 'development') logEvent('info', `[OTP] ${data.purpose}: code_created`);
      sendOtp({ identifier: value, channel, code }).catch((error) => {
        logEvent('error', 'sendOtp failed:', error);
      });
    } else {
      if (env.NODE_ENV === 'development') logEvent('info', `[OTP] ${data.purpose}: account_not_found; no code created`);
      await simulateOtpCreationCost();
    }

    return {
      message: 'اگر این حساب وجود داشته باشه، کد ارسال می‌شه',
    };
  }

  const { code } = await createOtp({
    identifier: value,
    channel,
    purpose: data.purpose,
  });

  await deliverOtp(value, channel, code);

  return {
    message: 'کد تایید ارسال شد',
  };
}

export async function verifyOtpCode(data: VerifyOtpData, ip: string) {
  const resolved = resolveIdentifier(data.identifier);

  if (!resolved) {
    throw badRequest('ایمیل یا شماره موبایل نامعتبره');
  }

  const { value, type } = resolved;

  // A bad captcha must not consume an OTP verification attempt.
  if (data.purpose === 'LOGIN') {
    await assertOtpVerifyCaptcha({
      ip,
      captchaId: data.captchaId,
      captchaAnswer: data.captchaAnswer,
    });
  }

  const result = await verifyOtp({
    identifier: value,
    purpose: data.purpose,
    code: data.code,
  });

  if (!result.ok) {
    throw badRequest(OTP_ERROR_MESSAGES[result.reason] ?? 'کد تایید نامعتبره');
  }

  const where =
    type === 'EMAIL'
      ? {
          email: value,
        }
      : {
          phone: value,
        };

  let user = await prisma.user.findFirst({
    where,
  });

  if (!user) {
    throw notFound('کاربر پیدا نشد');
  }

  // Discard passwords set before the identifier owner completed verification.
  const wasNeverVerified = !user.emailVerifiedAt && !user.phoneVerifiedAt;

  if (type === 'EMAIL') {
    if (!user.emailVerifiedAt) {
      user = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerifiedAt: new Date(),
        },
      });
    }
  } else if (!user.phoneVerifiedAt) {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        phoneVerifiedAt: new Date(),
      },
    });
  }

  if (wasNeverVerified && data.purpose !== 'REGISTER' && user.passwordHash) {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: null,
      },
    });
  }

  if (data.purpose === 'RESET_PASSWORD') {
    return {
      type: 'reset' as const,

      resetTicket: await signResetTicket(user.id),
    };
  }

  const approvalMessage = instructorApprovalBlockMessage(user);

  if (approvalMessage) {
    return {
      type: 'pending' as const,
      message: approvalMessage,
    };
  }

  const rememberMe =
    data.purpose === 'REGISTER' ? true : Boolean(data.rememberMe);

  const { accessToken, refreshToken, sid } = await issueTokenPair(
    user.id,
    user.role,
    rememberMe
  );

  forceLogoutOtherSessions(user.id, sid);

  return {
    type: 'authenticated' as const,

    accessToken,
    refreshToken,
    rememberMe,

    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username,

      onboardingCompleted: user.onboardingCompleted,

      organizationName: user.organizationName,
    },
  };
}

async function deliverOtp(
  identifier: string,
  channel: 'EMAIL' | 'SMS',
  code: string
) {
  try {
    await sendOtp({
      identifier,
      channel,
      code,
    });
  } catch (error) {
    logEvent('error', 'sendOtp failed:', error);

    throw new AppError(502, 'ارسال کد تایید ناموفق بود، دوباره تلاش کن');
  }
}
