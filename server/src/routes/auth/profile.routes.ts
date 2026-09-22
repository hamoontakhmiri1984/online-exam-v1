import { Router } from 'express';

import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/requireAuth';

import { updateMeSchema, onboardingSchema } from '../../validation/authSchemas';

import { asyncHandler } from '../../lib/asyncHandler';

import { AppError, badRequest } from '../../lib/errors';

import { serializeMe } from './auth.helpers';

const router = Router();

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

    res.json(serializeMe(user));
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

    res.json(serializeMe(user));
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

    res.json(serializeMe(user));
  })
);

export default router;
