import { prisma } from './prisma';
import { getPlan, type PlanId } from './plans';
import { requestPayment, verifyPayment } from './zarinpal';
import { env } from '../config/env';
import { lockInstructorForUpdate } from './instructorLock';
import { badRequest, notFound } from './errors';
import {
  assertPlanChangeAllowed,
  computePurchaseEndDate,
  selectPlan,
  type SubscriptionRow,
} from './subscriptions';

export type PaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';

export type PaymentRow = {
  id: string;
  instructorId: string;
  planId: PlanId;
  amount: number;
  authority: string;
  status: PaymentStatus;
  refId: number | null;
  subscriptionId: string | null;
  createdAt: Date;
};

export function serializePayment(p: PaymentRow) {
  return {
    id: p.id,
    planId: p.planId,
    amount: p.amount,
    status: p.status,
    refId: p.refId,
    createdAt: p.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// شروع پرداخت
// ---------------------------------------------------------------------------

export type CheckoutResult =
  | { free: true; subscription: SubscriptionRow }
  | { free: false; paymentUrl: string };

// شروع فرآیند پرداخت. پلن رایگان نیازی به درگاه نداره و مستقیم اعمال می‌شه؛
// پلن‌های پولی یه ردیف Payment(Pending) می‌سازن و لینک درگاه برمی‌گردن -
// پلن واقعی هیچ‌وقت این‌جا اعمال نمی‌شه، فقط بعد از verify موفق
// (settlePendingPayment).
export async function startCheckout(
  instructorId: string,
  planId: PlanId
): Promise<CheckoutResult> {
  const plan = getPlan(planId);

  // قبل از هر کاری (مخصوصاً قبل از ساخت Payment) تا کسی پولی نده که بعد
  // رد بشه
  await assertPlanChangeAllowed(instructorId, planId);

  if (plan.price === 0) {
    const subscription = await selectPlan(instructorId, planId);
    return { free: true, subscription };
  }

  const callbackUrl = `${env.SERVER_URL}/subscriptions/callback`;
  const result = await requestPayment({
    amount: plan.price,
    description: `ارتقای پلن مدرس به «${planId}»`,
    callbackUrl,
  });

  if (!result.ok) {
    throw badRequest(result.message);
  }

  await prisma.payment.create({
    data: {
      instructorId,
      planId,
      amount: plan.price,
      authority: result.authority,
      status: 'Pending',
    },
  });

  return { free: false, paymentUrl: result.paymentUrl };
}

// ---------------------------------------------------------------------------
// تسویه‌ی پرداخت (verify + اعمال پلن) - تنها مسیرِ اعمال پلن پولی، چه از
// callback مرورگر کاربر بیاد چه از reconciler پس‌زمینه
// ---------------------------------------------------------------------------

// «pending» یعنی نتیجه‌ی پرداخت هنوز قطعی نیست - ردیف Payment عمداً
// Pending می‌مونه؛ verify زرین‌پال idempotent ـه پس دوباره‌کاری خطری نداره.
export type PaymentCallbackResult = 'success' | 'failed' | 'pending';

function resultFromStatus(status: PaymentStatus): PaymentCallbackResult {
  if (status === 'Success') return 'success';
  if (status === 'Pending') return 'pending';
  return 'failed';
}

// شرط status:'Pending' تو همون کوئریِ update ـه، پس اتمیکه: اگه دو
// ریکوئست هم‌زمان با یه authority برسن، فقط یکیشون count=1 می‌گیره
async function markFailed(authority: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { authority, status: 'Pending' },
    data: { status: 'Failed' },
  });
}

// Failed هم قابل‌تبدیل به Success ـه: منبع حقیقت زرین‌پاله (verify)، نه
// وضعیت ما. مثلاً یه callback با Status=NOK یا یه reconcile زودهنگام نباید
// باعث بشه پرداختِ واقعاً موفق برای همیشه بی‌اثر بمونه
async function applyVerifiedPayment(
  payment: PaymentRow,
  refId: number
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // تسویه‌ی چند پرداختِ هم‌زمانِ *یه مدرس* (مثلاً دو تب/دو خرید پشت‌سرهم)
    // باید نوبتی بشه: بدون این قفل هر دو تراکنش «اشتراک فعلی» یکسانی رو
    // می‌خوندن و computePurchaseEndDate برای هر دو از همون endDate شروع
    // می‌کرد - یکی از دو ماهِ پرداخت‌شده گم می‌شد. `current` پایین‌تر عمداً
    // *بعد* از گرفتن قفل خونده می‌شه تا تسویه‌ی قبلی رو ببینه
    await lockInstructorForUpdate(tx, payment.instructorId);

    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ['Pending', 'Failed'] } },
      data: { status: 'Success', refId },
    });
    if (count !== 1) return false;

    const now = new Date();
    const current = await tx.subscription.findFirst({
      where: { instructorId: payment.instructorId },
      orderBy: { startDate: 'desc' },
    });
    const subscription = await tx.subscription.create({
      data: {
        instructorId: payment.instructorId,
        planId: payment.planId,
        startDate: now,
        endDate: computePurchaseEndDate(payment.planId, current, now),
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id },
    });
    return true;
  });
}

