// معادل سرور-ساید constants/plans.ts تو فرانت - فقط فیلدهای «کارکردی»
// (قیمت، مدت، سقف‌ها) که برای محاسبه‌ی endDate و چک محدودیت لازمه؛ چیزهای
// نمایشی مثل priceLabel/features فقط سمت فرانت لازمه و اینجا نیست

export type PlanId = 'free' | 'gold' | 'platinum' | 'vip';

export type Plan = {
  id: PlanId;
  price: number;
  durationDays: number | null; // null یعنی همیشگی (پلن رایگان)
  maxQuestions: number | null;
  maxActiveExams: number | null;
  maxGroups: number | null;
  maxHandouts: number | null;
};

export const PLAN_ORDER: PlanId[] = ['free', 'gold', 'platinum', 'vip'];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    price: 0,
    durationDays: null,
    maxQuestions: 50,
    maxActiveExams: 1,
    maxGroups: 1,
    maxHandouts: 5,
  },
  gold: {
    id: 'gold',
    price: 99000,
    durationDays: 30,
    maxQuestions: 500,
    maxActiveExams: 10,
    maxGroups: 5,
    maxHandouts: 50,
  },
  platinum: {
    id: 'platinum',
    price: 199000,
    durationDays: 30,
    maxQuestions: null,
    maxActiveExams: null,
    maxGroups: null,
    maxHandouts: null,
  },
  vip: {
    id: 'vip',
    price: 349000,
    durationDays: 30,
    maxQuestions: null,
    maxActiveExams: null,
    maxGroups: null,
    maxHandouts: null,
  },
};

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}
