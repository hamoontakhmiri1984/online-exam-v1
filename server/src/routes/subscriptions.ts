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

// این روت باید قبل از requireAuth بیاد: زرین‌پال بعد از پرداخت خود مرورگرِ
// کاربر رو (بدون هدر Authorization) به این آدرس ریدایرکت می‌کنه، پس نمی‌تونیم
// بهش نیاز به لاگین‌بودن تحمیل کنیم. امنیتش از طریق authority (که فقط ما و
// زرین‌پال می‌دونیم) + verify سمت سرور تامین می‌شه، نه از session کاربر.
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

// اشتراک فعلی خودِ مدرس - اگه ردیفی نداشته باشه، خودکار «رایگان» ساخته می‌شه
router.get(
  '/me',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const sub = await getCurrentSubscription(req.user!.sub);
    res.json(serializeSubscription(sub));
  })
);

// لیست اشتراک فعلیِ همه‌ی مدرس‌ها - فقط SuperAdmin (صفحه‌ی گزارش‌ها،
// InstructorSubscriptionsTable)
router.get(
  '/',
  requireRole('SuperAdmin'),
  asyncHandler(async (_req, res) => {
    const subs = await listCurrentSubscriptions();
    res.json(subs.map(serializeSubscription));
  })
);

// مصرف فعلی مدرس (تعداد گروه/آزمون فعال/سوال) - برای نوار پیشرفت تو UI
router.get(
  '/usage',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const usage = await getInstructorUsage(req.user!.sub);
    res.json(usage);
  })
);

// باقی‌مونده‌ی سهمیه‌ی هر بخش - قبل از ساخت گروه/آزمون/سوال ازش استفاده می‌شه
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

// مدرس فقط می‌تونه با این روت مستقیم پلن رایگان رو انتخاب کنه (بدون درگاه
// نیازی نیست). برای هر پلن پولی باید از /checkout بره - وگرنه هرکسی می‌تونست
// بدون پرداخت واقعی، خودش رو مستقیم VIP کنه.
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

// شروع فرآیند پرداخت. پلن رایگان همین‌جا مستقیم اعمال می‌شه (سازگار با
// رفتار قبلی select)؛ پلن پولی یه لینک درگاه زرین‌پال برمی‌گردونه که کلاینت
// باید کاربر رو بهش ریدایرکت کنه.
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

// تمدید همون پلن فعلی مدرس - فقط برای پلن رایگان مستقیمه (اونم عملاً
// بی‌اثره چون پلن رایگان endDate نداره). تمدید پلن پولی باید از /checkout
// با همون planId انجام بشه، وگرنه یه مدرس می‌تونست پلن پولی‌ای که یه بار
// (حتی به هر طریقی) گرفته رو تا ابد بدون پرداخت مجدد تمدید کنه.
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

// تاریخچه‌ی کاملِ اشتراک‌های خودِ مدرس (نه فقط پلنِ فعلی) - هر ارتقا/تمدید
// یه ردیفه
router.get(
  '/me/history',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const subs = await getSubscriptionHistory(req.user!.sub);
    res.json(subs.map(serializeSubscription));
  })
);

// تاریخچه‌ی کاملِ پرداخت‌های خودِ مدرس - برای صفحه‌ی صورت‌حساب/رسید
router.get(
  '/me/payments',
  requireRole('Instructor'),
  asyncHandler(async (req, res) => {
    const payments = await getPaymentHistory(req.user!.sub);
    res.json(payments.map(serializePayment));
  })
);

// استرداد یه پرداخت - فقط SuperAdmin (بعد از هماهنگیِ دستی با مدرس برای
// برگردوندنِ واقعیِ پول). دسترسیِ مدرس از همون لحظه قطع می‌شه (نه از پلنِ
// قبلی، چون تاریخچه‌ی append-only معنیِ «قبلی» رو مبهم می‌کنه)
router.post(
  '/:paymentId/refund',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const payment = await refundPayment(req.params.paymentId);
    res.json(serializePayment(payment));
  })
);

// SuperAdmin یه پلن رو دستی به یه مدرس خاص اختصاص می‌ده (مثلاً بعد از
// پرداخت آفلاین/کارت‌به‌کارت)
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

    const sub = await selectPlan(parsed.data.instructorId, parsed.data.planId);
    res.status(201).json(serializeSubscription(sub));
  })
);

export default router;
