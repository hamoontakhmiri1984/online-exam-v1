import type { PlanId } from '../constants/plans';
import { apiRequest } from '../lib/apiClient';

export type Subscription = {
  instructorId: string;
  planId: PlanId;
  startDate: string;
  endDate: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getSubscription(_instructorId: string): Promise<Subscription> {
  return apiRequest<Subscription>('/subscriptions/me');
}

export function getAllSubscriptions(): Promise<Subscription[]> {
  return apiRequest<Subscription[]>('/subscriptions');
}

// Paid plans must use checkout; direct selection accepts only the free plan.
export function selectPlan(
  _instructorId: string,
  planId: PlanId
): Promise<Subscription> {
  return apiRequest<Subscription>('/subscriptions/select', {
    method: 'POST',
    body: { planId },
  });
}

export type CheckoutResponse =
  | { free: true; subscription: Subscription }
  | { free: false; paymentUrl: string };

export function startCheckout(planId: PlanId): Promise<CheckoutResponse> {
  return apiRequest<CheckoutResponse>('/subscriptions/checkout', {
    method: 'POST',
    body: { planId },
  });
}

export function renewSubscription(
  _instructorId: string
): Promise<Subscription> {
  return apiRequest<Subscription>('/subscriptions/renew', { method: 'POST' });
}

export function assignSubscription(
  instructorId: string,
  planId: PlanId
): Promise<Subscription> {
  return apiRequest<Subscription>('/subscriptions/assign', {
    method: 'POST',
    body: { instructorId, planId },
  });
}

export function isSubscriptionExpired(sub: Subscription): boolean {
  if (!sub.endDate) return false;
  return new Date(sub.endDate).getTime() < Date.now();
}

export function getRemainingDays(sub: Subscription): number | null {
  if (!sub.endDate) return null;
  const diff = new Date(sub.endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

export type UsageSummary = {
  groups: number;
  activeExams: number;
  questions: number;
  handouts: number;
};

export function getInstructorUsage(
  _instructorId: string
): Promise<UsageSummary> {
  return apiRequest<UsageSummary>('/subscriptions/usage');
}

export type LimitCheck =
  | { allowed: true }
  | { allowed: false; reason: 'plan_expired' | 'limit_reached' };

export type RemainingQuota =
  | { limited: false }
  | {
      limited: true;
      expired: boolean;
      limit: number;
      used: number;
      remaining: number;
    };

type QuotaType = 'groups' | 'activeExams' | 'questions';

function getRemainingQuota(type: QuotaType): Promise<RemainingQuota> {
  return apiRequest<RemainingQuota>(`/subscriptions/limits/${type}`);
}

export function getRemainingGroupQuota(
  _instructorId: string
): Promise<RemainingQuota> {
  return getRemainingQuota('groups');
}

export function getRemainingActiveExamQuota(
  _instructorId: string
): Promise<RemainingQuota> {
  return getRemainingQuota('activeExams');
}

export function getRemainingQuestionQuota(
  _instructorId: string
): Promise<RemainingQuota> {
  return getRemainingQuota('questions');
}

export function getSubscriptionHistory(): Promise<Subscription[]> {
  return apiRequest<Subscription[]>('/subscriptions/me/history');
}

export type PaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';

export type PaymentRecord = {
  id: string;
  planId: PlanId;
  amount: number;
  status: PaymentStatus;
  refId: number | null;
  createdAt: string;
};

export function getPaymentHistory(): Promise<PaymentRecord[]> {
  return apiRequest<PaymentRecord[]>('/subscriptions/me/payments');
}

// Refund records the decision and ends the associated active subscription.
export function refundPayment(paymentId: string): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>(`/subscriptions/${paymentId}/refund`, {
    method: 'POST',
  });
}
