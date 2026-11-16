import { Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../lib/redisRateLimitStore';
import { rateLimitRedis } from '../lib/rateLimitRedis';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, badRequest } from '../lib/errors';
import {
  assistantAnswer,
  assistantConfig,
  assistantInput,
} from '../lib/supportAssistant';
const router = Router();
const limit = (name: string, max: number, global = false) =>
  rateLimit({
    store: new RedisRateLimitStore(rateLimitRedis, name),
    windowMs: 60 * 1000,
    max,
    passOnStoreError: false,
    standardHeaders: true,
    legacyHeaders: false,
    ...(global ? { keyGenerator: () => 'global' } : {}),
    message: { error: 'تعداد پیام‌ها زیاد است؛ یک دقیقه بعد تلاش کنید.' },
  });
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.get('/assistant', (_req, res) => res.json(assistantConfig()));
const dailyLimit = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'assistant-daily'),
  windowMs: 24 * 60 * 60 * 1000,
  max: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(process.env.ASSISTANT_DAILY_LIMIT || '100'),
  keyGenerator: () => 'global',
  skip: () => !assistantConfig().remote,
  passOnStoreError: false,
  message: { error: 'سهمیهٔ روزانهٔ دستیار تمام شده؛ از پشتیبان کمک بگیرید.' },
});
router.post(
  '/assistant',
  dailyLimit,
  limit('assistant-ip', 10),
  limit('assistant-global', 60, true),
  asyncHandler(async (req, res) => {
    const input = assistantInput.parse(req.body);
    if (assistantConfig().remote && !input.consent)
      throw badRequest(
        'برای ارسال متن به سرویس هوش مصنوعی، موافقت شما لازم است.',
      );
    res.json(await assistantAnswer(input.message));
  }),
);
router.use(requireAuth);
// A separate ticketing API replaces the single-thread UI. Legacy endpoints
// remain available for existing users and support widget compatibility.
const ticketInput = z
  .object({
    subject: z.string().trim().min(3).max(160),
    category: z.enum(['Technical', 'Exams', 'Payments', 'Account', 'Other']),
    priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).default('Normal'),
    body: z.string().trim().min(5).max(2000),
    assignedInstructorId: z.string().min(1).optional(),
  })
  .strict();
const ticketMessageInput = z
  .object({
    body: z.string().trim().min(1).max(2000),
    clientId: z.string().uuid(),
  })
  .strict();

