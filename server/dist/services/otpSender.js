"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = sendOtp;
const env_1 = require("../config/env");
// بدون timeout، کندیِ درگاه پیامک/ایمیل درخواست کاربر رو بی‌نهایت نگه می‌داشت
const SEND_TIMEOUT_MS = 10_000;
async function sendSms(phone, code) {
    if (!env_1.env.KAVENEGAR_API_KEY) {
        // تو production نباید کد OTP تو لاگ چاپ بشه و کاربر هم هیچ‌وقت پیامکی
        // نگیره - خطا می‌دیم تا کانفیگ ناقص فوراً دیده بشه
        if (env_1.env.NODE_ENV === 'production') {
            throw new Error('KAVENEGAR_API_KEY در production تنظیم نشده');
        }
        console.warn(`[DEV] KAVENEGAR_API_KEY خالیه - کد OTP برای ${phone}: ${code}`);
        return;
    }
    // مستندات: https://kavenegar.com/rest.html
    // نکته‌ی مهم: کاوه‌نگار حتی موقع خطای منطقی (الگوی نامعتبر، اعتبار ناکافی،
    // شماره نامعتبر و...) HTTP status رو 200 برمی‌گردونه - خطای واقعی فقط داخل
    // بدنه (return.status) میاد. پس فقط چک کردن res.ok کافی نیست.
    const url = `https://api.kavenegar.com/v1/${env_1.env.KAVENEGAR_API_KEY}/verify/lookup.json`;
    const params = new URLSearchParams({
        receptor: phone,
        token: code,
        template: 'otpverify', // باید تو پنل کاوه‌نگار یه الگوی پیامکی به همین اسم بسازی
    });
    const res = await fetch(`${url}?${params.toString()}`, {
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    let body;
    try {
        body = (await res.json());
    }
    catch {
        throw new Error(`ارسال پیامک OTP شکست خورد: پاسخ کاوه‌نگار قابل‌خواندن نبود (HTTP ${res.status})`);
    }
    if (!res.ok || body.return?.status !== 200) {
        throw new Error(`ارسال پیامک OTP شکست خورد: [${body.return?.status ?? res.status}] ${body.return?.message ?? 'پاسخ نامشخص'}`);
    }
    const entry = body.entries?.[0];
    console.log(`[SMS] کد OTP به ${phone} ارسال شد — messageid=${entry?.messageid}, status=${entry?.statustext}`);
}
async function sendEmail(email, code) {
    if (!env_1.env.RESEND_API_KEY) {
        if (env_1.env.NODE_ENV === 'production') {
            throw new Error('RESEND_API_KEY در production تنظیم نشده');
        }
        console.warn(`[DEV] RESEND_API_KEY خالیه - کد OTP برای ${email}: ${code}`);
        return;
    }
    // مستندات: https://resend.com/docs/api-reference/emails/send-email
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env_1.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'noreply@yourdomain.com', // گام ۲: باید دامنه‌ت رو تو Resend وریفای کنی
            to: email,
            subject: 'کد تایید شما',
            html: `<p>کد تایید شما: <b>${code}</b></p><p>این کد تا ۲ دقیقه معتبره.</p>`,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`ارسال ایمیل OTP شکست خورد: ${res.status} ${body}`);
    }
}
async function sendOtp({ identifier, channel, code, }) {
    if (channel === 'SMS')
        return sendSms(identifier, code);
    return sendEmail(identifier, code);
}
