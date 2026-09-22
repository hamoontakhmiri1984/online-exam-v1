export type PlanId = 'free' | 'gold' | 'platinum' | 'vip';

export type Plan = {
  id: PlanId;
  name: string;
  price: number; // تومان - صفر یعنی رایگان
  priceLabel: string; // برای نمایش، همون فرمت لندینگ (مثلاً «۹۹,۰۰۰»)
  durationDays: number | null; // طول یه دوره‌ی اشتراک - null یعنی همیشگی (پلن رایگان)
  maxQuestions: number | null;
  maxActiveExams: number | null;
  maxGroups: number | null;
  features: string[];
};

export const PLAN_ORDER: PlanId[] = ['free', 'gold', 'platinum', 'vip'];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'رایگان',
    price: 0,
    priceLabel: '۰',
    durationDays: null,
    maxQuestions: 50,
    maxActiveExams: 1,
    maxGroups: 1,
    features: [
      'تا ۵۰ سوال در بانک سوال',
      '۱ آزمون فعال هم‌زمان',
      '۱ گروه',
      'گزارش‌گیری پایه',
    ],
  },
  gold: {
    id: 'gold',
    name: 'طلایی',
    price: 99000,
    priceLabel: '۹۹,۰۰۰',
    durationDays: 30,
    maxQuestions: 500,
    maxActiveExams: 10,
    maxGroups: 5,
    features: [
      'تا ۵۰۰ سوال در بانک سوال',
      '۱۰ آزمون فعال هم‌زمان',
      'تا ۵ گروه',
      'ایمپورت نامحدود از اکسل',
      'گزارش‌گیری پیشرفته',
    ],
  },
  platinum: {
    id: 'platinum',
    name: 'پلاتینیوم',
    price: 199000,
    priceLabel: '۱۹۹,۰۰۰',
    durationDays: 30,
    maxQuestions: null,
    maxActiveExams: null,
    maxGroups: null,
    features: [
      'بانک سوال و آزمون نامحدود',
      'گروه نامحدود',
      'گزارش‌گیری تحلیلی و نموداری',
      'پشتیبانی در ساعات اداری',
    ],
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    price: 349000,
    priceLabel: '۳۴۹,۰۰۰',
    durationDays: 30,
    maxQuestions: null,
    maxActiveExams: null,
    maxGroups: null,
    features: [
      'همه‌ی امکانات پلاتینیوم',
      'پشتیبانی اختصاصی ۲۴ ساعته',
      'دسترسی زودهنگام به امکانات جدید',
    ],
  },
};

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

export function getNextPlan(id: PlanId): Plan | null {
  const index = PLAN_ORDER.indexOf(id);
  if (index === -1 || index === PLAN_ORDER.length - 1) return null;
  return PLANS[PLAN_ORDER[index + 1]];
}
