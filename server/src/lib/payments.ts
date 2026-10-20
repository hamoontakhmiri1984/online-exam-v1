import { periodicTask } from './periodicTask';
import { logEvent } from './logger';
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

export type CheckoutResult =
  | { free: true; subscription: SubscriptionRow }
  | { free: false; paymentUrl: string };

// Activate paid plans only after successful provider verification.
export async function startCheckout(
  instructorId: string,
  planId: PlanId
): Promise<CheckoutResult> {
  const plan = getPlan(planId);

  // Validate eligibility before creating a payable transaction.
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

// Unknown verification outcomes remain pending and can be retried safely.
export type PaymentCallbackResult = 'success' | 'failed' | 'pending';

function resultFromStatus(status: PaymentStatus): PaymentCallbackResult {
  if (status === 'Success') return 'success';
  if (status === 'Pending') return 'pending';
  return 'failed';
}

// The conditional update allows only one request to settle a pending payment.
async function markFailed(authority: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { authority, status: 'Pending' },
    data: { status: 'Failed' },
  });
}

// Provider verification is authoritative; a locally failed payment may still settle successfully.
async function applyVerifiedPayment(
  payment: PaymentRow,
  refId: number
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // Lock the instructor before reading the current subscription to preserve consecutive purchases.
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
      logEvent('error', `payment verify outcome unknown (authority=${payment.authority})`);
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
    logEvent('error', 'payment apply failed, left pending:', err);
    return 'pending';
  }
}

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

// Reconcile missed callbacks within the age window; older payments require manual review.
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

export function startPaymentReconciler(intervalMs = 5 * 60 * 1000) {
  return periodicTask(reconcilePendingPayments, intervalMs, error => logEvent('error', 'payment_reconcile_failed', error));
}

// Record the manual refund and end access atomically; this does not transfer money.
export async function refundPayment(paymentId: string): Promise<PaymentRow> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound('پرداخت پیدا نشد');
  if (payment.status !== 'Success') {
    throw badRequest('فقط پرداخت‌های موفق قابل استرداد هستن');
  }

  await prisma.$transaction(async (tx) => {
    // Keep lock order consistent: instructor, then payment.
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
