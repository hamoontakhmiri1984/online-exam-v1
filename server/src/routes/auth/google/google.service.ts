import { readCreationPolicy } from '../../../lib/approvalPolicy';
import { OAuth2Client } from 'google-auth-library';

import { prisma } from '../../../lib/prisma';
import { env } from '../../../config/env';

import { issueTokenPair } from '../../../lib/authTokens';
import { forceLogoutOtherSessions } from '../../../realtime/socket';

import { AppError, badRequest } from '../../../lib/errors';

import { instructorApprovalBlockMessage, serializeMe } from '../auth.helpers';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken: string) {
  if (!env.GOOGLE_CLIENT_ID)
    throw new AppError(503, 'ورود با گوگل فعلاً در دسترس نیست');
  const ticket = await googleClient
    .verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    })
    .catch(() => {
      throw new AppError(401, 'اعتبار ورود با گوگل تمام شده؛ دوباره تلاش کنید');
    });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.email_verified) {
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
      'این حساب گوگل قبلاً به یه حساب دیگه تو همین سایت وصل شده',
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

export async function loginWithGoogle(
  idToken: string,
  registration?: { role: 'Student' | 'Instructor'; name: string },
) {
  const payload = await verifyGoogleToken(idToken);

  // اول با googleId (شناسه‌ی پایدار گوگل)، بعد با ایمیل. قبلاً یه OR واحد بود
  // و اگه googleId مال یه حساب و ایمیل مال حساب دیگه بود، حساب اشتباه
  // انتخاب می‌شد
  const user = await prisma.$transaction(async (db) => {
    // Serialize Google sign-ins; lock existing users against simultaneous registration edits.
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${payload.sub}))`;
    let user =
      (await db.user.findUnique({
        where: {
          googleId: payload.sub,
        },
      })) ??
      (await db.user.findFirst({
        where: {
          email: payload.email,
        },
      }));

    if (!user) {
      if (!registration) return null;
      const policy = await readCreationPolicy(db);
      return db.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          emailVerifiedAt: new Date(),
          name: registration.name,
          role: registration.role,
          approvalStatus:
            registration.role === 'Instructor' &&
            policy.requireInstructorApproval
              ? 'Pending'
              : 'Approved',
        },
      });
    }
    await db.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    user = await db.user.findUniqueOrThrow({ where: { id: user.id } });

    // ایمیل ممکنه بعداً به آدم دیگه‌ای (مثلاً ایمیل سازمانی بازیافت‌شده) با
    // حساب گوگل دیگه‌ای داده بشه؛ اگه این حساب قبلاً به یه حساب گوگلِ دیگه
    // وصل شده، فقط با ایمیل واردش نمی‌کنیم
    if (user.googleId && user.googleId !== payload.sub) {
      throw new AppError(
        403,
        'این ایمیل به یه حساب گوگل دیگه وصل شده. با روش قبلی وارد شو',
      );
    }

    // حساب تایید‌نشده ممکنه رمزش رو یه نفر دیگه موقع ثبت‌نام ناتمام گذاشته باشه؛
    // صاحب واقعی ایمیل (با گوگل) تاییدش می‌کنه، پس اون رمز باید پاک بشه
    const wasNeverVerified = !user.emailVerifiedAt && !user.phoneVerifiedAt;

    if (!user.googleId || !user.emailVerifiedAt) {
      user = await db.user.update({
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

          ...(user.emailVerifiedAt || user.email !== payload.email
            ? {}
            : {
                emailVerifiedAt: new Date(),
              }),
        },
      });
    }

    return user;
  });
  if (!user) return { type: 'registration_required' as const };
  const approvalMessage = instructorApprovalBlockMessage(user);

  if (approvalMessage) {
    return {
      type: 'pending' as const,
      message: approvalMessage,
    };
  }

  const { accessToken, refreshToken, sid } = await issueTokenPair(
    user.id,
    user.role,
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
