import { ApiError, apiRequest } from '../../lib/apiClient';

import type {
  CaptchaAnswer,
  CaptchaChallenge,
  GoogleLoginResult,
  LoginResult,
  MeResponse,
  RegisterInput,
  RegisterResult,
} from './auth.types';

import { captchaRequiredOf, messageOf, userFromMe } from './auth.utils';

import { applySession } from './auth.session';

export async function getCaptcha(): Promise<CaptchaChallenge> {
  return apiRequest<CaptchaChallenge>('/auth/captcha');
}

export async function loginWithPassword(
  identifier: string,
  password: string,
  rememberMe: boolean,
  captcha?: CaptchaAnswer
): Promise<LoginResult> {
  try {
    const data = await apiRequest<{
      accessToken: string;
      user: MeResponse;
    }>('/auth/login/password', {
      method: 'POST',
      body: {
        identifier,
        password,
        rememberMe,
        ...captcha,
      },
    });

    const user = userFromMe(data.user);

    applySession(user, data.accessToken);

    return {
      status: 'success',
      user,
    };
  } catch (err) {
    return {
      status: 'error',
      message: messageOf(err),
      captchaRequired: captchaRequiredOf(err),
    };
  }
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  try {
    const data = await apiRequest<{
      identifier: string;
    }>('/auth/register', {
      method: 'POST',
      body: {
        identifier: input.identifier,

        username: input.username,

        password: input.password,

        name: input.name,

        role: input.role,

        joinCode: input.joinCode,

        ...input.captcha,
      },
    });

    return {
      status: 'otp_sent',
      identifier: data.identifier,
    };
  } catch (err) {
    const usernameSuggestions =
      err instanceof ApiError
        ? (
            err.body as {
              suggestions?: string[];
            } | null
          )?.suggestions
        : undefined;

    return {
      status: 'error',
      message: messageOf(err),

      usernameSuggestions,

      captchaRequired: captchaRequiredOf(err),
    };
  }
}

export async function googleLogin(idToken: string): Promise<GoogleLoginResult> {
  try {
    const data = await apiRequest<{
      pendingApproval?: boolean;
      message?: string;
      accessToken?: string;
      user?: MeResponse;
    }>('/auth/google', {
      method: 'POST',
      body: {
        idToken,
      },
    });

    if (data.pendingApproval) {
      return {
        status: 'pending_approval',

        message: data.message ?? '',
      };
    }

    if (!data.user || !data.accessToken) {
      return {
        status: 'error',

        message: 'اطلاعات ورود از سرور دریافت نشد',
      };
    }

    const user = userFromMe(data.user);

    applySession(user, data.accessToken);

    return {
      status: 'success',
      user,
    };
  } catch (err) {
    return {
      status: 'error',
      message: messageOf(err),
    };
  }
}
