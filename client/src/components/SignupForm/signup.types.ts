export type WizardStep = 'role' | 'identity' | 'review';

export type SignupStep = WizardStep | 'otp';

export type AccountRole = 'Student' | 'Instructor';

export type SignupFormData = {
  role: AccountRole | null;
  name: string;
  identifier: string;
  password: string;
  confirmPassword: string;
};

export const WIZARD_LABELS = ['نوع حساب', 'اطلاعات', 'تایید نهایی'];

export const WIZARD_ORDER: WizardStep[] = ['role', 'identity', 'review'];

// همون حداقل سرور برای نام (registerSchema)
export const MIN_NAME_LENGTH = 2;

export const MIN_PASSWORD_LENGTH = 6;

// همون قانون سرور (PASSWORD_REGEX): حداقل ۶ کاراکتر + حداقل یک حرف و یک عدد
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
