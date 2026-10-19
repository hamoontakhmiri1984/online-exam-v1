import { apiRequest } from '../lib/apiClient';
import {
  listQueryString,
  type ListPage,
  type ListQuery,
} from '../lib/listPagination';
import type { PlanId } from '../constants/plans';
export type Person = {
  id: string;
  name: string | null;
  username: string | null;
};
export type ReportSummary = {
  started: number;
  completed: number;
  average: number | null;
  revenue: number;
  successfulPayments: number;
  activeSubscriptions: number;
  series: { day: string; completed: number; registered: number }[];
  registrationSeriesAvailable: boolean;
};
export type ReportAttempt = {
  id: string;
  finishedAt: string;
  correctCount: number;
  totalQuestions: number;
  student: Person;
  exam: { id: string; title: string; instructor: Person | null };
};
export type ReportPayment = {
  id: string;
  amount: number;
  planId: PlanId;
  status: 'Pending' | 'Success' | 'Failed' | 'Refunded';
  createdAt: string;
  instructor: Person;
};
export type ReportEvent = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  admin: Person;
};
export const getReportSummary = (days = 30, instructorId = '') =>
  apiRequest<ReportSummary>(
    `/admin/reporting/summary?days=${days}&instructorId=${encodeURIComponent(instructorId)}`,
  );
export function getReportList<T>(
  kind: 'attempts' | 'payments' | 'events',
  query: ListQuery,
  days = 30,
  order = 'newest',
  instructorId = '',
) {
  return apiRequest<ListPage<T>>(
    `/admin/reporting/${kind}${listQueryString(query)}&days=${days}&order=${order}&instructorId=${encodeURIComponent(instructorId)}`,
  );
}
