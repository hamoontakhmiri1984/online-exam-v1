import { prisma } from '../../../lib/prisma';
import { normalizeUsername } from '../../../lib/username';
import {
  verifyPassword,
  verifyAgainstDummy,
  hashPassword,
} from '../../../lib/password';

import { verifyCaptcha } from '../../../lib/captcha';

import { issueTokenPair, verifyResetTicket } from '../../../lib/authTokens';

import { revokeSession } from '../../../lib/session';

import {
  isAccountLocked,
  registerFailedAttempt,
  clearFailedAttempts,
  isCaptchaRequired,
  registerIpFailure,
  clearIpFailures,
} from '../../../lib/loginSecurity';

import { notifyUser } from '../../../lib/notifications';
import { forceLogoutOtherSessions } from '../../../realtime/socket';

import { AppError, badRequest } from '../../../lib/errors';

import {
  instructorApprovalBlockMessage,
  resolveIdentifier,
} from '../auth.helpers';

type PasswordLoginData = {
  identifier: string;
  password: string;
  rememberMe?: boolean;
  captchaId?: string;
  captchaAnswer?: string;
};

async function invalidCredentials(ip: string) {
  await registerIpFailure(ip);

  const captchaRequired = await isCaptchaRequired(ip);

  return new AppError(
    401,
    'شناسه یا رمز اشتباهه',
    captchaRequired ? { captchaRequired: true } : undefined
  );
}

export async function loginWithPassword(data: PasswordLoginData, ip: string) {
  const captchaNeeded = await isCaptchaRequired(ip);

  if (captchaNeeded) {
    if (!data.captchaId || !data.captchaAnswer) {
      throw new AppError(
        400,
        'برای ادامه لازمه کد تصویر امنیتی رو هم وارد کنی',
        {
          captchaRequired: true,
        }
      );
    }

    const captchaValid = await verifyCaptcha(
      data.captchaId,
      data.captchaAnswer
    );

    if (!captchaValid) {
      await registerIpFailure(ip);

      throw new AppError(400, 'کد تصویر امنیتی اشتباهه یا منقضی شده', {
        captchaRequired: true,
      });
    }
  }

  const resolved = resolveIdentifier(data.identifier);

  const user = resolved
    ? await prisma.user.findFirst({
        where:
          resolved.type === 'EMAIL'
            ? {
                email: resolved.value,
              }
            : {
                phone: resolved.value,
              },
      })
    : await prisma.user.findFirst({
        where: {
          usernameNormalized: normalizeUsername(data.identifier),
        },
      });

  if (!user || !user.passwordHash) {
    await verifyAgainstDummy(data.password);
    throw await invalidCredentials(ip);
  }

  if (await isAccountLocked(user.id)) {
    throw new AppError(
      423,
      'به‌خاطر تلاش‌های ناموفق زیاد، ورود با رمز برای این حساب موقتاً قفل شده. با کد یکبارمصرف وارد شو یا چند دقیقه‌ی دیگه دوباره امتحان کن.'
    );
  }

  const passwordValid = await verifyPassword(data.password, user.passwordHash);

  if (!passwordValid) {
    await registerFailedAttempt(user.id);

    notifyUser(
      user.id,
      'یک نفر برای حساب شما رمز عبور اشتباه وارد کرد',
      'info'
    ).catch((error) => {
      console.error('notifyUser failed:', error);
    });

    throw await invalidCredentials(ip);
  }

  await clearFailedAttempts(user.id);
  await clearIpFailures(ip);

  const identifierVerified = user.email
    ? Boolean(user.emailVerifiedAt)
    : Boolean(user.phoneVerifiedAt);

  if (!identifierVerified) {
    throw new AppError(
      403,
      user.email
        ? 'ایمیلت هنوز تایید نشده. اول با کد تایید (OTP) وارد شو'
        : 'موبایلت هنوز تایید نشده. اول با کد تایید (OTP) وارد شو'
    );
  }

  const approvalMessage = instructorApprovalBlockMessage(user);

  if (approvalMessage) {
    throw new AppError(403, approvalMessage);
  }

  const { accessToken, refreshToken, sid } = await issueTokenPair(
    user.id,
    user.role,
    data.rememberMe
  );

  forceLogoutOtherSessions(user.id, sid);

  return {
    accessToken,
    refreshToken,
    rememberMe: data.rememberMe,

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

export async function resetPassword(resetTicket: string, newPassword: string) {
  let userId: string;

  // فقط خودِ تیکت نامعتبر/منقضی/مصرف‌شده «لینک نامعتبر» حساب می‌شه؛ خطای
  // بعدی (دیتابیس و ...) دیگه به‌اشتباه با همین پیام پنهان نمی‌شه
  try {
    ({ sub: userId } = await verifyResetTicket(resetTicket));
  } catch {
    throw badRequest('لینک/کد نامعتبر یا منقضی‌شده');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash,
    },
  });

  // کاربری که رمزش رو فراموش کرده ممکنه قفلِ ناشی از تلاش‌های ناموفق باشه؛
  // بعد از ریست نباید تا پایان قفل بلاک بمونه
  await clearFailedAttempts(userId);

  forceLogoutOtherSessions(userId);

  await revokeSession(userId);

  return {
    message: 'رمز عوض شد. دوباره وارد شو',
  };
}
