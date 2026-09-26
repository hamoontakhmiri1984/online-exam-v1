"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingSchema = exports.updateMeSchema = exports.googleAuthSchema = exports.resetPasswordSchema = exports.passwordLoginSchema = exports.otpVerifySchema = exports.otpRequestSchema = exports.otpPurposeSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const password_1 = require("../lib/password");
// bcrypt فقط ۷۲ بایتِ اول رمز رو می‌خونه؛ سقف بالاتر فقط توهم امنیته
const PASSWORD_MAX = 72;
const passwordMaxMessage = 'رمز نباید بیشتر از ۷۲ کاراکتر باشه';
exports.registerSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(3).max(254),
    captchaId: zod_1.z.string().min(1).max(64).optional(),
    captchaAnswer: zod_1.z.string().min(1).max(32).optional(),
    username: zod_1.z.string().min(1).max(64).optional(),
    password: zod_1.z
        .string()
        .regex(password_1.PASSWORD_REGEX, 'رمز باید حداقل ۶ کاراکتر و ترکیبی از حرف و عدد باشه')
        .max(PASSWORD_MAX, passwordMaxMessage)
        .optional(),
    name: zod_1.z.string().min(2).max(100).optional(),
    role: zod_1.z.enum(['Student', 'Instructor']),
    joinCode: zod_1.z.string().min(1).max(20).optional(),
});
exports.otpPurposeSchema = zod_1.z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD']);
exports.otpRequestSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(3).max(254),
    purpose: exports.otpPurposeSchema,
    captchaId: zod_1.z.string().min(1).max(64).optional(),
    captchaAnswer: zod_1.z.string().min(1).max(32).optional(),
});
exports.otpVerifySchema = zod_1.z.object({
    identifier: zod_1.z.string().min(3).max(254),
    purpose: exports.otpPurposeSchema,
    code: zod_1.z.string().regex(/^\d{6}$/, 'کد تایید باید ۶ رقم باشه'),
    rememberMe: zod_1.z.boolean().optional().default(false),
});
exports.passwordLoginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(3).max(254),
    password: zod_1.z.string().min(1).max(200),
    rememberMe: zod_1.z.boolean().optional().default(false),
    captchaId: zod_1.z.string().min(1).max(64).optional(),
    captchaAnswer: zod_1.z.string().min(1).max(32).optional(),
});
exports.resetPasswordSchema = zod_1.z.object({
    resetTicket: zod_1.z.string().min(10).max(2048),
    newPassword: zod_1.z
        .string()
        .regex(password_1.PASSWORD_REGEX, 'رمز باید حداقل ۶ کاراکتر و ترکیبی از حرف و عدد باشه')
        .max(PASSWORD_MAX, passwordMaxMessage),
});
exports.googleAuthSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(10).max(4096),
});
exports.updateMeSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(2, 'نام باید حداقل ۲ کاراکتر باشه')
        .max(100, 'نام نباید بیشتر از ۱۰۰ کاراکتر باشه'),
});
exports.onboardingSchema = zod_1.z.object({
    organizationName: zod_1.z.string().trim().min(1).max(120).optional(),
});
