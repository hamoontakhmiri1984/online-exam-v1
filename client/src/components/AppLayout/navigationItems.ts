import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Award,
  PlayCircle,
  Layers,
  CreditCard,
  ShieldCheck,
  Tags,
  GraduationCap,
  LibraryBig,
  BookOpenCheck,
  Layout,
  Newspaper,
  type LucideIcon,
} from 'lucide-react';

import type { Role } from '../../api/authApi';

import { ALL_ROLES } from '../../constants/roles';

export type NavigationGroupId = 'users' | 'content' | 'finance' | 'system';

export const navigationGroupLabel: Record<NavigationGroupId, string> = {
  users: 'کاربران',
  content: 'محتوا',
  finance: 'مالی',
  system: 'سیستم',
};

export type NavigationItem = {
  label: string;
  adminLabel?: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
  /** فقط برای منوی کاربر ارشد: آیتم‌های هم‌گروه زیر یک سرتیتر می‌آیند */
  group?: NavigationGroupId;
};

export const navigationItems: NavigationItem[] = [
  {
    label: 'داشبورد',
    adminLabel: 'میزکار',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    label: 'آزمون‌ها',
    adminLabel: 'آزمون‌ها',
    to: '/exams',
    icon: FileText,
    roles: ALL_ROLES,
  },
  {
    label: 'تمرین‌ها',

    to: '/practice',
    icon: BookOpenCheck,
    roles: ['Instructor', 'Student'],
  },
  {
    label: 'بانک سوال',
    to: '/question-banks',
    icon: LibraryBig,
    roles: ['Instructor'],
  },
  {
    label: 'دانشجویان',
    to: '/students',
    icon: Users,
    roles: ['Instructor'],
  },
  {
    label: 'گروه‌ها',
    to: '/groups',
    icon: Layers,
    roles: ['Instructor'],
  },
  {
    label: 'درس‌ها',
    to: '/lessons',
    icon: PlayCircle,
    roles: ['Instructor', 'Student'],
  },
  {
    label: 'نتایج من',
    to: '/my-results',
    icon: Award,
    roles: ['Student'],
  },
  {
    label: 'تنظیمات',
    to: '/settings',
    icon: Settings,
    roles: ['Instructor', 'Student'],
  },
  {
    label: 'پکیج من',
    to: '/plans',
    icon: CreditCard,
    roles: ['Instructor'],
  },
  // --- منوی کاربر ارشد: ترتیب این بلوک همان ترتیب گروه‌ها و آیتم‌های سایدبار است ---
  {
    label: 'مدرس‌ها',
    to: '/instructors',
    icon: GraduationCap,
    roles: ['SuperAdmin'],
    group: 'users',
  },
  {
    label: 'دانشجویان',
    to: '/instructor-students',
    icon: Users,
    roles: ['SuperAdmin'],
    group: 'users',
  },
  {
    label: 'تایید مدرس‌ها',
    to: '/instructor-approvals',
    icon: ShieldCheck,
    roles: ['SuperAdmin'],
    group: 'users',
  },
  { label: 'تأیید گروه‌ها', to: '/group-approvals', icon: ShieldCheck, roles: ['SuperAdmin'], group: 'users' },
  {
    label: 'دسته‌بندی‌ها',
    to: '/categories',
    icon: Tags,
    roles: ['SuperAdmin'],
    group: 'content',
  },
  {
    label: 'محتوای فرود',
    to: '/site-content',
    icon: Layout,
    roles: ['SuperAdmin'],
    group: 'content',
  },
  {
    label: 'بلاگ',
    to: '/blog-posts',
    icon: Newspaper,
    roles: ['SuperAdmin'],
    group: 'content',
  },
  { label: 'اشتراک‌ها', to: '/subscriptions', icon: CreditCard, roles: ['SuperAdmin'], group: 'finance' },
  { label: 'پرداخت‌ها', to: '/payments', icon: CreditCard, roles: ['SuperAdmin'], group: 'finance' },
  { label: 'رویدادها', to: '/admin-events', icon: ShieldCheck, roles: ['SuperAdmin'], group: 'system' },
  {
    label: 'گزارش‌ها',
    to: '/reports',
    icon: BarChart3,
    roles: ['SuperAdmin'],
    group: 'finance',
  },
  {
    label: 'تنظیمات',
    to: '/settings',
    icon: Settings,
    roles: ['SuperAdmin'],
    group: 'system',
  },
];

export const roleLabel: Record<Role, string> = {
  SuperAdmin: 'کاربر ارشد',
  Instructor: 'مدرس',
  Student: 'دانشجو',
};

export type NavigationSection<T extends { group?: NavigationGroupId }> = {
  group?: NavigationGroupId;
  items: T[];
};

// آیتم‌ها را به بخش‌های پشت‌سرهم تقسیم می‌کند (ترتیب بخش‌ها = ترتیب اولین
// دیده‌شدنشان). آیتم‌های بدون group یک بخش بدون سرتیتر می‌سازند؛ منوی
// مدرس و دانشجو فقط همین یک بخش را دارد و ظاهرشان عوض نمی‌شود
export function groupNavigationItems<T extends { group?: NavigationGroupId }>(
  items: T[]
): NavigationSection<T>[] {
  const sections: NavigationSection<T>[] = [];
  for (const item of items) {
    let section = sections.find((s) => s.group === item.group);
    if (!section) {
      section = { group: item.group, items: [] };
      sections.push(section);
    }
    section.items.push(item);
  }
  return sections;
}
