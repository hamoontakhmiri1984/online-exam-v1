import { apiRequest } from '../lib/apiClient';

export type TicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type TicketCategory = 'Technical' | 'Exams' | 'Payments' | 'Account' | 'Other';
export type TicketStatus = 'Open' | 'Answered' | 'Closed';

export type SupportTicket = {
  id: string;
  trackingCode: string;
  userId: string;
  assignedInstructorId?: string | null;
  user?: { id: string; name: string | null; username: string | null };
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};
export type SupportInstructor = {
  id: string;
  name: string | null;
  username: string | null;
  ticketCount: number;
  openCount: number;
};
export type TicketMessage = {
  id: string;
  ticketId: string;
  clientId: string;
  fromStaff: boolean;
  body: string;
  createdAt: string;
};
export const ticketCategoryLabels: Record<TicketCategory, string> = {
  Technical: 'فنی', Exams: 'آزمون‌ها', Payments: 'مالی و اشتراک',
  Account: 'حساب کاربری', Other: 'سایر',
};
export const ticketPriorityLabels: Record<TicketPriority, string> = {
  Low: 'کم', Normal: 'عادی', High: 'زیاد', Urgent: 'فوری',
};
export const ticketStatusLabels: Record<TicketStatus, string> = {
  Open: 'در انتظار پاسخ', Answered: 'پاسخ داده شده', Closed: 'بسته شده',
};

export const getMyTickets = (page = 0) => apiRequest<SupportTicket[]>(`/support/mine/tickets?page=${page}`);
export const createSupportTicket = (input: {
  subject: string; category: TicketCategory; priority: TicketPriority; body: string;
  assignedInstructorId?: string;
}) => apiRequest<SupportTicket>('/support/tickets', { method: 'POST', body: input });
export type AvailableInstructor = { id: string; name: string | null; username: string | null };
export const getStudentInstructors = () =>
  apiRequest<AvailableInstructor[]>('/support/student/instructors');
export const getAssignedStudentTickets = (page = 0) =>
  apiRequest<SupportTicket[]>(`/support/assigned/tickets?page=${page}`);
export const getSupportInstructors = () => apiRequest<SupportInstructor[]>('/support/instructors');
export const getInstructorTickets = (id: string, page = 0) =>
  apiRequest<SupportTicket[]>(`/support/instructors/${encodeURIComponent(id)}/tickets?page=${page}`);
export const getTicket = (id: string) =>
  apiRequest<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`);
export const getTicketMessages = (id: string) =>
  apiRequest<TicketMessage[]>(`/support/tickets/${encodeURIComponent(id)}/messages`);
export const postTicketMessage = (id: string, body: string, clientId: string) =>
  apiRequest<{ id: string }>(`/support/tickets/${encodeURIComponent(id)}/messages`, {
    method: 'POST', body: { body, clientId },
  });
export const updateTicketStatus = (id: string, status: 'Open' | 'Closed') =>
  apiRequest<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: { status },
  });
