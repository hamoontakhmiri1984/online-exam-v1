import { apiMultipartRequest, apiRequest } from '../../lib/apiClient';
import type { ChangePasswordResult, CompleteOnboardingResult, ConnectedAccountsResult, ConnectedAccountsStatus, MeResponse, UpdateAvatarResult, UpdateNameResult, UsernameAvailability } from './auth.types';
import { messageOf, userFromMe } from './auth.utils';
import { setCurrentUser } from './auth.session';
export async function checkUsernameAvailability(username: string, signal?: AbortSignal): Promise<UsernameAvailability> { return apiRequest<UsernameAvailability>(`/auth/username-available?username=${encodeURIComponent(username)}`, { signal }); }
export async function updateCurrentUserName(name: string): Promise<UpdateNameResult> { try { const data = await apiRequest<MeResponse>('/auth/me', { method: 'PATCH', body: { name } }); const user = userFromMe(data); setCurrentUser(user); return { status: 'success', user }; } catch (err) { return { status: 'error', message: messageOf(err) }; } }
export async function completeOnboarding(organizationName?: string): Promise<CompleteOnboardingResult> { try { const data = await apiRequest<MeResponse>('/auth/onboarding', { method: 'POST', body: { organizationName } }); const user = userFromMe(data); setCurrentUser(user); return { status: 'success', user }; } catch (err) { return { status: 'error', message: messageOf(err) }; } }
export async function getConnectedAccountsStatus(): Promise<ConnectedAccountsResult> { try { const data = await apiRequest<MeResponse & ConnectedAccountsStatus>('/auth/me'); return { status: 'success', googleLinked: data.googleLinked, hasPassword: data.hasPassword }; } catch (err) { return { status: 'error', message: messageOf(err) }; } }
export async function linkGoogleAccount(idToken: string): Promise<ConnectedAccountsResult> { try { const data = await apiRequest<MeResponse & ConnectedAccountsStatus>('/auth/google/link', { method: 'POST', body: { idToken } }); return { status: 'success', googleLinked: data.googleLinked, hasPassword: data.hasPassword }; } catch (err) { return { status: 'error', message: messageOf(err) }; } }
export async function unlinkGoogleAccount(): Promise<ConnectedAccountsResult> { try { const data = await apiRequest<MeResponse & ConnectedAccountsStatus>('/auth/google/unlink', { method: 'POST' }); return { status: 'success', googleLinked: data.googleLinked, hasPassword: data.hasPassword }; } catch (err) { return { status: 'error', message: messageOf(err) }; } }

export async function uploadAvatar(file: File): Promise<UpdateAvatarResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiMultipartRequest<MeResponse>('/auth/me/avatar', formData);
    const user = userFromMe(data);
    setCurrentUser(user);
    return { status: 'success', user };
  } catch (err) {
    return { status: 'error', message: messageOf(err) };
  }
}

export async function removeAvatar(): Promise<UpdateAvatarResult> {
  try {
    const data = await apiRequest<MeResponse>('/auth/me/avatar', { method: 'DELETE' });
    const user = userFromMe(data);
    setCurrentUser(user);
    return { status: 'success', user };
  } catch (err) {
    return { status: 'error', message: messageOf(err) };
  }
}

// Send currentPassword only for accounts that already have a password.
export async function changePassword(currentPassword: string | undefined, newPassword: string): Promise<ChangePasswordResult> {
  try {
    await apiRequest<MeResponse>('/auth/me/password', { method: 'POST', body: { currentPassword, newPassword } });
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: messageOf(err) };
  }
}
