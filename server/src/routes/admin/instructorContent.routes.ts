import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/asyncHandler';
import { optionalString, pagedResult, parsePaging } from '../../lib/adminPaging';

// Mounted after instructor existence/role validation in instructorDetail.routes.
// Both list and total are constrained to that instructor inside the database.
const router = Router();

router.get('/questions', asyncHandler(async (req, res) => {
  const paging = parsePaging(req.query);
  const bankId = optionalString(req.query.bankId);
  const where: Prisma.QuestionWhereInput = {
    bank: { instructorId: res.locals.instructorId },
    ...(bankId ? { bankId } : {}),
    ...(paging.q ? { text: { contains: paging.q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.question.findMany({
      where,
      select: {
        id: true, text: true, options: true, correctOptionIndex: true,
        difficulty: true, createdAt: true,
        bank: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: paging.skip, take: paging.take,
    }),
    prisma.question.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  res.json(pagedResult(items, total, paging));
}));

router.get('/attachments', asyncHandler(async (req, res) => {
  const paging = parsePaging(req.query);
  const instructorId: string = res.locals.instructorId;
  const where: Prisma.LessonAttachmentWhereInput = {
    session: { groups: { some: { instructorId } } },
    ...(paging.q ? { fileName: { contains: paging.q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.lessonAttachment.findMany({
      where,
      select: {
        id: true, fileName: true, fileSize: true, createdAt: true,
        session: { select: {
          id: true, title: true,
          groups: { where: { instructorId }, select: { id: true, name: true } },
        } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: paging.skip, take: paging.take,
    }),
    prisma.lessonAttachment.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  res.json(pagedResult(items, total, paging));
}));

export default router;
