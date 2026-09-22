import { prisma } from './prisma';
import { PLAN_ORDER, getPlan, type PlanId } from './plans';
import { badRequest } from './errors';
import { notifyUser } from './notifications';
import { lockInstructorForUpdate } from './instructorLock';

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionRow = {
  id: string;
  instructorId: string;
  planId: PlanId;
  startDate: Date;
  endDate: Date | null;
  expiryNotifiedAt: Date | null;
};

// فقط فیلدهایی که serializeSubscription لازم داره - برای لیست‌هایی که ردیف
// «رایگانِ پیش‌فرض» رو بدون ساختنش تو دیتابیس برمی‌گردونن
export type SubscriptionSummary = Pick<
  SubscriptionRow,
  'instructorId' | 'planId' | 'startDate' | 'endDate'
>;

export function computeEndDate(planId: PlanId, from: Date): Date | null {
  const plan = getPlan(planId);
  if (plan.durationDays === null) return null;
  return new Date(from.getTime() + plan.durationDays * DAY_MS);
}

// خرید پولی: اگه همون پلنِ فعلی هنوز منقضی نشده، مدت جدید از انتهای اشتراک
// فعلی شروع می‌شه تا روزهای باقی‌مونده‌ی پرداخت‌شده نسوزه؛ وگرنه از الان
export function computePurchaseEndDate(
  planId: PlanId,
  current: { planId: PlanId; endDate: Date | null } | null,
  now: Date
): Date | null {
  const canExtend =
    current !== null &&
    current.planId === planId &&
    current.endDate !== null &&
    current.endDate.getTime() > now.getTime();
  return computeEndDate(planId, canExtend ? current!.endDate! : now);
}

export function serializeSubscription(s: SubscriptionSummary) {
  return {
    instructorId: s.instructorId,
    planId: s.planId,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate ? s.endDate.toISOString() : null,
  };
}

// چک lazy برای اطلاع‌رسانیِ انقضا: به‌جای یه cron/job جداگانه (که این پروژه
// زیرساختش رو نداره)، همینجا هر بار getCurrentSubscription صدا زده می‌شه
// چک می‌کنیم. expiryNotifiedAt جلوی اسپم رو می‌گیره - یه‌بار که نوتیف
// فرستاده شد، دیگه هیچ‌وقت دوباره چک نمی‌کنه. updateMany atomic ـه.
async function notifyIfNewlyExpired(sub: SubscriptionRow): Promise<void> {
  if (!sub.endDate || sub.endDate.getTime() >= Date.now()) return;
  if (sub.expiryNotifiedAt) return;

  const { count } = await prisma.subscription.updateMany({
    where: { id: sub.id, expiryNotifiedAt: null },
    data: { expiryNotifiedAt: new Date() },
  });
  if (count === 0) return;

  await notifyUser(
    sub.instructorId,
    `پلن «${sub.planId}» شما منقضی شد - برای ادامه‌ی استفاده تمدید کنید`,
    'info'
  );
}

// طبق کامنت schema.prisma: تاریخچه‌ی اشتراک نگه داشته می‌شه (هر ارتقا/تمدید
// یه ردیف جدیده)، «پلن فعلی» یعنی جدیدترین ردیف بر اساس startDate. اگه
// مدرسی هنوز هیچ ردیفی نداشته باشه، دقیقاً مثل mock یه ردیف «رایگان»
// می‌سازیم و همون رو برمی‌گردونیم
export async function getCurrentSubscription(
  instructorId: string
): Promise<SubscriptionRow> {
  const existing = await prisma.subscription.findFirst({
    where: { instructorId },
    orderBy: { startDate: 'desc' },
  });
  if (existing) {
    await notifyIfNewlyExpired(existing);
    return existing;
  }

  // مدرسِ بدون ردیف: چند درخواستِ هم‌زمانِ اول (مثلاً چند تب، یا سهمیه +
  // /subscriptions/me) همه «ردیفی نیست» می‌دیدن و هرکدوم یه ردیف «رایگان»
  // می‌ساخت. ساخت الان پشت قفل ردیف مدرس (همون قفل تسویه‌ی پرداخت و سهمیه)
  // و با چکِ دوباره *بعد از قفل* انجام می‌شه. فقط تو همین مسیرِ کم‌تکرار
  // تراکنش باز می‌شه، نه تو هر خواندنِ اشتراک
  return prisma.$transaction(async (tx) => {
    await lockInstructorForUpdate(tx, instructorId);

    const created = await tx.subscription.findFirst({
      where: { instructorId },
      orderBy: { startDate: 'desc' },
    });
    if (created) return created;

    return tx.subscription.create({
      data: {
        instructorId,
        planId: 'free',
        startDate: new Date(),
        endDate: null,
      },
    });
  });
}

