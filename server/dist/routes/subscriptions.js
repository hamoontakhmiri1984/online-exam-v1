"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const subscriptions_1 = require("../lib/subscriptions");
const payments_1 = require("../lib/payments");
const rateLimiters_1 = require("../middleware/rateLimiters");
const quota_1 = require("../lib/quota");
const plans_1 = require("../lib/plans");
const subscriptionSchemas_1 = require("../validation/subscriptionSchemas");
const asyncHandler_1 = require("../lib/asyncHandler");
const errors_1 = require("../lib/errors");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
// این روت باید قبل از requireAuth بیاد: زرین‌پال بعد از پرداخت خود مرورگرِ
// کاربر رو (بدون هدر Authorization) به این آدرس ریدایرکت می‌کنه، پس نمی‌تونیم
// بهش نیاز به لاگین‌بودن تحمیل کنیم. امنیتش از طریق authority (که فقط ما و
// زرین‌پال می‌دونیم) + verify سمت سرور تامین می‌شه، نه از session کاربر.
router.get('/callback', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authority = String(req.query.Authority ?? '');
    const status = String(req.query.Status ?? '');
    const result = authority
        ? await (0, payments_1.handlePaymentCallback)({ authority, status })
        : 'failed';
    res.redirect(`${env_1.env.CLIENT_URL}/plans?payment=${result}`);
}));
router.use(requireAuth_1.requireAuth);
// اشتراک فعلی خودِ مدرس - اگه ردیفی نداشته باشه، خودکار «رایگان» ساخته می‌شه
router.get('/me', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const sub = await (0, subscriptions_1.getCurrentSubscription)(req.user.sub);
    res.json((0, subscriptions_1.serializeSubscription)(sub));
}));
// لیست اشتراک فعلیِ همه‌ی مدرس‌ها - فقط SuperAdmin (صفحه‌ی گزارش‌ها،
// InstructorSubscriptionsTable)
router.get('/', (0, requireAuth_1.requireRole)('SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const subs = await (0, subscriptions_1.listCurrentSubscriptions)();
    res.json(subs.map(subscriptions_1.serializeSubscription));
}));
// مصرف فعلی مدرس (تعداد گروه/آزمون فعال/سوال) - برای نوار پیشرفت تو UI
router.get('/usage', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const usage = await (0, quota_1.getInstructorUsage)(req.user.sub);
    res.json(usage);
}));
// باقی‌مونده‌ی سهمیه‌ی هر بخش - قبل از ساخت گروه/آزمون/سوال ازش استفاده می‌شه
router.get('/limits/:type', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type } = req.params;
    if (type !== 'groups' &&
        type !== 'activeExams' &&
        type !== 'questions' &&
        type !== 'handouts') {
        throw (0, errors_1.badRequest)('نوع محدودیت نامعتبره');
    }
    const quota = await quota_1.remainingQuota[type](req.user.sub);
    res.json(quota);
}));
// مدرس فقط می‌تونه با این روت مستقیم پلن رایگان رو انتخاب کنه (بدون درگاه
// نیازی نیست). برای هر پلن پولی باید از /checkout بره - وگرنه هرکسی می‌تونست
// بدون پرداخت واقعی، خودش رو مستقیم VIP کنه.
router.post('/select', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = subscriptionSchemas_1.selectPlanSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    if ((0, plans_1.getPlan)(parsed.data.planId).price > 0) {
        throw (0, errors_1.badRequest)('برای پلن‌های پولی باید از فرآیند پرداخت (/subscriptions/checkout) استفاده کنی');
    }
    await (0, subscriptions_1.assertPlanChangeAllowed)(req.user.sub, parsed.data.planId);
    const sub = await (0, subscriptions_1.selectPlan)(req.user.sub, parsed.data.planId);
    res.status(201).json((0, subscriptions_1.serializeSubscription)(sub));
}));
// شروع فرآیند پرداخت. پلن رایگان همین‌جا مستقیم اعمال می‌شه (سازگار با
// رفتار قبلی select)؛ پلن پولی یه لینک درگاه زرین‌پال برمی‌گردونه که کلاینت
// باید کاربر رو بهش ریدایرکت کنه.
router.post('/checkout', (0, requireAuth_1.requireRole)('Instructor'), rateLimiters_1.checkoutLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = subscriptionSchemas_1.checkoutSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const result = await (0, payments_1.startCheckout)(req.user.sub, parsed.data.planId);
    if (result.free) {
        res.status(201).json({
            free: true,
            subscription: (0, subscriptions_1.serializeSubscription)(result.subscription),
        });
        return;
    }
    res.status(201).json({ free: false, paymentUrl: result.paymentUrl });
}));
// تمدید همون پلن فعلی مدرس - فقط برای پلن رایگان مستقیمه (اونم عملاً
// بی‌اثره چون پلن رایگان endDate نداره). تمدید پلن پولی باید از /checkout
// با همون planId انجام بشه، وگرنه یه مدرس می‌تونست پلن پولی‌ای که یه بار
// (حتی به هر طریقی) گرفته رو تا ابد بدون پرداخت مجدد تمدید کنه.
router.post('/renew', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await (0, subscriptions_1.getCurrentSubscription)(req.user.sub);
    if ((0, plans_1.getPlan)(current.planId).price > 0) {
        throw (0, errors_1.badRequest)('تمدید پلن‌های پولی باید از فرآیند پرداخت (/subscriptions/checkout) انجام بشه');
    }
    const sub = await (0, subscriptions_1.renewSubscription)(req.user.sub);
    res.status(201).json((0, subscriptions_1.serializeSubscription)(sub));
}));
// تاریخچه‌ی کاملِ اشتراک‌های خودِ مدرس (نه فقط پلنِ فعلی) - هر ارتقا/تمدید
// یه ردیفه
router.get('/me/history', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const subs = await (0, subscriptions_1.getSubscriptionHistory)(req.user.sub);
    res.json(subs.map(subscriptions_1.serializeSubscription));
}));
// تاریخچه‌ی کاملِ پرداخت‌های خودِ مدرس - برای صفحه‌ی صورت‌حساب/رسید
router.get('/me/payments', (0, requireAuth_1.requireRole)('Instructor'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payments = await (0, payments_1.getPaymentHistory)(req.user.sub);
    res.json(payments.map(payments_1.serializePayment));
}));
// استرداد یه پرداخت - فقط SuperAdmin (بعد از هماهنگیِ دستی با مدرس برای
// برگردوندنِ واقعیِ پول). دسترسیِ مدرس از همون لحظه قطع می‌شه (نه از پلنِ
// قبلی، چون تاریخچه‌ی append-only معنیِ «قبلی» رو مبهم می‌کنه)
router.post('/:paymentId/refund', (0, requireAuth_1.requireRole)('SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const payment = await (0, payments_1.refundPayment)(req.params.paymentId);
    res.json((0, payments_1.serializePayment)(payment));
}));
// SuperAdmin یه پلن رو دستی به یه مدرس خاص اختصاص می‌ده (مثلاً بعد از
// پرداخت آفلاین/کارت‌به‌کارت)
router.post('/assign', (0, requireAuth_1.requireRole)('SuperAdmin'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = subscriptionSchemas_1.assignPlanSchema.safeParse(req.body);
    if (!parsed.success)
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    const instructor = await prisma_1.prisma.user.findUnique({
        where: { id: parsed.data.instructorId },
    });
    if (!instructor || instructor.role !== 'Instructor') {
        throw (0, errors_1.notFound)('مدرس یافت نشد');
    }
    const sub = await (0, subscriptions_1.selectPlan)(parsed.data.instructorId, parsed.data.planId);
    res.status(201).json((0, subscriptions_1.serializeSubscription)(sub));
}));
exports.default = router;
