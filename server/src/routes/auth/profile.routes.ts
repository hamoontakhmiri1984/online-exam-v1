import { logEvent } from '../../lib/logger';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';

import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/requireAuth';
import { authLimiter } from '../../middleware/rateLimiters';

import {
  updateMeSchema,
  onboardingSchema,
  changePasswordSchema,
} from '../../validation/authSchemas';

import { asyncHandler } from '../../lib/asyncHandler';

import { AppError, badRequest } from '../../lib/errors';

import { extensionForImageMimeType, imageUpload } from '../../lib/imageUpload';
import { validateUploadedFile } from '../../lib/uploadValidation';
import {
  deletePublicObject,
  getPublicObjectUrl,
  uploadPublicObject,
} from '../../lib/storage';

import { hashPassword, verifyPassword } from '../../lib/password';
import {
  clearFailedAttempts,
  isAccountLocked,
  registerFailedAttempt,
} from '../../lib/loginSecurity';
import { notifyUser } from '../../lib/notifications';

import { serializeMe } from './auth.helpers';

const router = Router();

type MeUser = Parameters<typeof serializeMe>[0] & {
  avatarKey: string | null;
};

function meResponse(user: MeUser) {
  const avatarUrl =
    user.avatarKey && env.S3_PUBLIC_BASE_URL
      ? getPublicObjectUrl(user.avatarKey)
      : null;

  return serializeMe(user, avatarUrl);
}

function avatarUpload(req: Request, res: Response, next: NextFunction) {
  imageUpload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return next(
        badRequest(
          err.code === 'LIMIT_FILE_SIZE'
            ? 'حجم تصویر نباید بیشتر از ۵ مگابایت باشد'
            : 'آپلود تصویر با خطا مواجه شد'
        )
      );
    }

    if (err) return next(err);

    next();
  });
}

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user!.sub,
      },
    });

    if (!user) {
      throw new AppError(401, 'کاربر پیدا نشد');
    }

    res.json(meResponse(user));
  })
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateMeSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    const user = await prisma.user.update({
      where: {
        id: req.user!.sub,
      },
      data: {
        name: parsed.data.name,
      },
    });

    res.json(meResponse(user));
  })
);

router.post(
  '/me/avatar',
  requireAuth,
  avatarUpload,
  validateUploadedFile('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw badRequest('فایل تصویر ارسال نشده');
    }

    if (!env.S3_PUBLIC_BASE_URL) {
      throw new AppError(503, 'آپلود تصویر پروفایل روی سرور تنظیم نشده است');
    }

    const userId = req.user!.sub;

    const existing = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existing) {
      throw new AppError(401, 'کاربر پیدا نشد');
    }

    const extension = extensionForImageMimeType(req.file.mimetype);
    const key = `avatars/${userId}/${randomUUID()}.${extension}`;

    await uploadPublicObject(key, req.file.buffer, req.file.mimetype);

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarKey: key,
      },
    });

    // Delete the old image only after the replacement is uploaded and saved.
    if (existing.avatarKey) {
      await deletePublicObject(existing.avatarKey).catch((error) =>
        logEvent('error', 'deletePublicObject failed:', error)
      );
    }

    res.json(meResponse(user));
  })
);

router.delete(
  '/me/avatar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const existing = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existing) {
      throw new AppError(401, 'کاربر پیدا نشد');
    }

    if (!existing.avatarKey) {
      return res.json(meResponse(existing));
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarKey: null,
      },
    });

    await deletePublicObject(existing.avatarKey).catch((error) =>
      logEvent('error', 'deletePublicObject failed:', error)
    );

    res.json(meResponse(user));
  })
);

// An incorrect current password is 400, not a session-expiring 401.
router.post(
  '/me/password',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    const { currentPassword, newPassword } = parsed.data;
    const userId = req.user!.sub;

    const existing = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existing) {
      throw new AppError(401, 'کاربر پیدا نشد');
    }

    if (existing.passwordHash) {
      if (!currentPassword) {
        throw badRequest('رمز عبور فعلی را وارد کنید');
      }

      if (await isAccountLocked(userId, req.ip ?? 'unknown')) {
        throw new AppError(
          423,
          'به‌خاطر تلاش‌های ناموفق زیاد، تغییر رمز موقتاً قفل شده. چند دقیقه‌ی دیگه دوباره امتحان کن.'
        );
      }

      if (!(await verifyPassword(currentPassword, existing.passwordHash))) {
        await registerFailedAttempt(userId, req.ip ?? 'unknown');

        throw badRequest('رمز عبور فعلی اشتباهه');
      }

      await clearFailedAttempts(userId);

      if (await verifyPassword(newPassword, existing.passwordHash)) {
        throw badRequest('رمز جدید باید با رمز فعلی فرق داشته باشه');
      }
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: await hashPassword(newPassword),
      },
    });

    notifyUser(
      userId,
      existing.passwordHash
        ? 'رمز عبور حساب شما تغییر کرد'
        : 'رمز عبور برای حساب شما تعیین شد',
      'info'
    ).catch((error) => {
      logEvent('error', 'notifyUser failed:', error);
    });

    res.json(meResponse(user));
  })
);

router.post(
  '/onboarding',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = onboardingSchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0].message);
    }

    const existing = await prisma.user.findUnique({
      where: {
        id: req.user!.sub,
      },
    });

    if (!existing) {
      throw new AppError(401, 'کاربر پیدا نشد');
    }

    const user = await prisma.user.update({
      where: {
        id: req.user!.sub,
      },
      data: {
        onboardingCompleted: true,

        ...(existing.role === 'Instructor' && parsed.data.organizationName
          ? {
              organizationName: parsed.data.organizationName,
            }
          : {}),
      },
    });

    res.json(meResponse(user));
  })
);

export default router;
