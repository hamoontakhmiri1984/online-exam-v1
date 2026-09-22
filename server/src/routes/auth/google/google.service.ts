import { OAuth2Client } from 'google-auth-library';

import { prisma } from '../../../lib/prisma';
import { env } from '../../../config/env';

import { issueTokenPair } from '../../../lib/authTokens';
import { forceLogoutOtherSessions } from '../../../realtime/socket';

import { AppError, badRequest } from '../../../lib/errors';

import { instructorApprovalBlockMessage, serializeMe } from '../auth.helpers';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload.email_verified) {
    throw badRequest('توکن گوگل نامعتبره');
  }

  // ایمیل نرمال (lowercase) - همون فرمتی که تو دیتابیس ذخیره می‌شه
  return { sub: payload.sub, email: payload.email.toLowerCase() };
}

export async function linkGoogleAccount(userId: string, idToken: string) {
  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!currentUser) {
    throw new AppError(401, 'کاربر پیدا نشد');
  }

  const payload = await verifyGoogleToken(idToken);

  const owner = await prisma.user.findUnique({
    where: {
      googleId: payload.sub,
    },
  });

  if (owner && owner.id !== currentUser.id) {
    throw new AppError(
      409,
      'این حساب گوگل قبلاً به یه حساب دیگه تو همین سایت وصل شده'
    );
  }

  const user = await prisma.user.update({
    where: {
      id: currentUser.id,
    },
    data: {
      googleId: payload.sub,

      ...(currentUser.email === payload.email && !currentUser.emailVerifiedAt
        ? {
            emailVerifiedAt: new Date(),
          }
        : {}),
    },
  });

  return serializeMe(user);
}

export async function loginWithGoogle(idToken: string) {
  const payload = await verifyGoogleToken(idToken);

  // اول با googleId (شناسه‌ی پایدار گوگل)، بعد با ایمیل. قبلاً یه OR واحد بود
  // و اگه googleId مال یه حساب و ایمیل مال حساب دیگه بود، حساب اشتباه
  // انتخاب می‌شد
  let user =
    (await prisma.user.findUnique({
      where: {
        googleId: payload.sub,
      },
    })) ??
    (await prisma.user.findFirst({
      where: {
        email: payload.email,
      },
    }));

  if (!user) {
    throw new AppError(
      403,
      'حسابی با این ایمیل ثبت نشده. اول باید از صفحه‌ی ثبت‌نام حساب بسازی'
    );
  }

  // ایمیل ممکنه بعداً به آدم دیگه‌ای (مثلاً ایمیل سازمانی بازیافت‌شده) با
  // حساب گوگل دیگه‌ای داده بشه؛ اگه این حساب قبلاً به یه حساب گوگلِ دیگه
  // وصل شده، فقط با ایمیل واردش نمی‌کنیم
  if (user.googleId && user.googleId !== payload.sub) {
    throw new AppError(
      403,
      'این ایمیل به یه حساب گوگل دیگه وصل شده. با روش قبلی وارد شو'
    );
  }

  // حساب تایید‌نشده ممکنه رمزش رو یه نفر دیگه موقع ثبت‌نام ناتمام گذاشته باشه؛
  // صاحب واقعی ایمیل (با گوگل) تاییدش می‌کنه، پس اون رمز باید پاک بشه
  const wasNeverVerified = !user.emailVerifiedAt && !user.phoneVerifiedAt;

  if (!user.googleId || !user.emailVerifiedAt) {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        ...(wasNeverVerified
          ? {
              passwordHash: null,
            }
          : {}),

        ...(user.googleId
          ? {}
          : {
              googleId: payload.sub,
            }),

        ...(user.emailVerifiedAt
          ? {}
          : {
              emailVerifiedAt: new Date(),
            }),
      },
    });
  }

  const approvalMessage = instructorApprovalBlockMessage(user);

  if (approvalMessage) {
    return {
      type: 'pending' as const,
      message: approvalMessage,
    };
  }

  const { accessToken, refreshToken, sid } = await issueTokenPair(
    user.id,
    user.role
  );

  forceLogoutOtherSessions(user.id, sid);

  return {
    type: 'authenticated' as const,

    accessToken,
    refreshToken,

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
