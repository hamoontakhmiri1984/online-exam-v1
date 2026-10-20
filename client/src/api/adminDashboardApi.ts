import { apiRequest } from '../lib/apiClient';

export type AdminExamState = 'draft' | 'upcoming' | 'completed';

export type AdminDashboard = {
  stats: {
    approvedInstructors: number;
    students: number;
    activeExams: number;
    pendingRequests: number;
  };
  attention: {
    instructors: {
      total: number;
      items: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        createdAt: string;
      }[];
    };
    groups: {
      total: number;
      items: {
        id: string;
        name: string;
        category: string;
        instructorName: string | null;
        createdAt: string;
      }[];
    };
  };
  recentExams: {
    id: string;
    title: string;
    instructorId: string;
    instructorName: string | null;
    scheduledAt: string;
    status: AdminExamState;
    participants: number;
  }[];
};

export function getAdminDashboard(): Promise<AdminDashboard> {
  return apiRequest<AdminDashboard>('/admin/dashboard');
}
