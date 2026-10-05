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

import { ALL_ROLES, MANAGEMENT_ROLES } from '../../constants/roles';

export type NavigationItem = {
  label: string;
  adminLabel?: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
};

export const navigationItems: NavigationItem[] = [
  {
    label: 'داشبورد',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    label: 'آزمون‌ها',
    adminLabel: 'همهٔ آزمون‌ها',
    to: '/exams',
    icon: FileText,
    roles: ALL_ROLES,
  },
  {
    label: 'تمرین‌ها',
    adminLabel: 'مجموعه‌های تمرین',
    to: '/practice',
    icon: BookOpenCheck,
    roles: ALL_ROLES,
  },
  {
    label: 'بانک سوال',
    adminLabel: 'همهٔ بانک‌های سوال',
    to: '/question-banks',
    icon: LibraryBig,
    roles: MANAGEMENT_ROLES,
  },
  {
    label: 'دانشجویان',
    to: '/students',
    icon: Users,
    // SuperAdmin دیگه اینجا نیست: همین دیتا تو «مدرس‌ها و دانشجوها»
    // (/instructor-students) به تفکیک مدرس نشون داده می‌شه - نگه‌داشتن
    // هر دو یعنی دو منوی موازی برای یه چیز
    roles: ['Instructor'],
  },
  {
    label: 'گروه‌ها',
    adminLabel: 'همهٔ گروه‌ها',
    to: '/groups',
    icon: Layers,
    roles: MANAGEMENT_ROLES,
  },
  {
    label: 'درس‌ها',
    adminLabel: 'همهٔ درس‌ها',
    to: '/lessons',
    icon: PlayCircle,
    roles: ALL_ROLES,
  },
  {
    label: 'نتایج من',
    to: '/my-results',
    icon: Award,
    roles: ['Student'],
  },
  {
    label: 'گزارش‌ها',
    to: '/reports',
    icon: BarChart3,
    roles: ['SuperAdmin'],
  },
  {
    label: 'تنظیمات',
    to: '/settings',
    icon: Settings,
    roles: ALL_ROLES,
  },
  {
    label: 'پکیج من',
    to: '/plans',
    icon: CreditCard,
    roles: ['Instructor'],
  },
  {
    label: 'تایید مدرس‌ها',
    to: '/instructor-approvals',
    icon: ShieldCheck,
    roles: ['SuperAdmin'],
  },
  {
    label: 'دسته‌بندی‌ها',
    to: '/categories',
    icon: Tags,
    roles: ['SuperAdmin'],
  },
  {
    label: 'مدرس‌ها و محتوا',
    to: '/instructors',
    icon: GraduationCap,
    roles: ['SuperAdmin'],
  },
  {
    label: 'محتوای فرود',
    to: '/site-content',
    icon: Layout,
    roles: ['SuperAdmin'],
  },
  {
    label: 'بلاگ',
    to: '/blog-posts',
    icon: Newspaper,
    roles: ['SuperAdmin'],
  },
];

export const roleLabel: Record<Role, string> = {
  SuperAdmin: 'مدیر ارشد',
  Instructor: 'مدرس',
  Student: 'دانشجو',
};