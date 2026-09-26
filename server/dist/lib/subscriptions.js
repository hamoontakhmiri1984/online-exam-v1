"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEndDate = computeEndDate;
exports.computePurchaseEndDate = computePurchaseEndDate;
exports.serializeSubscription = serializeSubscription;
exports.getCurrentSubscription = getCurrentSubscription;
exports.assertPlanChangeAllowed = assertPlanChangeAllowed;
exports.listCurrentSubscriptions = listCurrentSubscriptions;
exports.selectPlan = selectPlan;
exports.renewSubscription = renewSubscription;
exports.getSubscriptionHistory = getSubscriptionHistory;
exports.isSubscriptionExpired = isSubscriptionExpired;
exports.getRemainingDays = getRemainingDays;
const prisma_1 = require("./prisma");
const plans_1 = require("./plans");
const errors_1 = require("./errors");
const notifications_1 = require("./notifications");
const instructorLock_1 = require("./instructorLock");
const DAY_MS = 24 * 60 * 60 * 1000;
function computeEndDate(planId, from) {
    const plan = (0, plans_1.getPlan)(planId);
    if (plan.durationDays === null)
        return null;
    return new Date(from.getTime() + plan.durationDays * DAY_MS);
}
// خرید پولی: اگه همون پلنِ فعلی هنوز منقضی نشده، مدت جدید از انتهای اشتراک
// فعلی شروع می‌شه تا روزهای باقی‌مونده‌ی پرداخت‌شده نسوزه؛ وگرنه از الان
function computePurchaseEndDate(planId, current, now) {
    const canExtend = current !== null &&
        current.planId === planId &&
        current.endDate !== null &&
        current.endDate.getTime() > now.getTime();
    return computeEndDate(planId, canExtend ? current.endDate : now);
}
function serializeSubscription(s) {
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
async function notifyIfNewlyExpired(sub) {
    if (!sub.endDate || sub.endDate.getTime() >= Date.now())
        return;
    if (sub.expiryNotifiedAt)
        return;
    const { count } = await prisma_1.prisma.subscription.updateMany({
        where: { id: sub.id, expiryNotifiedAt: null },
        data: { expiryNotifiedAt: new Date() },
    });
    if (count === 0)
        return;
    await (0, notifications_1.notifyUser)(sub.instructorId, `پلن «${sub.planId}» شما منقضی شد - برای ادامه‌ی استفاده تمدید کنید`, 'info');
}
// طبق کامنت schema.prisma: تاریخچه‌ی اشتراک نگه داشته می‌شه (هر ارتقا/تمدید
// یه ردیف جدیده)، «پلن فعلی» یعنی جدیدترین ردیف بر اساس startDate. اگه
// مدرسی هنوز هیچ ردیفی نداشته باشه، دقیقاً مثل mock یه ردیف «رایگان»
// می‌سازیم و همون رو برمی‌گردونیم
async function getCurrentSubscription(instructorId) {
    const existing = await prisma_1.prisma.subscription.findFirst({
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
    return prisma_1.prisma.$transaction(async (tx) => {
        await (0, instructorLock_1.lockInstructorForUpdate)(tx, instructorId);
        const created = await tx.subscription.findFirst({
            where: { instructorId },
            orderBy: { startDate: 'desc' },
        });
        if (created)
            return created;
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
async function assertPlanChangeAllowed(instructorId, targetPlanId) {
    const current = await getCurrentSubscription(instructorId);
    if ((0, plans_1.getPlan)(current.planId).price === 0 || isSubscriptionExpired(current)) {
        return;
    }
    if (plans_1.PLAN_ORDER.indexOf(targetPlanId) < plans_1.PLAN_ORDER.indexOf(current.planId)) {
        throw (0, errors_1.badRequest)('تا پایان دوره‌ی پلن فعلی نمی‌تونی به پلن پایین‌تر بری. بعد از پایان دوره می‌تونی تغییر بدی');
    }
}
// اشتراک فعلیِ همه‌ی مدرس‌ها با دو کوئری (نه N+1) و بدون اثر جانبی: مدرسِ
// بدون ردیف «رایگان» حساب می‌شه ولی چیزی تو دیتابیس ساخته نمی‌شه و اعلان
// انقضا هم از مسیر خواندنِ ادمین فرستاده نمی‌شه
async function listCurrentSubscriptions() {
    const [instructors, latest] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where: { role: 'Instructor' },
            select: { id: true },
        }),
        prisma_1.prisma.subscription.findMany({
            where: { instructor: { role: 'Instructor' } },
            orderBy: [{ instructorId: 'asc' }, { startDate: 'desc' }],
            distinct: ['instructorId'],
        }),
    ]);
    const byInstructor = new Map(latest.map((s) => [s.instructorId, s]));
    return instructors.map((i) => byInstructor.get(i.id) ?? {
        instructorId: i.id,
        planId: 'free',
        startDate: new Date(),
        endDate: null,
    });
}
// انتخاب/ارتقای پلن - همیشه یه ردیف تازه می‌سازه (نه آپدیت ردیف قبلی) تا
// تاریخچه حفظ بشه. فقط برای مسیرهای بدون پرداخت (پلن رایگان، اختصاص دستی
// توسط SuperAdmin)؛ پلن پولی‌ای که پرداخت شده از lib/payments.ts اعمال می‌شه
async function selectPlan(instructorId, planId) {
    const now = new Date();
    return prisma_1.prisma.subscription.create({
        data: {
            instructorId,
            planId,
            startDate: now,
            endDate: computeEndDate(planId, now),
        },
    });
}
// تمدید همون پلن فعلی - یه ردیف جدید با تاریخ شروع/پایان تازه
async function renewSubscription(instructorId) {
    const current = await getCurrentSubscription(instructorId);
    return selectPlan(instructorId, current.planId);
}
async function getSubscriptionHistory(instructorId) {
    return prisma_1.prisma.subscription.findMany({
        where: { instructorId },
        orderBy: { startDate: 'desc' },
    });
}
function isSubscriptionExpired(sub) {
    if (!sub.endDate)
        return false;
    return sub.endDate.getTime() < Date.now();
}
function getRemainingDays(sub) {
    if (!sub.endDate)
        return null;
    const diff = sub.endDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / DAY_MS));
}
