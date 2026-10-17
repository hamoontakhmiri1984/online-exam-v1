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
    adminLabel: 'پیشخوان مدیریتی',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    label: 'آزمون‌ها',
    adminLabel: 'نظارت بر آزمون‌ها',
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
    label: 'دانشجویان',
    to: '/instructor-students',
    icon: Users,
    roles: ['SuperAdmin'],
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
  SuperAdmin: 'کاربر ارشد',
  Instructor: 'مدرس',
  Student: 'دانشجو',
};