import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { badRequest } from '../lib/errors';
import {
  accessiblePractice,
  serializePractice,
} from './practice/practice.access';
import {
  answerSchema,
  createPracticeSchema,
  statusSchema,
  updatePracticeSchema,
} from './practice/practice.validation';
import {
  createPractice,
  setPracticeStatus,
  updatePractice,
} from './practice/practice.manage';
import {
  listPractices,
  listPracticeQuestions,
  practiceHistory,
} from './practice/practice.read';
import { answerPractice } from './practice/practice.answers';
import type { z } from 'zod';
const router = Router();
router.use(requireAuth);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
function parse<T extends z.ZodTypeAny>(schema: T, body: unknown): z.output<T> {
  const value = schema.safeParse(body);
  if (!value.success) throw badRequest(value.error.issues[0].message);
  return value.data;
}
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await listPractices(req.user!, req.query));
  }),
);
router.post(
  '/',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await createPractice(
          req.user!.sub,
          parse(createPracticeSchema, req.body),
        ),
      );
  }),
);
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(
      serializePractice(
        await accessiblePractice(prisma, req.params.id, req.user!),
        req.user!,
      ),
    );
  }),
);
router.put(
  '/:id',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    res.json(
      await updatePractice(
        req.params.id,
        req.user!.sub,
        parse(updatePracticeSchema, req.body),
      ),
    );
  }),
);
router.post(
  '/:id/status',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    res.json(
      await setPracticeStatus(
        req.params.id,
        req.user!.sub,
        parse(statusSchema, req.body).status,
      ),
    );
  }),
);
router.get(
  '/:id/questions',
  asyncHandler(async (req, res) => {
    res.json(await listPracticeQuestions(req.params.id, req.user!, req.query));
  }),
);
router.get(
  '/:id/questions/:questionId/history',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    res.json(
      await practiceHistory(
        req.params.id,
        req.params.questionId,
        req.user!.sub,
        req.query,
      ),
    );
  }),
);
router.post(
  '/:id/questions/:questionId/answers',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    res.json(
      await answerPractice(
        req.params.id,
        req.params.questionId,
        req.user!.sub,
        parse(answerSchema, req.body),
      ),
    );
  }),
);
export default router;
