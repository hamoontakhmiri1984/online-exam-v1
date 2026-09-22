import type { PlanId } from '../constants/plans';
import { apiRequest } from '../lib/apiClient';

export type Subscription = {
  instructorId: string;
  planId: PlanId;
  startDate: string;
  endDate: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// شکل داده‌ها دقیقاً همون‌هاییه که سرور برمی‌گردونه (server/src/lib/subscriptions.ts
// -> serializeSubscription/getInstructorUsage/remainingQuota)، پس این فایل
// عمدتاً wrapper نازک دور apiRequest ـه.
//
// نکته‌ی مهم: GET /subscriptions/me و بقیه‌ی مسیرهای instructor-only، مدرس
// رو از accessToken (نه از پارامتر) تشخیص می‌دن - پس اینجا instructorId رو
// می‌گیریم ولی به سرور نمی‌فرستیمش، فقط برای این‌که امضای فراخوانی از
// useSubscription.ts/صفحه‌های instructor عوض نشه. برای دیدن اشتراکِ یه مدرسِ
// دیگه (مثلاً SuperAdmin که همه رو می‌بینه) باید getAllSubscriptions() رو
// صدا زد، نه این تابع رو.

export function getSubscription(_instructorId: string): Promise<Subscription> {
  return apiRequest<Subscription>('/subscriptions/me');
}

// فقط SuperAdmin - اشتراک فعلیِ همه‌ی مدرس‌ها با یه درخواست (صفحه‌ی
// گزارش‌ها/مدیریت اشتراک‌ها؛ نه یه به یه با getSubscription)
export function getAllSubscriptions(): Promise<Subscription[]> {
  return apiRequest<Subscription[]>('/subscriptions');
}

// فقط برای پلن رایگان کار می‌کنه - سرور خودش پلن پولی رو رد می‌کنه (باید از
// startCheckout استفاده بشه)
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

// شروع فرآیند پرداخت. برای پلن رایگان بلافاصله همون‌جا اعمال می‌شه (مثل
// selectPlan قدیمی)؛ برای پلن پولی یه paymentUrl برمی‌گردونه که باید کاربر
// رو بهش ریدایرکت کرد (window.location.href) - از اون‌جا به بعد کاربر تو
// درگاه زرین‌پاله و بعد از پرداخت خودکار به /plans?payment=success|failed
// برمی‌گرده.
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

// فقط SuperAdmin
export function assignSubscription(
  instructorId: string,
  planId: PlanId
): Promise<Subscription> {
  return apiRequest<Subscription>('/subscriptions/assign', {
    method: 'POST',
    body: { instructorId, planId },
  });
}

// این دو تابع خالص‌ان (فقط رو یه Subscription که از قبل داریم حساب می‌کنن)،
// نیازی به سرور ندارن - دست‌نخورده از نسخه‌ی قبلی موندن
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

// سرور همین منطق (سقف/مصرف‌شده/باقی‌مونده) رو خودش حساب می‌کنه
// (server/src/lib/subscriptions.ts -> remainingQuota) - دیگه لازم نیست
// اینجا usage و پلن رو جدا بگیریم و دستی تفریق کنیم
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

// تاریخچه‌ی کاملِ اشتراک‌های خودِ مدرس (نه فقط پلنِ فعلی) - هر ارتقا/تمدید
// یه ردیف جدیده، از جدیدترین به قدیمی‌ترین
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

// تاریخچه‌ی کاملِ پرداخت‌های خودِ مدرس - برای صفحه‌ی رسید/صورت‌حساب
export function getPaymentHistory(): Promise<PaymentRecord[]> {
  return apiRequest<PaymentRecord[]>('/subscriptions/me/payments');
}

// فقط SuperAdmin - وضعیتِ پرداخت رو Refunded می‌کنه و اگه ردیفِ اشتراکِ
// مرتبط هنوز فعال باشه، بلافاصله دسترسیِ مدرس رو قطع می‌کنه (برگردوندنِ
// واقعیِ پول همچنان دستیه - این فقط وضعیتِ سمتِ خودمون رو ثبت می‌کنه)
export function refundPayment(paymentId: string): Promise<PaymentRecord> {
  return apiRequest<PaymentRecord>(`/subscriptions/${paymentId}/refund`, {
    method: 'POST',
  });
}
