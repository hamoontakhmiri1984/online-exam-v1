import {
  Zap,
  ShieldCheck,
  Headphones,
  ListChecks,
  FileSpreadsheet,
  Timer,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Award,
  Star,
  Lock,
  Rocket,
  Heart,
  Globe,
  Users,
  Clock,
  BookOpen,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

// چون آیکون‌های lucide-react کامپوننت‌ان نه رشته، نمی‌شه مستقیم تو دیتابیس
// ذخیره‌شون کرد - این فایل یه allowlist از اسمِ رشته‌ای ↔ کامپوننته. تو
// فرم‌های ادمین (about/features) فقط از بینِ همین اسم‌ها انتخاب می‌شه، و
// همین فایل تو صفحه‌ی فرود (فاز ۳) هم برای رندرِ آیکونِ واقعی استفاده می‌شه.
// اضافه‌کردنِ آیکونِ جدید یعنی همین‌جا اضافه بشه، نه هرجای دیگه.
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Zap,
  ShieldCheck,
  Headphones,
  ListChecks,
  FileSpreadsheet,
  Timer,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Award,
  Star,
  Lock,
  Rocket,
  Heart,
  Globe,
  Users,
  Clock,
  BookOpen,
  MessageCircle,
};

export type IconName = keyof typeof ICON_REGISTRY;

export const ICON_NAMES = Object.keys(ICON_REGISTRY) as IconName[];

export const DEFAULT_ICON_NAME: IconName = 'Sparkles';

// برای وقتی مقدارِ ذخیره‌شده تو دیتابیس یه اسمِ نامعتبر/قدیمی بود (مثلاً
// آیکونی که بعداً از allowlist حذف شد) - به‌جای کرش، آیکونِ پیش‌فرض
export function resolveIcon(name: string | undefined): LucideIcon {
  if (name && name in ICON_REGISTRY) return ICON_REGISTRY[name];
  return ICON_REGISTRY[DEFAULT_ICON_NAME];
}
