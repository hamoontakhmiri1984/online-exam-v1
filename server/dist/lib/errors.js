"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.notFound = notFound;
exports.forbidden = forbidden;
exports.badRequest = badRequest;
exports.conflict = conflict;
// خطای «شناخته‌شده» و قابل‌کنترل - وقتی خودمون تشخیص می‌دیم یه وضعیت
// خطاست (نه یه bug/exception غیرمنتظره)، به‌جای res.status().json() پراکنده
// تو هر route، throw می‌کنیم و errorHandler مرکزی شکلش می‌ده.
// isOperational=true یعنی «این خطا رو می‌شناسیم و پیام‌ش امنه که مستقیم به
// کاربر نشون داده بشه» - در مقابل خطاهای برنامه‌نویسی/غیرمنتظره که پیامشون
// نباید لو بره.
class AppError extends Error {
    statusCode;
    isOperational = true;
    // فیلدهای اضافه‌ی گاه‌به‌گاه که کنار error تو پاسخ می‌رن (مثلاً reason
    // برای خطاهای محدودیت پلن) - errorHandler اینا رو کنار message می‌ذاره
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
function notFound(message = 'یافت نشد') {
    return new AppError(404, message);
}
function forbidden(message = 'دسترسی غیرمجاز') {
    return new AppError(403, message);
}
function badRequest(message) {
    return new AppError(400, message);
}
function conflict(message) {
    return new AppError(409, message);
}
