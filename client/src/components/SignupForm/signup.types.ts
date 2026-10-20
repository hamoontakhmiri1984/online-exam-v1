export type WizardStep = 'role' | 'identity';

export type SignupStep = WizardStep | 'otp';

export type AccountRole = 'Student' | 'Instructor';

export const WIZARD_LABELS = ['نوع حساب', 'اطلاعات'];

export const WIZARD_ORDER: WizardStep[] = ['role', 'identity'];

export const MIN_PASSWORD_LENGTH = 6;

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