async function settlePendingPayment(
  payment: PaymentRow
): Promise<PaymentCallbackResult> {
  const verified = await verifyPayment({
    amount: payment.amount,
    authority: payment.authority,
  });

  if (!verified.ok) {
    if (verified.retryable) {
      console.error(
        `payment verify outcome unknown (authority=${payment.authority})`
      );
      return 'pending';
    }
    await markFailed(payment.authority);
    return 'failed';
  }

  try {
    if (await applyVerifiedPayment(payment, verified.refId)) return 'success';

    const latest = await prisma.payment.findUnique({
      where: { id: payment.id },
    });
    return latest ? resultFromStatus(latest.status) : 'failed';
  } catch (err) {
    console.error('payment apply failed, left pending:', err);
    return 'pending';
  }
}

// نقطه‌ی ورود callback زرین‌پال (مرورگر کاربر)
export async function handlePaymentCallback(params: {
  authority: string;
  status: string;
}): Promise<PaymentCallbackResult> {
  const payment = await prisma.payment.findUnique({
    where: { authority: params.authority },
  });
  if (!payment) return 'failed';

  const canSettle =
    payment.status === 'Pending' ||
    (payment.status === 'Failed' && params.status === 'OK');
  if (!canSettle) return resultFromStatus(payment.status);

  if (params.status !== 'OK') {
    await markFailed(payment.authority);
    return 'failed';
  }

  return settlePendingPayment(payment);
}

// ---------------------------------------------------------------------------
// reconciler پس‌زمینه
// ---------------------------------------------------------------------------

// پرداخت‌هایی که کاربر بعد از پرداخت به callback برنگشته (بستن مرورگر،
// قطعی نت) یا verify اون لحظه نتیجه‌ی نامشخص داد، بدون این job برای همیشه
// Pending می‌موندن و پول گرفته‌شده پلنی فعال نمی‌کرد.
// MIN_AGE: کاربر ممکنه هنوز تو صفحه‌ی درگاه باشه؛ verify زودهنگام روی
// تراکنشِ در حال پرداخت خطای «ناموفق» می‌ده. MAX_AGE: بعد از این مدت دیگه
// خودکار پیگیری نمی‌شه (نیاز به بررسی دستی).
const RECONCILE_MIN_AGE_MS = 30 * 60 * 1000;
const RECONCILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function reconcilePendingPayments(limit = 50): Promise<number> {
  const now = Date.now();
  const pending = await prisma.payment.findMany({
    where: {
      status: 'Pending',
      createdAt: {
        lt: new Date(now - RECONCILE_MIN_AGE_MS),
        gt: new Date(now - RECONCILE_MAX_AGE_MS),
      },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let settled = 0;
  for (const payment of pending) {
    if ((await settlePendingPayment(payment)) !== 'pending') settled++;
  }
  return settled;
}

// چند instance هم‌زمان اجرا بشن مشکلی نیست - اعمال پلن اتمیکه
export function startPaymentReconciler(intervalMs = 5 * 60 * 1000) {
  const timer = setInterval(() => {
    reconcilePendingPayments().catch((err) =>
      console.error('reconcilePendingPayments failed:', err)
    );
  }, intervalMs);
  timer.unref();
  return timer;
}

// ---------------------------------------------------------------------------
// استرداد و تاریخچه
// ---------------------------------------------------------------------------

// استرداد یه پرداختِ موفق - فقط SuperAdmin. زرین‌پال API استرداد خودکار
// نداره؛ این تابع فقط سمتِ خودمون رو ثبت می‌کنه و endDate رو به «الان»
// می‌بنده تا دسترسی از همین لحظه قطع بشه (نه دستکاری تاریخچه). هر دو تغییر
// تو یه تراکنشن تا وسطش نیمه‌کاره نمونه
export async function refundPayment(paymentId: string): Promise<PaymentRow> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound('پرداخت پیدا نشد');
  if (payment.status !== 'Success') {
    throw badRequest('فقط پرداخت‌های موفق قابل استرداد هستن');
  }

  await prisma.$transaction(async (tx) => {
    // همون قفلِ تسویه، با همون ترتیب (اول مدرس، بعد Payment)
    await lockInstructorForUpdate(tx, payment.instructorId);

    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: 'Success' },
      data: { status: 'Refunded' },
    });
    if (count === 0) {
      throw badRequest('این پرداخت قبلاً پردازش شده');
    }

    if (payment.subscriptionId) {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: { endDate: new Date() },
      });
    }
  });

  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

export async function getPaymentHistory(
  instructorId: string
): Promise<PaymentRow[]> {
  return prisma.payment.findMany({
    where: { instructorId },
    orderBy: { createdAt: 'desc' },
  });
}
