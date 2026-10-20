import { collectListPages, listQueryString, type ListQuery, type ListPage } from '../lib/listPagination';
import type { Category } from '../constants/categories';
import { apiRequest, ApiError } from '../lib/apiClient';

export type Group = {
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  id: string;
  name: string;
  category: Category; // Category is a display filter, not an access boundary.
  instructorId: string;
  studentIds: string[];
  joinCode: string;
};

export function getGroupsPage(query: ListQuery = {}): Promise<ListPage<Group>> {
  return apiRequest<ListPage<Group>>(`/groups${listQueryString(query)}`);
}

export function getGroups(): Promise<Group[]> {
  return collectListPages(getGroupsPage).then(groups => groups.filter(g => !g.approvalStatus || g.approvalStatus === 'Approved'));
}

// Treat inaccessible groups as absent; propagate transport and infrastructure failures.
export async function getGroupById(id: string): Promise<Group | undefined> {
  try {
    return await apiRequest<Group>(`/groups/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return undefined;
    }
    throw err;
  }
}

export function getGroupsByInstructor(_instructorId: string): Promise<Group[]> {
  return getGroups();
}

export function getGroupsByStudent(_studentId: string): Promise<Group[]> {
  return getGroups();
}

export function addGroup(group: Omit<Group, 'id' | 'joinCode'>): Promise<Group> {
  return apiRequest<Group>('/groups', {
    method: 'POST',
    body: {
      name: group.name,
      category: group.category,
      studentIds: group.studentIds,
    },
  });
}

export function updateGroup(
  id: string,
  updated: Omit<Group, 'id' | 'joinCode'>
): Promise<Group> {
  return apiRequest<Group>(`/groups/${id}`, {
    method: 'PUT',
    body: {
      name: updated.name,
      category: updated.category,
      studentIds: updated.studentIds,
    },
  });
}

export function joinGroupByCode(code: string): Promise<Group> {
  return apiRequest<Group>('/groups/join', {
    method: 'POST',
    body: { joinCode: code.trim() },
  });
}

export function regenerateJoinCode(groupId: string): Promise<Group> {
  return apiRequest<Group>(`/groups/${groupId}/regenerate-join-code`, {
    method: 'POST',
  });
}

export function deleteGroup(id: string): Promise<void> {
  return apiRequest<void>(`/groups/${id}`, { method: 'DELETE' });
}
