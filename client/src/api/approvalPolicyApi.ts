import { apiRequest } from '../lib/apiClient';
import {
  listQueryString,
  type ListQuery,
  type ListPage,
} from '../lib/listPagination';
export type ApprovalPolicy = {
  revision: number;
  requireInstructorApproval: boolean;
  requireGroupApproval: boolean;
  pendingInstructors: number;
  pendingGroups: number;
};
export type PendingDecision = '' | 'keep' | 'approve';
export type PolicyUpdate = Pick<
  ApprovalPolicy,
  'revision' | 'requireInstructorApproval' | 'requireGroupApproval'
> & {
  pendingInstructors?: Exclude<PendingDecision, ''>;
  pendingGroups?: Exclude<PendingDecision, ''>;
};
export const getApprovalPolicy = () =>
  apiRequest<ApprovalPolicy>('/admin/approval-policy');
export const saveApprovalPolicy = (body: PolicyUpdate) =>
  apiRequest<ApprovalPolicy>('/admin/approval-policy', { method: 'PUT', body });
export type GroupReview = {
  id: string;
  name: string;
  category: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  instructor: { name: string | null; username: string | null };
};
export function getGroupReviews(
  status: GroupReview['approvalStatus'],
  query: ListQuery,
) {
  return apiRequest<ListPage<GroupReview>>(
    `/admin/group-approvals${listQueryString(query)}&status=${status}`,
  );
}
export function reviewGroup(
  group: GroupReview,
  status: 'Approved' | 'Rejected',
) {
  return apiRequest(
    `/admin/group-approvals/${encodeURIComponent(group.id)}/decision`,
    {
      method: 'POST',
      body: { status, expectedStatus: group.approvalStatus },
    },
  );
}
