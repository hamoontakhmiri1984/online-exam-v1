export type Role =
  | 'SuperAdmin'
  | 'Instructor'
  | 'Student';

export type User = {
  id: string;
  username?: string;
  role: Role;
  name?: string;
  onboardingCompleted: boolean;
  organizationName?: string;
};

export type MeResponse = {
  id: string;
  name: string | null;
  role: Role;
  username: string | null;
  onboardingCompleted: boolean;
  organizationName: string | null;
};

export type CaptchaAnswer = {
  captchaId: string;
  captchaAnswer: string;
};

export type CaptchaChallenge = {
  captchaId: string;
  svg: string;
};

export type LoginResult =
  | {
      status: 'success';
      user: User;
    }
  | {
      status: 'error';
      message: string;
      captchaRequired?: boolean;
    };

export type OtpPurpose =
  | 'REGISTER'
  | 'LOGIN'
  | 'RESET_PASSWORD';

export type RequestOtpResult =
  | {
      status: 'sent';
      identifier: string;
    }
  | {
      status: 'error';
      message: string;
      captchaRequired?: boolean;
    };

export type VerifyOtpResult =
  | {
      status: 'success';
      user: User;
    }
  | {
      status: 'pending_approval';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    };

export type VerifyResetOtpResult =
  | {
      status: 'success';
      resetTicket: string;
    }
  | {
      status: 'error';
      message: string;
    };

export type ResetPasswordResult =
  | {
      status: 'success';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    };

export type RegisterInput = {
  identifier: string;
  username?: string;
  password?: string;
  name?: string;
  role: 'Student' | 'Instructor';
  joinCode?: string;
  captcha?: CaptchaAnswer;
};

export type RegisterResult =
  | {
      status: 'otp_sent';
      identifier: string;
    }
  | {
      status: 'error';
      message: string;
      usernameSuggestions?: string[];
      captchaRequired?: boolean;
    };

export type UsernameAvailability =
  | {
      available: true;
    }
  | {
      available: false;
      reason: string;
      suggestions?: string[];
    };

export type GoogleLoginResult =
  | {
      status: 'success';
      user: User;
    }
  | {
      status: 'pending_approval';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    };

export type UpdateNameResult =
  | {
      status: 'success';
      user: User;
    }
  | {
      status: 'error';
      message: string;
    };

export type CompleteOnboardingResult =
  | {
      status: 'success';
      user: User;
    }
  | {
      status: 'error';
      message: string;
    };

export type ConnectedAccountsStatus = {
  googleLinked: boolean;
  hasPassword: boolean;
};

export type ConnectedAccountsResult =
  | ({
      status: 'success';
    } & ConnectedAccountsStatus)
  | {
      status: 'error';
      message: string;
    };