async function ticketAccess(id: string, userId: string, role: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, role: true, name: true, username: true } },
    },
  });
  if (!ticket) throw notFound('تیکت پیدا نشد');
  const ownsTicket = ticket.userId === userId;
  const adminCanAccess =
    role === 'SuperAdmin' && ticket.user.role === 'Instructor';
  const assignedTeacherCanAccess =
    role === 'Instructor' &&
    ticket.user.role === 'Student' &&
    ticket.assignedInstructorId === userId;
  if (!ownsTicket && !adminCanAccess && !assignedTeacherCanAccess)
    throw notFound('تیکت پیدا نشد');
  return ticket;
}
router.get(
  '/mine/tickets',
  asyncHandler(async (req, res) => {
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(req.query.page ?? 0);
    res.json(
      await prisma.supportTicket.findMany({
        where: { userId: req.user!.sub },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: page * 50,
        take: 50,
      }),
    );
  }),
);
router.get(
  '/student/instructors',
  requireRole('Student'),
  asyncHandler(async (req, res) => {
    // Only instructors of groups the student actually belongs to are assignable.
    const groups = await prisma.group.findMany({
      where: { students: { some: { id: req.user!.sub } } },
      select: {
        instructor: { select: { id: true, name: true, username: true } },
      },
    });
    const unique = new Map(
      groups.map(({ instructor }) => [instructor.id, instructor]),
    );
    res.json([...unique.values()]);
  }),
);
router.get(
  '/assigned/tickets',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(req.query.page ?? 0);
    res.json(
      await prisma.supportTicket.findMany({
        where: {
          assignedInstructorId: req.user!.sub,
          user: { role: 'Student' },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: page * 50,
        take: 50,
        include: { user: { select: { id: true, name: true, username: true } } },
      }),
    );
  }),
);
router.post(
  '/tickets',
  limit('support-new-ticket', 10),
  asyncHandler(async (req, res) => {
    if (req.user!.role === 'SuperAdmin')
      throw badRequest('مدیر ارشد تنها به تیکت‌های مدرس‌ها پاسخ می‌دهد');
    const input = ticketInput.parse(req.body);
    if (req.user!.role === 'Student') {
      if (!input.assignedInstructorId)
        throw badRequest('برای ثبت تیکت، مدرس مربوطه را انتخاب کنید');
      const relatedGroup = await prisma.group.findFirst({
        where: {
          instructorId: input.assignedInstructorId,
          students: { some: { id: req.user!.sub } },
        },
        select: { id: true },
      });
      if (!relatedGroup)
        throw badRequest('مدرس انتخاب‌شده متعلق به گروه‌های شما نیست');
    } else if (input.assignedInstructorId) {
      throw badRequest('تیکت شخصی مدرس قابل ارجاع به مدرس دیگری نیست');
    }
    const trackingCode = `TK-${Date.now().toString(36).toUpperCase()}-${randomBytes(5).toString('hex').toUpperCase()}`;
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.sub,
        trackingCode,
        subject: input.subject,
        assignedInstructorId:
          req.user!.role === 'Student' ? input.assignedInstructorId : null,
        category: input.category,
        priority: input.priority,
        messages: {
          create: {
            body: input.body,
            clientId: randomUUID(),
            fromStaff: false,
          },
        },
      },
    });
    res.status(201).json(ticket);
  }),
);
router.get(
  '/instructors',
  requireRole('SuperAdmin'),
  asyncHandler(async (_req, res) => {
    // Only teachers with tickets appear; students' private tickets are excluded.
    const users = await prisma.user.findMany({
      where: { role: 'Instructor', supportTickets: { some: {} } },
      select: {
        id: true,
        name: true,
        username: true,
        supportTickets: { select: { status: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(
      users.map(({ supportTickets, ...user }) => ({
        ...user,
        ticketCount: supportTickets.length,
        openCount: supportTickets.filter((ticket) => ticket.status !== 'Closed')
          .length,
      })),
    );
  }),
);
router.get(
  '/instructors/:instructorId/tickets',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const instructor = await prisma.user.findFirst({
      where: { id: req.params.instructorId, role: 'Instructor' },
      select: { id: true },
    });
    if (!instructor) throw notFound('مدرس پیدا نشد');
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(req.query.page ?? 0);
    res.json(
      await prisma.supportTicket.findMany({
        where: { userId: instructor.id },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: page * 50,
        take: 50,
      }),
    );
  }),
);
router.get(
  '/tickets/:id',
  asyncHandler(async (req, res) => {
    res.json(await ticketAccess(req.params.id, req.user!.sub, req.user!.role));
  }),
);
router.get(
  '/tickets/:id/messages',
  asyncHandler(async (req, res) => {
    await ticketAccess(req.params.id, req.user!.sub, req.user!.role);
    const rows = await prisma.supportTicketMessage.findMany({
      where: { ticketId: req.params.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    res.json(rows.reverse());
  }),
);
router.post(
  '/tickets/:id/messages',
  limit('support-ticket-message', 20),
  asyncHandler(async (req, res) => {
    const ticket = await ticketAccess(
      req.params.id,
      req.user!.sub,
      req.user!.role,
    );
    if (ticket.status === 'Closed') throw badRequest('این تیکت بسته شده است');
    const input = ticketMessageInput.parse(req.body);
    const fromStaff =
      req.user!.role === 'SuperAdmin' ||
      (req.user!.role === 'Instructor' &&
        ticket.assignedInstructorId === req.user!.sub &&
        ticket.user.role === 'Student');
    await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicketMessage.createMany({
        data: [
          {
            ticketId: ticket.id,
            clientId: input.clientId,
            body: input.body,
            fromStaff,
          },
        ],
        skipDuplicates: true,
      });
      if (created.count > 0)
        await tx.supportTicket.update({
          where: { id: ticket.id },
          data: {
            status: fromStaff ? 'Answered' : 'Open',
            updatedAt: new Date(),
          },
        });
    });
    res.status(201).json({ id: ticket.id });
  }),
);
router.patch(
  '/tickets/:id',
  asyncHandler(async (req, res) => {
    const ticket = await ticketAccess(
      req.params.id,
      req.user!.sub,
      req.user!.role,
    );
    const { status } = z
      .object({ status: z.enum(['Open', 'Closed']) })
      .strict()
      .parse(req.body);
    // Owners may close/reopen their own tickets; admin moderates teacher tickets.
    res.json(
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status },
      }),
    );
  }),
);

router.get(
  '/threads',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(req.query.page ?? 0);
    res.json(
      await prisma.supportThread.findMany({
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: page * 30,
        take: 30,
        include: { user: { select: { name: true, username: true } } },
      }),
    );
  }),
);
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.supportThread.findUnique({
        where: { userId: req.user!.sub },
      }),
    );
  }),
);
async function access(id: string, sub: string, role: string) {
  const thread = await prisma.supportThread.findFirst({
    where: { id, ...(role === 'SuperAdmin' ? {} : { userId: sub }) },
  });
  if (!thread) throw notFound('گفت‌وگو پیدا نشد');
  return thread;
}
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    await access(req.params.id, req.user!.sub, req.user!.role);
    const before = z.string().datetime().optional().parse(req.query.before);
    const messages = await prisma.supportMessage.findMany({
      where: {
        threadId: req.params.id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    res.json(messages.reverse());
  }),
);
const messageSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    clientId: z.string().uuid(),
  })
  .strict();
router.post(
  '/:id/messages',
  limit('support-message', 20),
  asyncHandler(async (req, res) => {
    const input = messageSchema.parse(req.body);
    const staff = req.user!.role === 'SuperAdmin';
    const thread =
      req.params.id === 'mine'
        ? await prisma.supportThread.upsert({
            where: { userId: req.user!.sub },
            create: { userId: req.user!.sub },
            update: {},
          })
        : await access(req.params.id, req.user!.sub, req.user!.role);
    await prisma.$transaction(async (tx) => {
      const result = await tx.supportMessage.createMany({
        data: [{ ...input, threadId: thread.id, fromStaff: staff }],
        skipDuplicates: true,
      });
      if (result.count)
        await tx.supportThread.update({
          where: { id: thread.id },
          data: {
            status: staff ? 'replied' : 'waiting',
            updatedAt: new Date(),
          },
        });
    });
    res.status(201).json({ id: thread.id });
  }),
);
router.patch(
  '/:id',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['closed', 'waiting']) })
      .strict()
      .parse(req.body);
    await access(req.params.id, req.user!.sub, req.user!.role);
    res.json(
      await prisma.supportThread.update({
        where: { id: req.params.id },
        data: { status },
      }),
    );
  }),
);
export default router;
