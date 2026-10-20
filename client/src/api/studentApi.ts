import { apiRequest } from '../lib/apiClient';

export type Student = {
  id: string;
  name: string;
  email?: string;
  username: string;
};

export function getStudents(): Promise<Student[]> {
  return apiRequest<Student[]>('/students');
}

export function deleteStudent(id: string): Promise<void> {
  return apiRequest<void>(`/students/${id}`, { method: 'DELETE' });
}
