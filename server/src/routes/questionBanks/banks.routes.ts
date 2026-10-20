import { parseListQuery } from '../../lib/listPagination';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import {
  createQuestionBankSchema,
  updateQuestionBankSchema,
} from '../../validation/questionBankSchemas';
import { asyncHandler } from '../../lib/asyncHandler';
import { notFound, forbidden, badRequest } from '../../lib/errors';
import { buildQuestionImportTemplate } from '../../lib/questionExcel';

import { serializeBank, loadOwnedBank } from './questionBanks.service';

const router = Router();
router.use(requireAuth, requireRole('Instructor', 'SuperAdmin'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const where = role === 'SuperAdmin' ? {} : { instructorId: sub };

    const { page, pageSize, skip, search } = parseListQuery(req.query);
    const filter = { ...where, ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}) };
    const [banks, total] = await prisma.$transaction([
      prisma.questionBank.findMany({
        where: filter,
        include: { _count: { select: { questions: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.questionBank.count({ where: filter }),
    ], { isolationLevel: 'RepeatableRead' });
    res.json({ items: banks.map(serializeBank), total, page, pageSize });
  })
);

// Register the template route before the dynamic bank-ID matcher.
router.get(
  '/import-template',
  asyncHandler(async (_req, res) => {
    const buffer = buildQuestionImportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="question-import-template.xlsx"'
    );
    res.send(buffer);
  })
);

router.get(
  '/:bankId',
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    const withCount = await prisma.questionBank.findUnique({
      where: { id: bank.id },
      include: { _count: { select: { questions: true } } },
    });
    res.json(serializeBank(withCount!));
  })
);

router.post(
  '/',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const parsed = createQuestionBankSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const bank = await prisma.questionBank.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        instructorId: req.user!.sub,
      },
      include: { _count: { select: { questions: true } } },
    });

    res.status(201).json(serializeBank(bank));
  })
);

router.put(
  '/:bankId',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    const parsed = updateQuestionBankSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const updated = await prisma.questionBank.update({
      where: { id: bank.id },
      data: { name: parsed.data.name, category: parsed.data.category },
      include: { _count: { select: { questions: true } } },
    });

    res.json(serializeBank(updated));
  })
);

// Bank deletion removes source questions; imported exam snapshots remain valid.
router.delete(
  '/:bankId',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { role, sub } = req.user!;
    const { bank, allowed } = await loadOwnedBank(req.params.bankId, sub, role);
    if (!bank) throw notFound('بانک سوال یافت نشد');
    if (!allowed) throw forbidden();

    await prisma.questionBank.delete({ where: { id: bank.id } });
    res.status(204).end();
  })
);

export default router;
