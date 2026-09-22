import { z } from 'zod';
import { PASSWORD_REGEX } from '../lib/password';

// bcrypt فقط ۷۲ بایتِ اول رمز رو می‌خونه؛ سقف بالاتر فقط توهم امنیته
const PASSWORD_MAX = 72;
const passwordMaxMessage = 'رمز نباید بیشتر از ۷۲ کاراکتر باشه';

export const registerSchema = z.object({
  identifier: z.string().min(3).max(254),
  captchaId: z.string().min(1).max(64).optional(),
  captchaAnswer: z.string().min(1).max(32).optional(),

  username: z.string().min(1).max(64).optional(),

  password: z
    .string()
    .regex(
      PASSWORD_REGEX,
      'رمز باید حداقل ۶ کاراکتر و ترکیبی از حرف و عدد باشه'
    )
    .max(PASSWORD_MAX, passwordMaxMessage)
    .optional(),

  name: z.string().min(2).max(100).optional(),

  role: z.enum(['Student', 'Instructor']),

  joinCode: z.string().min(1).max(20).optional(),
});

export const otpPurposeSchema = z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD']);

export const otpRequestSchema = z.object({
  identifier: z.string().min(3).max(254),
  purpose: otpPurposeSchema,
  captchaId: z.string().min(1).max(64).optional(),
  captchaAnswer: z.string().min(1).max(32).optional(),
});

export const otpVerifySchema = z.object({
  identifier: z.string().min(3).max(254),
  purpose: otpPurposeSchema,
  code: z.string().regex(/^\d{6}$/, 'کد تایید باید ۶ رقم باشه'),
  rememberMe: z.boolean().optional().default(false),
});

export const passwordLoginSchema = z.object({
  identifier: z.string().min(3).max(254),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional().default(false),
  captchaId: z.string().min(1).max(64).optional(),
  captchaAnswer: z.string().min(1).max(32).optional(),
});

export const resetPasswordSchema = z.object({
  resetTicket: z.string().min(10).max(2048),

  newPassword: z
    .string()
    .regex(
      PASSWORD_REGEX,
      'رمز باید حداقل ۶ کاراکتر و ترکیبی از حرف و عدد باشه'
    )
    .max(PASSWORD_MAX, passwordMaxMessage),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(10).max(4096),
});

export const updateMeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'نام باید حداقل ۲ کاراکتر باشه')
    .max(100, 'نام نباید بیشتر از ۱۰۰ کاراکتر باشه'),
});

export const onboardingSchema = z.object({
  organizationName: z.string().trim().min(1).max(120).optional(),
});
