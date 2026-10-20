import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import {
  assertPlanChangeAllowed,
  getCurrentSubscription,
  getSubscriptionHistory,
  listCurrentSubscriptions,
  renewSubscription,
  selectPlan,
  serializeSubscription,
} from '../lib/subscriptions';
import {
  getPaymentHistory,
  handlePaymentCallback,
  refundPayment,
  serializePayment,
  startCheckout,
} from '../lib/payments';
import { checkoutLimiter } from '../middleware/rateLimiters';
import {
  getInstructorUsage,
  quotaCheckers,
  remainingQuota,
} from '../lib/quota';
import { getPlan } from '../lib/plans';
import {
  assignPlanSchema,
  checkoutSchema,
  selectPlanSchema,
} from '../validation/subscriptionSchemas';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, badRequest } from '../lib/errors';
import { env } from '../config/env';

const router = Router();

// Provider callbacks have no auth header; verify the payment with the provider instead.
router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const authority = String(req.query.Authority ?? '');
    const status = String(req.query.Status ?? '');

    const result = authority
      ? await handlePaymentCallback({ authority, status })
      : 'failed';

    res.redirect(`${env.CLIENT_URL}/plans?payment=${result}`);
  })
);

router.use(requireAuth);

router.get(
  '/me',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const sub = await getCurrentSubscription(req.user!.sub);
    res.json(serializeSubscription(sub));
  })
);

router.get(
  '/',
  requireRole('SuperAdmin'),
  asyncHandler(async (_req, res) => {
    const subs = await listCurrentSubscriptions();
    res.json(subs.map(serializeSubscription));
  })
);

router.get(
  '/usage',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const usage = await getInstructorUsage(req.user!.sub);
    res.json(usage);
  })
);

router.get(
  '/limits/:type',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    if (
      type !== 'groups' &&
      type !== 'activeExams' &&
      type !== 'questions' &&
      type !== 'handouts'
    ) {
      throw badRequest('نوع محدودیت نامعتبره');
    }
    const quota = await remainingQuota[type](req.user!.sub);
    res.json(quota);
  })
);

// Direct plan selection is free-only; paid plans require verified checkout.
router.post(
  '/select',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const parsed = selectPlanSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    if (getPlan(parsed.data.planId).price > 0) {
      throw badRequest(
        'برای پلن‌های پولی باید از فرآیند پرداخت (/subscriptions/checkout) استفاده کنی'
      );
    }

    await assertPlanChangeAllowed(req.user!.sub, parsed.data.planId);

    const sub = await selectPlan(req.user!.sub, parsed.data.planId);
    res.status(201).json(serializeSubscription(sub));
  })
);

router.post(
  '/checkout',
  requireRole('Instructor'),
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const result = await startCheckout(req.user!.sub, parsed.data.planId);

    if (result.free) {
      res.status(201).json({
        free: true,
        subscription: serializeSubscription(result.subscription),
      });
      return;
    }

    res.status(201).json({ free: false, paymentUrl: result.paymentUrl });
  })
);

// Paid renewals must use checkout rather than extending access directly.
router.post(
  '/renew',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const current = await getCurrentSubscription(req.user!.sub);
    if (getPlan(current.planId).price > 0) {
      throw badRequest(
        'تمدید پلن‌های پولی باید از فرآیند پرداخت (/subscriptions/checkout) انجام بشه'
      );
    }

    const sub = await renewSubscription(req.user!.sub);
    res.status(201).json(serializeSubscription(sub));
  })
);

router.get(
  '/me/history',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const subs = await getSubscriptionHistory(req.user!.sub);
    res.json(subs.map(serializeSubscription));
  })
);

router.get(
  '/me/payments',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const payments = await getPaymentHistory(req.user!.sub);
    res.json(payments.map(serializePayment));
  })
);

// Record a manual refund and revoke associated access; the actual money transfer is external.
router.post(
  '/:paymentId/refund',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const payment = await refundPayment(req.params.paymentId);
    res.json(serializePayment(payment));
  })
);

router.post(
  '/assign',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const parsed = assignPlanSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0].message);

    const instructor = await prisma.user.findUnique({
      where: { id: parsed.data.instructorId },
    });
    if (!instructor || instructor.role !== 'Instructor') {
      throw notFound('مدرس یافت نشد');
    }

    const sub = await selectPlan(parsed.data.instructorId, parsed.data.planId, req.user!.sub);
    res.status(201).json(serializeSubscription(sub));
  })
);

export default router;
