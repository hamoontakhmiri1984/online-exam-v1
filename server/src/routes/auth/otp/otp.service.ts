import { prisma } from '../../../lib/prisma';

import {
  createOtp,
  simulateOtpCreationCost,
  verifyOtp,
} from '../../../lib/otp';

import { assertOtpSendAllowed } from '../../../lib/otpAbuseGuard';

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

  // قبل از هر lookup/ارسالی؛ روی همه‌ی purpose ها یکسان اعمال می‌شه تا
  // پاسخ‌ش وجود/عدم وجود حساب رو لو نده
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

    // پاسخ باید برای حساب موجود/ناموجود از نظر محتوا و زمان یکسان باشه:
    // ارسال کد (ایمیل/پیامک) منتظر نمی‌مونه - وگرنه هم تاخیرش و هم خطای 502
    // ارسال، وجود حساب رو لو می‌داد. خطای ارسال فقط لاگ می‌شه.
    if (user) {
      const { code } = await createOtp({
        identifier: value,
        channel,
        purpose: data.purpose,
        userId: user.id,
      });

      sendOtp({ identifier: value, channel, code }).catch((error) => {
        console.error('sendOtp failed:', error);
      });
    } else {
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

export async function verifyOtpCode(data: VerifyOtpData) {
  const resolved = resolveIdentifier(data.identifier);

  if (!resolved) {
    throw badRequest('ایمیل یا شماره موبایل نامعتبره');
  }

  const { value, type } = resolved;

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

  // اگه حساب تا الان هیچ‌وقت تایید نشده، رمزش رو کسی موقع «ثبت‌نام ناتمام»
  // گذاشته (ممکنه شخص دیگه‌ای غیر از صاحب ایمیل/موبایل باشه). وقتی صاحب واقعی
  // از مسیر دیگه‌ای (ورود با کد یا ...) حساب رو تایید می‌کنه، اون رمز باید پاک
  // بشه تا کسی که ثبت‌نام رو شروع کرده نتونه با اون رمز وارد بشه.
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
    console.error('sendOtp failed:', error);

    throw new AppError(502, 'ارسال کد تایید ناموفق بود، دوباره تلاش کن');
  }
}
