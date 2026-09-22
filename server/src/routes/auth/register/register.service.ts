import { prisma } from '../../../lib/prisma';

import {
  normalizeUsername,
  validateUsernameFormat,
  isUsernameTaken,
  suggestUsernameAlternatives,
} from '../../../lib/username';

import { hashPassword } from '../../../lib/password';
import { createOtp } from '../../../lib/otp';
import { assertOtpSendAllowed } from '../../../lib/otpAbuseGuard';
import { sendOtp } from '../../../services/otpSender';

import { notifyRoles, notifyUser } from '../../../lib/notifications';

import { AppError, badRequest } from '../../../lib/errors';

import { resolveIdentifier } from '../auth.helpers';

type RegisterData = {
  identifier: string;
  username?: string;
  password?: string;
  name?: string;
  role: 'Student' | 'Instructor';
  joinCode?: string;
  captchaId?: string;
  captchaAnswer?: string;
};

export async function registerUser(data: RegisterData, ip: string) {
  const resolved = resolveIdentifier(data.identifier);

  if (!resolved) {
    throw badRequest('ایمیل یا شماره موبایل نامعتبره');
  }

  const { type, value, channel } = resolved;

  await assertOtpSendAllowed({
    ip,
    identifier: value,
    captchaId: data.captchaId,
    captchaAnswer: data.captchaAnswer,
  });

  const where = type === 'EMAIL' ? { email: value } : { phone: value };

  let user = await prisma.user.findFirst({
    where,
  });

  const alreadyVerified =
    type === 'EMAIL'
      ? Boolean(user?.emailVerifiedAt)
      : Boolean(user?.phoneVerifiedAt);

  if (alreadyVerified) {
    throw badRequest('این حساب قبلاً ثبت شده');
  }

  let username: string;

  if (data.username?.trim()) {
    const formatCheck = validateUsernameFormat(data.username);

    if (!formatCheck.valid) {
      throw badRequest(formatCheck.error ?? 'نام کاربری نامعتبره');
    }

    username = normalizeUsername(data.username);

    const taken = await isUsernameTaken(username, user?.id);

    if (taken) {
      const suggestions = await suggestUsernameAlternatives(data.username);

      return {
        status: 'username_taken' as const,
        message: 'این نام کاربری قبلاً گرفته شده',
        usernameSuggestions: suggestions,
      };
    }
  } else {
    const baseUsername =
      type === 'EMAIL' ? value.split('@')[0] : `user${value.slice(-6)}`;

    const suggestions = await suggestUsernameAlternatives(baseUsername);

    username =
      suggestions[0] ??
      `${normalizeUsername(baseUsername)}${Date.now().toString().slice(-4)}`;
  }

  let passwordHash: string | null = null;

  if (data.password) {
    passwordHash = await hashPassword(data.password);
  }

  let groupId: string | null = null;

  if (data.role === 'Student' && data.joinCode?.trim()) {
    const joinCode = data.joinCode.trim().toUpperCase();

    const group = await prisma.group.findUnique({
      where: {
        joinCode,
      },
    });

    if (!group) {
      throw badRequest('کد دعوت نامعتبره');
    }

    groupId = group.id;
  }

  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        usernameNormalized: normalizeUsername(username),

        name: data.name?.trim() || null,

        passwordHash,

        role: data.role,

        approvalStatus: data.role === 'Instructor' ? 'Pending' : 'Approved',

        ...(type === 'EMAIL'
          ? {
              email: value,
            }
          : {
              phone: value,
            }),

        ...(groupId
          ? {
              groupsMember: {
                connect: {
                  id: groupId,
                },
              },
            }
          : {}),
      },
    });
  } else {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        username,
        usernameNormalized: normalizeUsername(username),

        name: data.name?.trim() || user.name,

        // این کاربر هنوز تایید نشده (alreadyVerified بالا رد شده) - رمز قبلیش
        // رو کسی گذاشته که مالکیت شناسه رو ثابت نکرده. اگه اینجا حفظ بشه
        // (`?? user.passwordHash`)، یه نفر می‌تونست ایمیل/شماره‌ی قربانی رو
        // با رمز خودش پیش‌ثبت‌نام کنه و بعد از اینکه صاحب واقعی بدون رمز
        // ثبت‌نام و تایید کرد، با اون رمز وارد حسابش بشه.
        passwordHash,

        role: data.role,

        approvalStatus: data.role === 'Instructor' ? 'Pending' : 'Approved',

        // کد دعوت تلاش دوم (بعد از ثبت‌نام ناتمام) قبلاً نادیده گرفته می‌شد
        groupsMember: {
          set: groupId ? [{ id: groupId }] : [],
        },
      },
    });
  }

  if (isNewUser) {
    await notifyUser(user.id, 'ثبت‌نام با موفقیت انجام شد', 'info').catch(
      (error) => {
        console.error('notifyUser failed:', error);
      }
    );

    if (data.role === 'Instructor') {
      await notifyRoles(
        ['SuperAdmin'],
        `مدرس جدید ${user.name || user.username} منتظر تایید حساب است`,
        'people'
      ).catch((error) => {
        console.error('notifyRoles failed:', error);
      });
    }
  }

  const { code } = await createOtp({
    identifier: value,
    channel,
    purpose: 'REGISTER',
    userId: user.id,
  });

  try {
    await sendOtp({
      identifier: value,
      channel,
      code,
    });
  } catch (error) {
    console.error('sendOtp failed:', error);

    throw new AppError(502, 'ارسال کد تایید ناموفق بود، دوباره تلاش کن');
  }

  return {
    status: 'otp_sent' as const,
    identifier: value,
  };
}