// تا وقتی پلن پولیِ فعلی منقضی نشده، رفتن به پلن پایین‌تر (رایگان یا پولیِ
// ارزون‌تر) رد می‌شه؛ وگرنه ردیفِ جدید از «همین الان» جای پلن فعلی رو
// می‌گیره و روزهای پرداخت‌شده می‌سوزه. ارتقا و تمدیدِ همون پلن مجازه.
// اختصاص دستیِ SuperAdmin (assign) از این چک رد نمی‌شه
export async function assertPlanChangeAllowed(
  instructorId: string,
  targetPlanId: PlanId
): Promise<void> {
  const current = await getCurrentSubscription(instructorId);
  if (getPlan(current.planId).price === 0 || isSubscriptionExpired(current)) {
    return;
  }

  if (PLAN_ORDER.indexOf(targetPlanId) < PLAN_ORDER.indexOf(current.planId)) {
    throw badRequest(
      'تا پایان دوره‌ی پلن فعلی نمی‌تونی به پلن پایین‌تر بری. بعد از پایان دوره می‌تونی تغییر بدی'
    );
  }
}

// اشتراک فعلیِ همه‌ی مدرس‌ها با دو کوئری (نه N+1) و بدون اثر جانبی: مدرسِ
// بدون ردیف «رایگان» حساب می‌شه ولی چیزی تو دیتابیس ساخته نمی‌شه و اعلان
// انقضا هم از مسیر خواندنِ ادمین فرستاده نمی‌شه
export async function listCurrentSubscriptions(): Promise<
  SubscriptionSummary[]
> {
  const [instructors, latest] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'Instructor' },
      select: { id: true },
    }),
    prisma.subscription.findMany({
      where: { instructor: { role: 'Instructor' } },
      orderBy: [{ instructorId: 'asc' }, { startDate: 'desc' }],
      distinct: ['instructorId'],
    }),
  ]);

  const byInstructor = new Map(latest.map((s) => [s.instructorId, s]));
  return instructors.map(
    (i) =>
      byInstructor.get(i.id) ?? {
        instructorId: i.id,
        planId: 'free' as const,
        startDate: new Date(),
        endDate: null,
      }
  );
}

// انتخاب/ارتقای پلن - همیشه یه ردیف تازه می‌سازه (نه آپدیت ردیف قبلی) تا
// تاریخچه حفظ بشه. فقط برای مسیرهای بدون پرداخت (پلن رایگان، اختصاص دستی
// توسط SuperAdmin)؛ پلن پولی‌ای که پرداخت شده از lib/payments.ts اعمال می‌شه
export async function selectPlan(
  instructorId: string,
  planId: PlanId
): Promise<SubscriptionRow> {
  const now = new Date();
  return prisma.subscription.create({
    data: {
      instructorId,
      planId,
      startDate: now,
      endDate: computeEndDate(planId, now),
    },
  });
}

// تمدید همون پلن فعلی - یه ردیف جدید با تاریخ شروع/پایان تازه
export async function renewSubscription(
  instructorId: string
): Promise<SubscriptionRow> {
  const current = await getCurrentSubscription(instructorId);
  return selectPlan(instructorId, current.planId);
}

export async function getSubscriptionHistory(
  instructorId: string
): Promise<SubscriptionRow[]> {
  return prisma.subscription.findMany({
    where: { instructorId },
    orderBy: { startDate: 'desc' },
  });
}

export function isSubscriptionExpired(sub: { endDate: Date | null }): boolean {
  if (!sub.endDate) return false;
  return sub.endDate.getTime() < Date.now();
}

export function getRemainingDays(sub: { endDate: Date | null }): number | null {
  if (!sub.endDate) return null;
  const diff = sub.endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}
