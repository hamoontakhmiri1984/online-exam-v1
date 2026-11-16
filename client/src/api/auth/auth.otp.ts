import { ApiError, apiRequest } from '../../lib/apiClient';
import type { CaptchaAnswer, OtpPurpose, RequestOtpResult, ResetPasswordResult, VerifyOtpResult, VerifyResetOtpResult, MeResponse } from './auth.types';
import { captchaRequiredOf, messageOf, userFromMe } from './auth.utils';
import { applySession } from './auth.session';
export async function requestOtp(
  identifier: string,
  purpose: OtpPurpose,
  captcha?: CaptchaAnswer,
): Promise<RequestOtpResult> {
  try {
    await apiRequest('/auth/otp/request', {
      method: 'POST',
      body: { identifier, purpose, ...captcha },
    });
    return { status: 'sent', identifier };
  } catch (err) {
    const retryAfterSeconds =
      err instanceof ApiError && err.status === 429 &&
      err.body && typeof err.body === 'object' && 'retryAfterSeconds' in err.body
        ? err.body.retryAfterSeconds
        : undefined;
    return {
      status: 'error',
      message: messageOf(err),
      captchaRequired: captchaRequiredOf(err),
      retryAfterSeconds: typeof retryAfterSeconds === 'number' &&
        Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds
        : undefined,
    };
  }
}
export async function verifyOtp(
  identifier: string,
  purpose: OtpPurpose,
  code: string,
  rememberMe = false,
  captcha?: CaptchaAnswer,
): Promise<VerifyOtpResult> {
  try {
    const data = await apiRequest<{ pendingApproval?: boolean; message?: string; resetTicket?: string; accessToken?: string; user?: MeResponse }>('/auth/otp/verify', { method: 'POST', body: { identifier, purpose, code, rememberMe, ...captcha } });
    if (data.pendingApproval) return { status: 'pending_approval', message: data.message ?? '' };
    if (!data.user || !data.accessToken) return { status: 'error', message: 'اطلاعات ورود از سرور دریافت نشد' };
    const user = userFromMe(data.user);
    applySession(user, data.accessToken);
    return { status: 'success', user };
  } catch (err) {
    return { status: 'error', message: messageOf(err), captchaRequired: captchaRequiredOf(err) };
  }
}
export async function verifyResetPasswordOtp(identifier: string, code: string): Promise<VerifyResetOtpResult> { try { const data = await apiRequest<{ resetTicket?: string }>('/auth/otp/verify', { method: 'POST', body: { identifier, purpose: 'RESET_PASSWORD', code } }); if (!data.resetTicket) return { status: 'error', message: 'کد بازیابی معتبر نیست' }; return { status: 'success', resetTicket: data.resetTicket }; } catch (err) { return { status: 'error', message: messageOf(err) }; } }
export async function resetPassword(resetTicket: string, newPassword: string): Promise<ResetPasswordResult> { try { const data = await apiRequest<{ message: string }>('/auth/reset-password', { method: 'POST', body: { resetTicket, newPassword } }); return { status: 'success', message: data.message }; } catch (err) { return { status: 'error', message: messageOf(err) }; } }
